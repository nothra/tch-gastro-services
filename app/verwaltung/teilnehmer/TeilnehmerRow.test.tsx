import { describe, it, expect, vi, beforeEach } from "vitest";
import { useEffect, useState } from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { Teilnehmer } from "@/db/schema";
import { TeilnehmerRow } from "./TeilnehmerRow";

// Externe Grenzen der Komponente: Server Actions und die Toast-Kapsel (ADR-058 D1).
vi.mock("./actions", () => ({
  updateTeilnehmerAction: vi.fn(),
  setTeilnehmerActiveAction: vi.fn(),
}));
vi.mock("@/app/components/ui/meldung", () => ({ meldeErfolg: vi.fn() }));

import { meldeErfolg } from "@/app/components/ui/meldung";
import { setTeilnehmerActiveAction, updateTeilnehmerAction } from "./actions";

const updateMock = vi.mocked(updateTeilnehmerAction);
const setActiveMock = vi.mocked(setTeilnehmerActiveAction);
const meldeErfolgMock = vi.mocked(meldeErfolg);

const aTeilnehmer: Teilnehmer = {
  id: "t-1",
  name: "Anna Müller",
  typ: "person",
  mitglied: false,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function renderRow(teilnehmer: Teilnehmer = aTeilnehmer) {
  render(
    <ul>
      <TeilnehmerRow teilnehmer={teilnehmer} />
    </ul>,
  );
}

function zeile() {
  return screen.getByRole("button", { name: /^Anna Müller/ });
}

function oeffnen() {
  fireEvent.click(zeile());
  return screen.getByRole("dialog", { name: "Teilnehmer bearbeiten" });
}

function dialogElement() {
  return document.querySelector("dialog")!;
}

async function klicke(name: string) {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name }));
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  updateMock.mockResolvedValue({ ok: true });
  setActiveMock.mockResolvedValue({ ok: true });
});

