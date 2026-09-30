import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";

vi.mock("./actions", () => ({ addZeilenAction: vi.fn(), createWalkInAction: vi.fn() }));

import { addZeilenAction, createWalkInAction } from "./actions";
import { TeilnehmerHinzufuegenDialog } from "./TeilnehmerHinzufuegenDialog";

const addZeilenActionMock = vi.mocked(addZeilenAction);
const createWalkInActionMock = vi.mocked(createWalkInAction);

const VERFUEGBAR = [
  { id: "t-1", name: "Anna Beispiel" },
  { id: "t-2", name: "Bernd Muster" },
  { id: "t-3", name: "Familie Annabell" },
];

function renderDialog(verfuegbar = VERFUEGBAR) {
  render(<TeilnehmerHinzufuegenDialog veranstaltungId="v-1" verfuegbar={verfuegbar} />);
}

function oeffnen() {
  fireEvent.click(screen.getByRole("button", { name: "+ Teilnehmer" }));
  return screen.getByRole("dialog", { name: "Teilnehmer hinzufügen" });
}

function dialogElement() {
  return document.querySelector("dialog")!;
}

function auswahlBereich() {
  return within(screen.getByRole("group", { name: "Stammteilnehmer" }));
}

function gastBereich() {
  return within(screen.getByRole("group", { name: "Neuer Gast" }));
}

