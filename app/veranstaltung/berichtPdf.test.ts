import { describe, expect, it } from "vitest";
import { berichtPdf } from "./berichtPdf";
import { berichtModell, type BerichtPositionInput } from "./berichtModell";

// Smoke-Test des PDF-Renderers (ADR-036 D6): der Renderer wird binär geprüft (Buffer nicht leer +
// PDF-Magic-Bytes „%PDF"); die inhaltliche Korrektheit verantwortet das getestete reine
// `berichtModell` (Single Source ⇒ inhaltsgleich zum Excel, AC10).

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

// %PDF im ASCII: 0x25 0x50 0x44 0x46.
function isPdf(buffer: Buffer): boolean {
  return buffer.subarray(0, 4).toString("latin1") === "%PDF";
}

describe("berichtPdf", () => {
  it("should_produceNonEmptyPdfBuffer_when_rendered", async () => {
    const buffer = await berichtPdf(modell);

    expect(buffer.length).toBeGreaterThan(0);
    expect(isPdf(buffer)).toBe(true);
  });

  it("should_produceValidPdf_when_reportIsEmpty", async () => {
    const leer = berichtModell({ veranstaltung, zeilen: [], positionen: [], auslagen: [] });

    const buffer = await berichtPdf(leer);

    expect(isPdf(buffer)).toBe(true);
  });
});
