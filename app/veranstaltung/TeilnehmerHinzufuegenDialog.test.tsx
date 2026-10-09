import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";

vi.mock("./actions", () => ({ addZeilenAction: vi.fn(), createWalkInAction: vi.fn() }));
vi.mock("@/app/components/ui/meldung", () => ({ meldeErfolg: vi.fn() }));

import { meldeErfolg } from "@/app/components/ui/meldung";
import { addZeilenAction, createWalkInAction } from "./actions";
import { TeilnehmerHinzufuegenDialog } from "./TeilnehmerHinzufuegenDialog";

const addZeilenActionMock = vi.mocked(addZeilenAction);
const createWalkInActionMock = vi.mocked(createWalkInAction);
const meldeErfolgMock = vi.mocked(meldeErfolg);

const VERFUEGBAR = [
  { id: "t-1", name: "Anna Beispiel" },
  { id: "t-2", name: "Bernd Muster" },
  { id: "t-3", name: "Familie Annabell" },
];

const DUPLIKAT_WARNUNG = "Ein aktiver Teilnehmer mit diesem Namen existiert bereits.";
const HINWEIS_DIREKT_HINZUGEFUEGT =
  "Der Teilnehmer wird angelegt und direkt zu dieser Veranstaltung hinzugefügt.";

function renderDialog(verfuegbar = VERFUEGBAR) {
  render(<TeilnehmerHinzufuegenDialog veranstaltungId="v-1" verfuegbar={verfuegbar} />);
}

function ausloeser() {
  return screen.getByRole("button", { name: "Teilnehmer hinzufügen" });
}

function oeffnen() {
  fireEvent.click(ausloeser());
  return auswahlSchritt();
}

function auswahlSchritt() {
  return screen.getByRole("dialog", { name: "Teilnehmer hinzufügen" });
}

function anlegeSchritt() {
  return screen.getByRole("dialog", { name: "Teilnehmer anlegen" });
}

function dialogElement() {
  return document.querySelector("dialog")!;
}

function im(schritt: HTMLElement) {
  return within(schritt);
}

function suche(begriff: string) {
  fireEvent.change(im(auswahlSchritt()).getByRole("searchbox", { name: "Suchen" }), {
    target: { value: begriff },
  });
}

function zumAnlegen(absprung = "Teilnehmer anlegen") {
  fireEvent.click(im(auswahlSchritt()).getByRole("button", { name: absprung }));
  return anlegeSchritt();
}

function nameFeld() {
  return im(anlegeSchritt()).getByRole("textbox", { name: "Name" });
}

async function absenden(button: HTMLElement) {
  await act(async () => {
    fireEvent.click(button);
  });
}

function buttonNamen(schritt: HTMLElement) {
  return im(schritt)
    .getAllByRole("button")
    .map((button) => button.textContent);
}

beforeEach(() => {
  vi.resetAllMocks();
  addZeilenActionMock.mockResolvedValue({ ok: true });
  createWalkInActionMock.mockResolvedValue({ ok: true });
});

describe("TeilnehmerHinzufuegenDialog – Auslöser (spec-404 AK7)", () => {
  it("should_beNamedTeilnehmerHinzufuegen_when_rendered", () => {
    renderDialog();

    expect(ausloeser()).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "+ Teilnehmer" })).not.toBeInTheDocument();
  });

  it("should_meetTouchSize_when_triggerRendered", () => {
    renderDialog();

    expect(ausloeser()).toHaveClass("min-h-11");
  });
});

