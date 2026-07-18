"use client";

import { useActionState } from "react";
import type { VerzehrFormAction } from "./types";

// Strichlisten-Steuerung einer (Zeile, Katalogartikel)-Position: −1 / Menge / +1. Der Client
// sendet ein Delta (±1), nie ein absolutes `menge` (ADR-025 D3). Die angezeigte Menge ist die
// server-autoritative Prop – nach jedem Erfassen frisch via `revalidatePath` (ADR-025 D4), also
// keine optimistische Drift. Schlägt die Action fehl, bleibt die alte Menge stehen und der
// Fehler wird sichtbar (FS3). Kein `useEffect` – Fehler kommen aus dem useActionState-State
// (Codify #49).
export function MengeControl({
  action,
  zeileId,
  catalogItemId,
  menge,
  editable,
}: {
  action: VerzehrFormAction;
  zeileId: string;
  catalogItemId: string;
  menge: number;
  editable: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  if (!editable) {
    return <span className="tabular-nums font-medium">{menge}</span>;
  }

  const buttonClass =
    "h-8 w-8 rounded border border-zinc-300 text-lg leading-none disabled:opacity-60 dark:border-zinc-700";

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="zeileId" value={zeileId} />
      <input type="hidden" name="catalogItemId" value={catalogItemId} />
      <button
        type="submit"
        name="delta"
        value="-1"
        disabled={pending}
        aria-label="Menge verringern"
        className={buttonClass}
      >
        −
      </button>
      <span className="w-6 text-center tabular-nums font-medium">{menge}</span>
      <button
        type="submit"
        name="delta"
        value="1"
        disabled={pending}
        aria-label="Menge erhöhen"
        className={buttonClass}
      >
        +
      </button>
      {state?.error && <span className="text-sm text-red-600">{state.error}</span>}
    </form>
  );
}
