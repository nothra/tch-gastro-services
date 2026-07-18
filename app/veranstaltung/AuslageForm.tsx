"use client";

import { useActionState, useCallback, useRef } from "react";
import type { AuslageKategorie } from "@/db/schema";
import { AUSLAGE_KATEGORIE_LABEL, AUSLAGE_KATEGORIE_ORDER } from "./labels";
import type { AuslageFormState } from "./actions";

// Erfassungs-/Korrektur-Formular einer Auslage (F6, #53, ADR-028 D4). Client-Komponente, damit
// Fehler/Pending über `useActionState` sichtbar werden. `action` ist die bereits scope-gebundene
// Server-Action (create: `.bind(null, veranstaltungId)`, edit: `.bind(null, veranstaltungId,
// auslageId)`); der Client liefert die IDs nie im Formular (IDOR-Schutz sitzt serverseitig).

const inputClass = "rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900";

export type AuslageFormTeilnehmer = { teilnehmerId: string; anzeigename: string };

// Vorbelegung beim Korrigieren; `betrag` ist der rohe EUR-Eingabewert (centsToEuroInput).
export type AuslageFormInitial = {
  teilnehmerId: string;
  kategorie: AuslageKategorie;
  betrag: string;
  zweck: string;
};

type BoundAuslageAction = (
  prevState: AuslageFormState | undefined,
  formData: FormData,
) => Promise<AuslageFormState>;

export function AuslageForm({
  action,
  teilnehmer,
  submitLabel,
  initial,
  onSuccess,
}: {
  action: BoundAuslageAction;
  teilnehmer: readonly AuslageFormTeilnehmer[];
  submitLabel: string;
  initial?: AuslageFormInitial;
  onSuccess?: () => void;
}) {
  const isEditing = initial !== undefined;
  const formRef = useRef<HTMLFormElement>(null);

  // Erfolg schließt (Korrektur) bzw. leert die Felder (Neuerfassung) – via useCallback-Wrapper,
  // nicht useEffect (Codify #49); die Referenz bleibt stabil. form.reset() leert bei JEDER
  // erfolgreichen Erfassung (nicht nur der ersten wie ein key-basierter Remount) und lässt die
  // Erfolgsmeldung stehen, weil der useActionState-Zustand nicht verworfen wird.
  const actionWithCallback = useCallback<BoundAuslageAction>(
    async (prev, formData) => {
      const result = await action(prev, formData);
      if (result.ok) {
        onSuccess?.();
        if (!isEditing) formRef.current?.reset();
      }
      return result;
    },
    [action, onSuccess, isEditing],
  );
  const [state, formAction, pending] = useActionState(actionWithCallback, undefined);

  if (teilnehmer.length === 0) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Zuerst Teilnehmer zur Veranstaltung hinzufügen, dann sind Auslagen erfassbar.
      </p>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-3 rounded border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <label className="flex flex-col gap-1 text-sm">
        Teilnehmer
        <select
          name="teilnehmerId"
          defaultValue={initial?.teilnehmerId ?? ""}
          required
          className={inputClass}
        >
          <option value="" disabled>
            Bitte wählen …
          </option>
          {teilnehmer.map((t) => (
            <option key={t.teilnehmerId} value={t.teilnehmerId}>
              {t.anzeigename}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Kategorie
        <select
          name="kategorie"
          defaultValue={initial?.kategorie ?? ""}
          required
          className={inputClass}
        >
          <option value="" disabled>
            Bitte wählen …
          </option>
          {AUSLAGE_KATEGORIE_ORDER.map((kategorie) => (
            <option key={kategorie} value={kategorie}>
              {AUSLAGE_KATEGORIE_LABEL[kategorie]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Betrag (EUR)
        <input
          name="betrag"
          type="text"
          inputMode="decimal"
          defaultValue={initial?.betrag ?? ""}
          required
          placeholder="z. B. 12,50"
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Notiz (optional)
        <input
          name="zweck"
          type="text"
          maxLength={200}
          defaultValue={initial?.zweck ?? ""}
          placeholder="z. B. Grillfleisch"
          className={inputClass}
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-cyan-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Speichern …" : submitLabel}
        </button>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.ok && !isEditing && <p className="text-sm text-green-700">Auslage erfasst.</p>}
      </div>
    </form>
  );
}
