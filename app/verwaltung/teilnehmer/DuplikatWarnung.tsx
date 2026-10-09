// Die überstimmbare Duplikat-Warnung beim Anlegen eines Teilnehmers (ADR-022). Verwaltung und
// „Teilnehmer anlegen" aus der Veranstaltung zeigen und bestätigen sie gleich (spec-404 AK4.3).

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
      {state?.needsConfirm && (
        <p role="status" className="text-sm text-warning">
          {state.warning}
        </p>
      )}
    </>
  );
}

export function anlegenLabel(state: DuplikatState | undefined): string {
  return state?.needsConfirm ? "Trotzdem anlegen" : "Anlegen";
}