describe("TeilnehmerHinzufuegenDialog – Auswahl (spec-404 AK2, AK5; spec-369 AK11–AK16)", () => {
  it("should_offerOnlySearchSelectionAndActions_when_opened", () => {
    // AK2: Suche, Mehrfachauswahl, Absprung, „Abbrechen" und „Hinzufügen" – kein Namensfeld,
    // kein Typ, keine Mitglied-Checkbox.
    renderDialog();

    const schritt = oeffnen();

    expect(im(schritt).getByRole("searchbox", { name: "Suchen" })).toBeInTheDocument();
    expect(im(schritt).getAllByRole("checkbox")).toHaveLength(3);
    expect(buttonNamen(schritt)).toEqual(["Teilnehmer anlegen", "Abbrechen", "Hinzufügen"]);
    expect(im(schritt).queryByRole("textbox", { name: "Name" })).not.toBeInTheDocument();
    expect(im(schritt).queryByRole("combobox", { name: "Typ" })).not.toBeInTheDocument();
    expect(im(schritt).queryByRole("checkbox", { name: "Mitglied" })).not.toBeInTheDocument();
  });

  it("should_mentionNeitherGastNorStammteilnehmer_when_opened", () => {
    // AK1/AK5
    renderDialog();

    const schritt = oeffnen();

    expect(schritt.textContent).not.toMatch(/Gast|Stammteilnehmer/);
    expect(im(schritt).queryAllByRole("group", { name: /Stammteilnehmer/ })).toHaveLength(0);
  });

  it("should_showOnlyMatchingCaseInsensitive_when_searchTermEntered", () => {
    // spec-369 AK11: Groß-/Kleinschreibung egal, Treffer im Namen.
    renderDialog();
    oeffnen();

    suche("ANNA");

    expect(
      im(auswahlSchritt())
        .getAllByRole("checkbox")
        .map((box) => box.getAttribute("value")),
    ).toEqual(["t-1", "t-3"]);
  });

  it("should_showEmptyStateAndNamedAbsprung_when_searchHasNoMatch", () => {
    // AK3.3 + Q4: Kein-Treffer-Text ohne „Stamm…", Absprung nennt den Suchtext.
    renderDialog();
    oeffnen();

    suche("  Zacharias ");

    expect(im(auswahlSchritt()).queryAllByRole("checkbox")).toHaveLength(0);
    expect(im(auswahlSchritt()).getByText("Kein Teilnehmer passt zu „Zacharias“.")).toBeVisible();
    expect(
      im(auswahlSchritt()).getByRole("button", { name: "„Zacharias“ als Teilnehmer anlegen" }),
    ).toBeEnabled();
    expect(auswahlSchritt().textContent).not.toMatch(/Gast|Stammteilnehmer/);
  });

  it("should_submitAllCheckedAndClose_when_hinzufuegenTapped", async () => {
    // spec-369 AK12: mehrere angehakt → alle an die Action, Dialog schließt bei Erfolg.
    renderDialog();
    oeffnen();
    fireEvent.click(im(auswahlSchritt()).getByRole("checkbox", { name: "Anna Beispiel" }));
    fireEvent.click(im(auswahlSchritt()).getByRole("checkbox", { name: "Bernd Muster" }));

    await absenden(im(auswahlSchritt()).getByRole("button", { name: "Hinzufügen" }));

    const formData = addZeilenActionMock.mock.calls[0][1];
    expect(formData.get("veranstaltungId")).toBe("v-1");
    expect(formData.getAll("teilnehmerId")).toEqual(["t-1", "t-2"]);
    expect(dialogElement()).not.toHaveAttribute("open");
    // spec-372 AK12.
    expect(meldeErfolgMock).toHaveBeenCalledWith("Teilnehmer hinzugefügt");
  });

  it("should_keepCheckedSelection_when_searchHidesIt", async () => {
    // Die Suche ist nur ein Filter der Anzeige – eine bereits angehakte Person bleibt gewählt.
    renderDialog();
    oeffnen();
    fireEvent.click(im(auswahlSchritt()).getByRole("checkbox", { name: "Bernd Muster" }));
    suche("anna");
    fireEvent.click(im(auswahlSchritt()).getByRole("checkbox", { name: "Anna Beispiel" }));

    await absenden(im(auswahlSchritt()).getByRole("button", { name: "Hinzufügen" }));

    expect(addZeilenActionMock.mock.calls[0][1].getAll("teilnehmerId")).toEqual(["t-1", "t-2"]);
  });

  it("should_notSubmitPerson_when_checkedThenUnchecked", async () => {
    renderDialog();
    oeffnen();
    fireEvent.click(im(auswahlSchritt()).getByRole("checkbox", { name: "Anna Beispiel" }));
    fireEvent.click(im(auswahlSchritt()).getByRole("checkbox", { name: "Bernd Muster" }));
    fireEvent.click(im(auswahlSchritt()).getByRole("checkbox", { name: "Anna Beispiel" }));

    await absenden(im(auswahlSchritt()).getByRole("button", { name: "Hinzufügen" }));

    expect(addZeilenActionMock.mock.calls[0][1].getAll("teilnehmerId")).toEqual(["t-2"]);
  });

  it("should_stayOpenAndShowReason_when_serverRejectsSelection", async () => {
    // spec-369 AK14 (Meldung aus der Zod-Grenze der Action) – ebenso FS1/FS2: Dialog bleibt offen.
    addZeilenActionMock.mockResolvedValue({ error: "Bitte mindestens einen Teilnehmer wählen." });
    renderDialog();
    oeffnen();

    await absenden(im(auswahlSchritt()).getByRole("button", { name: "Hinzufügen" }));

    expect(dialogElement()).toHaveAttribute("open");
    expect(im(auswahlSchritt()).getByRole("alert")).toHaveTextContent(
      "Bitte mindestens einen Teilnehmer wählen.",
    );
    expect(meldeErfolgMock).not.toHaveBeenCalled();
  });

  it("should_closeWithoutChangeAndFocusTrigger_when_abbrechenTapped", () => {
    // spec-369 AK15. Kein `trigger.focus()` vorab: Safari fokussiert einen getippten Button nicht,
    // der Rücksprung darf daran nicht hängen.
    renderDialog();
    const trigger = ausloeser();
    oeffnen();

    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));

    expect(dialogElement()).not.toHaveAttribute("open");
    expect(trigger).toHaveFocus();
    expect(addZeilenActionMock).not.toHaveBeenCalled();
    expect(createWalkInActionMock).not.toHaveBeenCalled();
  });

  it("should_closeWithoutChangeAndFocusTrigger_when_escapePressed", () => {
    // spec-369 AK15 verlangt den Fokus-Rücksprung auch bei Escape.
    renderDialog();
    oeffnen();

    fireEvent(dialogElement(), new Event("cancel", { cancelable: true }));

    expect(dialogElement()).not.toHaveAttribute("open");
    expect(ausloeser()).toHaveFocus();
    expect(addZeilenActionMock).not.toHaveBeenCalled();
  });

  it("should_keepRejectionVisible_when_lastAvailablePersonWasRejected", async () => {
    // spec-369 FS2: war die abgelehnte Person die letzte verfügbare, ist `verfuegbar` nach dem
    // Neu-Rendern leer – die Meldung mit ihrem Namen muss trotzdem stehen bleiben.
    const meldung = "Nicht mehr wählbar: Anna Beispiel. Es wurde niemand hinzugefügt.";
    addZeilenActionMock.mockResolvedValue({ error: meldung });
    const { rerender } = render(
      <TeilnehmerHinzufuegenDialog veranstaltungId="v-1" verfuegbar={[VERFUEGBAR[0]]} />,
    );
    oeffnen();
    fireEvent.click(im(auswahlSchritt()).getByRole("checkbox", { name: "Anna Beispiel" }));
    await absenden(im(auswahlSchritt()).getByRole("button", { name: "Hinzufügen" }));

    rerender(<TeilnehmerHinzufuegenDialog veranstaltungId="v-1" verfuegbar={[]} />);

    expect(im(auswahlSchritt()).getByRole("alert")).toHaveTextContent(meldung);
    expect(
      im(auswahlSchritt()).getByText("Alle aktiven Teilnehmer sind bereits hinzugefügt."),
    ).toBeVisible();
  });

  it("should_startFresh_when_reopenedAfterRejection", async () => {
    // Kinder werden nur bei offenem Dialog gemountet (ADR-053 D1): Suche, Häkchen und Meldung
    // aus dem letzten Durchlauf bleiben nicht stehen.
    addZeilenActionMock.mockResolvedValue({ error: "Abgelehnt." });
    renderDialog();
    oeffnen();
    fireEvent.click(im(auswahlSchritt()).getByRole("checkbox", { name: "Anna Beispiel" }));
    await absenden(im(auswahlSchritt()).getByRole("button", { name: "Hinzufügen" }));
    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));

    oeffnen();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(im(auswahlSchritt()).getByRole("checkbox", { name: "Anna Beispiel" })).not.toBeChecked();
  });

  it("should_explainAndOfferAnlegen_when_allTeilnehmerAlreadyAdded", () => {
    // spec-369 AK16, spec-404 Q4: Ersatztext ohne „Stamm…", Anlegen bleibt erreichbar.
    renderDialog([]);

    const schritt = oeffnen();

    expect(
      im(schritt).getByText("Alle aktiven Teilnehmer sind bereits hinzugefügt."),
    ).toBeVisible();
    expect(im(schritt).queryByRole("button", { name: "Hinzufügen" })).not.toBeInTheDocument();
    expect(im(schritt).getByRole("button", { name: "Teilnehmer anlegen" })).toBeEnabled();
    expect(schritt.textContent).not.toMatch(/Gast|Stammteilnehmer/);
  });
});

