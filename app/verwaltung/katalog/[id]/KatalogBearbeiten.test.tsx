import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { Catalog } from "@/db/schema";
import type { CatalogFormState } from "../actions";

// Externe Grenzen: Server Actions aus derselben Feature-Schicht und die Toast-Kapsel (ADR-058 D1).
// `useActionState` bleibt echt – geprüft wird das Zusammenspiel mit den Dialog-Bausteinen.
vi.mock("../actions", () => ({
  renameCatalogAction: vi.fn(),
  setCatalogActiveAction: vi.fn(),
  duplicateCatalogAction: vi.fn(),
}));
vi.mock("@/app/components/ui/meldung", () => ({ meldeErfolg: vi.fn() }));

import { meldeErfolg } from "@/app/components/ui/meldung";
import { duplicateCatalogAction, renameCatalogAction, setCatalogActiveAction } from "../actions";
import { KatalogBearbeiten } from "./KatalogBearbeiten";

const renameMock = vi.mocked(renameCatalogAction);
const duplicateMock = vi.mocked(duplicateCatalogAction);
const setActiveMock = vi.mocked(setCatalogActiveAction);
const meldeErfolgMock = vi.mocked(meldeErfolg);

const aktiverKatalog: Catalog = {
  id: "cat-1",
  name: "Montagsrunde",
  active: true,
  sortOrder: 0,
  createdAt: new Date("2026-09-17T00:00:00.000Z"),
  updatedAt: new Date("2026-09-17T00:00:00.000Z"),
};
const inaktiverKatalog: Catalog = { ...aktiverKatalog, active: false };

const TITEL = "Katalog bearbeiten";
const TITEL_BESTAETIGEN = "Katalog deaktivieren?";

// Offen gehaltene Action für die Lauf-Tests. Aufgelöst wird in `afterEach` innerhalb von `act` –
// auch wenn eine Assertion vorher scheitert; sonst hielte das Promise den Action-Scope für spätere
// Tests offen (Lesson #370).
let laufendeActionBeenden: (() => void) | undefined;

function actionBleibtOffen(mock: typeof renameMock) {
  mock.mockImplementation(
    () =>
      new Promise<CatalogFormState>((resolve) => {
        laufendeActionBeenden = () => resolve({ ok: true });
      }),
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  laufendeActionBeenden = undefined;
  for (const mock of [renameMock, duplicateMock, setActiveMock]) {
    mock.mockResolvedValue({ ok: true });
  }
});

afterEach(async () => {
  await act(async () => laufendeActionBeenden?.());
});

function ausloeser() {
  return screen.getByRole("button", { name: TITEL });
}

function oeffnen() {
  fireEvent.click(ausloeser());
  return dialog();
}

/** Der Dialog trägt den Titel des aktuellen Schritts als zugänglichen Namen. */
function dialog() {
  return screen.getByRole("dialog");
}

/** Ein geschlossener Dialog rendert keinen Inhalt – der Titel fehlt dann. */
function istOffen() {
  return document.querySelector("dialog h2") !== null;
}

function bereich(name: "Umbenennen" | "Duplizieren" | "Aktivieren") {
  return within(dialog()).getByRole("form", { name });
}

function knopfIm(name: string) {
  // Ein String-Name gilt in Testing Library als exakter Treffer – „Deaktivieren" trifft nicht
  // „Deaktivieren …" (anders als Playwright, Lesson #372).
  return within(dialog()).getByRole("button", { name });
}

async function klicke(name: string) {
  await act(async () => {
    fireEvent.click(knopfIm(name));
  });
}

function escape() {
  fireEvent(document.querySelector("dialog")!, new Event("cancel", { cancelable: true }));
}

