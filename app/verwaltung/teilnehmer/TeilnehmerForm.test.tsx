import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { TeilnehmerFormState } from "./actions";

// Externe Grenze: Server Action aus derselben Feature-Schicht.
vi.mock("./actions", () => ({ createTeilnehmerAction: vi.fn() }));

// useActionState steuert die gesamte Anzeige-Logik des Formulars. Wir mocken den Hook,
// um jeden Renderzustand ohne Formular-Submission zu testen (analog zur Empfehlung in
// tdd-principles.md: schwer testbarer Code signalisiert ein Designproblem – hier ist der
// Hook die externe Grenze des State-Systems).
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return { ...actual, useActionState: vi.fn() };
});

import { useActionState } from "react";
import { TeilnehmerForm } from "./TeilnehmerForm";

const useActionStateMock = vi.mocked(useActionState);
const noopDispatch = vi.fn();

// Hilfsfunktion: konfiguriert den Mock für einen bestimmten Formular-Zustand.
function withState(state: TeilnehmerFormState | undefined, isPending = false) {
  useActionStateMock.mockReturnValue([state, noopDispatch, isPending] as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  // Standardzustand: keine vorherige Aktion, kein Pending.
  withState(undefined);
});

describe("TeilnehmerForm", () => {
  it("should_showHeadingAndAnlegenButton_when_initialRender", () => {
    render(<TeilnehmerForm />);

    expect(screen.getByRole("heading", { name: "Teilnehmer anlegen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anlegen" })).toBeInTheDocument();
  });

  it("should_setConfirmDuplicateToFalse_when_noNeedsConfirmState", () => {
    render(<TeilnehmerForm />);

    const hidden = screen.getByDisplayValue("false");
    expect(hidden).toHaveAttribute("name", "confirmDuplicate");
  });

  it("should_showErrorMessage_when_stateHasError", () => {
    withState({ error: "Anzeigename ist erforderlich." });
    render(<TeilnehmerForm />);

    expect(screen.getByText("Anzeigename ist erforderlich.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anlegen" })).toBeInTheDocument();
  });

  it("should_showTrotzdemAnlegenAndWarning_when_needsConfirm", () => {
    withState({
      needsConfirm: true,
      warning: "Ein aktiver Teilnehmer mit diesem Namen existiert bereits.",
    });
    render(<TeilnehmerForm />);

    expect(screen.getByRole("button", { name: "Trotzdem anlegen" })).toBeInTheDocument();
    expect(
      screen.getByText("Ein aktiver Teilnehmer mit diesem Namen existiert bereits."),
    ).toBeInTheDocument();
    // confirmDuplicate-Feld muss "true" enthalten, damit der Zweitversuch durchgeht.
    expect(screen.getByDisplayValue("true")).toHaveAttribute("name", "confirmDuplicate");
  });

  it("should_showSuccessMessage_when_stateOk", () => {
    withState({ ok: true });
    render(<TeilnehmerForm />);

    expect(screen.getByText("Teilnehmer angelegt.")).toBeInTheDocument();
  });

  it("should_showSpeichernButtonDisabled_when_pending", () => {
    withState(undefined, true);
    render(<TeilnehmerForm />);

    const button = screen.getByRole("button", { name: "Speichern …" });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });
});
