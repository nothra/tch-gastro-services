import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { AuslageFormState } from "./actions";

// useActionState steuert alle Renderzustände direkt (Fehler/Erfolg/Pending) – etablierter
// Ansatz (WalkInForm/MengeControl, Codify #49).
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return { ...actual, useActionState: vi.fn() };
});

vi.mock("@/app/components/ui/meldung", () => ({ meldeErfolg: vi.fn() }));

import { useActionState } from "react";
import { meldeErfolg } from "@/app/components/ui/meldung";
import { AuslageForm } from "./AuslageForm";

const useActionStateMock = vi.mocked(useActionState);
const meldeErfolgMock = vi.mocked(meldeErfolg);

// Der an useActionState übergebene Wrapper (Codify #49) – hier direkt ausgeführt.
function wrappedAction() {
  return useActionStateMock.mock.calls[0][0] as (
    prev: AuslageFormState | undefined,
    fd: FormData,
  ) => Promise<AuslageFormState>;
}
const noopDispatch = vi.fn();

const teilnehmer = [
  { teilnehmerId: "t-1", anzeigename: "Anna" },
  { teilnehmerId: "t-2", anzeigename: "Bernd" },
];

function withState(state: AuslageFormState | undefined, isPending = false) {
  useActionStateMock.mockReturnValue([state, noopDispatch, isPending] as never);
}

const noopAction = vi.fn(async () => ({ ok: true }) as AuslageFormState);

beforeEach(() => {
  vi.clearAllMocks();
  withState(undefined);
});

