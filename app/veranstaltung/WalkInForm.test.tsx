import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { VeranstaltungFormState } from "./actions";

// Externe Grenze: Server Action aus derselben Feature-Schicht.
vi.mock("./actions", () => ({ createWalkInAction: vi.fn() }));

// useActionState steuert alle Renderzustände (Fehler, Erfolg, Pending).
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return { ...actual, useActionState: vi.fn() };
});

import { useActionState } from "react";
import { WalkInForm } from "./WalkInForm";

const useActionStateMock = vi.mocked(useActionState);
const noopDispatch = vi.fn();

function withState(state: VeranstaltungFormState | undefined, isPending = false) {
  useActionStateMock.mockReturnValue([state, noopDispatch, isPending] as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  withState(undefined);
});

describe("WalkInForm", () => {
  it("should_showHeadingAndAnlegenButton_when_rendered", () => {
    render(<WalkInForm veranstaltungId="v-1" />);

    expect(
      screen.getByRole("heading", { name: "Neuen Teilnehmer anlegen (Walk-in)", level: 3 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anlegen & erfassen" })).toBeInTheDocument();
  });

  it("should_includeHiddenVeranstaltungId_when_rendered", () => {
    render(<WalkInForm veranstaltungId="v-99" />);

    expect(screen.getByDisplayValue("v-99")).toHaveAttribute("name", "veranstaltungId");
  });

  it("should_showErrorMessage_when_stateHasError", () => {
    withState({ error: "Keine Veranstaltung angegeben." });
    render(<WalkInForm veranstaltungId="v-1" />);

    expect(screen.getByText("Keine Veranstaltung angegeben.")).toBeInTheDocument();
  });

  it("should_showSuccessMessage_when_stateOk", () => {
    withState({ ok: true });
    render(<WalkInForm veranstaltungId="v-1" />);

    expect(screen.getByText("Teilnehmer angelegt und erfasst.")).toBeInTheDocument();
  });

  it("should_showDisabledButtonWithAnlegenPendingText_when_pending", () => {
    withState(undefined, true);
    render(<WalkInForm veranstaltungId="v-1" />);

    const button = screen.getByRole("button", { name: "Anlegen …" });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });
});
