"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";
import { firstIssueMessage } from "@/lib/form-errors";
import {
  createItem,
  setItemActive,
  updateItem,
  createCatalog,
  renameCatalog,
  setCatalogActive,
  duplicateCatalog,
  getCatalogById,
  type CatalogItemData,
} from "@/db/catalog";
import type { CatalogItem } from "@/db/schema";
import { catalogItemSchema, catalogNameSchema } from "./schema";

const CATALOG_PATH = "/verwaltung/katalog";
const DUPLICATE_MESSAGE = "Ein Artikel mit dieser Bezeichnung und Größe existiert bereits.";
const ITEM_NOT_FOUND = "Artikel nicht gefunden.";
const CATALOG_NOT_FOUND = "Katalog nicht gefunden.";
// Artikel-Actions: der Katalogbezug (`catalogId`-FormData-Feld) fehlt. Eigene Konstante statt
// Wiederverwendung von `CATALOG_ID_MISSING_MESSAGE` (unten) – beide teilen sich zufällig denselben
// Wortlaut, meinen aber semantisch Verschiedenes (Artikel ohne Katalogbezug vs. Katalog ohne
// eigene Id) und könnten künftig unabhängig voneinander divergieren (Nitpick #345 Runde 2/3).
const ITEM_CATALOG_REFERENCE_MISSING_MESSAGE = "Kein Katalog angegeben.";

export type CatalogFormState = { ok?: boolean; error?: string };

// node-postgres und der Neon-HTTP-Treiber legen den Postgres-SQLSTATE-Code eines DB-Fehlers auf
// `.code` – gemeinsame Grundlage für die beiden Fehlerklassen-Prädikate unten (Review-Finding
// #353 Runde 1, Nitpick).
function hasSqlState(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === code
  );
}

// unique_violation: so wird der Duplikat-Fall (seit ADR-050 D2 UNIQUE(catalog_id, name, size))
// von einem echten Fehler unterschieden und in eine Nutzer-Meldung übersetzt (spec-49,
// unveränderter Wortlaut: spec-59 FS3).
function isUniqueViolation(error: unknown): boolean {
  return hasSqlState(error, "23505");
}

// foreign_key_violation. Nur an einer Stelle erreichbar: `createCatalogItemAction` liest
// `catalogId` aus einem clientseitigen FormData-Feld (#345) statt ihn serverseitig fix zu
// setzen; ein nicht (mehr) existierender Katalog löst beim INSERT diesen SQLSTATE aus statt
// eine Zeile zu liefern. Alle anderen Actions binden `catalogId` bereits ins WHERE (Parent-Key)
// und melden dort stattdessen `undefined`/„nicht gefunden" – für sie ist dieser Fehlerpfad
// unerreichbar (Security-Review #345, Issue #353).
function isForeignKeyViolation(error: unknown): boolean {
  return hasSqlState(error, "23503");
}

// Führt eine DB-Operation aus und übersetzt Unique-Violations in eine Nutzermeldung. Das
// Ergebnis wird durchgereicht statt verworfen: die guarded UPDATEs melden einen No-Match über
// ihren Rückgabewert, nicht über eine Exception (Kern-Kurzregel 1).
// Invariante: `ok: false` bedeutet IMMER eine echte Unique-Violation (23505) – jeder andere
// Fehler wird weitergeworfen, nie hier abgefangen. Aufrufstellen dürfen die Fehlermeldung im
// `ok: false`-Zweig deshalb gefahrlos auf eine katalogspezifische Duplikat-Meldung überschreiben;
// andere Fehlerfälle (z. B. „Katalog nicht gefunden") gehören NICHT in diesen Wrapper, sondern in
// eigene Guard-Checks davor (Review-Finding #345 Runde 1, Kritisch 1/2).
type UniqueCheckOutcome<T> = { ok: true; value: T } | { ok: false; state: CatalogFormState };

async function runWithUniqueCheck<T>(fn: () => Promise<T>): Promise<UniqueCheckOutcome<T>> {
  try {
    return { ok: true, value: await fn() };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, state: { error: DUPLICATE_MESSAGE } };
    throw error;
  }
}