describe("KatalogBearbeiten – Auslöser (spec-407 AK1.2, AK2.1)", () => {
  it("should_beSecondaryWithTouchSize_when_rendered", () => {
    render(<KatalogBearbeiten katalog={aktiverKatalog} />);

    expect(ausloeser()).toHaveClass("border-line", "min-h-11");
    expect(ausloeser()).not.toHaveClass("bg-accent");
    expect(ausloeser()).toHaveAttribute("type", "button");
  });

  it("should_openDialogTitledKatalogBearbeiten_when_triggerClicked", () => {
    render(<KatalogBearbeiten katalog={aktiverKatalog} />);

    expect(oeffnen()).toHaveAccessibleName(TITEL);
  });

  it("should_closeAndReturnFocusToTrigger_when_schliessenClicked", async () => {
    // AK2.1 + ADR-062 D2: „Schließen" statt „Abbrechen" – die Bereiche wirken sofort.
    render(<KatalogBearbeiten katalog={aktiverKatalog} />);
    oeffnen();

    await klicke("Schließen");

    expect(istOffen()).toBe(false);
    expect(ausloeser()).toHaveFocus();
    expect(screen.queryByRole("button", { name: "Abbrechen" })).not.toBeInTheDocument();
  });

  it("should_closeAndReturnFocusToTrigger_when_escapePressed", () => {
    render(<KatalogBearbeiten katalog={aktiverKatalog} />);
    oeffnen();

    escape();

    expect(istOffen()).toBe(false);
    expect(ausloeser()).toHaveFocus();
  });
});

describe("KatalogBearbeiten – Bereiche (spec-407 AK2.2/AK2.5)", () => {
  it("should_offerUmbenennenDuplizierenDeaktivieren_when_catalogActive", () => {
    render(<KatalogBearbeiten katalog={aktiverKatalog} />);
    oeffnen();

    expect(within(bereich("Umbenennen")).getByLabelText("Neuer Name")).toHaveValue("Montagsrunde");
    expect(within(bereich("Duplizieren")).getByLabelText("Name der Kopie")).toHaveAttribute(
      "placeholder",
      "Montagsrunde (Kopie)",
    );
    expect(bereich("Duplizieren")).toHaveTextContent(
      "„Montagsrunde“ wird mit allen aktiven Artikeln kopiert.",
    );
    expect(knopfIm("Deaktivieren")).toHaveAttribute("type", "button");
    expect(within(dialog()).queryByRole("button", { name: "Aktivieren" })).not.toBeInTheDocument();
  });

  it("should_offerAktivierenWithoutDuplizieren_when_catalogInactive", () => {
    // AK2.5 (#345 AK5): nur aktive Kataloge sind Duplizier-Quellen; Glossar: „Aktivieren".
    render(<KatalogBearbeiten katalog={inaktiverKatalog} />);
    oeffnen();

    expect(within(dialog()).queryByRole("form", { name: "Duplizieren" })).not.toBeInTheDocument();
    expect(within(dialog()).queryByLabelText("Name der Kopie")).not.toBeInTheDocument();
    expect(knopfIm("Aktivieren")).toHaveAttribute("type", "submit");
    expect(
      within(dialog()).queryByRole("button", { name: "Deaktivieren" }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog()).queryByRole("button", { name: "Reaktivieren" }),
    ).not.toBeInTheDocument();
  });

  it("should_offerNoPrimaryButton_when_bearbeitenStepShown", () => {
    // AK1.4: „+ Neu" im Artikelbereich bleibt der einzige Primär-Knopf der Seite.
    render(<KatalogBearbeiten katalog={aktiverKatalog} />);
    oeffnen();

    expect(dialog().querySelector(".bg-accent")).toBeNull();
  });
});

