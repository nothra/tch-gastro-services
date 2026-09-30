import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Externe Grenze: die Server Action hinter dem Formular.
vi.mock("./actions", () => ({ authenticate: vi.fn() }));

// `useActionState` steuert Fehlermeldung und Pending-Zustand (etabliertes Muster, Codify #49).
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return { ...actual, useActionState: vi.fn() };
});

import { useActionState } from "react";
import LoginPage from "./page";

const useActionStateMock = vi.mocked(useActionState);
const noopDispatch = vi.fn();

function withState(errorMessage?: string, isPending = false) {
  useActionStateMock.mockReturnValue([errorMessage, noopDispatch, isPending] as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  withState();
});

// Die Seite ist der Nachweis der Umstellung (spec AK5.1): sie nutzt Field/Button/Notice,
// statt Klassenstrings zu kopieren. Geprüft wird das an dem, was die Bausteine zusagen –
// Label-Verknüpfung, Absende-Typ, Rückmelde-Rolle –, nicht an Klassennamen.
describe("LoginPage (AK5.1, AK5.2)", () => {
  it("should_labelBothCredentialFields_when_rendered", () => {
    render(<LoginPage />);

    expect(screen.getByLabelText("E-Mail")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Passwort")).toHaveAttribute("type", "password");
  });

  // Die E2E-Tests adressieren die Felder über ihren Platzhalter – der bleibt erhalten.
  it("should_keepPlaceholders_when_rendered", () => {
    render(<LoginPage />);

    expect(screen.getByPlaceholderText("E-Mail")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Passwort")).toBeInTheDocument();
  });

  it("should_useSubmitButton_when_rendered", () => {
    render(<LoginPage />);

    expect(screen.getByRole("button", { name: "Anmelden" })).toHaveAttribute("type", "submit");
  });

  it("should_disableSubmitWithPendingText_when_signInIsRunning", () => {
    withState(undefined, true);
    render(<LoginPage />);

    expect(screen.getByRole("button", { name: "Anmelden …" })).toBeDisabled();
  });

  it("should_announceErrorAsAlert_when_credentialsRejected", () => {
    withState("Ungültige E-Mail oder Passwort.");
    render(<LoginPage />);

    expect(screen.getByRole("alert")).toHaveTextContent("Ungültige E-Mail oder Passwort.");
  });

  it("should_showNoAlert_when_noError", () => {
    render(<LoginPage />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
