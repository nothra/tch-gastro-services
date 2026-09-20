"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";
import { firstIssueMessage } from "@/lib/form-errors";
import { db } from "@/db/index";
import { catalog } from "@/db/schema";
import {
  createItem,
  setItemActive,
  updateItem,
  createCatalog,
  renameCatalog,
  setCatalogActive,
  duplicateCatalog,
} from "@/db/catalog";
import { catalogItemSchema, catalogNameSchema } from "./schema";

const CATALOG_PATH = "/verwaltung/katalog";
const DUPLICATE_MESSAGE = "Ein Artikel mit dieser Bezeichnung und Größe existiert bereits.";
const ITEM_NOT_FOUND = "Artikel nicht gefunden.";

export type CatalogFormState = { ok?: boolean; error?: string };

// Postgres unique_violation. node-postgres und der Neon-HTTP-Treiber legen den
// SQLSTATE-Code auf `.code` – so wird der Duplikat-Fall (seit ADR-050 D2
// UNIQUE(catalog_id, name, size)) von einem echten Fehler unterschieden und in eine
// Nutzer-Meldung übersetzt (spec-49, unveränderter Wortlaut: spec-59 FS3).
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

// Führt eine DB-Operation aus und übersetzt Unique-Violations in eine Nutzermeldung. Das
// Ergebnis wird durchgereicht statt verworfen: die guarded UPDATEs melden einen No-Match über
// ihren Rückgabewert, nicht über eine Exception (Kern-Kurzregel 1).
type UniqueCheckOutcome<T> = { ok: true; value: T } | { ok: false; state: CatalogFormState };

async function runWithUniqueCheck<T>(fn: () => Promise<T>): Promise<UniqueCheckOutcome<T>> {
  try {
    return { ok: true, value: await fn() };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, state: { error: DUPLICATE_MESSAGE } };
    throw error;
  }
}

export async function createCatalogItemAction(
  _prevState: CatalogFormState | undefined,
  formData: FormData,
): Promise<CatalogFormState> {
  await requireRole("verwalter");
  const catalogId = String(formData.get("catalogId") ?? "");
  if (!catalogId) return { error: "Kein Katalog angegeben." };

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
  const outcome = await runWithUniqueCheck(() => createItem(catalogId, parsed.data));
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
  if (!catalogId) return { error: "Kein Katalog angegeben." };

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
const CATALOG_NOT_FOUND = "Katalog nicht gefunden.";
const SOURCE_CATALOG_INACTIVE = "Der Quell-Katalog ist nicht aktiv.";

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
  if (!id) return { error: "Kein Katalog angegeben." };

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

  if (!id) return { error: "Kein Katalog angegeben." };

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

  // Serverseitige Durchsetzung: nur aktive Kataloge sind Duplizier-Quellen (AK5, Defense in Depth)
  const activeOnly = await runWithUniqueCheck(async () => {
    // Quelle muss existieren und aktiv sein
    const source = await db.select().from(catalog).where(eq(catalog.id, sourceId));
    if (source.length === 0) throw new Error(CATALOG_NOT_FOUND);
    if (!source[0].active) throw new Error(SOURCE_CATALOG_INACTIVE);

    return duplicateCatalog(sourceId, parsed.data.name);
  });

  if (!activeOnly.ok) return activeOnly.state;
  if (!activeOnly.value) return { error: CATALOG_NOT_FOUND };
  revalidatePath(CATALOG_PATH);
  return { ok: true };
}
