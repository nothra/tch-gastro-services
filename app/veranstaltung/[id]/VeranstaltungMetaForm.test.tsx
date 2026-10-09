import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { VeranstaltungFormState } from "../actions";

// Externe Grenze: Server Action aus derselben Feature-Schicht.
vi.mock("../actions", () => ({ updateVeranstaltungMetaAction: vi.fn() }));

// useActionState steuert Fehler/Pending direkt (Codify #49, analog KatalogWechsel) – so ist die
// serverseitige Ablehnung ohne echten Submit prüfbar.
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return { ...actual, useActionState: vi.fn() };
});

vi.mock("@/app/components/ui/meldung", () => ({ meldeErfolg: vi.fn() }));

import { useActionState } from "react";
import { meldeErfolg } from "@/app/components/ui/meldung";
import { updateVeranstaltungMetaAction } from "../actions";
import { VeranstaltungMetaForm } from "./VeranstaltungMetaForm";

const useActionStateMock = vi.mocked(useActionState);
const updateMock = vi.mocked(updateVeranstaltungMetaAction);
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

const props = {
  id: "v-1",
  bezeichnung: "Montagsrunde Juli",
  datum: new Date("2026-07-13"),
  kasse: "montagsrunde" as const,
};

beforeEach(() => {
  vi.resetAllMocks();
  withState(undefined);
});

describe("VeranstaltungMetaForm", () => {
  it("should_preselectCurrentValues_when_rendered", () => {
    // #352 AK1: das Formular zeigt den Ist-Zustand – wer nur ein Feld ändert, darf die beiden
    // anderen nicht versehentlich überschreiben, weil sie leer bzw. auf dem Default stünden.
    render(<VeranstaltungMetaForm {...props} />);

    expect(screen.getByLabelText("Bezeichnung")).toHaveValue("Montagsrunde Juli");
    expect(screen.getByLabelText("Datum")).toHaveValue("2026-07-13");
    expect(screen.getByLabelText("Kasse")).toHaveValue("montagsrunde");
  });

  it("should_useFieldNamesExpectedByAction_when_rendered", () => {
    // Die Feldnamen sind der Vertrag zum `veranstaltungMetaSchema` – ein Tippfehler liefe
    // sonst erst zur Laufzeit in eine Pflichtfeld-Ablehnung.
    render(<VeranstaltungMetaForm {...props} />);

    expect(screen.getByLabelText("Bezeichnung")).toHaveAttribute("name", "bezeichnung");
    expect(screen.getByLabelText("Datum")).toHaveAttribute("name", "datum");
    expect(screen.getByLabelText("Kasse")).toHaveAttribute("name", "kasse");
  });

  it("should_offerBothKassen_when_rendered", () => {
    render(<VeranstaltungMetaForm {...props} />);

    const select = screen.getByLabelText("Kasse");
    expect([...select.querySelectorAll("option")].map((option) => option.textContent)).toEqual([
      "Montagsrunde",
      "Vereinskasse",
    ]);
  });

  it("should_includeHiddenId_when_rendered", () => {
    // Die Action liest die Veranstaltung aus FormData (analog setStatusAction/KatalogWechsel).
    render(<VeranstaltungMetaForm {...props} id="v-42" />);

    expect(screen.getByDisplayValue("v-42")).toHaveAttribute("name", "id");
  });

  it("should_notOfferCatalogField_when_rendered", () => {
    // #352: der Katalog bleibt dem eigenen Wechsel-Weg (#346) vorbehalten – ein Feld hier
    // würde dessen Verzehr-Sperre (AK4) umgehen.
    const { container } = render(<VeranstaltungMetaForm {...props} />);

    expect(container.querySelector("[name='catalogId']")).toBeNull();
  });

  it("should_showSubheadingBelowDialogTitle_when_rendered", () => {
    // ADR-056 D6: im Dialog „Einstellungen" ist dessen Titel die `h2` – das Formular trägt
    // eine Zwischenüberschrift eine Ebene tiefer.
    render(<VeranstaltungMetaForm {...props} />);

    expect(screen.getByRole("heading", { name: "Veranstaltung bearbeiten" }).tagName).toBe("H3");
  });

  it("should_showRejectionError_when_stateHasError", () => {
    // #352 AK2/AK3 + spec-391 FS2/FS3: die serverseitige Ablehnung wird im Formular sichtbar,
    // nicht verschluckt – als Fehler-`Notice` angesagt.
    withState({ error: "Die Veranstaltung ist abgeschlossen und schreibgeschützt." });
    render(<VeranstaltungMetaForm {...props} />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Die Veranstaltung ist abgeschlossen und schreibgeschützt.",
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("should_notShowInlineSuccessMessage_when_stateOk", () => {
    // spec-372 AK17: die Rückmeldung ist der Toast, keine zweite Meldung am Formular.
    withState({ ok: true });
    render(<VeranstaltungMetaForm {...props} />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByText(/gespeichert/i)).not.toBeInTheDocument();
  });

  it("should_reportGespeichert_when_actionSucceeds", async () => {
    // spec-372 AK12, Glossar: Erfolg nach Änderung = „Gespeichert".
    updateMock.mockResolvedValue({ ok: true });
    render(<VeranstaltungMetaForm {...props} />);

    await wrappedAction()(undefined, new FormData());

    expect(meldeErfolgMock).toHaveBeenCalledWith("Gespeichert");
  });

  it("should_notReport_when_actionRejects", async () => {
    updateMock.mockResolvedValue({ error: "Bezeichnung ist erforderlich." });
    render(<VeranstaltungMetaForm {...props} />);

    await wrappedAction()(undefined, new FormData());

    expect(meldeErfolgMock).not.toHaveBeenCalled();
  });

  it("should_offerSubmitButtonInSecondaryStyle_when_rendered", () => {
    // ADR-056 D6: Baustein `Button` statt Rohklassen – Absenden explizit `type="submit"`.
    render(<VeranstaltungMetaForm {...props} />);

    const button = screen.getByRole("button", { name: "Änderungen speichern" });
    expect(button).toHaveAttribute("type", "submit");
    expect(button).toHaveClass("border-line", "bg-surface");
  });

  it("should_keepRejectionErrorVisible_when_fieldEditedAfterRejection", async () => {
    // Die Fehlermeldung ist kein Zustandsbericht, sondern die Aufforderung zur Korrektur – sie
    // darf beim Tippen NICHT verschwinden.
    const user = userEvent.setup();
    withState({ error: "Bezeichnung ist erforderlich." });
    render(<VeranstaltungMetaForm {...props} />);

    await user.type(screen.getByLabelText("Bezeichnung"), "Sommerfest");

    expect(screen.getByText("Bezeichnung ist erforderlich.")).toBeInTheDocument();
  });

  it("should_disableButtonWithPendingText_when_pending", () => {
    withState(undefined, true);
    render(<VeranstaltungMetaForm {...props} />);

    expect(screen.getByRole("button", { name: /Speichern …/ })).toBeDisabled();
  });
});
