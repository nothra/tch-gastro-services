"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole, requireRole } from "@/lib/authz";
import { firstIssueMessage } from "@/lib/form-errors";
import { createTeilnehmer, getTeilnehmer } from "@/db/teilnehmer";
import { getCatalogItem } from "@/db/catalog";
import { teilnehmerSchema } from "@/app/verwaltung/teilnehmer/schema";
import { KASSEN, veranstaltungStatus, type Kasse } from "@/db/schema";
import {
  addZeile,
  createVeranstaltung,
  ensureThekeForKasse,
  getVeranstaltung,
  getZeile,
  removeZeile,
  setStatus,
} from "@/db/veranstaltung";
import { adjustMenge } from "@/db/verzehr";
import type { VerzehrActionState } from "@/app/_verzehr/types";
import { veranstaltungSchema, verzehrAdjustSchema } from "./schema";

const LIST_PATH = "/veranstaltung";
const detailPath = (id: string) => `${LIST_PATH}/${id}`;
const verzehrPath = (id: string) => `${detailPath(id)}/verzehr`;

const NOT_FOUND = "Veranstaltung nicht gefunden.";
const NOT_OFFEN = "Die Veranstaltung ist abgeschlossen und schreibgeschützt.";
const DUPLICATE_ZEILE = "Dieser Teilnehmer ist bereits erfasst.";
const ZEILE_NOT_FOUND = "Teilnehmerzeile nicht gefunden.";
const ITEM_NOT_FOUND = "Artikel nicht gefunden.";

export type VeranstaltungFormState = { ok?: boolean; error?: string };

// Postgres unique_violation (SQLSTATE 23505) – unterscheidet den Duplikat-Fall von einem echten Fehler.
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
  await requireRole("veranstalter");
  const parsed = veranstaltungSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };

  await createVeranstaltung(parsed.data);
  revalidatePath(LIST_PATH);
  return { ok: true };
}

// Anzeigename-Snapshot wird serverseitig aus den Stammdaten geholt (nicht vom Client),
// damit die Zeile den autoritativen Namen konserviert.
export async function addZeileAction(
  _prevState: VeranstaltungFormState | undefined,
  formData: FormData,
): Promise<VeranstaltungFormState> {
  await requireRole("veranstalter");
  const veranstaltungId = String(formData.get("veranstaltungId") ?? "");
  const teilnehmerId = String(formData.get("teilnehmerId") ?? "");
  if (!veranstaltungId || !teilnehmerId) return { error: "Teilnehmer und Veranstaltung nötig." };

  const ziel = await getVeranstaltung(veranstaltungId);
  if (!ziel) return { error: NOT_FOUND };
  if (ziel.status !== "offen") return { error: NOT_OFFEN };

  // getTeilnehmer selektiert unabhängig von `active` – hier explizit prüfen, damit ein
  // manipulierter Request keinen soft-gelöschten Teilnehmer erfassen kann (ADR-022).
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

// Walk-in durch den Veranstalter (ADR-022): der Walk-in bleibt beim Veranstalter, nicht beim Gast.
export async function createWalkInAction(
  _prevState: VeranstaltungFormState | undefined,
  formData: FormData,
): Promise<VeranstaltungFormState> {
  await requireRole("veranstalter");
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

// Noch keine erfassten Positionen (F5/ADR-023 D7) – das Entfernen ist bedingungslos.
export async function removeZeileAction(formData: FormData): Promise<void> {
  await requireRole("veranstalter");
  const veranstaltungId = String(formData.get("veranstaltungId") ?? "");
  const zeileId = String(formData.get("zeileId") ?? "");
  if (!veranstaltungId || !zeileId) return;

  const ziel = await getVeranstaltung(veranstaltungId);
  if (!ziel || ziel.status !== "offen") return;

  await removeZeile(zeileId, veranstaltungId);
  revalidatePath(detailPath(veranstaltungId));
}

// Die stehende Theke schließt nie (ADR-023 D4) – ein Abschluss für typ='theke' wird abgelehnt.
export async function setStatusAction(formData: FormData): Promise<void> {
  await requireRole("veranstalter");
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

// Erfasst einen Strich (Delta ±1) auf einer (Zeile, Katalogartikel)-Position (F5, ADR-025 D6).
// `veranstaltungId` ist ein serverseitig gebundenes Argument (route-neutral, ADR-025 D5) – der
// Client liefert es nicht. Fail-closed in der ADR-025-D6-Reihenfolge; jeder Guard hat einen
// eigenen Test (Codify #51). Gibt die autoritative neue Menge zurück (ADR-025 D3): schlägt die
// Action fehl, bleibt der alte, server-gerenderte Wert stehen und der Fehler wird sichtbar (FS3).
export async function adjustVerzehrAction(
  veranstaltungId: string,
  _prevState: VerzehrActionState | undefined,
  formData: FormData,
): Promise<VerzehrActionState> {
  await requireRole("veranstalter");

  const parsed = verzehrAdjustSchema.safeParse({
    zeileId: formData.get("zeileId"),
    catalogItemId: formData.get("catalogItemId"),
    delta: formData.get("delta"),
  });
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };
  const { zeileId, catalogItemId, delta } = parsed.data;

  const ziel = await getVeranstaltung(veranstaltungId);
  if (!ziel) return { error: NOT_FOUND };
  if (ziel.status !== "offen") return { error: NOT_OFFEN };

  // IDOR-Bindung (Codify #51): die Zeile muss zu genau dieser Veranstaltung gehören.
  const zeile = await getZeile(zeileId, veranstaltungId);
  if (!zeile) return { error: ZEILE_NOT_FOUND };

  // Soft-Delete-Prüfung nach Laden by id (Codify #51): kein inaktiver Artikel erfassbar.
  const item = await getCatalogItem(catalogItemId);
  if (!item || !item.active) return { error: ITEM_NOT_FOUND };

  const position = await adjustMenge(zeileId, catalogItemId, delta);
  revalidatePath(verzehrPath(veranstaltungId));
  return { ok: true, menge: position?.menge };
}

// Idempotent (ADR-023 D3) – die DB-Idempotenz garantiert der Partial-Unique-Index.
export async function ensureThekeAction(
  _prevState: VeranstaltungFormState | undefined,
  formData: FormData,
): Promise<VeranstaltungFormState> {
  await requireAnyRole(["verwalter", "veranstalter"]);
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
