"use client";

import { useActionState } from "react";
import type { VeranstaltungFormState } from "./actions";

// Erfassungs-Formular des bar kassierten Betrags (`Erhalten`) einer Teilnehmerzeile (F8, #55,
// ADR-033 D6). Client-Komponente, damit Fehler/Pending über useActionState sichtbar werden
// (Codify #49 – kein useEffect). `action` ist die bereits scope-gebundene Server-Action
// (`kassiereZeileAction.bind(null, veranstaltungId)`); der Client liefert die veranstaltungId nie
// im Formular (IDOR-Schutz sitzt serverseitig). Kein Feld-Reset: `Erhalten` ist ein persistenter
// Zeilenwert (Korrektur in-place); Spende/Status werden serverseitig neu gerendert (revalidate).

const inputClass =
  "w-28 rounded border border-zinc-300 px-3 py-2 text-right tabular-nums dark:border-zinc-700 dark:bg-zinc-900";

type BoundKassiereAction = (
  prevState: VeranstaltungFormState | undefined,
  formData: FormData,
) => Promise<VeranstaltungFormState>;

export function KassiereZeileForm({
  action,
  zeileId,
  initialErhalten,
}: {
  action: BoundKassiereAction;
  zeileId: string;
  initialErhalten: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="zeileId" value={zeileId} />
      <input
        name="erhalten"
        type="text"
        inputMode="decimal"
        aria-label="Erhalten (EUR)"
        defaultValue={initialErhalten}
        placeholder="0,00"
        className={inputClass}
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-cyan-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Speichern …" : "Kassieren"}
      </button>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="w-full text-sm text-green-700">Gespeichert.</p>}
    </form>
  );
}
