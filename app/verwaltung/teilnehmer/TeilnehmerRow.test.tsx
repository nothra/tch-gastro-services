import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Teilnehmer } from "@/db/schema";
import { TeilnehmerRow } from "./TeilnehmerRow";

// Externe Grenzen der Komponente: Server Actions und Next.js Cache.
vi.mock("./actions", () => ({
  updateTeilnehmerAction: vi.fn(),
  setTeilnehmerActiveAction: vi.fn(),
}));

const aTeilnehmer: Teilnehmer = {
  id: "t-1",
  name: "Anna Müller",
  typ: "person",
  mitglied: false,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => vi.clearAllMocks());

describe("TeilnehmerRow (Anzeigemodus)", () => {
  it("should_showNameAndTypLabel_when_rendered", () => {
    render(<TeilnehmerRow teilnehmer={aTeilnehmer} />);

    expect(screen.getByText("Anna Müller")).toBeInTheDocument();
    // TYP_LABEL["person"] = "Person"
    expect(screen.getByText("Person")).toBeInTheDocument();
  });

  it("should_showFamilieLabel_when_typFamilie", () => {
    render(<TeilnehmerRow teilnehmer={{ ...aTeilnehmer, typ: "familie" }} />);

    expect(screen.getByText("Familie")).toBeInTheDocument();
  });

  it("should_showMitgliedLabel_when_mitgliedTrue", () => {
    render(<TeilnehmerRow teilnehmer={{ ...aTeilnehmer, mitglied: true }} />);

    expect(screen.getByText(/Mitglied/)).toBeInTheDocument();
  });

  it("should_showDeaktivierenButton_when_teilnehmerIsActive", () => {
    render(<TeilnehmerRow teilnehmer={aTeilnehmer} />);

    expect(screen.getByRole("button", { name: "Deaktivieren" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Aktivieren" })).not.toBeInTheDocument();
  });

  it("should_showAktivierenButtonAndDeactivatedLabel_when_teilnehmerIsInactive", () => {
    render(<TeilnehmerRow teilnehmer={{ ...aTeilnehmer, active: false }} />);

    expect(screen.getByRole("button", { name: "Aktivieren" })).toBeInTheDocument();
    expect(screen.getByText(/deaktiviert/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Deaktivieren" })).not.toBeInTheDocument();
  });
});

describe("TeilnehmerRow (Bearbeiten-Toggle)", () => {
  it("should_showEditFormWithSpeichernAndAbbrechen_when_BearbeitenClicked", async () => {
    const user = userEvent.setup();
    render(<TeilnehmerRow teilnehmer={aTeilnehmer} />);

    await user.click(screen.getByRole("button", { name: "Bearbeiten" }));

    expect(screen.getByRole("button", { name: "Speichern" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Abbrechen" })).toBeInTheDocument();
    // Bearbeiten-Button ist im Editmodus nicht mehr sichtbar
    expect(screen.queryByRole("button", { name: "Bearbeiten" })).not.toBeInTheDocument();
  });

  it("should_returnToDisplayView_when_AbbrechenClicked", async () => {
    const user = userEvent.setup();
    render(<TeilnehmerRow teilnehmer={aTeilnehmer} />);

    await user.click(screen.getByRole("button", { name: "Bearbeiten" }));
    await user.click(screen.getByRole("button", { name: "Abbrechen" }));

    expect(screen.getByRole("button", { name: "Bearbeiten" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Speichern" })).not.toBeInTheDocument();
  });
});
