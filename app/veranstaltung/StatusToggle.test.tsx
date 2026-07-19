import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { VeranstaltungFormState } from "./actions";

// Externe Grenze: Server Action aus derselben Feature-Schicht.
vi.mock("./actions", () => ({ setStatusAction: vi.fn() }));

// useActionState steuert Fehler/Pending direkt (Codify #49, analog AuslageForm) – so lässt sich
// die serverseitige Abschluss-Ablehnung ("N Zeile(n) noch offen") ohne echten Submit prüfen.
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return { ...actual, useActionState: vi.fn() };
});

import { useActionState } from "react";
import { StatusToggle } from "./StatusToggle";

const useActionStateMock = vi.mocked(useActionState);
const noopDispatch = vi.fn();

function withState(state: VeranstaltungFormState | undefined, isPending = false) {
  useActionStateMock.mockReturnValue([state, noopDispatch, isPending] as never);
}

beforeEach(() => {
  vi.resetAllMocks();
  withState(undefined);
});

describe("StatusToggle", () => {
  it("should_showAbschliessenButton_when_statusOffen", () => {
    render(<StatusToggle id="v-1" status="offen" />);

    expect(screen.getByRole("button", { name: "Abschließen" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Wieder öffnen" })).not.toBeInTheDocument();
  });

  it("should_showWiederOeffnenButton_when_statusAbgeschlossen", () => {
    render(<StatusToggle id="v-1" status="abgeschlossen" />);

    expect(screen.getByRole("button", { name: "Wieder öffnen" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Abschließen" })).not.toBeInTheDocument();
  });

  it("should_haveAbgeschlossenAsHiddenStatus_when_offen", () => {
    render(<StatusToggle id="v-1" status="offen" />);

    // Zielstatus ist der entgegengesetzte Wert: offen → abgeschlossen.
    expect(screen.getByDisplayValue("abgeschlossen")).toHaveAttribute("name", "status");
  });

  it("should_haveOffenAsHiddenStatus_when_abgeschlossen", () => {
    render(<StatusToggle id="v-1" status="abgeschlossen" />);

    // Zielstatus ist der entgegengesetzte Wert: abgeschlossen → offen.
    expect(screen.getByDisplayValue("offen")).toHaveAttribute("name", "status");
  });

  it("should_includeHiddenId_when_rendered", () => {
    render(<StatusToggle id="v-42" status="offen" />);

    expect(screen.getByDisplayValue("v-42")).toHaveAttribute("name", "id");
  });

  it("should_showRejectionError_when_stateHasError", () => {
    // Fail-closed-Ablehnung des Abschlusses (ADR-033 D3) wird im Formular sichtbar.
    withState({ error: "Abschluss nicht möglich: 2 Zeile(n) noch offen." });
    render(<StatusToggle id="v-1" status="offen" />);

    expect(screen.getByText("Abschluss nicht möglich: 2 Zeile(n) noch offen.")).toBeInTheDocument();
  });

  it("should_disableButtonWithPendingText_when_pending", () => {
    withState(undefined, true);
    render(<StatusToggle id="v-1" status="offen" />);

    expect(screen.getByRole("button", { name: /Speichern …/ })).toBeDisabled();
  });
});
