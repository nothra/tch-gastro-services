import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { AuslageRow as AuslageRowData } from "@/db/auslage";
import { AuslageRow } from "./AuslageRow";
import { AUSLAGEN_LISTE_ID } from "./auslagenListe";

// Externe Grenzen: Server Actions der Feature-Schicht und die Toast-Kapsel (ADR-058 D1). Das
// Formular im Dialog ist echt – seine Felder sind in AuslageForm.test.tsx abgedeckt.
vi.mock("./actions", () => ({
  setAuslageStatusAction: vi.fn(),
  removeAuslageAction: vi.fn(),
  updateAuslageAction: vi.fn(),
}));
vi.mock("@/app/components/ui/meldung", () => ({ meldeErfolg: vi.fn() }));

import { meldeErfolg } from "@/app/components/ui/meldung";
import { removeAuslageAction, setAuslageStatusAction, updateAuslageAction } from "./actions";

const removeMock = vi.mocked(removeAuslageAction);
const setStatusMock = vi.mocked(setAuslageStatusAction);
const updateMock = vi.mocked(updateAuslageAction);
const meldeErfolgMock = vi.mocked(meldeErfolg);

const offeneAuslage: AuslageRowData = {
  id: "a-1",
  teilnehmerId: "t-1",
  anzeigename: "Anna",
  kategorie: "essen",
  betragCents: 1250,
  zweck: "Grillfleisch",
  status: "offen",
};
const erstatteteAuslage: AuslageRowData = { ...offeneAuslage, status: "erstattet" };

const teilnehmer = [
  { teilnehmerId: "t-1", anzeigename: "Anna" },
  { teilnehmerId: "t-2", anzeigename: "Bernd" },
];

function zeile(overrides: Partial<Parameters<typeof AuslageRow>[0]> = {}) {
  return (
    <AuslageRow
      auslage={offeneAuslage}
      veranstaltungId="v-1"
      teilnehmer={teilnehmer}
      editable
      {...overrides}
    />
  );
}

function renderRow(overrides: Partial<Parameters<typeof AuslageRow>[0]> = {}) {
  return render(<ul>{zeile(overrides)}</ul>);
}

// Offen gehaltene Action für die Lauf-Tests. Aufgelöst wird in `afterEach` innerhalb von `act` –
// auch wenn eine Assertion vorher scheitert (Lesson #370).
let laufendeActionBeenden: (() => void) | undefined;

beforeEach(() => {
  vi.resetAllMocks();
  laufendeActionBeenden = undefined;
  removeMock.mockResolvedValue({ ok: true });
  setStatusMock.mockResolvedValue({ ok: true });
  updateMock.mockResolvedValue({ ok: true });
});

afterEach(async () => {
  await act(async () => laufendeActionBeenden?.());
});

function tippZiel() {
  return screen.getByRole("button", { name: /^Anna/ });
}

function menueKnopf() {
  return screen.getByRole("button", { name: "Aktionen für Anna" });
}

function menueOeffnen() {
  fireEvent.click(menueKnopf());
  return screen.getByRole("menu", { name: "Aktionen für Anna" });
}

function waehle(eintrag: string) {
  fireEvent.click(within(menueOeffnen()).getByRole("menuitem", { name: eintrag }));
}

// Das Menü öffnet außerhalb von `act`: darin würde es erst mit dem Ende von `act` gerendert.
async function waehleUndWarte(eintrag: string) {
  const menue = menueOeffnen();
  await act(async () => {
    fireEvent.click(within(menue).getByRole("menuitem", { name: eintrag }));
  });
}

function offenerDialog() {
  return document.querySelector("dialog[open]") as HTMLDialogElement;
}

function bearbeitenDialog() {
  return screen.getByRole("dialog", { name: "Auslage bearbeiten" });
}

function loeschDialog() {
  return screen.getByRole("dialog", { name: "Auslage löschen?" });
}

