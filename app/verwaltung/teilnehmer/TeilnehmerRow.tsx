"use client";

import { useActionState, useCallback, useState } from "react";
import type { Teilnehmer } from "@/db/schema";
import { setTeilnehmerActiveAction, updateTeilnehmerAction } from "./actions";
import { TeilnehmerFields, TYP_LABEL } from "./TeilnehmerFields";

// Eine Teilnehmer-Zeile: Anzeige, Inline-Bearbeitung und Deaktivieren/Reaktivieren.
export function TeilnehmerRow({ teilnehmer }: { teilnehmer: Teilnehmer }) {
  const [editing, setEditing] = useState(false);

  // Schließt die Inline-Bearbeitung nach erfolgreichem Speichern. setState in der
  // Action statt in einem useEffect (react-hooks/set-state-in-effect vermeiden).
  const actionWithClose = useCallback(
    async (prevState: Parameters<typeof updateTeilnehmerAction>[0], formData: FormData) => {
      const result = await updateTeilnehmerAction(prevState, formData);
      if (result.ok) setEditing(false);
      return result;
    },
    [],
  );

  const [state, formAction, pending] = useActionState(actionWithClose, undefined);

  return (
    <li
      className={`flex flex-col gap-2 rounded border border-zinc-200 p-3 dark:border-zinc-800 ${
        teilnehmer.active ? "" : "opacity-60"
      }`}
    >
      {editing ? (
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={teilnehmer.id} />
          <TeilnehmerFields teilnehmer={teilnehmer} />
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={pending}
              className="rounded bg-cyan-700 px-3 py-1 text-sm font-medium text-white disabled:opacity-60"
            >
              Speichern
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700"
            >
              Abbrechen
            </button>
            {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="font-medium">{teilnehmer.name}</span>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {TYP_LABEL[teilnehmer.typ]}
              {teilnehmer.mitglied ? " · Mitglied" : ""}
              {teilnehmer.active ? "" : " · deaktiviert"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700"
            >
              Bearbeiten
            </button>
            <form action={setTeilnehmerActiveAction}>
              <input type="hidden" name="id" value={teilnehmer.id} />
              <input type="hidden" name="active" value={teilnehmer.active ? "false" : "true"} />
              <button
                type="submit"
                className="rounded border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700"
              >
                {teilnehmer.active ? "Deaktivieren" : "Aktivieren"}
              </button>
            </form>
          </div>
        </div>
      )}
    </li>
  );
}
