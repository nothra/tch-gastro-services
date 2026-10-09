import { describe, it, expect } from "vitest";
import { useState } from "react";
import { act, render, screen } from "@testing-library/react";
import { useErsatzFokus } from "./useErsatzFokus";

// Der Hook wird direkt am Baustein belegt (Lesson #369 „Verhaltensvertrag in den Baustein"):
// wie in `TeilnehmerRow` hängt ein Erfolg die ganze Zeile samt fokussiertem Auslöser aus, der
// Fokus fällt auf <body> – der Cleanup des Hooks lenkt ihn dann aufs Ersatzziel.
function Zeile({
  ersatzFokusId,
  erfolg,
  onEntfernt,
}: {
  ersatzFokusId?: string;
  erfolg: boolean;
  onEntfernt: () => void;
}) {
  const fokus = useErsatzFokus(ersatzFokusId);
  return (
    <button
      onClick={() => {
        fokus.zuruecksetzen();
        if (erfolg) fokus.markiereErfolg();
        onEntfernt();
      }}
    >
      Auslöser
    </button>
  );
}

function Seite({
  ersatzFokusId,
  erfolg = true,
  ersatzInZugeklapptem = false,
}: {
  ersatzFokusId?: string;
  erfolg?: boolean;
  ersatzInZugeklapptem?: boolean;
}) {
  const [zeileDa, setZeileDa] = useState(true);
  return (
    <>
      {zeileDa && (
        <Zeile ersatzFokusId={ersatzFokusId} erfolg={erfolg} onEntfernt={() => setZeileDa(false)} />
      )}
      {ersatzInZugeklapptem ? (
        <details>
          <summary>Kopf</summary>
          <button id="ziel">Ziel</button>
        </details>
      ) : (
        <button id="ziel">Ziel</button>
      )}
      <button id="woanders">Woanders</button>
    </>
  );
}

function ausloeserBetaetigen() {
  const ausloeser = screen.getByRole("button", { name: "Auslöser" });
  ausloeser.focus();
  act(() => ausloeser.click());
}

describe("useErsatzFokus", () => {
  it("should_focusReplacementTarget_when_successRemovedFocusedTrigger", () => {
    render(<Seite ersatzFokusId="ziel" />);

    ausloeserBetaetigen();

    expect(document.activeElement).toBe(document.getElementById("ziel"));
  });

  it("should_focusSummary_when_replacementTargetSitsInClosedDetails", () => {
    render(<Seite ersatzFokusId="ziel" ersatzInZugeklapptem />);

    ausloeserBetaetigen();

    expect(document.activeElement).toBe(screen.getByText("Kopf"));
  });

  it("should_leaveFocusOnBody_when_noSuccessWasMarked", () => {
    render(<Seite ersatzFokusId="ziel" erfolg={false} />);

    ausloeserBetaetigen();

    expect(document.activeElement).toBe(document.body);
  });

  it("should_leaveFocusOnBody_when_noReplacementIdGiven", () => {
    render(<Seite />);

    ausloeserBetaetigen();

    expect(document.activeElement).toBe(document.body);
  });

  it("should_notPullFocusAway_when_userStandsElsewhereAtUnmount", () => {
    render(<Seite ersatzFokusId="ziel" />);
    const ausloeser = screen.getByRole("button", { name: "Auslöser" });
    const woanders = document.getElementById("woanders");
    ausloeser.focus();
    act(() => {
      // Klick und Fokuswechsel im selben Zug: der Nutzer steht beim Aushängen schon woanders.
      woanders?.focus();
      ausloeser.click();
    });

    expect(document.activeElement).toBe(woanders);
  });
});
