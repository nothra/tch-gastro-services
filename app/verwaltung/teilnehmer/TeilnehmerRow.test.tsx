import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

async function klicke(name: string) {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name }));
  });
}

const aTeilnehmer: Teilnehmer = {
  id: "t-1",
  name: "Anna Müller",
  typ: "person",
  mitglied: false,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.resetAllMocks();
  updateMock.mockResolvedValue({ ok: true });
  setActiveMock.mockResolvedValue({ ok: true });
});

describe("TeilnehmerRow (Rückmeldung, spec-372 AK12/AK16)", () => {
  it("should_reportGespeichertAndClose_when_saveSucceeds", async () => {
    render(<TeilnehmerRow teilnehmer={aTeilnehmer} />);
    await klicke("Bearbeiten");

    await klicke("Speichern");

    expect(meldeErfolgMock).toHaveBeenCalledWith("Gespeichert");
    expect(screen.getByRole("button", { name: "Bearbeiten" })).toBeInTheDocument();
  });

  it("should_showAlertAndStayInEdit_when_saveRejected", async () => {
    updateMock.mockResolvedValue({ error: "Anzeigename ist zu lang." });
    render(<TeilnehmerRow teilnehmer={aTeilnehmer} />);
    await klicke("Bearbeiten");

    await klicke("Speichern");

    expect(screen.getByRole("alert")).toHaveTextContent("Anzeigename ist zu lang.");
    expect(meldeErfolgMock).not.toHaveBeenCalled();
  });

  it("should_sendTargetStateAndReportDeaktiviert_when_deaktivierenSucceeds", async () => {
    render(<TeilnehmerRow teilnehmer={aTeilnehmer} />);

    await klicke("Deaktivieren");

    const formData = setActiveMock.mock.calls[0][1];
    expect(formData.get("id")).toBe("t-1");
    expect(formData.get("active")).toBe("false");
    expect(meldeErfolgMock).toHaveBeenCalledWith("Teilnehmer deaktiviert");
  });

  it("should_reportAktiviert_when_aktivierenSucceeds", async () => {
    render(<TeilnehmerRow teilnehmer={{ ...aTeilnehmer, active: false }} />);

    await klicke("Aktivieren");

    expect(meldeErfolgMock).toHaveBeenCalledWith("Teilnehmer aktiviert");
  });

  it("should_showAlertAndNoToast_when_toggleRejected", async () => {
    setActiveMock.mockResolvedValue({ error: "Teilnehmer nicht gefunden." });
    render(<TeilnehmerRow teilnehmer={aTeilnehmer} />);

    await klicke("Deaktivieren");

    expect(screen.getByRole("alert")).toHaveTextContent("Teilnehmer nicht gefunden.");
    expect(meldeErfolgMock).not.toHaveBeenCalled();
  });
});

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
