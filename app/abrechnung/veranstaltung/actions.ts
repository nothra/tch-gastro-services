"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole, requireRole } from "@/lib/authz";
import { firstIssueMessage } from "@/lib/form-errors";
import { createTeilnehmer, getTeilnehmer } from "@/db/teilnehmer";
import { teilnehmerSchema } from "@/app/verwaltung/teilnehmer/schema";
import { KASSEN, veranstaltungStatus, type Kasse } from "@/db/schema";
import {
  addZeile,
  createVeranstaltung,
  ensureThekeForKasse,
  getVeranstaltung,
  removeZeile,
  setStatus,
} from "@/db/veranstaltung";
import { veranstaltungSchema } from "./schema";

const LIST_PATH = "/abrechnung/veranstaltung";
const detailPath = (id: string) => `${LIST_PATH}/${id}`;

const NOT_FOUND = "Veranstaltung nicht gefunden.";
const NOT_OFFEN = "Die Veranstaltung ist abgeschlossen und schreibgeschützt.";
const DUPLICATE_ZEILE = "Dieser Teilnehmer ist bereits erfasst.";

export type VeranstaltungFormState = { ok?: boolean; error?: string };

// Postgres unique_violation (SQLSTATE 23505) – unterscheidet den Duplikat-Fall von einem
// echten Fehler (analog Katalog-Action).
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

export async function createVeranstaltungAction(
  _prevState: VeranstaltungFormState | undefined,
  formData: FormData,
): Promise<VeranstaltungFormState> {
  await requireRole("abrechner");
  const parsed = veranstaltungSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };

  await createVeranstaltung(parsed.data);
  revalidatePath(LIST_PATH);
  return { ok: true };
}

// Fügt einen Teilnehmer als Zeile hinzu. Der Anzeigename-Snapshot wird serverseitig aus den
// Stammdaten geholt (nicht vom Client), damit die Zeile den autoritativen Namen konserviert.
export async function addZeileAction(
  _prevState: VeranstaltungFormState | undefined,
  formData: FormData,
): Promise<VeranstaltungFormState> {
  await requireRole("abrechner");
  const veranstaltungId = String(formData.get("veranstaltungId") ?? "");
  const teilnehmerId = String(formData.get("teilnehmerId") ?? "");
  if (!veranstaltungId || !teilnehmerId) return { error: "Teilnehmer und Veranstaltung nötig." };

  const ziel = await getVeranstaltung(veranstaltungId);
  if (!ziel) return { error: NOT_FOUND };
  if (ziel.status !== "offen") return { error: NOT_OFFEN };

  // Nur aktive Stammdaten-Teilnehmer dürfen erfasst werden. getTeilnehmer selektiert
  // unabhängig von `active`, daher hier explizit prüfen – ein manipulierter Request darf
  // keinen soft-gelöschten (inaktiven) Teilnehmer erfassen (Review #51, ADR-022).
  const person = await getTeilnehmer(teilnehmerId);
  if (!person || !person.active) return { error: "Teilnehmer nicht gefunden." };

  try {
    await addZeile(veranstaltungId, person);
  } catch (error) {
    if (isUniqueViolation(error)) return { error: DUPLICATE_ZEILE };
    throw error;
  }
  revalidatePath(detailPath(veranstaltungId));
  return { ok: true };
}

// Walk-in: der Abrechner legt einen bisher unbekannten Teilnehmer an und erfasst ihn in
// einem Zug (F3/ADR-022 – der Walk-in bleibt beim Abrechner, nicht beim Gast). Der neue
// Teilnehmer landet in den Stammdaten und erhält direkt eine Zeile mit Namens-Snapshot.
export async function createWalkInAction(
  _prevState: VeranstaltungFormState | undefined,
  formData: FormData,
): Promise<VeranstaltungFormState> {
  await requireRole("abrechner");
  const veranstaltungId = String(formData.get("veranstaltungId") ?? "");
  if (!veranstaltungId) return { error: "Keine Veranstaltung angegeben." };

  const ziel = await getVeranstaltung(veranstaltungId);
  if (!ziel) return { error: NOT_FOUND };
  if (ziel.status !== "offen") return { error: NOT_OFFEN };

  const parsed = teilnehmerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };

  const person = await createTeilnehmer(parsed.data);
  await addZeile(veranstaltungId, person);
  revalidatePath(detailPath(veranstaltungId));
  return { ok: true };
}

// Entfernt eine Zeile aus einer offenen Veranstaltung. In #51 gibt es noch keine erfassten
// Positionen (F5), daher ist das Entfernen bedingungslos; die Schutzabfrage bei bereits
// erfassten Positionen gehört zu F5/F8 (spec-51, ADR-023 D7).
export async function removeZeileAction(formData: FormData): Promise<void> {
  await requireRole("abrechner");
  const veranstaltungId = String(formData.get("veranstaltungId") ?? "");
  const zeileId = String(formData.get("zeileId") ?? "");
  if (!veranstaltungId || !zeileId) return;

  const ziel = await getVeranstaltung(veranstaltungId);
  if (!ziel || ziel.status !== "offen") return;

  await removeZeile(zeileId, veranstaltungId);
  revalidatePath(detailPath(veranstaltungId));
}

// Status setzen: Abschließen (F8) und protokolliertes Wiederöffnen durch den Abrechner.
// Die stehende Theke schließt nie (ADR-023 D4) – ein Abschluss für typ='theke' wird abgelehnt.
export async function setStatusAction(formData: FormData): Promise<void> {
  await requireRole("abrechner");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id) return;
  if (!veranstaltungStatus.enumValues.includes(status as (typeof veranstaltungStatus.enumValues)[number])) {
    return;
  }

  const ziel = await getVeranstaltung(id);
  if (!ziel) return;
  if (ziel.typ === "theke" && status === "abgeschlossen") return;

  await setStatus(id, status as (typeof veranstaltungStatus.enumValues)[number]);
  revalidatePath(detailPath(id));
  revalidatePath(LIST_PATH);
}

// Richtet die stehende Theke einer Kasse ein (idempotent, ADR-023 D3). Verwalter ODER
// Abrechner. Ein zweiter Aufruf legt nicht doppelt an, sondern meldet Erfolg (die Theke
// existiert bereits) – die DB-Idempotenz garantiert der Partial-Unique-Index.
export async function ensureThekeAction(
  _prevState: VeranstaltungFormState | undefined,
  formData: FormData,
): Promise<VeranstaltungFormState> {
  await requireAnyRole(["verwalter", "abrechner"]);
  const kasse = String(formData.get("kasse") ?? "");
  if (!KASSEN.includes(kasse as Kasse)) return { error: "Bitte eine gültige Kasse wählen." };

  try {
    await ensureThekeForKasse(kasse as Kasse);
  } catch (error) {
    // Race mit einem parallelen Einrichten: die Theke existiert nun – ebenfalls Erfolg.
    if (!isUniqueViolation(error)) throw error;
  }
  revalidatePath(LIST_PATH);
  return { ok: true };
}
