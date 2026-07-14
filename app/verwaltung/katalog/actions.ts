"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";
import { createItem, setItemActive, updateItem } from "@/db/catalog";
import { catalogItemSchema } from "./schema";

const CATALOG_PATH = "/verwaltung/katalog";
const DUPLICATE_MESSAGE =
  "Ein Artikel mit dieser Bezeichnung und Größe existiert bereits.";

export type CatalogFormState = { ok?: boolean; error?: string };

// Postgres unique_violation. node-postgres und der Neon-HTTP-Treiber legen den
// SQLSTATE-Code auf `.code` – so wird der Duplikat-Fall (UNIQUE(name, size)) von einem
// echten Fehler unterschieden und in eine Nutzer-Meldung übersetzt (spec-49).
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

function firstIssueMessage(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Ungültige Eingabe.";
}

// Führt eine DB-Operation aus und übersetzt Unique-Violations in eine Nutzermeldung.
// Gibt null zurück wenn erfolgreich, ansonsten den Fehlerzustand.
async function runWithUniqueCheck(
  fn: () => Promise<unknown>,
): Promise<CatalogFormState | null> {
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

  const result = await runWithUniqueCheck(() => createItem(parsed.data));
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

  const result = await runWithUniqueCheck(() => updateItem(id, parsed.data));
  if (result) return result;
  revalidatePath(CATALOG_PATH);
  return { ok: true };
}

// Deaktivieren/Reaktivieren als direkte Formular-Action (kein Formularzustand nötig).
export async function setCatalogItemActiveAction(formData: FormData): Promise<void> {
  await requireRole("verwalter");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await setItemActive(id, formData.get("active") === "true");
  revalidatePath(CATALOG_PATH);
}
