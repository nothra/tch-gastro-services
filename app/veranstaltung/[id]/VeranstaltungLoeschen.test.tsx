import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { VeranstaltungFormState } from "../actions";

// Externe Grenze: Server Action aus derselben Feature-Schicht.
vi.mock("../actions", () => ({ deleteVeranstaltungAction: vi.fn() }));

// Nur `useActionState` wird ersetzt – `useState` bleibt echt, weil das Auf- und Zuklappen des
// Bestätigungsdialogs genau das zu prüfende Verhalten ist (AK8).
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return { ...actual, useActionState: vi.fn() };
});

import { useActionState } from "react";
import { VeranstaltungLoeschen } from "./VeranstaltungLoeschen";

const useActionStateMock = vi.mocked(useActionState);
const dispatchMock = vi.fn();

function withState(state: VeranstaltungFormState | undefined, isPending = false) {
  useActionStateMock.mockReturnValue([state, dispatchMock, isPending] as never);
}

const props = { id: "v-1", bezeichnung: "Montagsrunde Juli" };

beforeEach(() => {
  vi.resetAllMocks();
  withState(undefined);
});

describe("VeranstaltungLoeschen", () => {
  it("should_notShowDialog_when_initiallyRendered", () => {
    // #352 AK8: der Bestätigungsdialog ist das Sicherheitsnetz – er darf nicht vorab offen
    // stehen, sonst wäre die Bestätigung ein einzelner Klick wie das Löschen selbst.
    render(<VeranstaltungLoeschen {...props} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Veranstaltung löschen" })).toBeInTheDocument();
  });

  it("should_openDialogNamingTheVeranstaltung_when_deleteClicked", async () => {
    // Der Dialog nennt die betroffene Veranstaltung – sonst bestätigt man im Zweifel blind.
    const user = userEvent.setup();
    render(<VeranstaltungLoeschen {...props} />);

    await user.click(screen.getByRole("button", { name: "Veranstaltung löschen" }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent("Montagsrunde Juli");
  });

  it("should_notSubmit_when_dialogOpenedButNotConfirmed", async () => {
    // #352 AK8, Kern: das bloße Öffnen des Dialogs löst noch kein Löschen aus.
    const user = userEvent.setup();
    render(<VeranstaltungLoeschen {...props} />);

    await user.click(screen.getByRole("button", { name: "Veranstaltung löschen" }));

    expect(dispatchMock).not.toHaveBeenCalled();
  });

  it("should_closeDialogAndNotSubmit_when_cancelClicked", async () => {
    // #352 AK8: „Abbrechen löscht nichts" – geprüft wird beides, das Schließen UND dass keine
    // Action abgesetzt wurde.
    const user = userEvent.setup();
    render(<VeranstaltungLoeschen {...props} />);

    await user.click(screen.getByRole("button", { name: "Veranstaltung löschen" }));
    await user.click(screen.getByRole("button", { name: "Abbrechen" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(dispatchMock).not.toHaveBeenCalled();
  });

  it("should_submitWithHiddenId_when_confirmed", async () => {
    // Erst die explizite Bestätigung setzt die Action ab – mit der Veranstaltungs-Id, die die
    // Action aus FormData liest.
    const user = userEvent.setup();
    render(<VeranstaltungLoeschen {...props} id="v-42" />);

    await user.click(screen.getByRole("button", { name: "Veranstaltung löschen" }));

    expect(screen.getByDisplayValue("v-42")).toHaveAttribute("name", "id");
    await user.click(screen.getByRole("button", { name: "Endgültig löschen" }));

    expect(dispatchMock).toHaveBeenCalled();
  });

  it("should_showRejectionErrorInsideDialog_when_submittedAndStateHasError", async () => {
    // #352 AK5/AK6/AK12: die serverseitige Sperre wird sichtbar – und zwar dort, wo der Nutzer
    // gerade steht (im offenen Dialog), statt hinter ihm zu verschwinden.
    const user = userEvent.setup();
    withState({
      error: "Löschen nicht möglich: für diese Veranstaltung ist bereits Verzehr erfasst.",
    });
    render(<VeranstaltungLoeschen {...props} />);

    await user.click(screen.getByRole("button", { name: "Veranstaltung löschen" }));
    await user.click(screen.getByRole("button", { name: "Endgültig löschen" }));

    expect(screen.getByRole("dialog")).toHaveTextContent(
      "Löschen nicht möglich: für diese Veranstaltung ist bereits Verzehr erfasst.",
    );
  });

  it("should_notShowPreviousError_when_dialogReopenedAfterCancel", async () => {
    // Der `useActionState`-State überlebt das Schließen des Dialogs. Ohne Bindung an den
    // Öffnungs-Zyklus stünde die alte Ablehnung sofort wieder da – über einem Löschvorgang, der
    // in diesem Zyklus noch gar nicht versucht wurde.
    const user = userEvent.setup();
    const fehler = "Löschen nicht möglich: für diese Veranstaltung ist bereits Geld kassiert.";
    withState({ error: fehler });
    render(<VeranstaltungLoeschen {...props} />);

    await user.click(screen.getByRole("button", { name: "Veranstaltung löschen" }));
    await user.click(screen.getByRole("button", { name: "Endgültig löschen" }));
    expect(screen.getByRole("dialog")).toHaveTextContent(fehler); // Ausgangslage: Fehler steht

    await user.click(screen.getByRole("button", { name: "Abbrechen" }));
    await user.click(screen.getByRole("button", { name: "Veranstaltung löschen" }));

    expect(screen.getByRole("dialog")).not.toHaveTextContent(fehler);
  });

  it("should_disableConfirmButtonWithPendingText_when_pending", async () => {
    const user = userEvent.setup();
    withState(undefined, true);
    render(<VeranstaltungLoeschen {...props} />);

    await user.click(screen.getByRole("button", { name: "Veranstaltung löschen" }));

    expect(screen.getByRole("button", { name: /Löschen …/ })).toBeDisabled();
  });

  it("should_disableCancelButton_when_pending", async () => {
    // Bliebe „Abbrechen" im Pending-Fenster klickbar, verspräche die Beschriftung das Gegenteil
    // dessen, was geschieht: der Dialog schlösse sich, die bereits abgesetzte Action liefe
    // serverseitig zu Ende und löschte. Bewusste Abweichung vom Vorbild `CatalogControls`, das
    // „Abbrechen" aktiv lässt – dort begleitet es ein reversibles Anlegen/Umbenennen, hier einen
    // unumkehrbaren Hard-Delete.
    const user = userEvent.setup();
    withState(undefined, true);
    render(<VeranstaltungLoeschen {...props} />);

    await user.click(screen.getByRole("button", { name: "Veranstaltung löschen" }));

    expect(screen.getByRole("button", { name: "Abbrechen" })).toBeDisabled();
  });
});
