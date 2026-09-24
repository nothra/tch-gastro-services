import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { VeranstaltungFormState } from "../actions";

// Externe Grenze: Server Action aus derselben Feature-Schicht.
vi.mock("../actions", () => ({ updateVeranstaltungMetaAction: vi.fn() }));

// useActionState steuert Fehler/Pending direkt (Codify #49, analog KatalogWechsel) – so ist die
// serverseitige Ablehnung ohne echten Submit prüfbar.
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return { ...actual, useActionState: vi.fn() };
});

import { useActionState } from "react";
import { VeranstaltungMetaForm } from "./VeranstaltungMetaForm";

const useActionStateMock = vi.mocked(useActionState);
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

  it("should_showRejectionError_when_stateHasError", () => {
    // #352 AK2/AK3: die serverseitige Ablehnung wird im Formular sichtbar, nicht verschluckt.
    withState({ error: "Die Veranstaltung ist abgeschlossen und schreibgeschützt." });
    render(<VeranstaltungMetaForm {...props} />);

    expect(
      screen.getByText("Die Veranstaltung ist abgeschlossen und schreibgeschützt."),
    ).toBeInTheDocument();
  });

  it("should_showSuccessMessage_when_stateOk", () => {
    withState({ ok: true });
    render(<VeranstaltungMetaForm {...props} />);

    expect(screen.getByText("Änderungen gespeichert.")).toBeInTheDocument();
  });

  it("should_disableButtonWithPendingText_when_pending", () => {
    withState(undefined, true);
    render(<VeranstaltungMetaForm {...props} />);

    expect(screen.getByRole("button", { name: /Speichern …/ })).toBeDisabled();
  });
});
