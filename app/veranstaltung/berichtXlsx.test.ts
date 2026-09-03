import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { berichtXlsx, berichtXlsxGetraenke, neutralisiereFormelPraefix } from "./berichtXlsx";
import { berichtModell, berichtModellGetraenke, type BerichtPositionInput } from "./berichtModell";

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

// Zeilenlayout des Renderers (berichtXlsx.ts) bei genau einem Teilnehmer/einer Auslage:
// 5 Kopfzeilen (Abschlussbericht/Bezeichnung/Datum/Kasse/Status) + 1 Leerzeile + Teilnehmer-
// Header + Preiszeile = 8 Zeilen vor der ersten Teilnehmerzeile ⇒ Zeile 9. Danach Summe (10) +
// Leerzeile (11) + „Auslagenerstattungen"-Titel (12) + Auslagen-Header (13) ⇒ erste Auslagenzeile 14.
const BEZEICHNUNG_ZEILE = 2;
const ERSTE_TEILNEHMER_ZEILE = 9;
const ERSTE_AUSLAGE_ZEILE = 14;

async function ladeGerenderetesWorkbook(
  buffer: Buffer,
  blattname = "Abschlussbericht",
): Promise<ExcelJS.Worksheet> {
  const workbook = new ExcelJS.Workbook();
  // Cast: exceljs' `.d.ts` referenziert `Buffer` über eine ältere, verschachtelte
  // `@types/node`-Kopie (via fast-csv, eine exceljs-Dependency) – strukturell dieselbe
  // Laufzeit-Klasse, aber ein generischer Typkonflikt mit unserer Projekt-`@types/node`.
  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  return workbook.getWorksheet(blattname)!;
}

// Alle Text-Zellen des Blattes – Grundlage der Präsenz-/Abwesenheits-Prüfungen (AC5/AC6).
function sammleZellTexte(sheet: ExcelJS.Worksheet): string[] {
  const texte: string[] = [];
  sheet.eachRow((row) => {
    row.eachCell({ includeEmpty: false }, (cell) => {
      if (typeof cell.value === "string") texte.push(cell.value);
    });
  });
  return texte;
}

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
    const sheet = await ladeGerenderetesWorkbook(buffer);

    const bezeichnungZelle = sheet.getRow(BEZEICHNUNG_ZEILE).getCell(2).value;
    const anzeigenameZelle = sheet.getRow(ERSTE_TEILNEHMER_ZEILE).getCell(1).value;
    const auslageAnzeigenameZelle = sheet.getRow(ERSTE_AUSLAGE_ZEILE).getCell(1).value;

    expect(bezeichnungZelle).toBe("'=SUM(A1)");
    expect(anzeigenameZelle).toBe('\'=HYPERLINK("evil")');
    expect(auslageAnzeigenameZelle).toBe("'+49123456");
  });

  it("should_leaveValuesUnchanged_when_theyHaveNoFormulaPrefix", async () => {
    const buffer = await berichtXlsx(modell);
    const sheet = await ladeGerenderetesWorkbook(buffer);

    expect(sheet.getRow(BEZEICHNUNG_ZEILE).getCell(2).value).toBe("Montagsrunde Juli");
    expect(sheet.getRow(ERSTE_TEILNEHMER_ZEILE).getCell(1).value).toBe("Anna");
  });
});

// Beschriftungs-Bestandteile der drei kategorieübergreifenden Größen, die die Getränke-Variante
// ausblendet (spec-324 AC5). Dieselbe Liste liegt in `berichtPdf.test.ts` – beide Formate müssen
// dasselbe weglassen. „Einnahmen" steht separat, weil die Zeile „Einnahmen (Σ Erhalten)" heißt.
const KATEGORIEUEBERGREIFENDE_BEGRIFFE = ["Spende", "Erhalten", "Einnahmen", "Kassenveränderung"];