describe("KatalogBearbeiten – Umbenennen (spec-407 AK2.2/AK2.3/AK2.7)", () => {
  it("should_sendOnlyOwnFieldsCloseAndReportUmbenannt_when_renameSucceeds", async () => {
    render(<KatalogBearbeiten katalog={aktiverKatalog} />);
    oeffnen();
    fireEvent.change(within(bereich("Umbenennen")).getByLabelText("Neuer Name"), {
      target: { value: "Montagsrunde neu" },
    });

    await klicke("Umbenennen");

    const formData = renameMock.mock.calls[0][1];
    expect([...formData.keys()].sort()).toEqual(["id", "name"]);
    expect(formData.get("id")).toBe("cat-1");
    expect(formData.get("name")).toBe("Montagsrunde neu");
    expect(istOffen()).toBe(false);
    expect(meldeErfolgMock).toHaveBeenCalledWith("Katalog umbenannt");
    expect(ausloeser()).toHaveFocus();
  });

  it("should_keepDialogInputAndShowAlertAtRenameSection_when_renameRejected", async () => {
    renameMock.mockResolvedValue({ error: "Ein Katalog mit diesem Namen existiert bereits." });
    render(<KatalogBearbeiten katalog={aktiverKatalog} />);
    oeffnen();
    fireEvent.change(within(bereich("Umbenennen")).getByLabelText("Neuer Name"), {
      target: { value: "Dorfmeisterschaften" },
    });

    await klicke("Umbenennen");

    expect(istOffen()).toBe(true);
    expect(within(bereich("Umbenennen")).getByRole("alert")).toHaveTextContent(
      "Ein Katalog mit diesem Namen existiert bereits.",
    );
    expect(within(bereich("Duplizieren")).queryByRole("alert")).not.toBeInTheDocument();
    expect(within(bereich("Umbenennen")).getByLabelText("Neuer Name")).toHaveValue(
      "Dorfmeisterschaften",
    );
    expect(meldeErfolgMock).not.toHaveBeenCalled();
  });

  it("should_showBusyLabel_when_renameRunning", async () => {
    actionBleibtOffen(renameMock);
    render(<KatalogBearbeiten katalog={aktiverKatalog} />);
    oeffnen();

    await klicke("Umbenennen");

    expect(knopfIm("Umbenennen …")).toBeDisabled();
  });

  it("should_prefillNewName_when_reopenedAfterRenameAndRerender", async () => {
    // F5: der Dialog mountet seine Kinder erst beim Öffnen – keine veraltete Vorbelegung.
    const { rerender } = render(<KatalogBearbeiten katalog={aktiverKatalog} />);
    oeffnen();
    await klicke("Umbenennen");
    rerender(<KatalogBearbeiten katalog={{ ...aktiverKatalog, name: "Montagsrunde neu" }} />);

    oeffnen();

    expect(within(bereich("Umbenennen")).getByLabelText("Neuer Name")).toHaveValue(
      "Montagsrunde neu",
    );
  });

  it("should_notShowOldError_when_reopened", async () => {
    renameMock.mockResolvedValue({ error: "Katalog nicht gefunden." });
    render(<KatalogBearbeiten katalog={aktiverKatalog} />);
    oeffnen();
    await klicke("Umbenennen");
    await klicke("Schließen");

    oeffnen();

    expect(within(dialog()).queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("KatalogBearbeiten – Duplizieren (spec-407 AK2.2/AK2.3)", () => {
  it("should_sendOnlyOwnFieldsCloseAndReportDupliziert_when_duplicateSucceeds", async () => {
    render(<KatalogBearbeiten katalog={aktiverKatalog} />);
    oeffnen();
    fireEvent.change(within(bereich("Duplizieren")).getByLabelText("Name der Kopie"), {
      target: { value: "Sommerfest" },
    });

    await klicke("Duplizieren");

    const formData = duplicateMock.mock.calls[0][1];
    expect([...formData.keys()].sort()).toEqual(["name", "sourceId"]);
    expect(formData.get("sourceId")).toBe("cat-1");
    expect(formData.get("name")).toBe("Sommerfest");
    expect(istOffen()).toBe(false);
    expect(meldeErfolgMock).toHaveBeenCalledWith("Katalog dupliziert");
    expect(ausloeser()).toHaveFocus();
  });

  it("should_showAlertAtDuplicateSectionOnly_when_duplicateRejected", async () => {
    duplicateMock.mockResolvedValue({ error: "Der Quell-Katalog ist nicht aktiv." });
    render(<KatalogBearbeiten katalog={aktiverKatalog} />);
    oeffnen();
    fireEvent.change(within(bereich("Duplizieren")).getByLabelText("Name der Kopie"), {
      target: { value: "Sommerfest" },
    });

    await klicke("Duplizieren");

    expect(within(bereich("Duplizieren")).getByRole("alert")).toHaveTextContent(
      "Der Quell-Katalog ist nicht aktiv.",
    );
    expect(within(bereich("Umbenennen")).queryByRole("alert")).not.toBeInTheDocument();
    expect(within(bereich("Duplizieren")).getByLabelText("Name der Kopie")).toHaveValue(
      "Sommerfest",
    );
  });

  it("should_showBusyLabel_when_duplicateRunning", async () => {
    actionBleibtOffen(duplicateMock);
    render(<KatalogBearbeiten katalog={aktiverKatalog} />);
    oeffnen();

    await klicke("Duplizieren");

    expect(knopfIm("Duplizieren …")).toBeDisabled();
  });
});

describe("KatalogBearbeiten – Sperre während einer Action (spec-407 AK2.4, Lesson #369)", () => {
  // Jede laufende Action sperrt ALLE übrigen Bedienflächen des Dialogs und das Schließen.
  it.each([
    ["Umbenennen", renameMock, ["Duplizieren", "Deaktivieren", "Schließen"]],
    ["Duplizieren", duplicateMock, ["Umbenennen", "Deaktivieren", "Schließen"]],
  ] as const)("should_lockOtherButtonsAndEscape_when_%sRunning", async (aktion, mock, gesperrt) => {
    actionBleibtOffen(mock);
    render(<KatalogBearbeiten katalog={aktiverKatalog} />);
    oeffnen();

    await klicke(aktion);
    escape();

    expect(istOffen()).toBe(true);
    for (const name of gesperrt) {
      expect(knopfIm(name)).toBeDisabled();
    }
  });

  it("should_lockOtherButtonsAndEscape_when_aktivierenRunning", async () => {
    actionBleibtOffen(setActiveMock);
    render(<KatalogBearbeiten katalog={inaktiverKatalog} />);
    oeffnen();

    await klicke("Aktivieren");
    escape();

    expect(istOffen()).toBe(true);
    expect(knopfIm("Aktivieren …")).toBeDisabled();
    expect(knopfIm("Umbenennen")).toBeDisabled();
    expect(knopfIm("Schließen")).toBeDisabled();
  });
});

describe("KatalogBearbeiten – Deaktivieren als Bestätigungsschritt (spec-407 AK2.6, ADR-062 D1)", () => {
  async function zurBestaetigung() {
    oeffnen();
    await klicke("Deaktivieren");
    return dialog();
  }

  it("should_switchToConfirmStepNamingCatalogAndConsequence_when_deaktivierenClicked", async () => {
    render(<KatalogBearbeiten katalog={aktiverKatalog} />);

    const bestaetigung = await zurBestaetigung();

    expect(bestaetigung).toHaveAccessibleName(TITEL_BESTAETIGEN);
    expect(bestaetigung).toHaveAccessibleDescription(
      "„Montagsrunde“ ist danach für neue Veranstaltungen nicht mehr wählbar.",
    );
    expect(knopfIm("Deaktivieren")).toHaveClass("bg-danger");
    expect(knopfIm("Deaktivieren")).toHaveAttribute("type", "submit");
    expect(within(bestaetigung).queryByLabelText("Neuer Name")).not.toBeInTheDocument();
    expect(setActiveMock).not.toHaveBeenCalled();
  });

  it("should_focusAbbrechen_when_confirmStepEntered", async () => {
    // ADR-062 D1, Lesson #404: Fokus je Richtung explizit – hin auf das sichere Ziel.
    render(<KatalogBearbeiten katalog={aktiverKatalog} />);

    await zurBestaetigung();

    expect(knopfIm("Abbrechen")).toHaveFocus();
  });

  it("should_returnToBearbeitenAndFocusDeaktivieren_when_abbrechenInConfirmStep", async () => {
    render(<KatalogBearbeiten katalog={aktiverKatalog} />);
    await zurBestaetigung();

    await klicke("Abbrechen");

    expect(dialog()).toHaveAccessibleName(TITEL);
    expect(knopfIm("Deaktivieren")).toHaveFocus();
    expect(setActiveMock).not.toHaveBeenCalled();
  });

  it("should_focusNeitherDeaktivierenNorAbbrechen_when_dialogOpened", () => {
    // Gegenprobe zu Lesson #404: beim Öffnen setzt kein Schritt den Fokus selbst.
    render(<KatalogBearbeiten katalog={aktiverKatalog} />);

    oeffnen();

    expect(knopfIm("Deaktivieren")).not.toHaveFocus();
  });

  it("should_reopenAtBearbeitenStep_when_closedDuringConfirmStep", async () => {
    // ADR-062 D1: der Schritt wird beim Öffnen auf „Bearbeiten" zurückgesetzt.
    render(<KatalogBearbeiten katalog={aktiverKatalog} />);
    await zurBestaetigung();
    escape();
    expect(istOffen()).toBe(false);

    oeffnen();

    expect(dialog()).toHaveAccessibleName(TITEL);
    expect(knopfIm("Deaktivieren")).not.toHaveFocus();
  });

  it("should_sendIdAndFalseCloseAndReportDeaktiviert_when_confirmed", async () => {
    render(<KatalogBearbeiten katalog={aktiverKatalog} />);
    await zurBestaetigung();

    await klicke("Deaktivieren");

    const formData = setActiveMock.mock.calls[0][1];
    expect([...formData.keys()].sort()).toEqual(["active", "id"]);
    expect(formData.get("id")).toBe("cat-1");
    expect(formData.get("active")).toBe("false");
    expect(istOffen()).toBe(false);
    expect(meldeErfolgMock).toHaveBeenCalledWith("Katalog deaktiviert");
    expect(ausloeser()).toHaveFocus();
  });

  it("should_stayInConfirmStepWithAlertAndNoToast_when_deactivateRejected", async () => {
    // F1
    setActiveMock.mockResolvedValue({ error: "Katalog nicht gefunden." });
    render(<KatalogBearbeiten katalog={aktiverKatalog} />);
    await zurBestaetigung();

    await klicke("Deaktivieren");

    expect(dialog()).toHaveAccessibleName(TITEL_BESTAETIGEN);
    expect(within(dialog()).getByRole("alert")).toHaveTextContent("Katalog nicht gefunden.");
    expect(meldeErfolgMock).not.toHaveBeenCalled();
  });

  it("should_lockAbbrechenAndEscapeWithBusyLabel_when_deactivateRunning", async () => {
    actionBleibtOffen(setActiveMock);
    render(<KatalogBearbeiten katalog={aktiverKatalog} />);
    await zurBestaetigung();

    await klicke("Deaktivieren");
    escape();

    expect(istOffen()).toBe(true);
    expect(knopfIm("Abbrechen")).toBeDisabled();
    expect(knopfIm("Deaktivieren …")).toBeDisabled();
  });
});

describe("KatalogBearbeiten – Aktivieren ohne Rückfrage (spec-407 AK2.6, spec-372 AK4)", () => {
  it("should_sendIdAndTrueCloseAndReportAktiviert_when_aktivierenClicked", async () => {
    render(<KatalogBearbeiten katalog={inaktiverKatalog} />);
    oeffnen();

    await klicke("Aktivieren");

    const formData = setActiveMock.mock.calls[0][1];
    expect([...formData.keys()].sort()).toEqual(["active", "id"]);
    expect(formData.get("active")).toBe("true");
    expect(istOffen()).toBe(false);
    expect(meldeErfolgMock).toHaveBeenCalledWith("Katalog aktiviert");
    expect(ausloeser()).toHaveFocus();
  });

  it("should_keepDialogWithAlert_when_activateRejected", async () => {
    setActiveMock.mockResolvedValue({ error: "Katalog nicht gefunden." });
    render(<KatalogBearbeiten katalog={inaktiverKatalog} />);
    oeffnen();

    await klicke("Aktivieren");

    expect(within(bereich("Aktivieren")).getByRole("alert")).toHaveTextContent(
      "Katalog nicht gefunden.",
    );
    expect(meldeErfolgMock).not.toHaveBeenCalled();
  });
});