async function absenden(button: HTMLElement) {
  await act(async () => {
    fireEvent.click(button);
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  addZeilenActionMock.mockResolvedValue({ ok: true });
  createWalkInActionMock.mockResolvedValue({ ok: true });
});

describe("TeilnehmerHinzufuegenDialog (spec-369 AK10–AK16, FS1–FS3)", () => {
  it("should_openOneDialogWithStammteilnehmerAboveNeuerGast_when_triggerTapped", () => {
    // AK10: EIN Dialog, oben die Auswahl, darunter „Neuer Gast".
    renderDialog();

    const dialog = oeffnen();

    const bereiche = within(dialog).getAllByRole("group");
    expect(bereiche.map((bereich) => bereich.getAttribute("aria-label"))).toEqual([
      "Stammteilnehmer",
      "Neuer Gast",
    ]);
    expect(auswahlBereich().getAllByRole("checkbox")).toHaveLength(3);
  });

  it("should_meetTouchSize_when_triggerRendered", () => {
    renderDialog();

    expect(screen.getByRole("button", { name: "+ Teilnehmer" })).toHaveClass("min-h-11");
  });

  it("should_showOnlyMatchingCaseInsensitive_when_searchTermEntered", () => {
    // AK11: Groß-/Kleinschreibung egal, Treffer im Namen.
    renderDialog();
    oeffnen();

    fireEvent.change(auswahlBereich().getByRole("searchbox", { name: "Suchen" }), {
      target: { value: "ANNA" },
    });

    expect(
      auswahlBereich()
        .getAllByRole("checkbox")
        .map((box) => box.getAttribute("value")),
    ).toEqual(["t-1", "t-3"]);
  });

  it("should_showEmptyState_when_searchHasNoMatch", () => {
    renderDialog();
    oeffnen();

    fireEvent.change(auswahlBereich().getByRole("searchbox", { name: "Suchen" }), {
      target: { value: "Zacharias" },
    });

    expect(auswahlBereich().queryAllByRole("checkbox")).toHaveLength(0);
    expect(auswahlBereich().getByText("Kein Stammteilnehmer passt zu „Zacharias“.")).toBeVisible();
  });

  it("should_submitAllCheckedAndClose_when_hinzufuegenTapped", async () => {
    // AK12: mehrere angehakt → alle an die Action, Dialog schließt bei Erfolg.
    renderDialog();
    oeffnen();
    fireEvent.click(auswahlBereich().getByRole("checkbox", { name: "Anna Beispiel" }));
    fireEvent.click(auswahlBereich().getByRole("checkbox", { name: "Bernd Muster" }));

    await absenden(auswahlBereich().getByRole("button", { name: "Hinzufügen" }));

    const formData = addZeilenActionMock.mock.calls[0][1];
    expect(formData.get("veranstaltungId")).toBe("v-1");
    expect(formData.getAll("teilnehmerId")).toEqual(["t-1", "t-2"]);
    expect(dialogElement()).not.toHaveAttribute("open");
  });

  it("should_keepCheckedSelection_when_searchHidesIt", async () => {
    // Die Suche ist nur ein Filter der Anzeige – eine bereits angehakte Person bleibt gewählt.
    renderDialog();
    oeffnen();
    fireEvent.click(auswahlBereich().getByRole("checkbox", { name: "Bernd Muster" }));
    fireEvent.change(auswahlBereich().getByRole("searchbox", { name: "Suchen" }), {
      target: { value: "anna" },
    });
    fireEvent.click(auswahlBereich().getByRole("checkbox", { name: "Anna Beispiel" }));

    await absenden(auswahlBereich().getByRole("button", { name: "Hinzufügen" }));

    expect(addZeilenActionMock.mock.calls[0][1].getAll("teilnehmerId")).toEqual(["t-1", "t-2"]);
  });

  it("should_stayOpenAndShowReason_when_serverRejectsSelection", async () => {
    // AK14 (Meldung aus der Zod-Grenze der Action) – ebenso FS1/FS2: der Dialog bleibt offen.
    addZeilenActionMock.mockResolvedValue({ error: "Bitte mindestens einen Teilnehmer wählen." });
    renderDialog();
    oeffnen();

    await absenden(auswahlBereich().getByRole("button", { name: "Hinzufügen" }));

    expect(dialogElement()).toHaveAttribute("open");
    expect(auswahlBereich().getByRole("alert")).toHaveTextContent(
      "Bitte mindestens einen Teilnehmer wählen.",
    );
  });

  it("should_createGastAndClose_when_nameConfirmed", async () => {
    // AK13: gleiche Wirkung wie der bisherige Walk-in – dieselbe Action, dieselben Felder.
    renderDialog();
    oeffnen();
    fireEvent.change(gastBereich().getByRole("textbox", { name: "Name" }), {
      target: { value: "Gustav Gast" },
    });
    fireEvent.click(gastBereich().getByRole("checkbox", { name: "Mitglied" }));

    await absenden(gastBereich().getByRole("button", { name: "Gast hinzufügen" }));

    const formData = createWalkInActionMock.mock.calls[0][1];
    expect(formData.get("veranstaltungId")).toBe("v-1");
    expect(formData.get("name")).toBe("Gustav Gast");
    expect(formData.get("typ")).toBe("person");
    expect(formData.get("mitglied")).toBe("on");
    expect(dialogElement()).not.toHaveAttribute("open");
  });

  it("should_limitGastNameToSchemaMaximum_when_rendered", () => {
    // Dieselbe Grenze wie `teilnehmerSchema` (200 Zeichen) – keine zweite, abweichende Zahl.
    renderDialog();
    oeffnen();

    expect(gastBereich().getByRole("textbox", { name: "Name" })).toHaveAttribute(
      "maxLength",
      "200",
    );
  });

  it("should_stayOpenAndShowFieldError_when_gastNameRejected", async () => {
    // FS3: Feldfehler aus der Validierung des Walk-in.
    createWalkInActionMock.mockResolvedValue({ error: "Anzeigename ist erforderlich." });
    renderDialog();
    oeffnen();
    fireEvent.change(gastBereich().getByRole("textbox", { name: "Name" }), {
      target: { value: "   " },
    });

    await absenden(gastBereich().getByRole("button", { name: "Gast hinzufügen" }));

    expect(dialogElement()).toHaveAttribute("open");
    const name = gastBereich().getByRole("textbox", { name: "Name" });
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(name).toHaveAccessibleDescription("Anzeigename ist erforderlich.");
  });

  it("should_closeWithoutChangeAndFocusTrigger_when_abbrechenTapped", () => {
    // AK15. Kein `trigger.focus()` vorab: Safari fokussiert einen getippten Button nicht, der
    // Rücksprung darf daran nicht hängen.
    renderDialog();
    const trigger = screen.getByRole("button", { name: "+ Teilnehmer" });
    oeffnen();

    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));

    expect(dialogElement()).not.toHaveAttribute("open");
    expect(trigger).toHaveFocus();
    expect(addZeilenActionMock).not.toHaveBeenCalled();
    expect(createWalkInActionMock).not.toHaveBeenCalled();
  });

  it("should_closeWithoutChangeAndFocusTrigger_when_escapePressed", () => {
    // AK15 verlangt den Fokus-Rücksprung auch bei Escape.
    renderDialog();
    oeffnen();

    fireEvent(dialogElement(), new Event("cancel", { cancelable: true }));

    expect(dialogElement()).not.toHaveAttribute("open");
    expect(screen.getByRole("button", { name: "+ Teilnehmer" })).toHaveFocus();
    expect(addZeilenActionMock).not.toHaveBeenCalled();
  });

  it("should_keepRejectionVisible_when_lastAvailablePersonWasRejected", async () => {
    // FS2: war die abgelehnte Person die letzte verfügbare, ist `verfuegbar` nach dem
    // Neu-Rendern leer – die Meldung mit ihrem Namen muss trotzdem stehen bleiben.
    const meldung = "Nicht mehr wählbar: Anna Beispiel. Es wurde niemand hinzugefügt.";
    addZeilenActionMock.mockResolvedValue({ error: meldung });
    const { rerender } = render(
      <TeilnehmerHinzufuegenDialog veranstaltungId="v-1" verfuegbar={[VERFUEGBAR[0]]} />,
    );
    oeffnen();
    fireEvent.click(auswahlBereich().getByRole("checkbox", { name: "Anna Beispiel" }));
    await absenden(auswahlBereich().getByRole("button", { name: "Hinzufügen" }));

    rerender(<TeilnehmerHinzufuegenDialog veranstaltungId="v-1" verfuegbar={[]} />);

    expect(auswahlBereich().getByRole("alert")).toHaveTextContent(meldung);
    expect(
      auswahlBereich().getByText("Alle aktiven Stammteilnehmer sind bereits erfasst."),
    ).toBeVisible();
  });

  it("should_startFresh_when_reopenedAfterRejection", async () => {
    // Kinder werden nur bei offenem Dialog gemountet (ADR-053 D1): Suche, Häkchen und Meldung
    // aus dem letzten Durchlauf bleiben nicht stehen.
    addZeilenActionMock.mockResolvedValue({ error: "Abgelehnt." });
    renderDialog();
    oeffnen();
    fireEvent.click(auswahlBereich().getByRole("checkbox", { name: "Anna Beispiel" }));
    await absenden(auswahlBereich().getByRole("button", { name: "Hinzufügen" }));
    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));

    oeffnen();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(auswahlBereich().getByRole("checkbox", { name: "Anna Beispiel" })).not.toBeChecked();
  });

  it("should_explainAndKeepGastUsable_when_allStammteilnehmerErfasst", () => {
    // AK16
    renderDialog([]);
    oeffnen();

    expect(
      auswahlBereich().getByText("Alle aktiven Stammteilnehmer sind bereits erfasst."),
    ).toBeVisible();
    expect(auswahlBereich().queryByRole("button", { name: "Hinzufügen" })).not.toBeInTheDocument();
    expect(gastBereich().getByRole("button", { name: "Gast hinzufügen" })).toBeEnabled();
  });

  describe("während eine Action läuft", () => {
    function neverResolving() {
      return new Promise<never>(() => {});
    }

    it("should_lockCloseAndShowPendingLabel_when_stammteilnehmerActionRuns", async () => {
      addZeilenActionMock.mockImplementation(neverResolving);
      renderDialog();
      oeffnen();
      fireEvent.click(auswahlBereich().getByRole("checkbox", { name: "Anna Beispiel" }));

      await absenden(auswahlBereich().getByRole("button", { name: "Hinzufügen" }));
      const cancel = new Event("cancel", { cancelable: true });
      fireEvent(dialogElement(), cancel);

      expect(cancel.defaultPrevented).toBe(true);
      expect(dialogElement()).toHaveAttribute("open");
      expect(screen.getByRole("button", { name: "Abbrechen" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Hinzufügen …" })).toBeDisabled();
    });

    it("should_lockCloseAndShowPendingLabel_when_gastActionRuns", async () => {
      createWalkInActionMock.mockImplementation(neverResolving);
      renderDialog();
      oeffnen();
      fireEvent.change(gastBereich().getByLabelText("Name"), { target: { value: "Gast Eins" } });

      await absenden(gastBereich().getByRole("button", { name: "Gast hinzufügen" }));
      fireEvent(dialogElement(), new Event("cancel", { cancelable: true }));

      expect(dialogElement()).toHaveAttribute("open");
      expect(screen.getByRole("button", { name: "Abbrechen" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Anlegen …" })).toBeDisabled();
    });

    it("should_unlockClose_when_actionRejected", async () => {
      addZeilenActionMock.mockResolvedValue({ error: "Nicht mehr wählbar: Anna Beispiel" });
      renderDialog();
      oeffnen();
      fireEvent.click(auswahlBereich().getByRole("checkbox", { name: "Anna Beispiel" }));

      await absenden(auswahlBereich().getByRole("button", { name: "Hinzufügen" }));

      expect(screen.getByRole("button", { name: "Abbrechen" })).toBeEnabled();
    });
  });
});
