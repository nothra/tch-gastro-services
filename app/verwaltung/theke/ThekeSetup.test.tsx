import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { VeranstaltungFormState } from "@/app/veranstaltung/actions";

// Externe Grenze: die Action bleibt unverändert in der Veranstaltungs-Schicht (spec-373).
vi.mock("@/app/veranstaltung/actions", () => ({ ensureThekeAction: vi.fn() }));

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

describe("ThekeSetup (spec-373 AK3.2)", () => {
  it("should_showKasseSelectAndEinrichtenButton_when_rendered", () => {
    render(<ThekeSetup />);

    expect(screen.getByLabelText("Kasse")).toHaveAttribute("name", "kasse");
    expect(screen.getByRole("button", { name: "Einrichten" })).toHaveAttribute("type", "submit");
  });

  it("should_showAllKassenOptions_when_rendered", () => {
    render(<ThekeSetup />);

    expect(screen.getByRole("option", { name: "Montagsrunde" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Vereinskasse" })).toBeInTheDocument();
  });

  it("should_explainIdempotency_when_rendered", () => {
    render(<ThekeSetup />);

    expect(screen.getByText(/erneutes Einrichten legt nicht doppelt an/)).toBeInTheDocument();
  });

  it("should_showErrorMessage_when_stateHasError", () => {
    withState({ error: "Bitte eine gültige Kasse wählen." });
    render(<ThekeSetup />);

    expect(screen.getByRole("alert")).toHaveTextContent("Bitte eine gültige Kasse wählen.");
  });

  it("should_showSuccessMessage_when_stateOk", () => {
    withState({ ok: true });
    render(<ThekeSetup />);

    expect(screen.getByRole("status")).toHaveTextContent("Theke eingerichtet.");
  });

  it("should_showDisabledButtonWithEinrichtenPendingText_when_pending", () => {
    withState(undefined, true);
    render(<ThekeSetup />);

    expect(screen.getByRole("button", { name: "Einrichten …" })).toBeDisabled();
  });
});