// Eng gefasster zweiter Wrapper nur um den `createItem`-INSERT (Review-Finding #353 Runde 1,
// Wichtig): fängt ausschließlich die FK-Violation dieses einen Aufrufs ab, nicht auch
// nachfolgende, unabhängige Schritte wie `revalidatePath` – ein dort auftretender Fehler soll
// nie fälschlich als „Katalog nicht gefunden" gemeldet werden.
async function createItemOrCatalogNotFound(
  catalogId: string,
  data: CatalogItemData,
): Promise<UniqueCheckOutcome<CatalogItem>> {
  try {
    return await runWithUniqueCheck(() => createItem(catalogId, data));
  } catch (error) {
    if (isForeignKeyViolation(error)) return { ok: false, state: { error: CATALOG_NOT_FOUND } };
    throw error;
  }
}

export async function createCatalogItemAction(
  _prevState: CatalogFormState | undefined,
  formData: FormData,
): Promise<CatalogFormState> {
  await requireRole("verwalter");
  const catalogId = String(formData.get("catalogId") ?? "");
  if (!catalogId) return { error: ITEM_CATALOG_REFERENCE_MISSING_MESSAGE };

  // FormData-Einträge filtern: catalogId soll nicht in das Zod-Schema gehen
  const itemData = Object.fromEntries(
    Array.from(formData.entries()).filter(([key]) => key !== "catalogId"),
  );
  const parsed = catalogItemSchema.safeParse(itemData);
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };

  // Der Katalogbezug wird serverseitig gesetzt, aber nicht aus einem Default – er kommt
  // aus FormData ([id]/page.tsx setzt ihn). ADR-050 D4 verbietet einen Default-Parameter
  // damit der Compiler in #346 jede Aufrufstelle meldet; per FormData ist der Bezug
  // Nutzer-authentisch und keine Standardannahme.
  // `createItem` liefert immer den angelegten Artikel (kein `| undefined`) – ein No-Match-Zweig
  // wäre hier totes Verhalten (Clean-Code: keine Fallbacks für typseitig ausgeschlossene Fälle).
  const outcome = await createItemOrCatalogNotFound(catalogId, parsed.data);
  if (!outcome.ok) return outcome.state;
  revalidatePath(`/verwaltung/katalog/${catalogId}`);
  return { ok: true };
}

export async function updateCatalogItemAction(
  _prevState: CatalogFormState | undefined,
  formData: FormData,
): Promise<CatalogFormState> {
  await requireRole("verwalter");
  const id = String(formData.get("id") ?? "");
  const catalogId = String(formData.get("catalogId") ?? "");
  if (!id) return { error: "Kein Artikel angegeben." };
  if (!catalogId) return { error: ITEM_CATALOG_REFERENCE_MISSING_MESSAGE };

  // FormData-Einträge filtern
  const itemData = Object.fromEntries(
    Array.from(formData.entries()).filter(([key]) => !["id", "catalogId"].includes(key)),
  );
  const parsed = catalogItemSchema.safeParse(itemData);
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };

  const outcome = await runWithUniqueCheck(() => updateItem(id, catalogId, parsed.data));
  if (!outcome.ok) return outcome.state;
  // Guarded UPDATE: `undefined` heißt „keine Zeile getroffen" (Kern-Kurzregel 1, Lesson #55) –
  // `id` und `catalogId` kommen aus FormData, sind also client-gesteuert. Ohne diesen Zweig
  // meldete die Action Erfolg für einen Schreibvorgang, der nicht stattgefunden hat.
  if (!outcome.value) return { error: ITEM_NOT_FOUND };
  revalidatePath(`/verwaltung/katalog/${catalogId}`);
  return { ok: true };
}

