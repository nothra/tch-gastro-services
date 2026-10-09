// Die überstimmbare Duplikat-Warnung beim Anlegen eines Teilnehmers (ADR-022). Verwaltung und
// „Teilnehmer anlegen" aus der Veranstaltung zeigen und bestätigen sie gleich (spec-404 AK4.3).
// Dargestellt als `Notice` der Art `warnung` (spec-405 AK4.2, ADR-060 D2).

import { Notice } from "@/app/components/ui/Notice";

export interface DuplikatState {
  needsConfirm?: boolean;
  warning?: string;
}

/**
 * Verstecktes `confirmDuplicate` plus Warnung. Nach einer Warnung sendet der Zweitversuch "true"
 * und überstimmt sie; die Eingabe bleibt stehen, solange das Formular ohne Reset absendet.
 */
export function DuplikatWarnung({ state }: { state: DuplikatState | undefined }) {
  return (
    <>
      <input type="hidden" name="confirmDuplicate" value={state?.needsConfirm ? "true" : "false"} />
      {state?.needsConfirm && <Notice kind="warnung">{state.warning}</Notice>}
    </>
  );
}

export function anlegenLabel(state: DuplikatState | undefined): string {
  return state?.needsConfirm ? "Trotzdem anlegen" : "Anlegen";
}
