import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { CatalogFormState } from "../actions";

// Externe Grenzen: Server Action aus derselben Feature-Schicht und die Toast-Kapsel (ADR-058 D1).
vi.mock("../actions", () => ({ createCatalogAction: vi.fn() }));
vi.mock("@/app/components/ui/meldung", () => ({ meldeErfolg: vi.fn() }));

import { meldeErfolg } from "@/app/components/ui/meldung";
import { createCatalogAction } from "../actions";
import { KatalogAnlegen } from "./KatalogAnlegen";

const createMock = vi.mocked(createCatalogAction);
const meldeErfolgMock = vi.mocked(meldeErfolg);

const TITEL = "Katalog anlegen";

// Offen gehaltene Action für den Lauf-Test; aufgelöst in `afterEach` (Lesson #370).
let laufendeActionBeenden: (() => void) | undefined;

beforeEach(() => {
  vi.resetAllMocks();
  laufendeActionBeenden = undefined;
  createMock.mockResolvedValue({ ok: true });
});

afterEach(async () => {
  await act(async () => laufendeActionBeenden?.());
});

function ausloeser() {
  return screen.getByRole("button", { name: "Katalog anlegen" });
}

function oeffnen() {
  fireEvent.click(ausloeser());
  return screen.getByRole("dialog", { name: TITEL });
}

function istOffen() {
  return screen.queryByRole("heading", { name: TITEL }) !== null;
}

async function klickeIm(dialog: HTMLElement, name: string) {
  await act(async () => {
    fireEvent.click(within(dialog).getByRole("button", { name }));
  });
}

describe("KatalogAnlegen – Auslöser (spec-407 AK1.2/AK2.9)", () => {
  it("should_beSecondaryWithTouchSize_when_rendered", () => {
    render(<KatalogAnlegen />);

    expect(ausloeser()).toHaveClass("border-line", "min-h-11");
    expect(ausloeser()).not.toHaveClass("bg-accent");
  });

  it("should_notCarrySeitenkopfId_when_rendered", () => {
    // AK2.9: die Id `anlegen-seitenkopf` gehört dem Primär-Knopf „+ Neu" im Artikelbereich.
    render(<KatalogAnlegen />);

    expect(ausloeser()).not.toHaveAttribute("id");
  });
});

describe("KatalogAnlegen – Dialog (spec-407 AK2.8, spec-372 AK5/AK6)", () => {
  it("should_openDialogWithTitleAndLinkedField_when_triggerClicked", () => {
    render(<KatalogAnlegen />);

    const dialog = oeffnen();

    expect(within(dialog).getByLabelText("Katalogname")).toHaveAttribute("name", "name");
    expect(within(dialog).getByRole("button", { name: "Abbrechen" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Anlegen" })).toHaveAttribute(
      "type",
      "submit",
    );
  });

  it("should_sendNameCloseAndReportAngelegt_when_createSucceeds", async () => {
    render(<KatalogAnlegen />);
    const dialog = oeffnen();
    fireEvent.change(within(dialog).getByLabelText("Katalogname"), {
      target: { value: "Dorfmeisterschaften" },
    });

    await klickeIm(dialog, "Anlegen");

    expect(createMock.mock.calls[0][1].get("name")).toBe("Dorfmeisterschaften");
    expect(istOffen()).toBe(false);
    expect(meldeErfolgMock).toHaveBeenCalledWith("Katalog angelegt");
    expect(ausloeser()).toHaveFocus();
  });

  it("should_keepDialogWithAlertAndInput_when_createRejected", async () => {
    createMock.mockResolvedValue({ error: "Ein Katalog mit diesem Namen existiert bereits." });
    render(<KatalogAnlegen />);
    const dialog = oeffnen();
    fireEvent.change(within(dialog).getByLabelText("Katalogname"), {
      target: { value: "Montagsrunde" },
    });

    await klickeIm(dialog, "Anlegen");

    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "Ein Katalog mit diesem Namen existiert bereits.",
    );
    expect(within(dialog).getByLabelText("Katalogname")).toHaveValue("Montagsrunde");
    expect(meldeErfolgMock).not.toHaveBeenCalled();
  });

  it("should_closeAndReturnFocus_when_cancelClicked", async () => {
    render(<KatalogAnlegen />);
    const dialog = oeffnen();

    await klickeIm(dialog, "Abbrechen");

    expect(istOffen()).toBe(false);
    expect(createMock).not.toHaveBeenCalled();
    expect(ausloeser()).toHaveFocus();
  });

  it("should_lockEscapeAndButtonsWithAnlegenBusyLabel_when_createRunning", async () => {
    // AK5.3: Busy „Anlegen …"; spec-372 AK6: Sperre während der Action.
    createMock.mockImplementation(
      () =>
        new Promise<CatalogFormState>((resolve) => {
          laufendeActionBeenden = () => resolve({ ok: true });
        }),
    );
    render(<KatalogAnlegen />);
    const dialog = oeffnen();

    await klickeIm(dialog, "Anlegen");
    fireEvent(dialog.closest("dialog")!, new Event("cancel", { cancelable: true }));

    expect(istOffen()).toBe(true);
    expect(within(dialog).getByRole("button", { name: "Abbrechen" })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "Anlegen …" })).toBeDisabled();
  });
});
