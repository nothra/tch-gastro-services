"use client";

import { useActionState } from "react";
import { Button } from "@/app/components/ui/Button";
import { Notice } from "@/app/components/ui/Notice";
import { joinClasses } from "@/app/components/ui/joinClasses";
import type { VerzehrFormAction } from "./types";

// Strichlisten-Steuerung einer (Zeile, Katalogartikel)-Position: −1 / Menge / +1. Der Client
// sendet ein Delta (±1), nie ein absolutes `menge` (ADR-025 D3). Die angezeigte Menge ist die
// server-autoritative Prop – nach jedem Erfassen frisch via `revalidatePath` (ADR-025 D4), also
// keine optimistische Drift. Schlägt die Action mit einem regulären `VerzehrActionState.error`
// fehl (z. B. ADR-044-Drossel), bleibt die alte Menge stehen und der Fehler wird inline sichtbar
// (spec-370 FS1). Kein `useEffect` – Fehler kommen aus dem useActionState-State (Codify #49). Das
// gilt nur für Action-Fehlerzustände innerhalb des Server-Action-Protokolls: Eine Proxy-Antwort
// außerhalb dieses Protokolls (429-Klartext bei erschöpftem Schreib-Budget, ADR-048 D5) oder ein
// Netz-/Offline-Fehler wirft während des Renderns weiter und läuft nicht über diesen State –
// dafür fängt `app/theke/[token]/error.tsx` die Theken-Route (#331, spec-370 FS2).
//
// Touch-Ziel (spec-370 AK4.1/AK4.6): Höhe aus dem Button-Baustein (`min-h-11`), die quadratische
// Breite als Layout-`className`. Bei Menge 0 ist „−" deaktiviert – ein Delta unter 0 lehnte der
// Server ohnehin ab (AK4.3).
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

  if (!editable) return <MengeAnzeige menge={menge} />;

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={formAction} className="flex items-center gap-1">
        <input type="hidden" name="zeileId" value={zeileId} />
        <input type="hidden" name="catalogItemId" value={catalogItemId} />
        <StepperButton delta="-1" label="Menge verringern" disabled={pending || menge === 0}>
          −
        </StepperButton>
        <MengeAnzeige menge={menge} />
        <StepperButton delta="1" label="Menge erhöhen" disabled={pending}>
          +
        </StepperButton>
      </form>
      <Notice kind="fehler">{state?.error}</Notice>
    </div>
  );
}

function StepperButton({
  delta,
  label,
  disabled,
  children,
}: {
  delta: "-1" | "1";
  label: string;
  disabled: boolean;
  children: string;
}) {
  return (
    <Button
      type="submit"
      variant="secondary"
      name="delta"
      value={delta}
      disabled={disabled}
      aria-label={label}
      className="min-w-11 text-xl leading-none"
    >
      {children}
    </Button>
  );
}

// Menge 0 zurückgenommen („leer"), sonst in Vordergrundfarbe; Ziffern gleicher Breite (AK4.5).
function MengeAnzeige({ menge }: { menge: number }) {
  return (
    <span
      className={joinClasses(
        "w-8 text-center text-lg font-semibold tabular-nums",
        menge === 0 ? "text-muted" : undefined,
      )}
    >
      {menge}
    </span>
  );
}
