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

vi.mock("@/app/components/ui/meldung", () => ({ meldeErfolg: vi.fn() }));

import { useActionState } from "react";
import { meldeErfolg } from "@/app/components/ui/meldung";
import { ensureThekeAction } from "@/app/veranstaltung/actions";
import { ThekeSetup } from "./ThekeSetup";

const useActionStateMock = vi.mocked(useActionState);
const ensureMock = vi.mocked(ensureThekeAction);
const meldeErfolgMock = vi.mocked(meldeErfolg);

// Der an useActionState übergebene Wrapper (Codify #49) – hier direkt ausgeführt.
function wrappedAction() {
  return useActionStateMock.mock.calls[0][0] as (
    prev: VeranstaltungFormState | undefined,
    fd: FormData,
  ) => Promise<VeranstaltungFormState>;
}
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

  it("should_notShowInlineSuccessMessage_when_stateOk", () => {
    // spec-372 AK17: die Rückmeldung ist der Toast, keine zweite Meldung am Formular.
    withState({ ok: true });
    render(<ThekeSetup />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("should_reportThekeAngelegt_when_actionSucceeds", async () => {
    // spec-372 AK12 + Glossar (neues Objekt = anlegen; Button-Text folgt mit #401).
    ensureMock.mockResolvedValue({ ok: true });
    render(<ThekeSetup />);

    await wrappedAction()(undefined, new FormData());

    expect(meldeErfolgMock).toHaveBeenCalledWith("Theke angelegt");
  });

  it("should_notReport_when_actionRejects", async () => {
    ensureMock.mockResolvedValue({ error: "Bitte eine gültige Kasse wählen." });
    render(<ThekeSetup />);

    await wrappedAction()(undefined, new FormData());

    expect(meldeErfolgMock).not.toHaveBeenCalled();
  });

  it("should_showDisabledButtonWithEinrichtenPendingText_when_pending", () => {
    withState(undefined, true);
    render(<ThekeSetup />);

    expect(screen.getByRole("button", { name: "Einrichten …" })).toBeDisabled();
  });
});
