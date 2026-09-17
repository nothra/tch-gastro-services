"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";
import { firstIssueMessage } from "@/lib/form-errors";
import { STANDARD_CATALOG_ID, createItem, setItemActive, updateItem } from "@/db/catalog";
import { catalogItemSchema } from "./schema";

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
  const parsed = catalogItemSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };

  // Der Katalogbezug wird serverseitig gesetzt und nie aus `FormData` gelesen (ADR-050 D4) –
  // ein Client kann keinen fremden Katalog als Schreibziel angeben.
  // `createItem` liefert immer den angelegten Artikel (kein `| undefined`) – ein No-Match-Zweig
  // wäre hier totes Verhalten (Clean-Code: keine Fallbacks für typseitig ausgeschlossene Fälle).
  const outcome = await runWithUniqueCheck(() => createItem(STANDARD_CATALOG_ID, parsed.data));
  if (!outcome.ok) return outcome.state;
  revalidatePath(CATALOG_PATH);
  return { ok: true };
}

export async function updateCatalogItemAction(
  _prevState: CatalogFormState | undefined,
  formData: FormData,
): Promise<CatalogFormState> {
  await requireRole("verwalter");
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Kein Artikel angegeben." };

  const parsed = catalogItemSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };

  const outcome = await runWithUniqueCheck(() => updateItem(id, STANDARD_CATALOG_ID, parsed.data));
  if (!outcome.ok) return outcome.state;
  // Guarded UPDATE: `undefined` heißt „keine Zeile getroffen" (Kern-Kurzregel 1, Lesson #55) –
  // `id` kommt aus `FormData`, ist also client-gesteuert. Ohne diesen Zweig meldete die Action
  // Erfolg für einen Schreibvorgang, der nicht stattgefunden hat.
  if (!outcome.value) return { error: ITEM_NOT_FOUND };
  revalidatePath(CATALOG_PATH);
  return { ok: true };
}

// Deaktivieren/Reaktivieren als direkte Formular-Action (kein Formularzustand nötig).
// `setItemActive` liefert ebenfalls `undefined`, wenn keine Zeile getroffen wurde – diese Action
// hat aber keinen Meldungskanal (Rückgabetyp `void`, kein `useActionState`). Der Fall bleibt
// daher bewusst stumm; einen sichtbaren Fehlerweg bekommt die Katalogpflege mit #345.
export async function setCatalogItemActiveAction(formData: FormData): Promise<void> {
  await requireRole("verwalter");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await setItemActive(id, STANDARD_CATALOG_ID, formData.get("active") === "true");
  revalidatePath(CATALOG_PATH);
}
