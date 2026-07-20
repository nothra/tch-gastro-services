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

  it("should_produceValidXlsx_when_twoTeilnehmerOrderTheSameArticle", async () => {
    // Deckt den Dedup-Zweig in `sammleArtikel` ab: ein Artikel, der von mehreren Teilnehmern
    // bestellt wurde, darf nur EINE Matrix-Spalte erhalten (sonst doppelte Spalten im Bericht).
    const geteilterArtikel = berichtModell({
      veranstaltung,
      zeilen: [
        { id: "z1", anzeigename: "Anna", erhaltenCents: 500 },
        { id: "z2", anzeigename: "Ben", erhaltenCents: 500 },
      ],
      positionen: [
        {
          zeileId: "z1",
          name: "Bier",
          size: "0,5l",
          menge: 1,
          priceCents: 250,
          category: "getraenk",
        },
        {
          zeileId: "z2",
          name: "Bier",
          size: "0,5l",
          menge: 3,
          priceCents: 250,
          category: "getraenk",
        },
      ],
      auslagen: [],
    });

    const buffer = await berichtXlsx(geteilterArtikel);

    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);
  });

  it("should_produceValidXlsx_when_teilnehmerOrderDifferentArticles", async () => {
    // Deckt den `?? null`-Zweig ab: Anna bestellt nur Bier, Ben nur Wein – in Annas Zeile bleibt
    // die Wein-Spalte leer (und umgekehrt), da nicht jeder Teilnehmer jeden Artikel bestellt.
    const unterschiedlicheArtikel = berichtModell({
      veranstaltung,
      zeilen: [
        { id: "z1", anzeigename: "Anna", erhaltenCents: 500 },
        { id: "z2", anzeigename: "Ben", erhaltenCents: 500 },
      ],
      positionen: [
        {
          zeileId: "z1",
          name: "Bier",
          size: "0,5l",
          menge: 1,
          priceCents: 250,
          category: "getraenk",
        },
        {
          zeileId: "z2",
          name: "Wein",
          size: "0,2l",
          menge: 1,
          priceCents: 400,
          category: "getraenk",
        },
      ],
      auslagen: [],
    });

    const buffer = await berichtXlsx(unterschiedlicheArtikel);

    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);
  });

  it("should_produceValidXlsx_when_teilnehmerHasNullErhalten", async () => {
    // Deckt den Zweig ab, der die "Erhalten"-Zelle bei `null` (noch nicht kassiert)
    // bewusst NICHT befüllt.
    const chris = berichtModell({
      veranstaltung,
      zeilen: [{ id: "z-2", anzeigename: "Chris", erhaltenCents: null }],
      positionen: [],
      auslagen: [],
    });

    const buffer = await berichtXlsx(chris);

    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);
  });
});