describe("TeilnehmerHinzufuegenDialog – Schritt „Teilnehmer anlegen“ (spec-404 AK3, AK4)", () => {
  it("should_switchToAnlegeSchrittWithZurueck_when_absprungTapped", () => {
    // AK3.1
    renderDialog();
    oeffnen();

    const schritt = zumAnlegen();

    expect(im(schritt).getByRole("button", { name: "← Zur Auswahl" })).toBeEnabled();
    expect(screen.queryByRole("dialog", { name: "Teilnehmer hinzufügen" })).not.toBeInTheDocument();
    expect(nameFeld()).toHaveValue("");
  });

  it("should_focusNameField_when_absprungTapped", () => {
    // Der Absprung hängt sich mit dem Wechsel selbst aus (Lesson #371) – ohne neues Ziel landete
    // der Fokus auf <body> im modalen Dialog.
    renderDialog();
    oeffnen();

    zumAnlegen();

    expect(nameFeld()).toHaveFocus();
  });

  it("should_focusAbsprung_when_zurueckTapped", () => {
    renderDialog();
    oeffnen();
    suche("Zacharias");
    zumAnlegen("„Zacharias“ als Teilnehmer anlegen");

    fireEvent.click(im(anlegeSchritt()).getByRole("button", { name: "← Zur Auswahl" }));

    expect(
      im(auswahlSchritt()).getByRole("button", { name: "„Zacharias“ als Teilnehmer anlegen" }),
    ).toHaveFocus();
  });

  it("should_notFocusAbsprung_when_dialogOpenedFresh", () => {
    // Gegenrichtung: beim Öffnen bestimmt der Dialog das Fokusziel, nicht der Absprung.
    renderDialog();

    oeffnen();

    expect(im(auswahlSchritt()).getByRole("button", { name: "Teilnehmer anlegen" })).not.toHaveFocus();
  });

  it("should_keepSelectionAndSearch_when_zurueckTapped", async () => {
    // AK3.2 / Q1
    renderDialog();
    oeffnen();
    fireEvent.click(im(auswahlSchritt()).getByRole("checkbox", { name: "Bernd Muster" }));
    suche("anna");
    zumAnlegen();

    fireEvent.click(im(anlegeSchritt()).getByRole("button", { name: "← Zur Auswahl" }));

    expect(im(auswahlSchritt()).getByRole("searchbox", { name: "Suchen" })).toHaveValue("anna");
    await absenden(im(auswahlSchritt()).getByRole("button", { name: "Hinzufügen" }));
    expect(addZeilenActionMock.mock.calls[0][1].getAll("teilnehmerId")).toEqual(["t-2"]);
  });

  it("should_prefillNameFromSearch_when_namedAbsprungTapped", () => {
    // AK3.3
    renderDialog();
    oeffnen();
    suche("  Zacharias ");

    zumAnlegen("„Zacharias“ als Teilnehmer anlegen");

    expect(nameFeld()).toHaveValue("Zacharias");
  });

  it("should_offerVerwaltungFieldsAndHint_when_shown", () => {
    // AK4.1/AK5: Name, Typ, Mitglied aus `TeilnehmerFields`, dazu der Hinweis.
    renderDialog();
    oeffnen();

    const schritt = zumAnlegen();

    expect(nameFeld()).toBeRequired();
    expect(nameFeld()).toHaveAttribute("maxLength", "200");
    expect(im(schritt).getByRole("combobox", { name: "Typ" })).toHaveValue("person");
    expect(im(schritt).getByRole("checkbox", { name: "Mitglied" })).not.toBeChecked();
    expect(im(schritt).getByText(HINWEIS_DIREKT_HINZUGEFUEGT)).toBeVisible();
    expect(buttonNamen(schritt)).toEqual(["← Zur Auswahl", "Abbrechen", "Anlegen"]);
    expect(schritt.textContent).not.toMatch(/Gast|Stammteilnehmer/);
  });

  it("should_createAddAndClose_when_anlegenConfirmed", async () => {
    // AK4.2 / Q2
    renderDialog();
    oeffnen();
    zumAnlegen();
    fireEvent.change(nameFeld(), { target: { value: "Gustav Neu" } });
    fireEvent.click(im(anlegeSchritt()).getByRole("checkbox", { name: "Mitglied" }));

    await absenden(im(anlegeSchritt()).getByRole("button", { name: "Anlegen" }));

    const formData = createWalkInActionMock.mock.calls[0][1];
    expect(formData.get("veranstaltungId")).toBe("v-1");
    expect(formData.get("name")).toBe("Gustav Neu");
    expect(formData.get("typ")).toBe("person");
    expect(formData.get("mitglied")).toBe("on");
    expect(formData.get("confirmDuplicate")).toBe("false");
    expect(dialogElement()).not.toHaveAttribute("open");
    expect(meldeErfolgMock).toHaveBeenCalledWith("Teilnehmer angelegt und hinzugefügt");
  });

  it("should_warnKeepInputAndConfirmOnRetry_when_nameIsDuplicate", async () => {
    // AK4.3 / Q3 (ADR-022)
    createWalkInActionMock.mockResolvedValueOnce({ needsConfirm: true, warning: DUPLIKAT_WARNUNG });
    renderDialog();
    oeffnen();
    zumAnlegen();
    fireEvent.change(nameFeld(), { target: { value: "Anna Beispiel" } });

    await absenden(im(anlegeSchritt()).getByRole("button", { name: "Anlegen" }));

    expect(im(anlegeSchritt()).getByRole("status")).toHaveTextContent(DUPLIKAT_WARNUNG);
    expect(nameFeld()).toHaveValue("Anna Beispiel");
    expect(meldeErfolgMock).not.toHaveBeenCalled();

    await absenden(im(anlegeSchritt()).getByRole("button", { name: "Trotzdem anlegen" }));

    expect(createWalkInActionMock.mock.calls[1][1].get("confirmDuplicate")).toBe("true");
    expect(dialogElement()).not.toHaveAttribute("open");
    expect(meldeErfolgMock).toHaveBeenCalledWith("Teilnehmer angelegt und hinzugefügt");
  });

  it("should_stayInSchrittAndShowFieldError_when_actionRejects", async () => {
    // AK4.4: Fehler am Namensfeld, Eingabe bleibt stehen.
    createWalkInActionMock.mockResolvedValue({
      error: "Die Veranstaltung ist abgeschlossen und schreibgeschützt.",
    });
    renderDialog();
    oeffnen();
    zumAnlegen();
    fireEvent.change(nameFeld(), { target: { value: "Gustav Neu" } });

    await absenden(im(anlegeSchritt()).getByRole("button", { name: "Anlegen" }));

    expect(dialogElement()).toHaveAttribute("open");
    expect(nameFeld()).toHaveValue("Gustav Neu");
    expect(nameFeld()).toHaveAttribute("aria-invalid", "true");
    expect(nameFeld()).toHaveAccessibleDescription(
      "Die Veranstaltung ist abgeschlossen und schreibgeschützt.",
    );
    expect(meldeErfolgMock).not.toHaveBeenCalled();
  });

  it("should_closeAndFocusTrigger_when_abbrechenTappedInAnlegeSchritt", () => {
    renderDialog();
    oeffnen();
    zumAnlegen();

    fireEvent.click(im(anlegeSchritt()).getByRole("button", { name: "Abbrechen" }));

    expect(dialogElement()).not.toHaveAttribute("open");
    expect(ausloeser()).toHaveFocus();
    expect(createWalkInActionMock).not.toHaveBeenCalled();
  });

  it("should_startAtAuswahl_when_reopenedAfterAnlegeSchritt", () => {
    renderDialog();
    oeffnen();
    suche("anna");
    zumAnlegen();
    fireEvent.click(im(anlegeSchritt()).getByRole("button", { name: "Abbrechen" }));

    const schritt = oeffnen();

    expect(im(schritt).getByRole("searchbox", { name: "Suchen" })).toHaveValue("");
  });
});

