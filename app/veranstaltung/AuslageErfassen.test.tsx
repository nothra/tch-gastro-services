import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { AuslageFormState } from "./actions";

vi.mock("@/app/components/ui/meldung", () => ({ meldeErfolg: vi.fn() }));

import { meldeErfolg } from "@/app/components/ui/meldung";
import { AuslageErfassen } from "./AuslageErfassen";

const meldeErfolgMock = vi.mocked(meldeErfolg);
const action =
  vi.fn<(prev: AuslageFormState | undefined, fd: FormData) => Promise<AuslageFormState>>();
const teilnehmer = [{ teilnehmerId: "t-1", anzeigename: "Anna" }];

beforeEach(() => {
  vi.resetAllMocks();
  action.mockResolvedValue({ ok: true });
});

function dialog() {
  return document.querySelector("dialog")!;
}

function ausloeser() {
  return screen.getByRole("button", { name: "+ Neu" });
}

describe("AuslageErfassen (spec-406 AK1.2–AK1.7)", () => {
  it("should_showOnlyPrimaryTrigger_when_rendered", () => {
    render(<AuslageErfassen action={action} teilnehmer={teilnehmer} ausloeser="+ Neu" />);

    expect(ausloeser()).toHaveClass("bg-accent");
    expect(dialog()).not.toHaveAttribute("open");
  });

  it("should_openDialogAuslageErfassenWithFields_when_triggerClicked", () => {
    // AK1.3
    render(<AuslageErfassen action={action} teilnehmer={teilnehmer} ausloeser="+ Neu" />);

    fireEvent.click(ausloeser());

    const offen = screen.getByRole("dialog", { name: "Auslage erfassen" });
    expect(within(offen).getByLabelText("Teilnehmer")).toBeInTheDocument();
    expect(within(offen).getByLabelText("Kategorie")).toBeInTheDocument();
    expect(within(offen).getByLabelText("Betrag (€)")).toBeInTheDocument();
    expect(within(offen).getByLabelText("Notiz (optional)")).toBeInTheDocument();
    expect(within(offen).getByRole("button", { name: "Erfassen" })).toBeInTheDocument();
  });

  it("should_closeAndReport_when_erfassenSucceeds", async () => {
    // AK1.4
    render(<AuslageErfassen action={action} teilnehmer={teilnehmer} ausloeser="+ Neu" />);
    fireEvent.click(ausloeser());
    fireEvent.change(screen.getByLabelText("Teilnehmer"), { target: { value: "t-1" } });
    fireEvent.change(screen.getByLabelText("Kategorie"), { target: { value: "essen" } });
    fireEvent.change(screen.getByLabelText("Betrag (€)"), { target: { value: "3,00" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Erfassen" }));
    });

    expect(action).toHaveBeenCalledTimes(1);
    expect(dialog()).not.toHaveAttribute("open");
    expect(meldeErfolgMock).toHaveBeenCalledWith("Auslage erfasst");
  });

  it("should_closeWithoutSavingAndFocusTrigger_when_abbrechenClicked", () => {
    // AK1.6
    render(<AuslageErfassen action={action} teilnehmer={teilnehmer} ausloeser="+ Neu" />);
    fireEvent.click(ausloeser());

    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));

    expect(dialog()).not.toHaveAttribute("open");
    expect(action).not.toHaveBeenCalled();
    expect(ausloeser()).toHaveFocus();
  });

  it("should_showHint_when_noTeilnehmer", () => {
    // AK1.7
    render(<AuslageErfassen action={action} teilnehmer={[]} ausloeser="+ Neu" />);

    fireEvent.click(ausloeser());

    expect(within(dialog()).getByRole("status")).toHaveTextContent(/Zuerst Teilnehmer/);
  });
});

describe("AuslageErfassen – ohne Teilnehmer (spec-420 AK3.1–AK3.3)", () => {
  function oeffnenOhneTeilnehmer() {
    render(<AuslageErfassen action={action} teilnehmer={[]} ausloeser="+ Neu" />);
    fireEvent.click(ausloeser());
    return screen.getByRole("dialog", { name: "Auslage erfassen" });
  }

  it("should_showAbbrechenAndDisabledErfassen_when_opened", () => {
    const offen = oeffnenOhneTeilnehmer();

    expect(within(offen).getByRole("button", { name: "Abbrechen" })).toBeEnabled();
    expect(within(offen).getByRole("button", { name: "Erfassen" })).toBeDisabled();
  });

  it("should_closeAndFocusNeu_when_abbrechenClicked", () => {
    const offen = oeffnenOhneTeilnehmer();

    fireEvent.click(within(offen).getByRole("button", { name: "Abbrechen" }));

    expect(dialog()).not.toHaveAttribute("open");
    expect(action).not.toHaveBeenCalled();
    expect(ausloeser()).toHaveFocus();
  });

  it("should_closeAndFocusNeu_when_escapePressed", () => {
    oeffnenOhneTeilnehmer();

    fireEvent(dialog(), new Event("cancel", { cancelable: true }));

    expect(dialog()).not.toHaveAttribute("open");
    expect(ausloeser()).toHaveFocus();
  });
});
