"use client";

import { useActionState, useState } from "react";
import { deleteVeranstaltungAction } from "../actions";

// Endgültiges Löschen einer noch offenen, datierten Veranstaltung (#352 AK4/AK8). Der
// Bestätigungsdialog ist Pflicht (spec-352, „Gesetzte Entscheidungen") und folgt dem bestehenden
// `<dialog open>`-Muster aus `verwaltung/katalog/[id]/CatalogControls.tsx` – kein neues
// Dialog-Pattern. Der serverseitige Fehler (Verzehr/Kassiert/Auslage erfasst, AK5/AK12/AK6)
// erscheint IM Dialog, weil der Nutzer nach dem Absenden dort steht; er bleibt dafür offen. Bei
// Erfolg leitet die Action selbst zur Übersicht (AK9), dieser Zustand wird hier also nie gerendert.
//
// `abgeschickt` bindet die Fehleranzeige an den aktuellen Öffnungs-Zyklus: der `useActionState`-
// State überlebt das Schließen des Dialogs, sonst stünde beim erneuten Öffnen sofort die alte
// Ablehnung da – über einem Vorgang, der noch gar nicht versucht wurde.
export function VeranstaltungLoeschen({ id, bezeichnung }: { id: string; bezeichnung: string }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [abgeschickt, setAbgeschickt] = useState(false);
  const [state, formAction, pending] = useActionState(deleteVeranstaltungAction, undefined);

  function oeffnen() {
    setAbgeschickt(false);
    setShowConfirm(true);
  }

  return (
    <div>
      <button
        type="button"
        onClick={oeffnen}
        className="w-fit rounded border border-red-600 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
      >
        Veranstaltung löschen
      </button>

      {showConfirm && (
        <dialog open className="fixed inset-0 flex items-center justify-center bg-black/50 p-4">
          <div className="flex w-full max-w-sm flex-col gap-4 rounded-lg bg-white p-6 dark:bg-zinc-900">
            <h2 className="text-lg font-bold">Veranstaltung löschen?</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              „{bezeichnung}“ wird endgültig entfernt – samt ihrer Teilnehmerzeilen. Das lässt sich
              nicht rückgängig machen.
            </p>
            <form action={formAction} className="flex flex-col gap-3">
              <input type="hidden" name="id" value={id} />
              {abgeschickt && state?.error && <p className="text-sm text-red-600">{state.error}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 rounded bg-zinc-200 px-3 py-2 text-sm dark:bg-zinc-700"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  onClick={() => setAbgeschickt(true)}
                  disabled={pending}
                  className="flex-1 rounded bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {pending ? "Löschen …" : "Endgültig löschen"}
                </button>
              </div>
            </form>
          </div>
        </dialog>
      )}
    </div>
  );
}
