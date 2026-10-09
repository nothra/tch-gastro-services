import { describe, it, expect } from "vitest";
import { useState, type RefObject } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { useBestaetigung } from "./useBestaetigung";

// Eine Liste mit einer Zeile, deren bestätigter Erfolg die Zeile samt Auslöser aushängt
// (Lesson #371) – wie „Auslage löschen".
function Liste({ ersatzFokusId }: { ersatzFokusId?: string }) {
  const [vorhanden, setVorhanden] = useState(true);
  return vorhanden ? (
    <Zeile ersatzFokusId={ersatzFokusId} onEntfernt={() => setVorhanden(false)} />
  ) : (
    <p>Weg</p>
  );
}

function Zeile({ ersatzFokusId, onEntfernt }: { ersatzFokusId?: string; onEntfernt: () => void }) {
  const { ausloeserRef, oeffnen, durchlauf, dialogProps, schliessenNachErfolg } =
    useBestaetigung(ersatzFokusId);
  return (
    <>
      <button ref={ausloeserRef} onClick={oeffnen}>
        Löschen
      </button>
      <Bestaetigung
        key={durchlauf}
        {...dialogProps}
        onBestaetigt={() => {
          schliessenNachErfolg();
          onEntfernt();
        }}
      />
    </>
  );
}

interface BestaetigungProps {
  open: boolean;
  onClose: () => void;
  returnFocusRef: RefObject<HTMLElement | null>;
  onBestaetigt: () => void;
}

function Bestaetigung({ onBestaetigt, ...dialogProps }: BestaetigungProps) {
  const [versuche, setVersuche] = useState(0);
  return (
    <ConfirmDialog
      {...dialogProps}
      title="Wirklich löschen?"
      description="Endgültig."
      confirmLabel="Bestätigen"
      action={() => setVersuche((bisher) => bisher + 1)}
      error={versuche > 0 ? "Abgelehnt." : undefined}
    >
      <button type="button" onClick={onBestaetigt}>
        Erfolg simulieren
      </button>
    </ConfirmDialog>
  );
}

function dialogElement() {
  return document.querySelector("dialog")!;
}

function oeffnen() {
  fireEvent.click(screen.getByRole("button", { name: "Löschen" }));
}

describe("useBestaetigung (spec-372 AK1/AK3, Review-372 W6)", () => {
  it("should_openDialog_when_triggerClicked", () => {
    render(<Liste />);

    oeffnen();

    expect(dialogElement()).toHaveAttribute("open");
  });

  it("should_closeAndReturnFocusToTrigger_when_abbrechen", () => {
    render(<Liste />);
    oeffnen();

    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));

    expect(dialogElement()).not.toHaveAttribute("open");
    expect(screen.getByRole("button", { name: "Löschen" })).toHaveFocus();
  });

  it("should_startWithoutOldError_when_reopened", async () => {
    // Der Fehler liegt im Zustand des Kindes – nur ein neuer `key` je Öffnen räumt ihn ab.
    render(<Liste />);
    oeffnen();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Bestätigen" }));
    });
    expect(screen.getByText("Abgelehnt.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));

    oeffnen();

    expect(screen.queryByText("Abgelehnt.")).not.toBeInTheDocument();
  });

  it("should_focusErsatzziel_when_successUnmountsTrigger", () => {
    // Lesson #371/#373: der Auslöser ist nach dem Erfolg weg – Fokus auf das Ersatzziel statt `<body>`.
    render(
      <>
        <ul id="liste" tabIndex={-1} />
        <Liste ersatzFokusId="liste" />
      </>,
    );
    oeffnen();

    fireEvent.click(screen.getByRole("button", { name: "Erfolg simulieren" }));

    expect(screen.getByText("Weg")).toBeInTheDocument();
    expect(document.getElementById("liste")).toHaveFocus();
  });
});
