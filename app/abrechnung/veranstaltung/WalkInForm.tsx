"use client";

import { useActionState } from "react";
import { TeilnehmerFields } from "@/app/verwaltung/teilnehmer/TeilnehmerFields";
import { createWalkInAction } from "./actions";

// Walk-in: legt einen neuen Teilnehmer an und erfasst ihn direkt (F3/ADR-022). Nutzt die
// gemeinsamen TeilnehmerFields, damit die Stammdaten-Eingabe nicht dupliziert wird.
export function WalkInForm({ veranstaltungId }: { veranstaltungId: string }) {
  const [state, formAction, pending] = useActionState(createWalkInAction, undefined);
  return (
    <form
      key={state?.ok ? "reset" : "edit"}
      action={formAction}
      className="flex flex-col gap-3 rounded border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <h3 className="text-sm font-semibold">Neuen Teilnehmer anlegen (Walk-in)</h3>
      <input type="hidden" name="veranstaltungId" value={veranstaltungId} />
      <TeilnehmerFields />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium disabled:opacity-60 dark:border-zinc-700"
        >
          {pending ? "Anlegen …" : "Anlegen & erfassen"}
        </button>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.ok && <p className="text-sm text-green-700">Teilnehmer angelegt und erfasst.</p>}
      </div>
    </form>
  );
}
