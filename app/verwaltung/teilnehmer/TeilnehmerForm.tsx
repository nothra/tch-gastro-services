"use client";

import { useActionState } from "react";
import { createTeilnehmerAction } from "./actions";
import { TeilnehmerFields } from "./TeilnehmerFields";

// Anlege-Formular. Bei Erfolg leert `key` das Formular (frische Felder für den nächsten
// Teilnehmer); bei Fehlern und bei der überstimmbaren Duplikat-Warnung bleibt die Eingabe
// stehen. Der Duplikat-Fall setzt das versteckte confirmDuplicate-Feld auf "true", sodass
// der Zweitversuch die Warnung überstimmt und anlegt (ADR-022).
export function TeilnehmerForm() {
  const [state, formAction, pending] = useActionState(createTeilnehmerAction, undefined);
  return (
    <form
      key={state?.ok ? "reset" : "edit"}
      action={formAction}
      className="flex flex-col gap-3 rounded border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <h2 className="font-semibold">Teilnehmer anlegen</h2>
      <TeilnehmerFields />
      <input type="hidden" name="confirmDuplicate" value={state?.needsConfirm ? "true" : "false"} />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-cyan-700 px-4 py-2 font-medium text-white disabled:opacity-60"
        >
          {pending ? "Speichern …" : state?.needsConfirm ? "Trotzdem anlegen" : "Anlegen"}
        </button>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.needsConfirm && <p className="text-sm text-amber-600">{state.warning}</p>}
        {state?.ok && <p className="text-sm text-green-700">Teilnehmer angelegt.</p>}
      </div>
    </form>
  );
}
