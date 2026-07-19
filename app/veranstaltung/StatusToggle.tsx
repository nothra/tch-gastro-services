"use client";

import { useActionState } from "react";
import type { VeranstaltungStatus } from "@/db/schema";
import { setStatusAction } from "./actions";

// Abschließen (F8) bzw. protokolliertes Wiederöffnen durch den Veranstalter (ADR-033 D6). Client-
// Komponente, damit die serverseitige, fail-closed Abschluss-Ablehnung ("N Zeile(n) noch offen",
// ADR-033 D3) über useActionState sichtbar wird (Codify #49 – kein useEffect). Das versteckte
// Zielstatus-Feld kippt jeweils auf den Gegenwert.
export function StatusToggle({ id, status }: { id: string; status: VeranstaltungStatus }) {
  const offen = status === "offen";
  const [state, formAction, pending] = useActionState(setStatusAction, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={offen ? "abgeschlossen" : "offen"} />
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded border border-zinc-300 px-4 py-2 text-sm font-medium disabled:opacity-60 dark:border-zinc-700"
      >
        {pending ? "Speichern …" : offen ? "Abschließen" : "Wieder öffnen"}
      </button>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
