import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AuslageRow as AuslageRowData } from "@/db/auslage";
import { AuslageRow } from "./AuslageRow";
import { AUSLAGEN_LISTE_ID } from "./auslagenListe";

// Externe Grenzen: Server Actions der Feature-Schicht und die Toast-Kapsel (ADR-058 D1).
vi.mock("./actions", () => ({
  setAuslageStatusAction: vi.fn(),
  removeAuslageAction: vi.fn(),
  updateAuslageAction: vi.fn(),
}));
vi.mock("@/app/components/ui/meldung", () => ({ meldeErfolg: vi.fn() }));

import { meldeErfolg } from "@/app/components/ui/meldung";
import { removeAuslageAction, setAuslageStatusAction } from "./actions";

const removeMock = vi.mocked(removeAuslageAction);
const setStatusMock = vi.mocked(setAuslageStatusAction);
const meldeErfolgMock = vi.mocked(meldeErfolg);

// AuslageForm ist eigenständig getestet (AuslageForm.test.tsx); hier durch ein Stub ersetzt,
// das die durchgereichten Props sichtbar macht und onSuccess auslösen kann.
vi.mock("./AuslageForm", () => ({
  AuslageForm: ({ onSuccess, initial }: { onSuccess?: () => void; initial?: unknown }) => (
    <div data-testid="edit-form">
      <span data-testid="edit-initial">{JSON.stringify(initial)}</span>
      <button type="button" onClick={() => onSuccess?.()}>
        stub-save
      </button>
    </div>
  ),
}));

const offeneAuslage: AuslageRowData = {
  id: "a-1",
  teilnehmerId: "t-1",
  anzeigename: "Anna",
  kategorie: "essen",
  betragCents: 1250,
  zweck: "Grillfleisch",
  status: "offen",
};

const teilnehmer = [{ teilnehmerId: "t-1", anzeigename: "Anna" }];

function renderRow(overrides: Partial<Parameters<typeof AuslageRow>[0]> = {}) {
  return render(
    <ul>
      <AuslageRow
        auslage={offeneAuslage}
        veranstaltungId="v-1"
        teilnehmer={teilnehmer}
        editable
        {...overrides}
      />
    </ul>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  removeMock.mockResolvedValue({ ok: true });
  setStatusMock.mockResolvedValue({ ok: true });
});

function dialog() {
  return document.querySelector("dialog")!;
}

function loeschenAusloeser() {
  // Der Auslöser in der Zeile – im geöffneten Dialog gibt es einen zweiten „Löschen"-Button.
  return screen.getAllByRole("button", { name: "Löschen" })[0];
}

function loeschenBestaetigen() {
  return within(dialog()).getByRole("button", { name: "Löschen" });
}

describe("AuslageRow (Anzeige)", () => {
  it("should_showNameKategorieBetragZweckStatus_when_rendered", () => {
    renderRow();

    expect(screen.getByText("Anna")).toBeInTheDocument();
    expect(screen.getByText("Essen")).toBeInTheDocument();
    expect(screen.getByText("12,50 €")).toBeInTheDocument();
    expect(screen.getByText(/Grillfleisch/)).toBeInTheDocument();
    expect(screen.getByText("offen zu erstatten")).toBeInTheDocument();
  });

  it("should_renderWithoutZweck_when_zweckNull", () => {
    renderRow({ auslage: { ...offeneAuslage, zweck: null } });

    expect(screen.getByText("Anna")).toBeInTheDocument();
    expect(screen.queryByText(/Grillfleisch/)).not.toBeInTheDocument();
  });
});

