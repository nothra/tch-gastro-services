import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

// Externe Grenze: Server Action aus derselben Feature-Schicht.
vi.mock("./actions", () => ({ createCatalogItemAction: vi.fn() }));
vi.mock("@/app/components/ui/meldung", () => ({ meldeErfolg: vi.fn() }));

import { meldeErfolg } from "@/app/components/ui/meldung";
import { createCatalogItemAction } from "./actions";
import { ArtikelAnlegen } from "./ArtikelAnlegen";

const createMock = vi.mocked(createCatalogItemAction);
const meldeErfolgMock = vi.mocked(meldeErfolg);

function renderUndOeffnen() {
  render(<ArtikelAnlegen catalogId="cat-2" ausloeser="+ Neu" />);
  fireEvent.click(screen.getByRole("button", { name: "+ Neu" }));
  return screen.getByRole("dialog", { name: "Artikel anlegen" });
}

// Pflichtfelder füllen, damit eine Ablehnung aus der Action stammt, nicht aus der nativen Prüfung.
function ausfuellen() {
  fireEvent.change(screen.getByLabelText("Bezeichnung"), { target: { value: "Radler" } });
  fireEvent.change(screen.getByLabelText("Preis (EUR)"), { target: { value: "2,40" } });
}

async function anlegen() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Anlegen" }));
  });
}

// Offen gehaltene Action für den Lauf-Test. Aufgelöst wird in `afterEach` innerhalb von `act` –
// auch wenn eine Assertion vorher scheitert; sonst hielte das Promise den Action-Scope für spätere
// Tests offen (Lesson #370).
let laufendeActionBeenden: (() => void) | undefined;

beforeEach(() => {
  vi.resetAllMocks();
  laufendeActionBeenden = undefined;
  createMock.mockResolvedValue({ ok: true });
});

afterEach(async () => {
  await act(async () => laufendeActionBeenden?.());
});

describe("ArtikelAnlegen (spec-373 AK1, AK6.2)", () => {
  it("should_showOnlyTrigger_when_rendered", () => {
    render(<ArtikelAnlegen catalogId="cat-2" ausloeser="+ Neu" />);

    expect(screen.queryByLabelText("Bezeichnung")).not.toBeInTheDocument();
  });

  it("should_showCatalogFields_when_opened", () => {
    // AK1.2: gleiche Felder wie das bisherige Anlege-Formular (CatalogFields).
    renderUndOeffnen();

    expect(screen.getByLabelText("Bezeichnung")).toHaveValue("");
    expect(screen.getByLabelText("Kategorie")).toHaveValue("getraenk");
    expect(screen.getByLabelText("Preis (EUR)")).toBeRequired();
  });

  it("should_createInGivenCatalogAndClose_when_anlegenSucceeds", async () => {
    // AK1.3 + AK6.2: angelegt wird im geöffneten Katalog.
    renderUndOeffnen();
    ausfuellen();

    await anlegen();

    const formData = createMock.mock.calls[0][1];
    expect(formData.get("catalogId")).toBe("cat-2");
    expect(formData.get("name")).toBe("Radler");
    expect(document.querySelector("dialog")).not.toHaveAttribute("open");
  });

  it("should_reportAngelegt_when_anlegenSucceeds", async () => {
    // spec-372 AK12.
    renderUndOeffnen();
    ausfuellen();

    await anlegen();

    expect(meldeErfolgMock).toHaveBeenCalledWith("Artikel angelegt");
  });

  it("should_showAnlegenBusyLabel_when_anlegenRunning", async () => {
    // spec-407 AK5.3: der Busy-Text folgt dem Verb des Buttons (Glossar), nicht „Speichern …".
    createMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          laufendeActionBeenden = () => resolve({ ok: true });
        }),
    );
    renderUndOeffnen();
    ausfuellen();

    await anlegen();

    expect(screen.getByRole("button", { name: "Anlegen …" })).toBeDisabled();
  });

  it("should_keepDialogWithErrorAndInput_when_duplicateRejected", async () => {
    // AK1.4
    createMock.mockResolvedValue({ error: "Diesen Artikel gibt es bereits." });
    renderUndOeffnen();
    ausfuellen();

    await anlegen();

    expect(screen.getByRole("alert")).toHaveTextContent("Diesen Artikel gibt es bereits.");
    expect(screen.getByLabelText("Bezeichnung")).toHaveValue("Radler");
    expect(document.querySelector("dialog")).toHaveAttribute("open");
  });
});
