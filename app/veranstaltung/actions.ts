"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole, requireRole } from "@/lib/authz";
import { firstIssueMessage } from "@/lib/form-errors";
import { createTeilnehmer, getTeilnehmer } from "@/db/teilnehmer";
import { getCatalogItem } from "@/db/catalog";
import { teilnehmerSchema } from "@/app/verwaltung/teilnehmer/schema";
import { KASSEN, veranstaltungStatus, type Kasse } from "@/db/schema";
import {
  abschliessenVeranstaltung,
  addZeile,
  createVeranstaltung,
  ensureThekeForKasse,
  getVeranstaltung,
  getZeile,
  getZeileByTeilnehmer,
  listZeilen,
  removeZeile,
  setErhalten,
  wiedereroeffnenVeranstaltung,
} from "@/db/veranstaltung";
import { adjustMenge, getPosition, listPositionen } from "@/db/verzehr";
import { createAuslage, removeAuslage, setAuslageStatus, updateAuslage } from "@/db/auslage";
import type { VerzehrActionState } from "@/app/_verzehr/types";
import { kassierTagessummen, kassierZeilen } from "./kassierSummen";
import {
  auslageSchema,
  auslageStatusSchema,
  kassiereSchema,
  veranstaltungSchema,
  verzehrAdjustSchema,
} from "./schema";

const LIST_PATH = "/veranstaltung";
const detailPath = (id: string) => `${LIST_PATH}/${id}`;
const verzehrPath = (id: string) => `${detailPath(id)}/verzehr`;
const auslagenPath = (id: string) => `${detailPath(id)}/auslagen`;
const kassierenPath = (id: string) => `${detailPath(id)}/kassieren`;

const NOT_FOUND = "Veranstaltung nicht gefunden.";
const NOT_OFFEN = "Die Veranstaltung ist abgeschlossen und schreibgeschützt.";
const DUPLICATE_ZEILE = "Dieser Teilnehmer ist bereits erfasst.";
const ZEILE_NOT_FOUND = "Teilnehmerzeile nicht gefunden.";
const ITEM_NOT_FOUND = "Artikel nicht gefunden.";
const TEILNEHMER_NOT_IN_VERANSTALTUNG = "Teilnehmer gehört nicht zu dieser Veranstaltung.";
const TEILNEHMER_INACTIVE = "Teilnehmer nicht gefunden.";
const AUSLAGE_NOT_FOUND = "Auslage nicht gefunden.";

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

const THEKE_NICHT_ABSCHLIESSBAR = "Die Theke wird nicht abgeschlossen.";
const BEREITS_ABGESCHLOSSEN = "Die Veranstaltung ist bereits abgeschlossen.";
const BEREITS_OFFEN = "Die Veranstaltung ist bereits offen.";
const INVALID_STATUS = "Ungültiger Status.";

// Zählt die noch offenen Zeilen (`Verzehr-Gesamt > Erhalten`) einer Veranstaltung über die
// SINGLE-SOURCE-Kassierlogik (ADR-033 D5) – dieselbe Berechnung wie die Anzeige. Speist das
// fail-closed Abschluss-Gate (ADR-033 D3).
async function offeneZeilenCount(veranstaltungId: string): Promise<number> {
  const [zeilen, positionen] = await Promise.all([
    listZeilen(veranstaltungId),
    listPositionen(veranstaltungId),
  ]);
  return kassierTagessummen(kassierZeilen(zeilen, positionen)).offeneZeilen;
}

