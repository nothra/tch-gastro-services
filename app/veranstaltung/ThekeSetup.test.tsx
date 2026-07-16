import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { VeranstaltungFormState } from "./actions";

// Externe Grenze: Server Action aus derselben Feature-Schicht.
vi.mock("./actions", () => ({ ensureThekeAction: vi.fn() }));

// useActionState steuert alle Renderzustände (Fehler, Erfolg, Pending).
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return { ...actual, useActionState: vi.fn() };
});

import { useActionState } from "react";
import { ThekeSetup } from "./ThekeSetup";

const useActionStateMock = vi.mocked(useActionState);
const noopDispatch = vi.fn();

function withState(state: VeranstaltungFormState | undefined, isPending = false) {
  useActionStateMock.mockReturnValue([state, noopDispatch, isPending] as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  withState(undefined);
});

describe("ThekeSetup", () => {
  it("should_showHeadingAndEinrichtenButton_when_rendered", () => {
    render(<ThekeSetup />);

    expect(
      screen.getByRole("heading", { name: "Stehende Theke einrichten" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Einrichten" })).toBeInTheDocument();
  });

  it("should_showAllKassenOptions_when_rendered", () => {
    render(<ThekeSetup />);

    expect(screen.getByRole("option", { name: "Montagsrunde" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Vereinskasse" })).toBeInTheDocument();
  });

  it("should_showErrorMessage_when_stateHasError", () => {
    withState({ error: "Bitte eine gültige Kasse wählen." });
    render(<ThekeSetup />);

    expect(screen.getByText("Bitte eine gültige Kasse wählen.")).toBeInTheDocument();
  });

  it("should_showSuccessMessage_when_stateOk", () => {
    withState({ ok: true });
    render(<ThekeSetup />);

    expect(screen.getByText("Theke eingerichtet.")).toBeInTheDocument();
  });

  it("should_showDisabledButtonWithEinrichtenPendingText_when_pending", () => {
    withState(undefined, true);
    render(<ThekeSetup />);

    const button = screen.getByRole("button", { name: "Einrichten …" });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });
});
