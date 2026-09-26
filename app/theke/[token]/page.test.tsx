import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { CatalogItem, Veranstaltung, VeranstaltungZeile } from "@/db/schema";

vi.mock("@/db/veranstaltung", () => ({
  getVeranstaltungByToken: vi.fn(),
  listZeilen: vi.fn(),
}));
vi.mock("@/db/catalog", () => ({ listActiveCatalog: vi.fn() }));
vi.mock("@/db/verzehr", () => ({ listPositionen: vi.fn() }));
vi.mock("@/app/veranstaltung/actions", () => ({ adjustVerzehrByTokenAction: vi.fn() }));

const notFoundMock = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
vi.mock("next/navigation", () => ({ notFound: () => notFoundMock() }));

// MengeControl ist eine Client-Komponente (useActionState); durch ein statisches Stub ersetzt,
// das die editable-Prop spiegelt. Für die Seite zählt nur, dass Daten geladen/weitergereicht
// werden und der Token-/Status-Pfad stimmt.
vi.mock("@/app/_verzehr/MengeControl", () => ({
  MengeControl: ({ menge, editable }: { menge: number; editable: boolean }) => (
    <span data-testid="menge" data-editable={String(editable)}>
      {menge}
    </span>
  ),
}));

import { getVeranstaltungByToken, listZeilen } from "@/db/veranstaltung";
import { listActiveCatalog } from "@/db/catalog";
import { listPositionen } from "@/db/verzehr";
import ThekePage from "./page";

const getByTokenMock = vi.mocked(getVeranstaltungByToken);
const listZeilenMock = vi.mocked(listZeilen);
const listActiveCatalogMock = vi.mocked(listActiveCatalog);
const listPositionenMock = vi.mocked(listPositionen);

// Soll-Wert als Literal, nicht aus dem Mock gelesen (Testing-Standards). Der Drift-Guard in
// db/catalog.test.ts hält Produktions-Konstante und Migrations-Literal gegeneinander – er liest
// dieses Literal hier nicht mit; es ist unabhängig auf denselben Wert gesetzt.
const STANDARD_CATALOG_ID = "standard";

// Bewusst NICHT der Standard-Katalog (#365 Regression zu #346): nur so unterscheidet die
// Wiring-Assertion unten zwischen „lädt die Auswahl aus veranstaltung.catalogId" und „nimmt
// weiter die hart codierte Konstante" – analog zur Assertion in
// app/veranstaltung/[id]/verzehr/page.test.tsx (KATALOG_B_ID). Mit 'standard' als Fixture-Wert
// wäre sie vor wie nach dem Fix grün.
const KATALOG_B_ID = "kat-b";