describe("TeilnehmerRow – Zeile (spec-405 AK1)", () => {
  it("should_renderWhiteCardWithButtonNotLink_when_rendered", () => {
    // AK1.1/AK1.3: ListenZeile im Auslöser-Betrieb – ganze Karte ist ein Button, kein Link.
    renderRow();

    const karte = screen.getByRole("listitem");
    expect(karte).toHaveClass("bg-surface", "rounded-lg");
    expect(within(karte).queryByRole("link")).not.toBeInTheDocument();
    expect(zeile()).toHaveAttribute("type", "button");
    expect(zeile()).toHaveClass("min-h-11");
    expect(zeile().querySelector("svg")).not.toBeNull();
  });

  it("should_beOnlyControlInRow_when_rendered", () => {
    // Entschiedene Annahme: „Bearbeiten"/„Deaktivieren" stehen nicht mehr in der Zeile.
    renderRow();

    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it.each<[Teilnehmer["typ"], boolean, string]>([
    ["person", true, "Person · Mitglied"],
    ["person", false, "Person · kein Mitglied"],
    ["familie", true, "Familie · Mitglied"],
    ["familie", false, "Familie · kein Mitglied"],
  ])("should_showUntertitel_when_typ%sAndMitglied%s", (typ, mitglied, untertitel) => {
    // AK1.2
    renderRow({ ...aTeilnehmer, typ, mitglied });

    expect(screen.getByText("Anna Müller")).toBeInTheDocument();
    expect(screen.getByText(untertitel)).toBeInTheDocument();
  });

  it("should_dimAndShowBadge_when_teilnehmerIsInactive", () => {
    // AK3.3: Zustand als Text (Badge), nicht nur als Abblendung.
    renderRow({ ...aTeilnehmer, active: false });

    expect(zeile()).toHaveAccessibleName(/deaktiviert/);
    expect(screen.getByText("Anna Müller").parentElement).toHaveClass("opacity-60");
  });

  it("should_neitherDimNorBadge_when_teilnehmerIsActive", () => {
    renderRow();

    expect(screen.queryByText("deaktiviert")).not.toBeInTheDocument();
    expect(screen.getByRole("listitem").querySelector(".opacity-60")).toBeNull();
  });

  it("should_useStableRowId_when_rendered", () => {
    // ADR-060 D3: Ersatz-Fokusziel nach dem Gruppenwechsel.
    renderRow();

    expect(zeile()).toHaveAttribute("id", "teilnehmer-t-1");
  });
});

describe("TeilnehmerRow – Dialog „Teilnehmer bearbeiten“ (spec-405 AK2)", () => {
  it("should_openDialogWithPrefilledFields_when_rowTapped", () => {
    // AK2.1/AK2.2
    renderRow({ ...aTeilnehmer, typ: "familie", mitglied: true });

    const dialog = oeffnen();

    expect(dialog).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("Anna Müller");
    expect(screen.getByLabelText("Typ")).toHaveValue("familie");
    expect(screen.getByLabelText("Mitglied")).toBeChecked();
    expect(screen.getByRole("button", { name: "Speichern" })).toHaveAttribute("type", "submit");
    expect(screen.getByRole("button", { name: "Abbrechen" })).toBeInTheDocument();
  });

  it("should_sendIdAndFieldsCloseAndReport_when_saveSucceeds", async () => {
    // AK2.3
    renderRow();
    oeffnen();
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Anna Schmidt" } });

    await klicke("Speichern");

    const formData = updateMock.mock.calls[0][1];
    expect(formData.get("id")).toBe("t-1");
    expect(formData.get("name")).toBe("Anna Schmidt");
    expect(dialogElement()).not.toHaveAttribute("open");
    expect(meldeErfolgMock).toHaveBeenCalledWith("Gespeichert");
  });

  it("should_keepDialogInputAndShowFehlerNotice_when_saveRejected", async () => {
    // AK2.4 / F3: kein Formular-Reset nach Ablehnung.
    updateMock.mockResolvedValue({ error: "Anzeigename ist zu lang." });
    renderRow();
    oeffnen();
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Anna Schmidt" } });

    await klicke("Speichern");

    expect(dialogElement()).toHaveAttribute("open");
    expect(screen.getByRole("alert")).toHaveTextContent("Anzeigename ist zu lang.");
    expect(screen.getByRole("alert")).toHaveClass("text-danger");
    expect(screen.getByLabelText("Name")).toHaveValue("Anna Schmidt");
    expect(meldeErfolgMock).not.toHaveBeenCalled();
  });

  it("should_closeWithoutActionAndReturnFocusToRow_when_abbrechen", () => {
    // AK2.5
    renderRow();
    oeffnen();

    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));

    expect(updateMock).not.toHaveBeenCalled();
    expect(setActiveMock).not.toHaveBeenCalled();
    expect(dialogElement()).not.toHaveAttribute("open");
    expect(zeile()).toHaveFocus();
  });

  it("should_offerDeaktivierenWithWirkungssatz_when_teilnehmerIsActive", () => {
    // AK2.6
    renderRow();
    oeffnen();

    expect(screen.getByRole("button", { name: "Deaktivieren" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Deaktivierte Teilnehmer lassen sich keiner Veranstaltung mehr hinzufügen. Bestehende Abrechnungen bleiben unverändert.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Aktivieren" })).not.toBeInTheDocument();
  });

  it("should_offerAktivierenWithWirkungssatz_when_teilnehmerIsInactive", () => {
    // AK2.7
    renderRow({ ...aTeilnehmer, active: false });
    oeffnen();

    expect(screen.getByRole("button", { name: "Aktivieren" })).toBeInTheDocument();
    expect(
      screen.getByText("Der Teilnehmer lässt sich wieder Veranstaltungen hinzufügen."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Deaktivieren" })).not.toBeInTheDocument();
  });

  it("should_separateToggleFromForm_when_dialogOpen", () => {
    // AK2.6: abgesetzt per Trennlinie wie im Artikel-Dialog.
    renderRow();
    oeffnen();

    const umschalten = screen.getByRole("button", { name: "Deaktivieren" }).closest("form")!;
    expect(umschalten).toHaveClass("border-t", "border-line-subtle");
    expect(umschalten).not.toContainElement(screen.getByLabelText("Name"));
  });

  it("should_sendOnlyIdAndTargetStateCloseAndReport_when_deaktivierenSucceeds", async () => {
    // AK2.8/AK2.9: eigenes Formular – bearbeitete Felder gehen nicht mit.
    renderRow();
    oeffnen();
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Ungespeichert" } });

    await klicke("Deaktivieren");

    const formData = setActiveMock.mock.calls[0][1];
    expect(formData.get("id")).toBe("t-1");
    expect(formData.get("active")).toBe("false");
    expect(formData.get("name")).toBeNull();
    expect(updateMock).not.toHaveBeenCalled();
    expect(dialogElement()).not.toHaveAttribute("open");
    expect(meldeErfolgMock).toHaveBeenCalledWith("Teilnehmer deaktiviert");
  });

  it("should_sendActiveTrueAndReportAktiviert_when_aktivierenSucceeds", async () => {
    renderRow({ ...aTeilnehmer, active: false });
    oeffnen();

    await klicke("Aktivieren");

    expect(setActiveMock.mock.calls[0][1].get("active")).toBe("true");
    expect(meldeErfolgMock).toHaveBeenCalledWith("Teilnehmer aktiviert");
  });

  it("should_keepDialogWithFehlerNotice_when_toggleRejected", async () => {
    // AK2.9 / F1
    setActiveMock.mockResolvedValue({ error: "Teilnehmer nicht gefunden." });
    renderRow();
    oeffnen();

    await klicke("Deaktivieren");

    expect(dialogElement()).toHaveAttribute("open");
    expect(screen.getByRole("alert")).toHaveTextContent("Teilnehmer nicht gefunden.");
    expect(meldeErfolgMock).not.toHaveBeenCalled();
  });

  it("should_lockSaveAndAbbrechen_when_toggleIsPending", async () => {
    // AK2.10 – die Antwort wird am Testende aufgelöst (Lesson #370).
    let antworten: (state: { error: string }) => void = () => {};
    setActiveMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          antworten = resolve;
        }),
    );
    renderRow();
    oeffnen();

    await klicke("Deaktivieren");

    expect(screen.getByRole("button", { name: "Speichern" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Abbrechen" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Deaktivieren …" })).toBeDisabled();

    await act(async () => antworten({ error: "Teilnehmer nicht gefunden." }));
    expect(screen.getByRole("button", { name: "Abbrechen" })).toBeEnabled();
  });

  it("should_lockToggle_when_saveIsPending", async () => {
    // AK2.10 Gegenrichtung (Lesson #211).
    let antworten: (state: { error: string }) => void = () => {};
    updateMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          antworten = resolve;
        }),
    );
    renderRow();
    oeffnen();

    await klicke("Speichern");

    expect(screen.getByRole("button", { name: "Speichern …" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Deaktivieren" })).toBeDisabled();

    await act(async () => antworten({ error: "Anzeigename ist zu lang." }));
    expect(screen.getByRole("button", { name: "Deaktivieren" })).toBeEnabled();
  });
});

describe("TeilnehmerRow – Fokus nach Gruppenwechsel (spec-405 AK3.5)", () => {
  // Die Seite teilt in „Aktiv"/„Deaktiviert": Nach „Deaktivieren" wandert die Zeile in die andere
  // Liste und wird dort neu gemountet – ihr alter Auslöser ist weg (Lesson #371/#373).
  const seite = { umziehen: () => {} };

  function GruppierteSeite() {
    const [aktiv, setAktiv] = useState(true);
    useEffect(() => {
      seite.umziehen = () => setAktiv(false);
    });
    const zeileIn = (gruppeAktiv: boolean) =>
      aktiv === gruppeAktiv && <TeilnehmerRow teilnehmer={{ ...aTeilnehmer, active: aktiv }} />;
    return (
      <>
        <ul aria-label="Aktiv">{zeileIn(true)}</ul>
        <ul aria-label="Deaktiviert">{zeileIn(false)}</ul>
      </>
    );
  }

  it("should_focusMovedRow_when_deaktivierenMovesRowToOtherGroup", async () => {
    setActiveMock.mockImplementation(async () => {
      seite.umziehen();
      return { ok: true };
    });
    render(<GruppierteSeite />);
    oeffnen();

    await klicke("Deaktivieren");

    const deaktiviert = screen.getByRole("list", { name: "Deaktiviert" });
    expect(deaktiviert).toContainElement(zeile());
    expect(zeile()).toHaveFocus();
  });
});
