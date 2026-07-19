import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { VeranstaltungFormState } from "./actions";

// useActionState steuert Fehler/Pending direkt (Codify #49, analog AuslageForm/StatusToggle).
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return { ...actual, useActionState: vi.fn() };
});

import { useActionState } from "react";
import { KassiereZeileForm } from "./KassiereZeileForm";

const useActionStateMock = vi.mocked(useActionState);
const noopDispatch = vi.fn();
const noopAction = vi.fn(async () => ({ ok: true }) as VeranstaltungFormState);

function withState(state: VeranstaltungFormState | undefined, isPending = false) {
  useActionStateMock.mockReturnValue([state, noopDispatch, isPending] as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  withState(undefined);
});

describe("KassiereZeileForm", () => {
  it("should_prefillErhalten_when_initialGiven", () => {
    render(<KassiereZeileForm action={noopAction} zeileId="z-1" initialErhalten="12,50" />);

    expect(screen.getByLabelText(/Erhalten/i)).toHaveValue("12,50");
  });

  it("should_renderEmptyErhalten_when_notYetCollected", () => {
    render(<KassiereZeileForm action={noopAction} zeileId="z-1" initialErhalten="" />);

    expect(screen.getByLabelText(/Erhalten/i)).toHaveValue("");
  });

  it("should_includeHiddenZeileId_when_rendered", () => {
    render(<KassiereZeileForm action={noopAction} zeileId="z-42" initialErhalten="" />);

    expect(screen.getByDisplayValue("z-42")).toHaveAttribute("name", "zeileId");
  });

  it("should_showErrorMessage_when_stateHasError", () => {
    withState({ error: "Bitte einen gültigen Betrag mit höchstens 2 Nachkommastellen eingeben." });
    render(<KassiereZeileForm action={noopAction} zeileId="z-1" initialErhalten="" />);

    expect(screen.getByText(/gültigen Betrag/i)).toBeInTheDocument();
  });

  it("should_showSuccessMessage_when_stateOk", () => {
    withState({ ok: true });
    render(<KassiereZeileForm action={noopAction} zeileId="z-1" initialErhalten="" />);

    expect(screen.getByText(/gespeichert/i)).toBeInTheDocument();
  });

  it("should_disableButtonWithPendingText_when_pending", () => {
    withState(undefined, true);
    render(<KassiereZeileForm action={noopAction} zeileId="z-1" initialErhalten="" />);

    expect(screen.getByRole("button", { name: /Speichern …/ })).toBeDisabled();
  });
});
