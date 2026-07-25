import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { berichtXlsx, neutralisiereFormelPraefix } from "./berichtXlsx";
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

describe("neutralisiereFormelPraefix", () => {
  it.each([
    ["=SUM(A1)", "'=SUM(A1)"],
    ["+1234", "'+1234"],
    ["-1234", "'-1234"],
    ["@SUM(A1)", "'@SUM(A1)"],
    ["\tName", "'\tName"],
    ["\rName", "'\rName"],
  ])("should_prependApostrophe_when_valueStartsWithFormulaPrefix(%s)", (eingabe, erwartet) => {
    expect(neutralisiereFormelPraefix(eingabe)).toBe(erwartet);
  });

  it("should_returnUnchanged_when_valueHasNoFormulaPrefix", () => {
    expect(neutralisiereFormelPraefix("Anna")).toBe("Anna");
  });

  it("should_returnUnchanged_when_valueAlreadyStartsWithApostrophe", () => {
    expect(neutralisiereFormelPraefix("'=SUM(A1)")).toBe("'=SUM(A1)");
  });

  it("should_returnEmptyString_when_valueIsEmpty", () => {
    expect(neutralisiereFormelPraefix("")).toBe("");
  });
});

describe("berichtXlsx – Formula-Injection-Neutralisierung", () => {
  it("should_neutralizeBezeichnungAnzeigenameAndAuslageAnzeigename_when_theyStartWithFormulaPrefix", async () => {
    const bericht = berichtModell({
      veranstaltung: { ...veranstaltung, bezeichnung: "=SUM(A1)" },
      zeilen: [{ id: "z1", anzeigename: '=HYPERLINK("evil")', erhaltenCents: 500 }],
      positionen: [],
      auslagen: [
        { anzeigename: "+49123456", kategorie: "getraenke", betragCents: 300, status: "offen" },
      ],
    });

    const buffer = await berichtXlsx(bericht);
    const workbook = new ExcelJS.Workbook();
    // Cast: exceljs' `.d.ts` referenziert `Buffer` über eine ältere, verschachtelte
    // `@types/node`-Kopie (via fast-csv, eine exceljs-Dependency) – strukturell dieselbe
    // Laufzeit-Klasse, aber ein generischer Typkonflikt mit unserer Projekt-`@types/node`.
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    const sheet = workbook.getWorksheet("Abschlussbericht")!;

    const bezeichnungZelle = sheet.getRow(2).getCell(2).value;
    const anzeigenameZelle = sheet.getRow(9).getCell(1).value;
    const auslageAnzeigenameZelle = sheet.getRow(14).getCell(1).value;

    expect(bezeichnungZelle).toBe("'=SUM(A1)");
    expect(anzeigenameZelle).toBe('\'=HYPERLINK("evil")');
    expect(auslageAnzeigenameZelle).toBe("'+49123456");
  });

  it("should_leaveValuesUnchanged_when_theyHaveNoFormulaPrefix", async () => {
    const buffer = await berichtXlsx(modell);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    const sheet = workbook.getWorksheet("Abschlussbericht")!;

    expect(sheet.getRow(2).getCell(2).value).toBe("Montagsrunde Juli");
    expect(sheet.getRow(9).getCell(1).value).toBe("Anna");
  });
});
