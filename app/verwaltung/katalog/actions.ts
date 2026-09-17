"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";
import { firstIssueMessage } from "@/lib/form-errors";
import { STANDARD_CATALOG_ID, createItem, setItemActive, updateItem } from "@/db/catalog";
import { catalogItemSchema } from "./schema";

const CATALOG_PATH = "/verwaltung/katalog";
const DUPLICATE_MESSAGE = "Ein Artikel mit dieser Bezeichnung und Größe existiert bereits.";

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

// Führt eine DB-Operation aus und übersetzt Unique-Violations in eine Nutzermeldung.
// Gibt null zurück wenn erfolgreich, ansonsten den Fehlerzustand.
async function runWithUniqueCheck(fn: () => Promise<unknown>): Promise<CatalogFormState | null> {
  try {
    await fn();
    return null;
  } catch (error) {
    if (isUniqueViolation(error)) return { error: DUPLICATE_MESSAGE };
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
  const result = await runWithUniqueCheck(() => createItem(STANDARD_CATALOG_ID, parsed.data));
  if (result) return result;
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

  const result = await runWithUniqueCheck(() => updateItem(id, STANDARD_CATALOG_ID, parsed.data));
  if (result) return result;
  revalidatePath(CATALOG_PATH);
  return { ok: true };
}

// Deaktivieren/Reaktivieren als direkte Formular-Action (kein Formularzustand nötig).
export async function setCatalogItemActiveAction(formData: FormData): Promise<void> {
  await requireRole("verwalter");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await setItemActive(id, STANDARD_CATALOG_ID, formData.get("active") === "true");
  revalidatePath(CATALOG_PATH);
}
