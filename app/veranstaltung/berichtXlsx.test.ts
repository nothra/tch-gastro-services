import { describe, expect, it } from "vitest";
import { berichtXlsx } from "./berichtXlsx";
import { berichtModell, type BerichtPositionInput } from "./berichtModell";

// Smoke-Test des Excel-Renderers (ADR-036 D6): der Renderer wird binär geprüft (Buffer nicht leer +
// ZIP-Magic-Bytes „PK"); die inhaltliche Korrektheit verantwortet das getestete reine `berichtModell`.

const veranstaltung = {
  bezeichnung: "Montagsrunde Juli",
  datum: new Date("2026-07-14"),
  kasse: "montagsrunde" as const,
  status: "abgeschlossen" as const,
};

const positionen: BerichtPositionInput[] = [
  { zeileId: "z1", name: "Bier", size: "0,5l", menge: 2, priceCents: 250, category: "getraenk" },
  { zeileId: "z1", name: "Schnitzel", size: "", menge: 1, priceCents: 800, category: "essen" },
];

const modell = berichtModell({
  veranstaltung,
  zeilen: [{ id: "z1", anzeigename: "Anna", erhaltenCents: 1500 }],
  positionen,
  auslagen: [
    {
      anzeigename: "Anna",
      kategorie: "getraenke",
      betragCents: 300,
      status: "erstattet",
    },
  ],
});

describe("berichtXlsx", () => {
  it("should_produceNonEmptyXlsxBuffer_when_rendered", async () => {
    const buffer = await berichtXlsx(modell);

    expect(buffer.length).toBeGreaterThan(0);
    // .xlsx ist ein ZIP-Container → Magic Bytes 0x50 0x4B ("PK").
    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);
  });

  it("should_produceValidXlsx_when_reportIsEmpty", async () => {
    const leer = berichtModell({ veranstaltung, zeilen: [], positionen: [], auslagen: [] });

    const buffer = await berichtXlsx(leer);

    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);
  });
});
