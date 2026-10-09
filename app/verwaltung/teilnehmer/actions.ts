"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";
import { firstIssueMessage } from "@/lib/form-errors";
import {
  createTeilnehmer,
  findActiveByName,
  setTeilnehmerActive,
  updateTeilnehmer,
} from "@/db/teilnehmer";
import { teilnehmerSchema } from "./schema";

const TEILNEHMER_PATH = "/verwaltung/teilnehmer";
const DUPLICATE_WARNING =
  "Ein aktiver Teilnehmer mit diesem Namen existiert bereits. Zum Anlegen erneut bestätigen.";
const NO_TEILNEHMER = "Kein Teilnehmer angegeben.";
const TEILNEHMER_NOT_FOUND = "Teilnehmer nicht gefunden.";

// needsConfirm/warning tragen die nicht-blockierende Duplikat-Warnung (ADR-022): kein
// DB-Unique, stattdessen ein überstimmbarer Hinweis an der Server-Grenze.
export type TeilnehmerFormState = {
  ok?: boolean;
  error?: string;
  needsConfirm?: boolean;
  warning?: string;
};

export async function createTeilnehmerAction(
  _prevState: TeilnehmerFormState | undefined,
  formData: FormData,
): Promise<TeilnehmerFormState> {
  await requireRole("verwalter");
  const parsed = teilnehmerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };

  // Duplikat-Warnung ist überstimmbar: erst ohne confirmDuplicate prüfen, bei Treffer
  // ohne zu speichern zurückmelden; erst der bestätigte Zweitversuch legt an (ADR-022).
  const confirmDuplicate = formData.get("confirmDuplicate") === "true";
  if (!confirmDuplicate && (await findActiveByName(parsed.data.name))) {
    return { needsConfirm: true, warning: DUPLICATE_WARNING };
  }

  await createTeilnehmer(parsed.data);
  revalidatePath(TEILNEHMER_PATH);
  return { ok: true };
}

export async function updateTeilnehmerAction(
  _prevState: TeilnehmerFormState | undefined,
  formData: FormData,
): Promise<TeilnehmerFormState> {
  await requireRole("verwalter");
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: NO_TEILNEHMER };

  const parsed = teilnehmerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };

  await updateTeilnehmer(id, parsed.data);
  revalidatePath(TEILNEHMER_PATH);
  return { ok: true };
}

// Deaktivieren/Aktivieren. Meldet einen Zustand statt `void`, damit der Client den Erfolg als
// Toast zeigen und eine Ablehnung sichtbar machen kann (spec-372 AK12, ADR-058 D2).
export async function setTeilnehmerActiveAction(
  _prevState: TeilnehmerFormState | undefined,
  formData: FormData,
): Promise<TeilnehmerFormState> {
  await requireRole("verwalter");
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: NO_TEILNEHMER };

  const updated = await setTeilnehmerActive(id, formData.get("active") === "true");
  if (!updated) return { error: TEILNEHMER_NOT_FOUND };

  revalidatePath(TEILNEHMER_PATH);
  return { ok: true };
}