// Alle Texte, die einen der ausgeschlossenen Begriffe enthalten (Substring, damit auch
// zusammengesetzte Beschriftungen auffallen). Leeres Ergebnis = der Bericht nennt keinen davon.
function kategorieuebergreifendeBegriffe(texte: string[]): string[] {
  return texte.filter((text) =>
    KATEGORIEUEBERGREIFENDE_BEGRIFFE.some((begriff) => text.includes(begriff)),
  );
}

// ── Getränke-Variante (#324, spec-324, ADR-046 D3) ────────────────────────────────────────────

const getraenkeModell = berichtModellGetraenke(modell);

// Volles Modell mit genau den Größen, welche die Variante ausblenden muss (spec-324 AC5):
// Spende (Erhalten 1500 > Verzehr 1300), Essen-Verzehr und Auslagen aller drei Kategorien.
const modellMitAllenKategorien = berichtModell({
  veranstaltung,
  zeilen: [{ id: "z1", anzeigename: "Anna", erhaltenCents: 1500 }],
  positionen,
  auslagen: [
    { anzeigename: "Anna", kategorie: "getraenke", betragCents: 300, status: "erstattet" },
    { anzeigename: "Anna", kategorie: "essen", betragCents: 250, status: "erstattet" },
    { anzeigename: "Anna", kategorie: "sonstiges", betragCents: 100, status: "offen" },
  ],
});

// Zeilenlayout von `berichtXlsxGetraenke` für `getraenkeModell` (Anna mit einem Getränke-Artikel,
// eine Getränke-Auslage): 5 Kopfzeilen (Titel/Bezeichnung/Datum/Kasse/Status) + 1 Leerzeile +
// Teilnehmer-Header (7) + Preiszeile (8) + Anna (9) + Summe (10) + Leerzeile (11)
// ⇒ Auslagen-Titel in Zeile 12. Danach Auslagen-Header (13) + eine Auslage (14) + Leerzeile (15)
// ⇒ Ergebnis-Titel in Zeile 16, gefolgt von genau zwei Summen-Zeilen (17/18).
const GETRAENKE_AUSLAGEN_TITEL_ZEILE = 12;
const GETRAENKE_ERGEBNIS_TITEL_ZEILE = 16;

