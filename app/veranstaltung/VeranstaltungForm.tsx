"use client";

import { useActionState } from "react";
import { KASSEN } from "@/db/schema";
import { createVeranstaltungAction } from "./actions";
import { KASSE_LABEL } from "./labels";

const inputClass = "rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900";

// Anlege-Formular für eine datierte Veranstaltung. Bei Erfolg leert `key` die Felder für
// die nächste Anlage; bei Fehlern bleibt die Eingabe stehen.
export function VeranstaltungForm() {
  const [state, formAction, pending] = useActionState(createVeranstaltungAction, undefined);
  return (
    <form
      key={state?.ok ? "reset" : "edit"}
      action={formAction}
      className="flex flex-col gap-3 rounded border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <h2 className="font-semibold">Veranstaltung anlegen</h2>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Bezeichnung
          <input name="bezeichnung" required className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Datum
          <input type="date" name="datum" required className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Kasse
          <select name="kasse" defaultValue={KASSEN[0]} className={inputClass}>
            {KASSEN.map((kasse) => (
              <option key={kasse} value={kasse}>
                {KASSE_LABEL[kasse]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-cyan-700 px-4 py-2 font-medium text-white disabled:opacity-60"
        >
          {pending ? "Speichern …" : "Anlegen"}
        </button>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.ok && <p className="text-sm text-green-700">Veranstaltung angelegt.</p>}
      </div>
    </form>
  );
}
