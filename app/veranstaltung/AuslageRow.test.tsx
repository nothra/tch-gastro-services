import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AuslageRow as AuslageRowData } from "@/db/auslage";
import { AuslageRow } from "./AuslageRow";

// Externe Grenzen: Server Actions der Feature-Schicht.
vi.mock("./actions", () => ({
  setAuslageStatusAction: vi.fn(),
  removeAuslageAction: vi.fn(),
  updateAuslageAction: vi.fn(),
}));

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

beforeEach(() => vi.clearAllMocks());

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
});

describe("AuslageRow (Löschen)", () => {
  it("should_carryVeranstaltungIdAndId_when_deleteForm", () => {
    renderRow();

    const button = screen.getByRole("button", { name: "Löschen" });
    const form = button.closest("form")!;
    expect(within(form).getByDisplayValue("v-1")).toHaveAttribute("name", "veranstaltungId");
    expect(within(form).getByDisplayValue("a-1")).toHaveAttribute("name", "id");
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
