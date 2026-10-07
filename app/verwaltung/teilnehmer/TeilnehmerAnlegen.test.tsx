import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

// Externe Grenze: Server Action aus derselben Feature-Schicht.
vi.mock("./actions", () => ({ createTeilnehmerAction: vi.fn() }));

import { createTeilnehmerAction } from "./actions";
import { TeilnehmerAnlegen } from "./TeilnehmerAnlegen";

const createMock = vi.mocked(createTeilnehmerAction);

const DUPLIKAT_WARNUNG = "Ein aktiver Teilnehmer mit diesem Namen existiert bereits.";

function renderUndOeffnen() {
  render(<TeilnehmerAnlegen ausloeser="+ Neu" />);
  fireEvent.click(screen.getByRole("button", { name: "+ Neu" }));
  return screen.getByRole("dialog", { name: "Teilnehmer anlegen" });
}

async function klicke(name: string) {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name }));
  });
}

function confirmDuplicate() {
  return document.querySelector<HTMLInputElement>('input[name="confirmDuplicate"]')!;
}

beforeEach(() => {
  vi.resetAllMocks();
  createMock.mockResolvedValue({ ok: true });
});

describe("TeilnehmerAnlegen (spec-373 AK8.1, AK1)", () => {
  it("should_showOnlyTrigger_when_rendered", () => {
    render(<TeilnehmerAnlegen ausloeser="+ Neu" />);

    expect(screen.queryByLabelText("Anzeigename")).not.toBeInTheDocument();
  });

  it("should_showFieldsOfFormerForm_when_opened", () => {
    // AK1.2: gleiche Felder wie bisher.
    renderUndOeffnen();

    expect(screen.getByLabelText("Anzeigename")).toBeRequired();
    expect(screen.getByLabelText("Typ")).toHaveValue("person");
    expect(screen.getByLabelText("Mitglied")).not.toBeChecked();
    expect(confirmDuplicate()).toHaveValue("false");
  });

  it("should_sendFieldsAndClose_when_anlegenSucceeds", async () => {
    // AK1.3
    renderUndOeffnen();
    fireEvent.change(screen.getByLabelText("Anzeigename"), { target: { value: "Anna" } });

    await klicke("Anlegen");

    const formData = createMock.mock.calls[0][1];
    expect(formData.get("name")).toBe("Anna");
    expect(formData.get("confirmDuplicate")).toBe("false");
    expect(document.querySelector("dialog")).not.toHaveAttribute("open");
  });

  it("should_keepInputAndShowError_when_actionRejects", async () => {
    // AK1.4
    createMock.mockResolvedValue({ error: "Anzeigename ist zu lang." });
    renderUndOeffnen();
    fireEvent.change(screen.getByLabelText("Anzeigename"), { target: { value: "Anna" } });

    await klicke("Anlegen");

    expect(screen.getByRole("alert")).toHaveTextContent("Anzeigename ist zu lang.");
    expect(screen.getByLabelText("Anzeigename")).toHaveValue("Anna");
  });

  it("should_offerTrotzdemAnlegenWithConfirm_when_duplicateWarning", async () => {
    // ADR-022: die überstimmbare Duplikat-Warnung bleibt im Dialog, der Zweitversuch bestätigt.
    createMock.mockResolvedValueOnce({ needsConfirm: true, warning: DUPLIKAT_WARNUNG });
    renderUndOeffnen();
    fireEvent.change(screen.getByLabelText("Anzeigename"), { target: { value: "Anna" } });

    await klicke("Anlegen");

    expect(screen.getByRole("status")).toHaveTextContent(DUPLIKAT_WARNUNG);
    expect(screen.getByLabelText("Anzeigename")).toHaveValue("Anna");
    expect(confirmDuplicate()).toHaveValue("true");

    await klicke("Trotzdem anlegen");

    expect(createMock.mock.calls[1][1].get("confirmDuplicate")).toBe("true");
    expect(document.querySelector("dialog")).not.toHaveAttribute("open");
  });
});