// Schließt eine Veranstaltung ab bzw. öffnet sie wieder (F8, #55, ADR-033 D3/D6). Erweitert die
// frühere fire-and-forget-Variante auf einen Rückgabe-State (`useActionState`, Codify #49), damit
// die Abschluss-Ablehnung „N Zeile(n) offen" sichtbar wird. Abschluss ist fail-closed: die Theke
// schließt nie (ADR-023 D4), und solange eine Zeile offen ist, wird abgelehnt. Abschluss/
// Wiederöffnung laufen transaktional (Preis-Snapshot + Status + Protokoll) in der Data-Layer.
export async function setStatusAction(
  _prevState: VeranstaltungFormState | undefined,
  formData: FormData,
): Promise<VeranstaltungFormState> {
  const session = await requireRole("veranstalter");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id) return { error: "Keine Veranstaltung angegeben." };
  if (
    !veranstaltungStatus.enumValues.includes(
      status as (typeof veranstaltungStatus.enumValues)[number],
    )
  ) {
    return { error: INVALID_STATUS };
  }

  const ziel = await getVeranstaltung(id);
  if (!ziel) return { error: NOT_FOUND };

  // Akteur-Snapshot für das Protokoll (ADR-033 D4/D7): id aus der Session, Name display-ready.
  const akteur = { userId: session.user.id || null, name: session.user.name ?? null };

  // Der guarded UPDATE der Data-Layer (`WHERE status = …`, ADR-033 D3) liefert `undefined`, wenn
  // eine nebenläufige Anfrage den Wechsel schon vollzogen hat (TOCTOU nach diesem Vor-Check).
  // Diesen No-op als „bereits …"-Fehler ausweisen, statt fälschlich `{ ok: true }` zu melden.
  if (status === "abgeschlossen") {
    if (ziel.typ === "theke") return { error: THEKE_NICHT_ABSCHLIESSBAR };
    if (ziel.status !== "offen") return { error: BEREITS_ABGESCHLOSSEN };
    const offene = await offeneZeilenCount(id);
    if (offene > 0) {
      return { error: `Abschluss nicht möglich: ${offene} Zeile(n) noch offen.` };
    }
    const closed = await abschliessenVeranstaltung(id, akteur);
    if (!closed) return { error: BEREITS_ABGESCHLOSSEN };
  } else {
    if (ziel.status !== "abgeschlossen") return { error: BEREITS_OFFEN };
    const reopened = await wiedereroeffnenVeranstaltung(id, akteur);
    if (!reopened) return { error: BEREITS_OFFEN };
  }

  revalidatePath(detailPath(id));
  revalidatePath(kassierenPath(id));
  revalidatePath(LIST_PATH);
  return { ok: true };
}

// Erfasst den bar kassierten Betrag (`Erhalten`) einer Zeile (F8, #55, ADR-033 D6). `veranstaltungId`
// ist serverseitig gebunden (`.bind(null, id)`, analog `adjustVerzehrAction`). Fail-closed:
// Veranstalter-Rolle, offene Veranstaltung, IDOR-Bindung der Zeile (Codify #51). Der Zeilenstatus
// (bezahlt/offen) und die Spende werden NICHT gespeichert – sie sind abgeleitet (ADR-033 D1).
export async function kassiereZeileAction(
  veranstaltungId: string,
  _prevState: VeranstaltungFormState | undefined,
  formData: FormData,
): Promise<VeranstaltungFormState> {
  await requireRole("veranstalter");

  const zeileId = String(formData.get("zeileId") ?? "");
  if (!zeileId) return { error: ZEILE_NOT_FOUND };

  const parsed = kassiereSchema.safeParse({ erhalten: formData.get("erhalten") ?? "" });
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };

  const ziel = await getVeranstaltung(veranstaltungId);
  if (!ziel) return { error: NOT_FOUND };
  if (ziel.status !== "offen") return { error: NOT_OFFEN };

  // IDOR-Bindung (Codify #51): die Zeile muss zu genau dieser Veranstaltung gehören.
  const zeile = await getZeile(zeileId, veranstaltungId);
  if (!zeile) return { error: ZEILE_NOT_FOUND };

  await setErhalten(zeileId, veranstaltungId, parsed.data.erhalten);
  revalidatePath(kassierenPath(veranstaltungId));
  return { ok: true };
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

  // Soft-Delete-Prüfung nach Laden by id (Codify #51, gelockert durch ADR-026 D2): ein
  // inaktiver Artikel ist nur anpassbar, wenn auf dieser Zeile bereits eine Position dafür
  // existiert (Korrektur eines bereits erfassten Verzehrs) – Neu-Erfassung bleibt blockiert.
  const item = await getCatalogItem(catalogItemId);
  if (!item) return { error: ITEM_NOT_FOUND };
  if (!item.active) {
    const existing = await getPosition(zeileId, catalogItemId);
    if (!existing) return { error: ITEM_NOT_FOUND };
  }

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

export type AuslageFormState = { ok?: boolean; error?: string };