describe("AuslageRow – Zeile (spec-406 AK2)", () => {
  it("should_renderListenZeileCardWithTitelAndKategorieZweck_when_rendered", () => {
    // AK2.1
    renderRow();

    expect(screen.getByRole("listitem")).toHaveClass(
      "rounded-lg",
      "border-line-subtle",
      "bg-surface",
    );
    expect(screen.getByText("Anna")).toBeInTheDocument();
    expect(screen.getByText("Essen · Grillfleisch")).toBeInTheDocument();
    expect(within(tippZiel()).getByText("12,50 €")).toBeInTheDocument();
  });

  it("should_showOnlyKategorie_when_zweckNull", () => {
    // AK2.1: kein „ · "-Rest ohne Notiz.
    renderRow({ auslage: { ...offeneAuslage, zweck: null } });

    expect(screen.getByText("Essen")).toBeInTheDocument();
    expect(screen.queryByText(/·/)).not.toBeInTheDocument();
  });

  it("should_showWarnungBadgeOffen_when_statusOffen", () => {
    // AK2.2: Status als Text im Badge, nicht mehr im Untertitel.
    renderRow();

    const badge = within(tippZiel()).getByText("offen");
    expect(badge).toHaveClass("bg-warning-subtle", "text-warning");
    expect(screen.queryByText(/offen zu erstatten/)).not.toBeInTheDocument();
  });

  it("should_showErfolgBadgeErstattet_when_statusErstattet", () => {
    renderRow({ auslage: erstatteteAuslage });

    expect(within(tippZiel()).getByText("erstattet")).toHaveClass(
      "bg-success-subtle",
      "text-success",
    );
  });

  it("should_beButtonNotLink_when_editable", () => {
    // AK2.3: Tipp-Ziel ist ein Button, mindestens 44 px hoch.
    renderRow();

    expect(tippZiel().tagName).toBe("BUTTON");
    expect(tippZiel()).toHaveClass("min-h-11");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("should_notOfferOldInlineButtons_when_rendered", () => {
    // AK3.6: Erstatten, Bearbeiten, Löschen stehen nicht mehr als eigene Buttons in der Zeile.
    renderRow();

    expect(
      screen
        .getAllByRole("button")
        .map((button) => button.getAttribute("aria-label") ?? button.textContent),
    ).toEqual([expect.stringMatching(/^Anna/), "Aktionen für Anna"]);
  });
});

describe("AuslageRow – Dialog „Auslage bearbeiten“ (spec-406 AK2.3, AK2a)", () => {
  it("should_openPrefilledDialog_when_rowTapped", () => {
    // AK2.3 + AK2a.1
    renderRow();

    fireEvent.click(tippZiel());

    const dialog = bearbeitenDialog();
    expect(within(dialog).getByLabelText("Teilnehmer")).toHaveValue("t-1");
    expect(within(dialog).getByLabelText("Kategorie")).toHaveValue("essen");
    expect(within(dialog).getByLabelText("Betrag (€)")).toHaveValue("12,50");
    expect(within(dialog).getByLabelText("Notiz (optional)")).toHaveValue("Grillfleisch");
    expect(within(dialog).getByRole("button", { name: "Speichern" })).toBeInTheDocument();
  });

  it("should_prefillEmptyNotiz_when_zweckNull", () => {
    renderRow({ auslage: { ...offeneAuslage, zweck: null } });

    fireEvent.click(tippZiel());

    expect(within(bearbeitenDialog()).getByLabelText("Notiz (optional)")).toHaveValue("");
  });

  it("should_saveBoundToVeranstaltungAndAuslageAndClose_when_speichernSucceeds", async () => {
    // AK2a.2: IDs serverseitig gebunden (IDOR, Codify #51), Toast „Gespeichert".
    renderRow();
    fireEvent.click(tippZiel());

    await act(async () => {
      fireEvent.click(within(bearbeitenDialog()).getByRole("button", { name: "Speichern" }));
    });

    const [veranstaltungId, auslageId, , formData] = updateMock.mock.calls[0];
    expect(veranstaltungId).toBe("v-1");
    expect(auslageId).toBe("a-1");
    expect((formData as FormData).get("betrag")).toBe("12,50");
    expect(offenerDialog()).toBeNull();
    expect(meldeErfolgMock).toHaveBeenCalledWith("Gespeichert");
  });

  it("should_keepDialogWithAlert_when_speichernRejected", async () => {
    // AK2a.3 + F1
    updateMock.mockResolvedValue({ error: "Auslage nicht gefunden." });
    renderRow();
    fireEvent.click(tippZiel());

    await act(async () => {
      fireEvent.click(within(bearbeitenDialog()).getByRole("button", { name: "Speichern" }));
    });

    expect(within(bearbeitenDialog()).getByRole("alert")).toHaveTextContent(
      "Auslage nicht gefunden.",
    );
    expect(meldeErfolgMock).not.toHaveBeenCalled();
  });

  it("should_closeWithoutSavingAndFocusRow_when_abbrechenClicked", () => {
    // AK2a.4
    renderRow();
    fireEvent.click(tippZiel());

    fireEvent.click(within(bearbeitenDialog()).getByRole("button", { name: "Abbrechen" }));

    expect(offenerDialog()).toBeNull();
    expect(updateMock).not.toHaveBeenCalled();
    expect(tippZiel()).toHaveFocus();
  });

  it("should_closeWithoutSaving_when_escaped", () => {
    renderRow();
    fireEvent.click(tippZiel());

    fireEvent(offenerDialog(), new Event("cancel", { cancelable: true }));

    expect(offenerDialog()).toBeNull();
    expect(updateMock).not.toHaveBeenCalled();
  });
});

describe("AuslageRow – Zeilenmenü (spec-406 AK3)", () => {
  it("should_placeMenuTriggerNextToTippZiel_when_editable", () => {
    // AK3.1: neben dem Tipp-Ziel, nicht darin; Tippfläche ≥ 44 px.
    renderRow();

    expect(tippZiel()).not.toContainElement(menueKnopf());
    expect(menueKnopf()).toHaveClass("min-h-11", "min-w-11");
  });

  it("should_offerErstattenBearbeitenLoeschen_when_offen", () => {
    // AK3.2
    renderRow();

    const menue = menueOeffnen();

    expect(
      within(menue)
        .getAllByRole("menuitem")
        .map((eintrag) => eintrag.textContent),
    ).toEqual(["Als erstattet markieren", "Bearbeiten", "Löschen"]);
  });

  it("should_offerZuruecknehmenFirst_when_erstattet", () => {
    renderRow({ auslage: erstatteteAuslage });

    const menue = menueOeffnen();

    expect(within(menue).getAllByRole("menuitem")[0]).toHaveTextContent("Erstattung zurücknehmen");
  });

  it("should_markErstattetWithoutConfirmationCloseMenuAndReport_when_chosen", async () => {
    // AK3.3: ohne Bestätigungsdialog, IDs + Zielstatus im Formular (IDOR, Codify #51).
    renderRow();

    await waehleUndWarte("Als erstattet markieren");

    const formData = setStatusMock.mock.calls[0][1];
    expect(formData.get("status")).toBe("erstattet");
    expect(formData.get("veranstaltungId")).toBe("v-1");
    expect(formData.get("id")).toBe("a-1");
    expect(document.querySelector("dialog[open]")).toBeNull();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(menueKnopf()).toHaveFocus();
    expect(meldeErfolgMock).toHaveBeenCalledWith("Auslage erstattet");
  });

  it("should_reportZurueckgenommenWithTargetOffen_when_zuruecknehmenChosen", async () => {
    renderRow({ auslage: erstatteteAuslage });

    await waehleUndWarte("Erstattung zurücknehmen");

    expect(setStatusMock.mock.calls[0][1].get("status")).toBe("offen");
    expect(meldeErfolgMock).toHaveBeenCalledWith("Erstattung zurückgenommen");
  });

  it("should_keepMenuOpenWithAlert_when_erstattenRejected", async () => {
    // AK3.4 + F1: sichtbar statt stumm, Notice im Menü.
    setStatusMock.mockResolvedValue({ error: "Veranstaltung ist nicht mehr offen." });
    renderRow();

    await waehleUndWarte("Als erstattet markieren");

    const menue = screen.getByRole("menu");
    expect(within(menue).getByRole("alert")).toHaveTextContent(
      "Veranstaltung ist nicht mehr offen.",
    );
    expect(meldeErfolgMock).not.toHaveBeenCalled();
  });

  it("should_lockErstattenEntry_when_actionRunning", async () => {
    setStatusMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          laufendeActionBeenden = () => resolve({ ok: true });
        }),
    );
    renderRow();

    await waehleUndWarte("Als erstattet markieren");

    expect(screen.getByRole("menuitem", { name: "Als erstattet markieren" })).toBeDisabled();
  });

  it("should_openBearbeitenDialogReturningFocusToRow_when_bearbeitenChosen", () => {
    // AK3.5: „Bearbeiten" öffnet den Dialog aus AK2a, Fokus-Rückgabe auf die Zeile.
    renderRow();

    waehle("Bearbeiten");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    fireEvent.click(within(bearbeitenDialog()).getByRole("button", { name: "Abbrechen" }));

    expect(tippZiel()).toHaveFocus();
  });
});

