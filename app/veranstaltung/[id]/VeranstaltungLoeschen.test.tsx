import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { VeranstaltungFormState } from "../actions";

// Externe Grenze: Server Action aus derselben Feature-Schicht. `useActionState` bleibt echt –
// der Zustand je Öffnungs-Zyklus (`key`) ist genau das zu prüfende Verhalten (ADR-056 D4).
vi.mock("../actions", () => ({ deleteVeranstaltungAction: vi.fn() }));

import { deleteVeranstaltungAction } from "../actions";
import { VeranstaltungLoeschen } from "./VeranstaltungLoeschen";

const deleteMock = vi.mocked(deleteVeranstaltungAction);

const props = { id: "v-1", bezeichnung: "Montagsrunde Juli" };

// Offen gehaltene Action für die Pending-Tests. Jeder Test löst sie in `afterEach` innerhalb von
// `act` auf – sonst hielte ein nie aufgelöstes Promise den Action-Scope für spätere Tests offen
// (Lesson #370).
let laufendeActionBeenden: (() => void) | undefined;

function actionBleibtOffen() {
  deleteMock.mockImplementation(
    () =>
      new Promise<VeranstaltungFormState>((resolve) => {
        laufendeActionBeenden = () => resolve({});
      }),
  );
}

function papierkorb() {
  return screen.getByRole("button", { name: "Veranstaltung löschen" });
}

function dialogElement() {
  return document.querySelector("dialog")!;
}

async function bestaetigen() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Endgültig löschen" }));
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  laufendeActionBeenden = undefined;
});

afterEach(async () => {
  await act(async () => laufendeActionBeenden?.());
});

describe("VeranstaltungLoeschen – Auslöser (spec-391 AK3/AK11)", () => {
  it("should_renderDangerIconButton_when_rendered", () => {
    // AK3: Papierkorb als Symbol ohne Text, zugänglicher Name, 44 px, Gefahr-Token.
    render(<VeranstaltungLoeschen {...props} />);

    expect(papierkorb()).toHaveTextContent(/^$/);
    expect(papierkorb()).toHaveClass("size-11", "text-danger");
    expect(papierkorb().querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("should_notShowDialog_when_initiallyRendered", () => {
    // #352 AK8: der Bestätigungsdialog ist das Sicherheitsnetz – er darf nicht vorab offen
    // stehen, sonst wäre die Bestätigung ein einzelner Klick wie das Löschen selbst.
    render(<VeranstaltungLoeschen {...props} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("should_openDangerConfirmationNamingTheVeranstaltung_when_papierkorbTapped", () => {
    // AK11: der bestehende Bestätigungsdialog, Variante danger; er nennt die betroffene
    // Veranstaltung – sonst bestätigt man im Zweifel blind. Texte unverändert (spec-352).
    render(<VeranstaltungLoeschen {...props} />);

    fireEvent.click(papierkorb());

    const dialog = screen.getByRole("dialog", { name: "Veranstaltung löschen?" });
    expect(dialog).toHaveAccessibleDescription(
      "„Montagsrunde Juli“ wird endgültig entfernt – samt ihrer Teilnehmerzeilen. Das lässt sich nicht rückgängig machen.",
    );
    expect(screen.getByRole("button", { name: "Endgültig löschen" })).toHaveClass("bg-danger");
    expect(deleteMock).not.toHaveBeenCalled();
  });
});

describe("VeranstaltungLoeschen – Abbrechen (spec-391 AK11)", () => {
  it("should_closeWithoutDeletingAndFocusPapierkorb_when_cancelClicked", () => {
    // #352 AK8 + spec-391 AK11: Abbrechen löscht nichts, der Fokus kehrt auf den Papierkorb.
    render(<VeranstaltungLoeschen {...props} />);
    fireEvent.click(papierkorb());

    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));

    expect(dialogElement()).not.toHaveAttribute("open");
    expect(deleteMock).not.toHaveBeenCalled();
    expect(papierkorb()).toHaveFocus();
  });

  it("should_closeWithoutDeletingAndFocusPapierkorb_when_escapePressed", () => {
    render(<VeranstaltungLoeschen {...props} />);
    fireEvent.click(papierkorb());

    fireEvent(dialogElement(), new Event("cancel", { cancelable: true }));

    expect(dialogElement()).not.toHaveAttribute("open");
    expect(deleteMock).not.toHaveBeenCalled();
    expect(papierkorb()).toHaveFocus();
  });
});

describe("VeranstaltungLoeschen – Bestätigen (spec-391 AK12)", () => {
  it("should_submitWithHiddenId_when_confirmed", async () => {
    // Erst die explizite Bestätigung setzt die Action ab – mit der Veranstaltungs-Id, die die
    // Action aus FormData liest.
    deleteMock.mockResolvedValue({});
    render(<VeranstaltungLoeschen {...props} id="v-42" />);
    fireEvent.click(papierkorb());

    await bestaetigen();

    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(deleteMock.mock.calls[0][1].get("id")).toBe("v-42");
  });

  it("should_keepDialogOpenShowingRejection_when_serverRejects", async () => {
    // AK12 / #352 AK5/AK6/AK12: die Ablehnung steht dort, wo der Nutzer gerade steht – im
    // offenen Bestätigungsdialog (ADR-056 D4).
    const fehler = "Löschen nicht möglich: für diese Veranstaltung ist bereits Verzehr erfasst.";
    deleteMock.mockResolvedValue({ error: fehler });
    render(<VeranstaltungLoeschen {...props} />);
    fireEvent.click(papierkorb());

    await bestaetigen();

    expect(dialogElement()).toHaveAttribute("open");
    expect(screen.getByRole("alert")).toHaveTextContent(fehler);
  });

  it("should_notShowPreviousRejection_when_dialogReopened", async () => {
    // Jedes Öffnen ist ein neuer Versuch: die Ablehnung von vorhin gehört nicht über einen
    // Löschvorgang, der in diesem Zyklus noch gar nicht versucht wurde.
    deleteMock.mockResolvedValue({ error: "Löschen nicht möglich: bereits Geld kassiert." });
    render(<VeranstaltungLoeschen {...props} />);
    fireEvent.click(papierkorb());
    await bestaetigen();
    expect(screen.getByRole("alert")).toBeInTheDocument(); // Ausgangslage: Ablehnung steht
    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));

    fireEvent.click(papierkorb());

    expect(dialogElement()).toHaveAttribute("open");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("VeranstaltungLoeschen – während die Action läuft", () => {
  it("should_disableBothButtonsWithPendingText_when_pending", async () => {
    // Bliebe „Abbrechen" klickbar, verspräche die Beschriftung das Gegenteil dessen, was
    // geschieht: der Dialog schlösse sich, die abgesetzte Action löschte trotzdem.
    actionBleibtOffen();
    render(<VeranstaltungLoeschen {...props} />);
    fireEvent.click(papierkorb());

    await bestaetigen();

    expect(screen.getByRole("button", { name: "Löschen …" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Abbrechen" })).toBeDisabled();
  });

  it("should_stayOpen_when_escapePressedWhilePending", async () => {
    actionBleibtOffen();
    render(<VeranstaltungLoeschen {...props} />);
    fireEvent.click(papierkorb());
    await bestaetigen();
    expect(screen.getByRole("button", { name: "Löschen …" })).toBeInTheDocument(); // läuft

    fireEvent(dialogElement(), new Event("cancel", { cancelable: true }));

    expect(dialogElement()).toHaveAttribute("open");
  });
});