// Deaktivieren/Reaktivieren als direkte Formular-Action (kein Formularzustand nötig).
// `setItemActive` liefert ebenfalls `undefined`, wenn keine Zeile getroffen wurde – diese Action
// hat aber keinen Meldungskanal (Rückgabetyp `void`, kein `useActionState`). Der Fall bleibt
// daher bewusst stumm; einen sichtbaren Fehlerweg mit #345 folgt mit der Katalog-verwaltung.
export async function setCatalogItemActiveAction(formData: FormData): Promise<void> {
  await requireRole("verwalter");
  const id = String(formData.get("id") ?? "");
  const catalogId = String(formData.get("catalogId") ?? "");
  if (!id || !catalogId) return;
  await setItemActive(id, catalogId, formData.get("active") === "true");
  revalidatePath(`/verwaltung/katalog/${catalogId}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Katalog-Management (#345): Preislisten-Verwaltung
// ─────────────────────────────────────────────────────────────────────────────

const CATALOG_MANAGEMENT_DUPLICATE_MESSAGE = "Ein Katalog mit diesem Namen existiert bereits.";
const SOURCE_CATALOG_INACTIVE = "Der Quell-Katalog ist nicht aktiv.";
// Katalog-Actions: der Katalog selbst hat keine `id` in FormData (rename/setActive beziehen sich
// auf den zu ändernden Katalog, nicht auf einen fremden Bezug wie oben bei den Artikel-Actions).
const CATALOG_ID_MISSING_MESSAGE = "Kein Katalog angegeben.";

export async function createCatalogAction(
  _prevState: CatalogFormState | undefined,
  formData: FormData,
): Promise<CatalogFormState> {
  await requireRole("verwalter");
  const parsed = catalogNameSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };

  const outcome = await runWithUniqueCheck(() => createCatalog(parsed.data.name));
  if (!outcome.ok) return { ...outcome.state, error: CATALOG_MANAGEMENT_DUPLICATE_MESSAGE };
  revalidatePath(CATALOG_PATH);
  return { ok: true };
}

export async function renameCatalogAction(
  _prevState: CatalogFormState | undefined,
  formData: FormData,
): Promise<CatalogFormState> {
  await requireRole("verwalter");
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: CATALOG_ID_MISSING_MESSAGE };

  const parsed = catalogNameSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };

  const outcome = await runWithUniqueCheck(() => renameCatalog(id, parsed.data.name));
  if (!outcome.ok) return { ...outcome.state, error: CATALOG_MANAGEMENT_DUPLICATE_MESSAGE };
  if (!outcome.value) return { error: CATALOG_NOT_FOUND };
  revalidatePath(CATALOG_PATH);
  return { ok: true };
}

export async function setCatalogActiveAction(
  _prevState: CatalogFormState | undefined,
  formData: FormData,
): Promise<CatalogFormState> {
  await requireRole("verwalter");
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";

  if (!id) return { error: CATALOG_ID_MISSING_MESSAGE };

  const result = await setCatalogActive(id, active);
  if (!result) return { error: CATALOG_NOT_FOUND };
  revalidatePath(CATALOG_PATH);
  return { ok: true };
}

export async function duplicateCatalogAction(
  _prevState: CatalogFormState | undefined,
  formData: FormData,
): Promise<CatalogFormState> {
  await requireRole("verwalter");
  const sourceId = String(formData.get("sourceId") ?? "");
  if (!sourceId) return { error: "Kein Quell-Katalog angegeben." };

  const parsed = catalogNameSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };

  // Serverseitige Durchsetzung: nur aktive Kataloge sind Duplizier-Quellen (AK5, Defense in
  // Depth). Diese Prüfung steht bewusst AUSSERHALB von `runWithUniqueCheck` (Review-Finding #345
  // Runde 1, Kritisch 1): der Wrapper fängt nur Unique-Violations, alles andere wirft er weiter –
  // ein hier geworfener `CATALOG_NOT_FOUND`/`SOURCE_CATALOG_INACTIVE`-Fehler würde also
  // unkontrolliert bis zum Client durchschlagen statt einer Nutzermeldung.
  const source = await getCatalogById(sourceId);
  if (!source) return { error: CATALOG_NOT_FOUND };
  if (!source.active) return { error: SOURCE_CATALOG_INACTIVE };

  // Ab hier ist die einzig mögliche Fehlerquelle eine Unique-Violation auf den neuen Namen
  // (Transaktionsabbruch in `duplicateCatalog`) – exakt der Fall, für den `runWithUniqueCheck`
  // gebaut ist, analog zu `createCatalogAction`/`renameCatalogAction`.
  const outcome = await runWithUniqueCheck(() => duplicateCatalog(sourceId, parsed.data.name));
  if (!outcome.ok) return { ...outcome.state, error: CATALOG_MANAGEMENT_DUPLICATE_MESSAGE };
  revalidatePath(CATALOG_PATH);
  return { ok: true };
}