describe("berichtXlsxGetraenke", () => {
  it("should_produceNonEmptyXlsxBuffer_when_rendered", async () => {
    const buffer = await berichtXlsxGetraenke(getraenkeModell);

    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);
  });

  it("should_produceValidXlsx_when_noGetraenkeAtAll", async () => {
    // AC11: ohne Getränke-Verzehr und ohne Getränke-Auslagen wird der Bericht dennoch erzeugt.
    const leer = berichtModellGetraenke(
      berichtModell({ veranstaltung, zeilen: [], positionen: [], auslagen: [] }),
    );

    const buffer = await berichtXlsxGetraenke(leer);

    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);
  });

  it("should_markUmfangInTitle_when_rendered", async () => {
    const buffer = await berichtXlsxGetraenke(getraenkeModell);
    const sheet = await ladeGerenderetesWorkbook(buffer, "Abschlussbericht Getränke");

    // AC9: der eingeschränkte Umfang ist aus dem Kopf eindeutig erkennbar.
    expect(sheet.getRow(1).getCell(1).value).toBe("Abschlussbericht – nur Getränke");
    expect(sheet.getRow(2).getCell(2).value).toBe("Montagsrunde Juli");
  });

  it("should_listOnlyGetraenkeArticles_when_rendered", async () => {
    const buffer = await berichtXlsxGetraenke(getraenkeModell);
    const sheet = await ladeGerenderetesWorkbook(buffer, "Abschlussbericht Getränke");
    const texte = sammleZellTexte(sheet);

    // AC2: Annas Bier erscheint als Artikel-Spalte, ihr Schnitzel (Essen) nicht.
    expect(texte).toContain("Bier (0,5l)");
    expect(texte).not.toContain("Schnitzel");
  });

  it("should_listAuslagenWithTeilnehmerBetragAndStatus_when_rendered", async () => {
    const buffer = await berichtXlsxGetraenke(getraenkeModell);
    const sheet = await ladeGerenderetesWorkbook(buffer, "Abschlussbericht Getränke");

    // AC3: Auslagen-Abschnitt mit genau den drei geforderten Spalten, je Auslage eine Zeile.
    expect(sheet.getRow(GETRAENKE_AUSLAGEN_TITEL_ZEILE).getCell(1).value).toBe(
      "Auslagenerstattungen Getränke",
    );
    const kopfzeile = sheet.getRow(GETRAENKE_AUSLAGEN_TITEL_ZEILE + 1);
    expect([1, 2, 3].map((spalte) => kopfzeile.getCell(spalte).value)).toEqual([
      "Teilnehmer",
      "Betrag",
      "Status",
    ]);
    const auslageZeile = sheet.getRow(GETRAENKE_AUSLAGEN_TITEL_ZEILE + 2);
    expect(auslageZeile.getCell(1).value).toBe("Anna");
    expect(auslageZeile.getCell(2).value).toBe(3); // 300 Cent als echte Zahl in Euro
    expect(auslageZeile.getCell(3).value).toBe("erstattet");
  });

  it("should_omitSpendeErhaltenAndKassenveraenderung_when_rendered", async () => {
    const buffer = await berichtXlsxGetraenke(berichtModellGetraenke(modellMitAllenKategorien));
    const sheet = await ladeGerenderetesWorkbook(buffer, "Abschlussbericht Getränke");

    // AC5: keine der drei kategorieübergreifenden Größen – weder als Spalten-/Zeilen-Beschriftung
    // noch als Summe. Substring-Prüfung, damit auch Varianten wie „Einnahmen (Σ Erhalten)"
    // auffallen. Dass der Helfer diese Begriffe überhaupt findet, belegt die Gegenprobe (AC6).
    expect(kategorieuebergreifendeBegriffe(sammleZellTexte(sheet))).toEqual([]);
  });

  it("should_keepSpendeErhaltenAndKassenveraenderung_when_fullReportRendered", async () => {
    const buffer = await berichtXlsx(modellMitAllenKategorien);
    const sheet = await ladeGerenderetesWorkbook(buffer);

    // AC6 (Gegenprobe zu AC5): derselbe Datenbestand, vollständiger Bericht – hier müssen alle
    // drei Größen erhalten bleiben.
    const texte = sammleZellTexte(sheet);
    expect(texte).toContain("Spende");
    expect(texte).toContain("Erhalten");
    expect(texte).toContain("Einnahmen (Σ Erhalten)");
    expect(texte).toContain("Kassenveränderung");
  });

  it("should_renderExactlyTheTwoErgebnisSums_when_rendered", async () => {
    const buffer = await berichtXlsxGetraenke(getraenkeModell);
    const sheet = await ladeGerenderetesWorkbook(buffer, "Abschlussbericht Getränke");

    // AC4: unter dem Ergebnis-Titel stehen genau zwei Summen – danach endet das Blatt.
    expect(sheet.getRow(GETRAENKE_ERGEBNIS_TITEL_ZEILE).getCell(1).value).toBe(
      "Ergebnis (Kasse: Montagsrunde)",
    );
    expect(sheet.getRow(GETRAENKE_ERGEBNIS_TITEL_ZEILE + 1).getCell(1).value).toBe(
      "Verzehr-Umsatz Getränke",
    );
    expect(sheet.getRow(GETRAENKE_ERGEBNIS_TITEL_ZEILE + 2).getCell(1).value).toBe(
      "Auslagenerstattung Getränke",
    );
    expect(sheet.rowCount).toBe(GETRAENKE_ERGEBNIS_TITEL_ZEILE + 2);
  });
});
