"use client";

import { useActionState } from "react";
import type { Teilnehmer } from "@/db/schema";
import { addZeileAction } from "./actions";

const inputClass = "rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900";

// Fügt einen bereits erfassten Teilnehmer (Stammdaten) als Zeile hinzu. `verfuegbar` enthält
// nur aktive Teilnehmer, die noch keine Zeile haben – die Auswahl kann keine Dublette erzeugen.
export function AddTeilnehmerForm({
  veranstaltungId,
  verfuegbar,
}: {
  veranstaltungId: string;
  verfuegbar: Teilnehmer[];
}) {
  const [state, formAction, pending] = useActionState(addZeileAction, undefined);

  if (verfuegbar.length === 0) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Alle aktiven Teilnehmer sind bereits erfasst.
      </p>
    );
  }

  return (
    <form
      key={state?.ok ? "reset" : "edit"}
      action={formAction}
      className="flex flex-wrap items-end gap-3"
    >
      <input type="hidden" name="veranstaltungId" value={veranstaltungId} />
      <label className="flex flex-col gap-1 text-sm">
        Teilnehmer hinzufügen
        <select name="teilnehmerId" defaultValue="" required className={inputClass}>
          <option value="" disabled>
            Bitte wählen …
          </option>
          {verfuegbar.map((teilnehmer) => (
            <option key={teilnehmer.id} value={teilnehmer.id}>
              {teilnehmer.name}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-cyan-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Hinzufügen …" : "Hinzufügen"}
      </button>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