describe("AuslageRow – Löschen mit Rückfrage (spec-406 AK4, spec-372 AK1)", () => {
  it("should_openDangerConfirmationNamingAuslage_when_loeschenChosen", () => {
    // AK4.1
    renderRow();

    waehle("Löschen");

    const dialog = loeschDialog();
    expect(dialog).toHaveAccessibleDescription(
      "Die Auslage von „Anna“ (Essen, 12,50 €) wird gelöscht. Das kann nicht rückgängig gemacht werden.",
    );
    expect(within(dialog).getByRole("button", { name: "Löschen" })).toHaveClass("bg-danger");
    expect(removeMock).not.toHaveBeenCalled();
  });

  it("should_notSubmitAnything_when_loeschenEntryChosen", () => {
    // AK4.4: der Auslöser ist kein Submit – auch vor der Hydration sendet er nichts ab.
    renderRow();

    const eintrag = within(menueOeffnen()).getByRole("menuitem", { name: "Löschen" });

    expect(eintrag).toHaveAttribute("type", "button");
    expect(eintrag.closest("form")).toBeNull();
  });

  it("should_notDeleteAndFocusMenuTrigger_when_cancelled", () => {
    // AK4.3
    renderRow();
    waehle("Löschen");

    fireEvent.click(within(loeschDialog()).getByRole("button", { name: "Abbrechen" }));

    expect(offenerDialog()).toBeNull();
    expect(removeMock).not.toHaveBeenCalled();
    expect(menueKnopf()).toHaveFocus();
  });

  it("should_notDelete_when_escaped", () => {
    renderRow();
    waehle("Löschen");

    fireEvent(offenerDialog(), new Event("cancel", { cancelable: true }));

    expect(offenerDialog()).toBeNull();
    expect(removeMock).not.toHaveBeenCalled();
  });

  it("should_deleteBoundIdsAndReportGeloescht_when_confirmed", async () => {
    // AK4.2
    renderRow();
    waehle("Löschen");

    await act(async () => {
      fireEvent.click(within(loeschDialog()).getByRole("button", { name: "Löschen" }));
    });

    const formData = removeMock.mock.calls[0][1];
    expect(formData.get("veranstaltungId")).toBe("v-1");
    expect(formData.get("id")).toBe("a-1");
    expect(offenerDialog()).toBeNull();
    expect(meldeErfolgMock).toHaveBeenCalledWith("Auslage gelöscht");
  });

  it("should_lockDialog_when_deleteRunning", async () => {
    // AK4.2: Busy „Löschen …", gesperrt.
    removeMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          laufendeActionBeenden = () => resolve({ ok: true });
        }),
    );
    renderRow();
    waehle("Löschen");

    await act(async () => {
      fireEvent.click(within(loeschDialog()).getByRole("button", { name: "Löschen" }));
    });
    fireEvent(offenerDialog(), new Event("cancel", { cancelable: true }));

    expect(offenerDialog()).not.toBeNull();
    expect(within(loeschDialog()).getByRole("button", { name: "Löschen …" })).toBeDisabled();
    expect(within(loeschDialog()).getByRole("button", { name: "Abbrechen" })).toBeDisabled();
  });

  it("should_keepDialogWithAlert_when_deleteRejected", async () => {
    // AK4.3 + F1
    removeMock.mockResolvedValue({ error: "Auslage nicht gefunden." });
    renderRow();
    waehle("Löschen");

    await act(async () => {
      fireEvent.click(within(loeschDialog()).getByRole("button", { name: "Löschen" }));
    });

    expect(within(loeschDialog()).getByRole("alert")).toHaveTextContent("Auslage nicht gefunden.");
    expect(meldeErfolgMock).not.toHaveBeenCalled();
  });

  it("should_notShowOldError_when_reopened", async () => {
    removeMock.mockResolvedValue({ error: "Abgelehnt." });
    renderRow();
    waehle("Löschen");
    await act(async () => {
      fireEvent.click(within(loeschDialog()).getByRole("button", { name: "Löschen" }));
    });
    fireEvent.click(within(loeschDialog()).getByRole("button", { name: "Abbrechen" }));

    waehle("Löschen");

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("should_moveFocusToAuslagenListe_when_rowDisappearsAfterDelete", async () => {
    // AK4.4 (Lesson #371/#373): nach dem Erfolg verschwindet die Zeile samt Auslöser.
    const ueberschrift = (
      <h2 id={AUSLAGEN_LISTE_ID} tabIndex={-1}>
        Auslagen
      </h2>
    );
    const { rerender } = render(
      <>
        {ueberschrift}
        <ul>{zeile()}</ul>
      </>,
    );
    waehle("Löschen");
    await act(async () => {
      fireEvent.click(within(loeschDialog()).getByRole("button", { name: "Löschen" }));
    });

    // Die Revalidierung liefert die Liste ohne die gelöschte Auslage.
    (document.activeElement as HTMLElement | null)?.blur();
    rerender(
      <>
        {ueberschrift}
        <ul />
      </>,
    );

    expect(screen.getByRole("heading", { name: "Auslagen" })).toHaveFocus();
  });
});

describe("AuslageRow – nur lesen (spec-406 F2, ADR-061 D4)", () => {
  it("should_showContentWithoutAnyControl_when_notEditable", () => {
    renderRow({ editable: false });

    expect(screen.getByText("Anna")).toBeInTheDocument();
    expect(screen.getByText("Essen · Grillfleisch")).toBeInTheDocument();
    expect(screen.getByText("12,50 €")).toBeInTheDocument();
    expect(screen.getByText("offen")).toHaveClass("text-warning");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("should_shareListenZeileCardTokens_when_notEditable", () => {
    // Drift-Anker (ADR-061 Konsequenzen): dieselbe Kartenoptik wie `ListenZeile`.
    renderRow({ editable: false });

    expect(screen.getByRole("listitem")).toHaveClass(
      "rounded-lg",
      "border",
      "border-line-subtle",
      "bg-surface",
      "text-foreground",
    );
  });
});