const aVeranstaltung: Veranstaltung = {
  id: "v-1",
  typ: "veranstaltung",
  bezeichnung: "Montagsrunde Juli",
  datum: new Date("2026-07-14"),
  kasse: "montagsrunde",
  // #346 AK7: die Theke bekommt keine eigene Katalogauswahl und trägt deshalb den
  // Spalten-Default – `ensureThekeForKasse` setzt die Spalte nie.
  catalogId: STANDARD_CATALOG_ID,
  status: "offen",
  token: "tok-1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const aZeile: VeranstaltungZeile = {
  id: "z-1",
  veranstaltungId: "v-1",
  teilnehmerId: "t-1",
  anzeigename: "Anna",
  erhaltenCents: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const cola: CatalogItem = {
  id: "c-1",
  catalogId: STANDARD_CATALOG_ID,
  name: "Cola",
  size: "0,5l",
  category: "getraenk",
  priceCents: 250,
  sortOrder: 0,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const kuchen: CatalogItem = {
  id: "c-2",
  catalogId: STANDARD_CATALOG_ID,
  name: "Kuchen",
  size: "",
  category: "essen",
  priceCents: 150,
  sortOrder: 1,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function params(token: string) {
  return Promise.resolve({ token });
}

beforeEach(() => {
  vi.resetAllMocks();
  window.localStorage.clear();
  Element.prototype.scrollIntoView = vi.fn();
  listZeilenMock.mockResolvedValue([aZeile]);
  listActiveCatalogMock.mockResolvedValue([cola]);
  listPositionenMock.mockResolvedValue([]);
});

describe("ThekePage", () => {
  it("should_notFound_when_tokenUnknown", async () => {
    getByTokenMock.mockResolvedValue(undefined);

    await expect(ThekePage({ params: params("nope") })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalled();
    expect(listZeilenMock).not.toHaveBeenCalled();
  });

  it("should_showPickerAndReadOnlyList_when_openAndNoStoredName", async () => {
    getByTokenMock.mockResolvedValue(aVeranstaltung);

    render(await ThekePage({ params: params("tok-1") }));

    expect(getByTokenMock).toHaveBeenCalledWith("tok-1");
    expect(listZeilenMock).toHaveBeenCalledWith("v-1");
    expect(listPositionenMock).toHaveBeenCalledWith("v-1");
    // Diese Fixture trägt den Standard-Katalog (Default), daher hier weiterhin dieser Wert –
    // die Umstellung auf veranstaltung.catalogId (#365) zeigt sich erst mit einer abweichenden
    // Katalog-Id, siehe should_loadCatalogFromVeranstaltung_when_catalogWasSwitchedAwayFromStandard.
    expect(listActiveCatalogMock).toHaveBeenCalledWith(STANDARD_CATALOG_ID);
    // Kein gemerkter Name → Namens-Picker UND bereits Liste + Summen sichtbar (spec-54 AC B1),
    // aber die Erfassungs-Controls bleiben read-only, bis ein Name gewählt wurde.
    expect(screen.getByText("Wer bist du?")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Wer bist du?" })).toBeInTheDocument();
    expect(screen.getByText(/Cola/)).toBeInTheDocument();
    expect(screen.getByTestId("menge")).toHaveAttribute("data-editable", "false");
  });

  it("should_showEditableFocus_when_openAndErfasserAndZielStored", async () => {
    // Zweischritt übersprungen (Wiederkehr, #183): Erfasser + Ziel als Zeilen-IDs gemerkt →
    // Fokus-Ansicht mit offener, bearbeitbarer Ziel-Karte.
    window.localStorage.setItem("tch:sb:erfasser:tok-1", "z-1");
    window.localStorage.setItem("tch:sb:ziel:tok-1", "z-1");
    getByTokenMock.mockResolvedValue(aVeranstaltung);

    render(await ThekePage({ params: params("tok-1") }));

    expect(screen.getByText(/Cola/)).toBeInTheDocument();
    expect(screen.getByTestId("menge")).toHaveAttribute("data-editable", "true");
  });

  it("should_renderReadOnlyAccordionWithoutGate_when_abgeschlossen", async () => {
    getByTokenMock.mockResolvedValue({ ...aVeranstaltung, status: "abgeschlossen" });

    render(await ThekePage({ params: params("tok-1") }));

    // Read-only (#183/ADR-035 D5): kein Namens-Gate, Akkordeon mit allen Karten zu.
    expect(screen.queryByText("Wer bist du?")).not.toBeInTheDocument();
    expect(screen.queryByTestId("menge")).not.toBeInTheDocument();
    // Chip zum Aufklappen → read-only-Erfassung wird sichtbar, aber nicht bearbeitbar.
    fireEvent.click(screen.getByRole("button", { name: "Anna" }));
    expect(screen.getByTestId("menge")).toHaveAttribute("data-editable", "false");
  });

  it("should_workSameWayIncludingEssen_when_veranstaltungTypIsTheke", async () => {
    // AC E1 (spec-54): dieselbe Route bedient die stehende Theke identisch wie eine datierte
    // Veranstaltung – die Seite verzweigt nirgends auf `typ`, Essen bleibt eingeblendet.
    getByTokenMock.mockResolvedValue({ ...aVeranstaltung, typ: "theke", datum: null });
    listActiveCatalogMock.mockResolvedValue([cola, kuchen]);

    render(await ThekePage({ params: params("tok-1") }));

    expect(screen.getByText("Wer bist du?")).toBeInTheDocument();
    expect(screen.getByText(/Cola/)).toBeInTheDocument();
    expect(screen.getByText(/Kuchen/)).toBeInTheDocument();
  });

  it("should_loadCatalogFromVeranstaltung_when_catalogWasSwitchedAwayFromStandard", async () => {
    // #365: Nach einem Katalog-Wechsel (#346) muss die öffentliche Route dieselbe Katalog-Id
    // wie die Veranstaltung verwenden – nicht länger die hart codierte Standard-Konstante.
    getByTokenMock.mockResolvedValue({ ...aVeranstaltung, catalogId: KATALOG_B_ID });

    render(await ThekePage({ params: params("tok-1") }));

    expect(listActiveCatalogMock).toHaveBeenCalledWith(KATALOG_B_ID);
    expect(listActiveCatalogMock).not.toHaveBeenCalledWith(STANDARD_CATALOG_ID);
  });

  it("should_notOfferNewParticipant_when_openAndNoStoredName", async () => {
    // AC B4 (spec-54): Selbstbedienung kann keinen neuen Teilnehmer anlegen – nur Auswahl.
    getByTokenMock.mockResolvedValue(aVeranstaltung);

    render(await ThekePage({ params: params("tok-1") }));

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /anlegen|hinzufügen|neu/i }),
    ).not.toBeInTheDocument();
  });
});