describe("AuslageRow (Status-Umschalten)", () => {
  it("should_offerMarkErstattetWithTargetStatus_when_offen", () => {
    renderRow();

    const button = screen.getByRole("button", { name: /erstattet markieren/i });
    const form = button.closest("form")!;
    expect(within(form).getByDisplayValue("erstattet")).toHaveAttribute("name", "status");
    expect(within(form).getByDisplayValue("v-1")).toHaveAttribute("name", "veranstaltungId");
    expect(within(form).getByDisplayValue("a-1")).toHaveAttribute("name", "id");
  });

  it("should_offerZuruecknehmenWithTargetStatusOffen_when_erstattet", () => {
    renderRow({ auslage: { ...offeneAuslage, status: "erstattet" } });

    expect(screen.getByText("erstattet")).toBeInTheDocument();
    const button = screen.getByRole("button", { name: /zurücknehmen/i });
    const form = button.closest("form")!;
    expect(within(form).getByDisplayValue("offen")).toHaveAttribute("name", "status");
  });

  it("should_reportErstattet_when_markErstattetSucceeds", async () => {
    // spec-372 AK12: Erstattung umschalten meldet per Toast.
    renderRow();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Als erstattet markieren" }));
    });

    expect(setStatusMock.mock.calls[0][1].get("status")).toBe("erstattet");
    expect(meldeErfolgMock).toHaveBeenCalledWith("Auslage erstattet");
  });

  it("should_reportZurueckgenommen_when_zuruecknehmenSucceeds", async () => {
    renderRow({ auslage: { ...offeneAuslage, status: "erstattet" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Erstattung zurücknehmen" }));
    });

    expect(meldeErfolgMock).toHaveBeenCalledWith("Erstattung zurückgenommen");
  });

  it("should_showAlertAndNoToast_when_statusChangeRejected", async () => {
    // FS2: Veranstaltung inzwischen abgeschlossen – sichtbar statt stumm, kein Erfolg.
    setStatusMock.mockResolvedValue({ error: "Veranstaltung ist nicht mehr offen." });
    renderRow();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Als erstattet markieren" }));
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Veranstaltung ist nicht mehr offen.");
    expect(meldeErfolgMock).not.toHaveBeenCalled();
  });
});