// Gemeinsame Guard-Sequenz für create/update (ADR-028 D5 Schritt 5): der Teilnehmer muss eine
// Zeile in dieser Veranstaltung haben (IDOR-artige Zuordnungsprüfung) und aktiv sein
// (Soft-Delete-Prüfung nach Laden by id, Codify #51).
async function assertTeilnehmerInVeranstaltung(
  veranstaltungId: string,
  teilnehmerId: string,
): Promise<string | undefined> {
  const zeile = await getZeileByTeilnehmer(veranstaltungId, teilnehmerId);
  if (!zeile) return TEILNEHMER_NOT_IN_VERANSTALTUNG;

  const person = await getTeilnehmer(teilnehmerId);
  if (!person || !person.active) return TEILNEHMER_INACTIVE;

  return undefined;
}

// Erfasst eine Auslage (F6, #53, ADR-028 D5). `veranstaltungId` ist serverseitig gebunden
// (die Seite curryt sie über `.bind(null, id)`, analog `adjustVerzehrAction`) – der Client
// liefert sie nicht.
export async function createAuslageAction(
  veranstaltungId: string,
  _prevState: AuslageFormState | undefined,
  formData: FormData,
): Promise<AuslageFormState> {
  await requireRole("veranstalter");

  const parsed = auslageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };

  const ziel = await getVeranstaltung(veranstaltungId);
  if (!ziel) return { error: NOT_FOUND };
  if (ziel.status !== "offen") return { error: NOT_OFFEN };

  const guardError = await assertTeilnehmerInVeranstaltung(
    veranstaltungId,
    parsed.data.teilnehmerId,
  );
  if (guardError) return { error: guardError };

  await createAuslage({
    veranstaltungId,
    teilnehmerId: parsed.data.teilnehmerId,
    kategorie: parsed.data.kategorie,
    betragCents: parsed.data.betrag,
    zweck: parsed.data.zweck,
  });
  revalidatePath(auslagenPath(veranstaltungId));
  return { ok: true };
}

// Korrigiert eine bestehende Auslage, solange die Veranstaltung offen ist. `veranstaltungId`
// und `auslageId` sind serverseitig gebunden (`.bind(null, veranstaltungId, auslage.id)`); die
// Data-Layer bindet `veranstaltungId` zusätzlich ins WHERE (IDOR-Schutz, Codify #51).
export async function updateAuslageAction(
  veranstaltungId: string,
  auslageId: string,
  _prevState: AuslageFormState | undefined,
  formData: FormData,
): Promise<AuslageFormState> {
  await requireRole("veranstalter");

  const parsed = auslageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };

  const ziel = await getVeranstaltung(veranstaltungId);
  if (!ziel) return { error: NOT_FOUND };
  if (ziel.status !== "offen") return { error: NOT_OFFEN };

  const guardError = await assertTeilnehmerInVeranstaltung(
    veranstaltungId,
    parsed.data.teilnehmerId,
  );
  if (guardError) return { error: guardError };

  const updated = await updateAuslage(auslageId, veranstaltungId, {
    teilnehmerId: parsed.data.teilnehmerId,
    kategorie: parsed.data.kategorie,
    betragCents: parsed.data.betrag,
    zweck: parsed.data.zweck,
  });
  if (!updated) return { error: AUSLAGE_NOT_FOUND };

  revalidatePath(auslagenPath(veranstaltungId));
  return { ok: true };
}

// Bestätigt oder nimmt eine Erstattung zurück (ADR-028 D3 – ein Weg, beide Richtungen).
export async function setAuslageStatusAction(formData: FormData): Promise<void> {
  await requireRole("veranstalter");
  const veranstaltungId = String(formData.get("veranstaltungId") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!veranstaltungId || !id) return;

  const parsed = auslageStatusSchema.safeParse({ status: formData.get("status") });
  if (!parsed.success) return;

  const ziel = await getVeranstaltung(veranstaltungId);
  if (!ziel || ziel.status !== "offen") return;

  await setAuslageStatus(id, veranstaltungId, parsed.data.status);
  revalidatePath(auslagenPath(veranstaltungId));
}

// Hard-Delete (ADR-028 D2, Leaf-Entität ohne Referenzen/Audit-Bedarf) – nur solange die
// Veranstaltung offen ist.
export async function removeAuslageAction(formData: FormData): Promise<void> {
  await requireRole("veranstalter");
  const veranstaltungId = String(formData.get("veranstaltungId") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!veranstaltungId || !id) return;

  const ziel = await getVeranstaltung(veranstaltungId);
  if (!ziel || ziel.status !== "offen") return;

  await removeAuslage(id, veranstaltungId);
  revalidatePath(auslagenPath(veranstaltungId));
}
