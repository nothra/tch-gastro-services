import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { VeranstaltungFormState } from "./actions";

// Externe Grenze: Server Action aus derselben Feature-Schicht.
vi.mock("./actions", () => ({ createVeranstaltungAction: vi.fn() }));

// useActionState steuert alle Renderzustände. Gemockt analog zu TeilnehmerForm.test.tsx,
// damit jeder Zustand ohne Formular-Submission testbar ist.
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return { ...actual, useActionState: vi.fn() };
});

import { useActionState } from "react";
import { VeranstaltungForm } from "./VeranstaltungForm";

const useActionStateMock = vi.mocked(useActionState);
const noopDispatch = vi.fn();

function withState(state: VeranstaltungFormState | undefined, isPending = false) {
  useActionStateMock.mockReturnValue([state, noopDispatch, isPending] as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  withState(undefined);
});

describe("VeranstaltungForm", () => {
  it("should_showHeadingAndAnlegenButton_when_initialRender", () => {
    render(<VeranstaltungForm />);

    expect(screen.getByRole("heading", { name: "Veranstaltung anlegen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anlegen" })).toBeInTheDocument();
  });

  it("should_showAllKassenOptions_when_rendered", () => {
    render(<VeranstaltungForm />);

    expect(screen.getByRole("option", { name: "Montagsrunde" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Vereinskasse" })).toBeInTheDocument();
  });

  it("should_showErrorMessage_when_stateHasError", () => {
    withState({ error: "Bezeichnung ist erforderlich." });
    render(<VeranstaltungForm />);

    expect(screen.getByText("Bezeichnung ist erforderlich.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anlegen" })).toBeInTheDocument();
  });

  it("should_showSuccessMessage_when_stateOk", () => {
    withState({ ok: true });
    render(<VeranstaltungForm />);

    expect(screen.getByText("Veranstaltung angelegt.")).toBeInTheDocument();
  });

  it("should_showDisabledButtonWithSpeichernText_when_pending", () => {
    withState(undefined, true);
    render(<VeranstaltungForm />);

    const button = screen.getByRole("button", { name: "Speichern …" });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });
});