describe("AuslageRow (Löschen mit Bestätigung, spec-372 AK1/AK2/AK6/AK7)", () => {
  it("should_styleTriggerAsDangerWithoutSubmitting_when_rendered", () => {
    // AK7 + FS7: Gefahr-Optik, und der Auslöser sendet nie selbst ab (auch nicht vor Hydration).
    renderRow();

    expect(loeschenAusloeser()).toHaveClass("bg-danger");
    expect(loeschenAusloeser()).toHaveAttribute("type", "button");
    expect(loeschenAusloeser().closest("form")).toBeNull();
  });

  it("should_openDangerConfirmationNamingAuslage_when_loeschenClicked", () => {
    // AK1: Teilnehmer, Kategorie und Betrag stehen im Dialog; noch nichts gelöscht.
    renderRow();

    fireEvent.click(loeschenAusloeser());

    const bestaetigung = screen.getByRole("dialog", { name: "Auslage löschen?" });
    expect(bestaetigung).toHaveAccessibleDescription(/Anna/);
    expect(bestaetigung).toHaveAccessibleDescription(/Essen/);
    expect(bestaetigung).toHaveAccessibleDescription(/12,50 €/);
    expect(loeschenBestaetigen()).toHaveClass("bg-danger");
    expect(removeMock).not.toHaveBeenCalled();
  });

  it("should_notDeleteAndReturnFocus_when_cancelled", () => {
    // AK2
    renderRow();
    fireEvent.click(loeschenAusloeser());

    fireEvent.click(within(dialog()).getByRole("button", { name: "Abbrechen" }));

    expect(dialog()).not.toHaveAttribute("open");
    expect(removeMock).not.toHaveBeenCalled();
    expect(loeschenAusloeser()).toHaveFocus();
  });

  it("should_notDelete_when_escaped", () => {
    // AK2
    renderRow();
    fireEvent.click(loeschenAusloeser());

    fireEvent(dialog(), new Event("cancel", { cancelable: true }));

    expect(dialog()).not.toHaveAttribute("open");
    expect(removeMock).not.toHaveBeenCalled();
  });

  it("should_deleteBoundIdsAndReportGeloescht_when_confirmed", async () => {
    // AK1 + AK12
    renderRow();
    fireEvent.click(loeschenAusloeser());

    await act(async () => {
      fireEvent.click(loeschenBestaetigen());
    });

    const formData = removeMock.mock.calls[0][1];
    expect(formData.get("veranstaltungId")).toBe("v-1");
    expect(formData.get("id")).toBe("a-1");
    expect(dialog()).not.toHaveAttribute("open");
    expect(meldeErfolgMock).toHaveBeenCalledWith("Auslage gelöscht");
  });

  it("should_keepDialogWithAlertAndNoToast_when_serverRejects", async () => {
    // AK6 + FS1: die Auslage ist schon weg (anderes Gerät).
    removeMock.mockResolvedValue({ error: "Auslage nicht gefunden." });
    renderRow();
    fireEvent.click(loeschenAusloeser());

    await act(async () => {
      fireEvent.click(loeschenBestaetigen());
    });

    expect(dialog()).toHaveAttribute("open");
    expect(within(dialog()).getByRole("alert")).toHaveTextContent("Auslage nicht gefunden.");
    expect(meldeErfolgMock).not.toHaveBeenCalled();
  });

  it("should_lockCancelConfirmAndEscape_when_actionRunning", async () => {
    // AK6: kein Schließen während des Schreibens. Die Action wird am Ende aufgelöst – ein nie
    // endendes Promise hielte den Action-Scope für spätere Tests offen (Lesson #370).
    let beenden: (state: { ok: true }) => void = () => {};
    removeMock.mockReturnValue(new Promise((resolve) => (beenden = resolve)));
    renderRow();
    fireEvent.click(loeschenAusloeser());

    await act(async () => {
      fireEvent.click(loeschenBestaetigen());
    });
    fireEvent(dialog(), new Event("cancel", { cancelable: true }));

    expect(dialog()).toHaveAttribute("open");
    expect(within(dialog()).getByRole("button", { name: "Abbrechen" })).toBeDisabled();
    expect(within(dialog()).getByRole("button", { name: "Löschen …" })).toBeDisabled();
    await act(async () => beenden({ ok: true }));
  });

  it("should_notShowOldError_when_reopened", async () => {
    removeMock.mockResolvedValue({ error: "Abgelehnt." });
    renderRow();
    fireEvent.click(loeschenAusloeser());
    await act(async () => {
      fireEvent.click(loeschenBestaetigen());
    });
    fireEvent.click(within(dialog()).getByRole("button", { name: "Abbrechen" }));

    fireEvent.click(loeschenAusloeser());

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("should_moveFocusToAuslagenListe_when_rowDisappearsAfterDelete", async () => {
    // Lesson #371/#373: nach dem Erfolg verschwindet die Zeile samt Auslöser – der Fokus fiele auf
    // `<body>`. Ersatzziel ist die Überschrift der Auslagen-Liste.
    const { rerender } = render(
      <>
        <h2 id={AUSLAGEN_LISTE_ID} tabIndex={-1}>
          Auslagen
        </h2>
        <ul>
          <AuslageRow
            auslage={offeneAuslage}
            veranstaltungId="v-1"
            teilnehmer={teilnehmer}
            editable
          />
        </ul>
      </>,
    );
    fireEvent.click(loeschenAusloeser());
    await act(async () => {
      fireEvent.click(loeschenBestaetigen());
    });

    // Die Revalidierung liefert die Liste ohne die gelöschte Auslage.
    (document.activeElement as HTMLElement | null)?.blur();
    rerender(
      <>
        <h2 id={AUSLAGEN_LISTE_ID} tabIndex={-1}>
          Auslagen
        </h2>
        <ul />
      </>,
    );

    expect(screen.getByRole("heading", { name: "Auslagen" })).toHaveFocus();
  });
});

describe("AuslageRow (nicht editierbar)", () => {
  it("should_hideAllControls_when_notEditable", () => {
    renderRow({ editable: false });

    expect(screen.getByText("Anna")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("AuslageRow (Bearbeiten-Toggle)", () => {
  it("should_showEditFormWithPrefilledInitial_when_BearbeitenClicked", async () => {
    const user = userEvent.setup();
    renderRow();

    await user.click(screen.getByRole("button", { name: "Bearbeiten" }));

    expect(screen.getByTestId("edit-form")).toBeInTheDocument();
    const initial = JSON.parse(screen.getByTestId("edit-initial").textContent!);
    expect(initial).toEqual({
      teilnehmerId: "t-1",
      kategorie: "essen",
      betrag: "12,50",
      zweck: "Grillfleisch",
    });
  });

  it("should_returnToDisplay_when_editSucceeds", async () => {
    const user = userEvent.setup();
    renderRow();

    await user.click(screen.getByRole("button", { name: "Bearbeiten" }));
    await user.click(screen.getByRole("button", { name: "stub-save" }));

    expect(screen.queryByTestId("edit-form")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bearbeiten" })).toBeInTheDocument();
  });

  it("should_returnToDisplay_when_AbbrechenClicked", async () => {
    const user = userEvent.setup();
    renderRow();

    await user.click(screen.getByRole("button", { name: "Bearbeiten" }));
    await user.click(screen.getByRole("button", { name: "Abbrechen" }));

    expect(screen.queryByTestId("edit-form")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bearbeiten" })).toBeInTheDocument();
  });

  it("should_prefillEmptyZweck_when_zweckNull", async () => {
    const user = userEvent.setup();
    renderRow({ auslage: { ...offeneAuslage, zweck: null } });

    await user.click(screen.getByRole("button", { name: "Bearbeiten" }));

    const initial = JSON.parse(screen.getByTestId("edit-initial").textContent!);
    expect(initial.zweck).toBe("");
  });
});
