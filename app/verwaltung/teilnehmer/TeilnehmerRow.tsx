"use client";

import { useState } from "react";
import type { Teilnehmer } from "@/db/schema";
import { Notice } from "@/app/components/ui/Notice";
import { useSchliessendeAction } from "@/app/components/useSchliessendeAction";
import { setTeilnehmerActiveAction, updateTeilnehmerAction } from "./actions";
import { TeilnehmerFields, TYP_LABEL } from "./TeilnehmerFields";

const sekundaerButtonClass =
  "rounded border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700";

// Eine Teilnehmer-Zeile: Anzeige, Inline-Bearbeitung und Deaktivieren/Aktivieren. Erfolge melden
// sich als Toast, Ablehnungen an der Zeile (spec-372 AK12/AK16).
export function TeilnehmerRow({ teilnehmer }: { teilnehmer: Teilnehmer }) {
  const [editing, setEditing] = useState(false);

  // Schließt die Inline-Bearbeitung nach erfolgreichem Speichern – im Action-Wrapper des Hooks,
  // nicht in einem useEffect (react-hooks/set-state-in-effect vermeiden).
  const [state, formAction, pending] = useSchliessendeAction(updateTeilnehmerAction, {
    onErfolg: () => setEditing(false),
    erfolgsMeldung: "Gespeichert",
  });

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
              className={sekundaerButtonClass}
            >
              Abbrechen
            </button>
          </div>
          <Notice kind="fehler">{state?.error}</Notice>
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
            <button type="button" onClick={() => setEditing(true)} className={sekundaerButtonClass}>
              Bearbeiten
            </button>
            <AktivUmschalten teilnehmer={teilnehmer} />
          </div>
        </div>
      )}
    </li>
  );
}

// Reversibel, deshalb ohne Bestätigung (spec-372 „Nicht inbegriffen").
function AktivUmschalten({ teilnehmer }: { teilnehmer: Teilnehmer }) {
  const [state, formAction, pending] = useSchliessendeAction(setTeilnehmerActiveAction, {
    erfolgsMeldung: teilnehmer.active ? "Teilnehmer deaktiviert" : "Teilnehmer aktiviert",
  });

  return (
    <form action={formAction} className="flex flex-col gap-1">
      <input type="hidden" name="id" value={teilnehmer.id} />
      <input type="hidden" name="active" value={teilnehmer.active ? "false" : "true"} />
      <button type="submit" disabled={pending} className={sekundaerButtonClass}>
        {teilnehmer.active ? "Deaktivieren" : "Aktivieren"}
      </button>
      <Notice kind="fehler">{state?.error}</Notice>
    </form>
  );
}