describe("TeilnehmerHinzufuegenDialog – während eine Action läuft", () => {
  // React 19 bündelt laufende Async-Actions in einem modulweiten Scope: eine nie aufgelöste Aktion
  // hielte ihn über das Testende hinaus offen, und spätere Tests dieser Datei sähen ihre
  // Action-Ergebnisse nie committet (Lesson #370). Darum löst jeder Test sie am Ende auf.
  const offeneAntworten: Array<(zustand: { ok: true }) => void> = [];

  function offeneAktion() {
    return new Promise<{ ok: true }>((resolve) => offeneAntworten.push(resolve));
  }

  afterEach(async () => {
    await act(async () => offeneAntworten.splice(0).forEach((loese) => loese({ ok: true })));
  });

  it("should_lockCloseAndShowPendingLabel_when_auswahlActionRuns", async () => {
    addZeilenActionMock.mockImplementation(offeneAktion);
    renderDialog();
    oeffnen();
    fireEvent.click(im(auswahlSchritt()).getByRole("checkbox", { name: "Anna Beispiel" }));

    await absenden(im(auswahlSchritt()).getByRole("button", { name: "Hinzufügen" }));
    const cancel = new Event("cancel", { cancelable: true });
    fireEvent(dialogElement(), cancel);

    expect(cancel.defaultPrevented).toBe(true);
    expect(dialogElement()).toHaveAttribute("open");
    expect(screen.getByRole("button", { name: "Abbrechen" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Hinzufügen …" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Teilnehmer anlegen" })).toBeDisabled();
  });

  it("should_lockCloseZurueckAndShowPendingLabel_when_anlegenActionRuns", async () => {
    // FS: kein zweiter Submit und kein Schrittwechsel während des Laufs.
    createWalkInActionMock.mockImplementation(offeneAktion);
    renderDialog();
    oeffnen();
    zumAnlegen();
    fireEvent.change(nameFeld(), { target: { value: "Gustav Neu" } });

    await absenden(im(anlegeSchritt()).getByRole("button", { name: "Anlegen" }));
    fireEvent(dialogElement(), new Event("cancel", { cancelable: true }));

    expect(dialogElement()).toHaveAttribute("open");
    expect(screen.getByRole("button", { name: "Abbrechen" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Anlegen …" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "← Zur Auswahl" })).toBeDisabled();
  });

  it("should_unlockClose_when_actionRejected", async () => {
    addZeilenActionMock.mockResolvedValue({ error: "Nicht mehr wählbar: Anna Beispiel" });
    renderDialog();
    oeffnen();
    fireEvent.click(im(auswahlSchritt()).getByRole("checkbox", { name: "Anna Beispiel" }));

    await absenden(im(auswahlSchritt()).getByRole("button", { name: "Hinzufügen" }));

    expect(im(auswahlSchritt()).getByRole("alert")).toHaveTextContent(
      "Nicht mehr wählbar: Anna Beispiel",
    );
    expect(screen.getByRole("button", { name: "Abbrechen" })).toBeEnabled();
  });
});
