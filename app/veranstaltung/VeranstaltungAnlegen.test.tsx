import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { Catalog } from "@/db/schema";

// Externe Grenze: Server Action aus derselben Feature-Schicht.
vi.mock("./actions", () => ({ createVeranstaltungAction: vi.fn() }));

import { createVeranstaltungAction } from "./actions";
import { VeranstaltungAnlegen } from "./VeranstaltungAnlegen";

const createMock = vi.mocked(createVeranstaltungAction);

// Soll-Wert als Literal, nicht aus der Produktions-Konstante gelesen (Testing-Standards);
// der Drift-Guard in db/catalog.test.ts hält Konstante und Migrations-Literal gegeneinander.
const STANDARD_CATALOG_ID = "standard";

function katalog(id: string, name: string): Catalog {
  return {
    id,
    name,
    active: true,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// Der Standard-Katalog steht bewusst NICHT an erster Stelle: sonst wäre die Vorbelegungs-
// Assertion auch dann grün, wenn das Formular gar kein defaultValue setzte und der Browser
// einfach die erste Option nähme (#346 AK1).
const kataloge = [
  katalog("kat-b", "Dorfmeisterschaften"),
  katalog(STANDARD_CATALOG_ID, "Montagsrunde"),
];

function renderUndOeffnen(liste: Catalog[] = kataloge) {
  render(<VeranstaltungAnlegen kataloge={liste} ausloeser="+ Neu" />);
  fireEvent.click(screen.getByRole("button", { name: "+ Neu" }));
  return screen.getByRole("dialog", { name: "Veranstaltung anlegen" });
}

// Die Auswahlen werden je Select abgefragt statt global: seit #346 heißen eine Kasse und der
// Standard-Katalog beide „Montagsrunde", ein globales getByRole("option") wäre mehrdeutig.
function optionen(label: string) {
  const select = screen.getByLabelText(label);
  return [...select.querySelectorAll("option")].map((option) => option.textContent);
}

// Pflichtfelder füllen, damit eine Ablehnung aus der Action stammt und nicht aus der nativen
// Pflichtfeld-Prüfung.
async function anlegen() {
  fireEvent.change(screen.getByLabelText("Datum"), { target: { value: "2026-10-12" } });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Anlegen" }));
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  createMock.mockResolvedValue({ ok: true });
});

describe("VeranstaltungAnlegen (spec-373 AK1)", () => {
  it("should_showOnlyTrigger_when_rendered", () => {
    render(<VeranstaltungAnlegen kataloge={kataloge} ausloeser="+ Neu" />);

    expect(screen.getByRole("button", { name: "+ Neu" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Bezeichnung")).not.toBeInTheDocument();
  });

  it("should_showFieldsOfFormerForm_when_opened", () => {
    // AK1.2: gleiche Felder wie das bisherige Anlege-Formular.
    renderUndOeffnen();

    expect(screen.getByLabelText("Bezeichnung")).toBeRequired();
    expect(screen.getByLabelText("Datum")).toHaveAttribute("type", "date");
    expect(optionen("Kasse")).toEqual(["Montagsrunde", "Vereinskasse"]);
    expect(screen.getByLabelText("Katalog")).toHaveAttribute("name", "catalogId");
    expect(optionen("Katalog")).toEqual(["Dorfmeisterschaften", "Montagsrunde"]);
  });

  it("should_preselectStandardKatalog_when_opened", () => {
    // #346 AK1: Standard ist vorbelegt – der Regelfall bleibt ein Klick weniger.
    renderUndOeffnen();

    expect(screen.getByLabelText("Katalog")).toHaveValue(STANDARD_CATALOG_ID);
  });

  it("should_preselectFirstKatalog_when_standardKatalogNotOffered", () => {
    // Grenzfall zu #346 AK6: ein deaktivierter Standard-Katalog fehlt in der Liste – vorbelegt
    // wird dann keine Id, die das Formular gar nicht anbietet.
    renderUndOeffnen([katalog("kat-b", "Dorfmeisterschaften")]);

    expect(screen.getByLabelText("Katalog")).toHaveValue("kat-b");
  });

  it("should_callActionAndClose_when_anlegenSucceeds", async () => {
    // AK1.3
    renderUndOeffnen();
    fireEvent.change(screen.getByLabelText("Bezeichnung"), { target: { value: "Sommerfest" } });

    await anlegen();

    expect(createMock).toHaveBeenCalledTimes(1);
    const formData = createMock.mock.calls[0][1];
    expect(formData.get("bezeichnung")).toBe("Sommerfest");
    expect(formData.get("catalogId")).toBe(STANDARD_CATALOG_ID);
    expect(document.querySelector("dialog")).not.toHaveAttribute("open");
  });

  it("should_keepDialogWithError_when_actionRejects", async () => {
    // AK1.4 – Fehlerszenario „kein aktiver Katalog": die Ablehnung der Action steht im Dialog.
    createMock.mockResolvedValue({ error: "Bitte einen gültigen Katalog wählen." });
    renderUndOeffnen([]);
    fireEvent.change(screen.getByLabelText("Bezeichnung"), { target: { value: "Sommerfest" } });

    await anlegen();

    expect(screen.getByRole("alert")).toHaveTextContent("Bitte einen gültigen Katalog wählen.");
    expect(document.querySelector("dialog")).toHaveAttribute("open");
  });
});