describe("AuslageForm", () => {
  it("should_renderTeilnehmerOptions_when_teilnehmerGiven", () => {
    render(<AuslageForm action={noopAction} teilnehmer={teilnehmer} submitLabel="Erfassen" />);

    expect(screen.getByRole("option", { name: "Anna" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Bernd" })).toBeInTheDocument();
  });

  it("should_renderAllThreeKategorieOptions_when_rendered", () => {
    render(<AuslageForm action={noopAction} teilnehmer={teilnehmer} submitLabel="Erfassen" />);

    expect(screen.getByRole("option", { name: "Getränke" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Essen" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Sonstiges" })).toBeInTheDocument();
  });

  it("should_showHint_when_noTeilnehmer", () => {
    render(<AuslageForm action={noopAction} teilnehmer={[]} submitLabel="Erfassen" />);

    expect(screen.getByText(/zuerst Teilnehmer/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Erfassen" })).not.toBeInTheDocument();
  });

  it("should_prefillFields_when_editingWithInitial", () => {
    render(
      <AuslageForm
        action={noopAction}
        teilnehmer={teilnehmer}
        submitLabel="Speichern"
        initial={{
          teilnehmerId: "t-2",
          kategorie: "essen",
          betrag: "12,50",
          zweck: "Grillfleisch",
        }}
      />,
    );

    expect(screen.getByLabelText(/Teilnehmer/i)).toHaveValue("t-2");
    expect(screen.getByLabelText(/Kategorie/i)).toHaveValue("essen");
    expect(screen.getByLabelText(/Betrag/i)).toHaveValue("12,50");
    expect(screen.getByLabelText(/Notiz/i)).toHaveValue("Grillfleisch");
  });

  it("should_showErrorMessage_when_stateHasError", () => {
    withState({ error: "Betrag muss größer als 0 sein." });
    render(<AuslageForm action={noopAction} teilnehmer={teilnehmer} submitLabel="Erfassen" />);

    expect(screen.getByText("Betrag muss größer als 0 sein.")).toBeInTheDocument();
  });

  it("should_notShowInlineSuccessMessage_when_stateOk", () => {
    // spec-372 AK17: die Rückmeldung ist der Toast, keine zweite Meldung am Formular.
    withState({ ok: true });
    render(<AuslageForm action={noopAction} teilnehmer={teilnehmer} submitLabel="Erfassen" />);

    expect(screen.queryByText(/erfasst/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("should_reportErfasst_when_createSucceeds", async () => {
    // spec-372 AK12 (Glossar: Beträge eintragen = erfassen).
    render(<AuslageForm action={noopAction} teilnehmer={teilnehmer} submitLabel="Erfassen" />);

    await wrappedAction()(undefined, new FormData());

    expect(meldeErfolgMock).toHaveBeenCalledWith("Auslage erfasst");
  });

  it("should_reportGespeichert_when_editSucceeds", async () => {
    render(
      <AuslageForm
        action={noopAction}
        teilnehmer={teilnehmer}
        submitLabel="Speichern"
        initial={{ teilnehmerId: "t-1", kategorie: "getraenke", betrag: "1,00", zweck: "" }}
      />,
    );

    await wrappedAction()(undefined, new FormData());

    expect(meldeErfolgMock).toHaveBeenCalledWith("Gespeichert");
  });

  it("should_notReport_when_actionRejects", async () => {
    // AK16: der Fehler bleibt am Formular.
    const action = vi.fn(async () => ({ error: "abgelehnt" }) as AuslageFormState);
    render(<AuslageForm action={action} teilnehmer={teilnehmer} submitLabel="Erfassen" />);

    await wrappedAction()(undefined, new FormData());

    expect(meldeErfolgMock).not.toHaveBeenCalled();
  });

  it("should_showErrorAsAlert_when_stateHasError", () => {
    // AK16: Ablehnung als `role="alert"` am Ort der Aktion.
    withState({ error: "Betrag ist zu hoch." });
    render(<AuslageForm action={noopAction} teilnehmer={teilnehmer} submitLabel="Erfassen" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Betrag ist zu hoch.");
  });

  it("should_disableButtonWithPendingText_when_pending", () => {
    withState(undefined, true);
    render(<AuslageForm action={noopAction} teilnehmer={teilnehmer} submitLabel="Erfassen" />);

    const button = screen.getByRole("button", { name: /Speichern …/ });
    expect(button).toBeDisabled();
  });

  it("should_callOnSuccess_when_wrappedActionSucceeds", async () => {
    const onSuccess = vi.fn();
    const action = vi.fn(async () => ({ ok: true }) as AuslageFormState);
    render(
      <AuslageForm
        action={action}
        teilnehmer={teilnehmer}
        submitLabel="Speichern"
        onSuccess={onSuccess}
      />,
    );

    const result = await wrappedAction()(undefined, new FormData());

    expect(result.ok).toBe(true);
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  // Reset bei jeder erfolgreichen Neu-Erfassung (nicht nur der ersten): der Wrapper leert die
  // Felder per form.reset() über eine Ref – so bleibt der Reset bei aufeinanderfolgenden
  // Erfassungen zuverlässig, ohne key-basierten Remount (der beim 2. ok nicht mehr griff).
  it("should_clearFields_when_createSucceeds", async () => {
    render(<AuslageForm action={noopAction} teilnehmer={teilnehmer} submitLabel="Erfassen" />);
    const betrag = screen.getByLabelText(/Betrag/i);
    fireEvent.change(betrag, { target: { value: "9,99" } });
    expect(betrag).toHaveValue("9,99");

    await wrappedAction()(undefined, new FormData());

    expect(betrag).toHaveValue("");
  });

  it("should_notResetFields_when_editSucceeds", async () => {
    render(
      <AuslageForm
        action={noopAction}
        teilnehmer={teilnehmer}
        submitLabel="Speichern"
        initial={{
          teilnehmerId: "t-2",
          kategorie: "essen",
          betrag: "12,50",
          zweck: "Grillfleisch",
        }}
      />,
    );
    const betrag = screen.getByLabelText(/Betrag/i);
    fireEvent.change(betrag, { target: { value: "9,99" } });

    await wrappedAction()(undefined, new FormData());

    // Im Korrektur-Modus schließt onSuccess das Formular – kein Feld-Reset.
    expect(betrag).toHaveValue("9,99");
  });

  it("should_notCallOnSuccess_when_wrappedActionReturnsError", async () => {
    const onSuccess = vi.fn();
    const action = vi.fn(async () => ({ error: "abgelehnt" }) as AuslageFormState);
    render(
      <AuslageForm
        action={action}
        teilnehmer={teilnehmer}
        submitLabel="Speichern"
        onSuccess={onSuccess}
      />,
    );

    await wrappedAction()(undefined, new FormData());

    expect(onSuccess).not.toHaveBeenCalled();
  });
});
