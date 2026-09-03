import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { formatCents } from "@/lib/money";
import { berichtXlsxGetraenke } from "./berichtXlsx";
import {
  berichtPdf,
  berichtPdfDokument,
  berichtPdfGetraenke,
  berichtPdfGetraenkeDokument,
} from "./berichtPdf";
import { berichtModell, berichtModellGetraenke, type BerichtPositionInput } from "./berichtModell";

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

  it("should_produceValidPdf_when_teilnehmerHasNoPositionsAndNullErhalten", async () => {
    // Deckt zwei Zweige ab, die der Haupt-Smoke-Test nicht erreicht: "Erhalten"-Anzeige bei
    // `null` (noch nicht kassiert) und ein Teilnehmer ohne Artikeltabelle (nichts konsumiert).
    const chris = berichtModell({
      veranstaltung,
      zeilen: [{ id: "z-2", anzeigename: "Chris", erhaltenCents: null }],
      positionen: [],
      auslagen: [],
    });

    const buffer = await berichtPdf(chris);

    expect(isPdf(buffer)).toBe(true);
  });
});

// ── Getränke-Variante (#324, spec-324, ADR-046 D3) ────────────────────────────────────────────

const getraenkeModell = berichtModellGetraenke(modell);

// Sammelt alle Texte der Dokument-Definition rekursiv – die PDF-Bytes selbst sind komprimiert und
// damit nicht durchsuchbar; die reine Definition ist die prüfbare Inhalts-Quelle.
function sammleDokumentTexte(knoten: unknown): string[] {
  if (typeof knoten === "string") return [knoten];
  if (Array.isArray(knoten)) return knoten.flatMap(sammleDokumentTexte);
  if (knoten !== null && typeof knoten === "object") {
    const eintrag = knoten as Record<string, unknown>;
    return ["content", "text", "stack", "table", "body"].flatMap((schluessel) =>
      schluessel in eintrag ? sammleDokumentTexte(eintrag[schluessel]) : [],
    );
  }
  return [];
}

// Beschriftungs-Bestandteile der drei kategorieübergreifenden Größen, die die Getränke-Variante
// ausblendet (spec-324 AC5). Dieselbe Liste liegt in `berichtXlsx.test.ts` – beide Formate müssen
// dasselbe weglassen. „Einnahmen" steht separat, weil die Zeile „Einnahmen (Σ Erhalten)" heißt.
const KATEGORIEUEBERGREIFENDE_BEGRIFFE = ["Spende", "Erhalten", "Einnahmen", "Kassenveränderung"];

// Alle Texte, die einen der ausgeschlossenen Begriffe enthalten (Substring, damit auch
// zusammengesetzte Beschriftungen auffallen). Leeres Ergebnis = der Bericht nennt keinen davon.
function kategorieuebergreifendeBegriffe(texte: string[]): string[] {
  return texte.filter((text) =>
    KATEGORIEUEBERGREIFENDE_BEGRIFFE.some((begriff) => text.includes(begriff)),
  );
}

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

describe("berichtPdfGetraenke", () => {
  it("should_produceNonEmptyPdfBuffer_when_rendered", async () => {
    const buffer = await berichtPdfGetraenke(getraenkeModell);

    expect(buffer.length).toBeGreaterThan(0);
    expect(isPdf(buffer)).toBe(true);
  });

  it("should_produceValidPdf_when_noGetraenkeAtAll", async () => {
    // AC11: ohne Getränke-Verzehr und ohne Getränke-Auslagen wird der Bericht dennoch erzeugt –
    // deckt zugleich die beiden Leer-Zweige (Teilnehmer-Hinweis, Auslagen-Platzhalter) ab.
    const leer = berichtModellGetraenke(
      berichtModell({ veranstaltung, zeilen: [], positionen: [], auslagen: [] }),
    );

    const buffer = await berichtPdfGetraenke(leer);

    expect(isPdf(buffer)).toBe(true);
    const texte = sammleDokumentTexte(berichtPdfGetraenkeDokument(leer));
    expect(texte).toContain("Keine Teilnehmer mit Getränken.");
    expect(texte).toContain("Keine Getränke-Auslagen.");
  });

  it("should_markUmfangInTitle_when_rendered", () => {
    const texte = sammleDokumentTexte(berichtPdfGetraenkeDokument(getraenkeModell));

    // AC9: der eingeschränkte Umfang ist aus dem Kopf eindeutig erkennbar.
    expect(texte).toContain("Abschlussbericht – nur Getränke");
    expect(texte).toContain("Bezeichnung: Montagsrunde Juli");
  });

  it("should_omitSpendeErhaltenAndKassenveraenderung_when_rendered", () => {
    const texte = sammleDokumentTexte(
      berichtPdfGetraenkeDokument(berichtModellGetraenke(modellMitAllenKategorien)),
    );

    // AC5: keine der drei kategorieübergreifenden Größen – weder je Teilnehmer noch als Summe.
    // Dass der Helfer diese Begriffe überhaupt findet, belegt die Gegenprobe (AC6).
    expect(kategorieuebergreifendeBegriffe(texte)).toEqual([]);
  });

  it("should_keepSpendeErhaltenAndKassenveraenderung_when_fullReportRendered", () => {
    const texte = sammleDokumentTexte(berichtPdfDokument(modellMitAllenKategorien));

    // AC6 (Gegenprobe zu AC5): derselbe Datenbestand, vollständiger Bericht – hier müssen alle
    // drei Größen erhalten bleiben (je Teilnehmer in der Summenzeile, in den Tagessummen und in
    // der Gesamtabrechnung).
    expect(texte).toContain("Spende");
    expect(texte).toContain("Erhalten");
    expect(texte).toContain("Einnahmen (Σ Erhalten)");
    expect(texte).toContain("Kassenveränderung");
    expect(texte.some((text) => text.startsWith("Spende "))).toBe(true);
  });

  it("should_listOnlyGetraenkeArticlesAndAuslagen_when_rendered", () => {
    const texte = sammleDokumentTexte(berichtPdfGetraenkeDokument(getraenkeModell));

    // AC2/AC3: Annas Bier bleibt, ihr Schnitzel (Essen) verschwindet; der Auslagen-Abschnitt
    // nennt Getränke explizit.
    expect(texte).toContain("Bier (0,5l)");
    expect(texte).not.toContain("Schnitzel");
    expect(texte).toContain("Auslagenerstattungen Getränke");
  });
});

// Cross-Format-Prüfung der Variante (spec-324 AC8). Sie liegt in dieser Datei, weil hier der
// Textsammler über die PDF-Dokument-Definition schon existiert – die Excel-Seite braucht nur das
// Laden des Workbooks. Verglichen werden die DARGESTELLTEN Beträge: beide Renderer müssen aus
// demselben Modell dieselbe Betragsmenge erzeugen, obwohl ihr Layout unterschiedlich ist
// (Excel: Artikel-Matrix, PDF: Unterlisten je Teilnehmer, ADR-036 D8).
describe("Getränke-Variante – Excel und PDF inhaltsgleich (AC8)", () => {
  // Zwei Teilnehmer, zwei Getränke-Artikel mit unterschiedlichen Preisen und drei Auslagen (davon
  // eine offene und eine der Kategorie Essen) – so ist jeder erwartete Betrag eindeutig.
  const zweiTeilnehmer = berichtModellGetraenke(
    berichtModell({
      veranstaltung,
      zeilen: [
        { id: "z1", anzeigename: "Anna", erhaltenCents: 1500 },
        { id: "z2", anzeigename: "Bert", erhaltenCents: 1200 },
      ],
      positionen: [
        {
          zeileId: "z1",
          name: "Bier",
          size: "0,5l",
          menge: 2,
          priceCents: 250,
          category: "getraenk",
        },
        {
          zeileId: "z1",
          name: "Schnitzel",
          size: "",
          menge: 1,
          priceCents: 800,
          category: "essen",
        },
        {
          zeileId: "z2",
          name: "Wein",
          size: "0,2l",
          menge: 3,
          priceCents: 400,
          category: "getraenk",
        },
      ],
      auslagen: [
        { anzeigename: "Anna", kategorie: "getraenke", betragCents: 300, status: "erstattet" },
        { anzeigename: "Bert", kategorie: "getraenke", betragCents: 700, status: "offen" },
        { anzeigename: "Anna", kategorie: "essen", betragCents: 250, status: "erstattet" },
      ],
    }),
  );

  async function ladeGetraenkeBlatt(): Promise<ExcelJS.Worksheet> {
    const workbook = new ExcelJS.Workbook();
    const buffer = await berichtXlsxGetraenke(zweiTeilnehmer);
    // Cast wie in `berichtXlsx.test.ts`: exceljs' `.d.ts` referenziert `Buffer` über eine ältere,
    // verschachtelte `@types/node`-Kopie – strukturell dieselbe Laufzeit-Klasse.
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    return workbook.getWorksheet("Abschlussbericht Getränke")!;
  }

  // Alle als Betrag dargestellten Excel-Zellen: Mengen-Zellen tragen bewusst KEIN Zahlenformat,
  // Betrags-Zellen dagegen immer (`setzeBetrag`) – daran lassen sie sich unterscheiden.
  function excelBetraege(sheet: ExcelJS.Worksheet): string[] {
    const betraege: string[] = [];
    sheet.eachRow((row) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        if (typeof cell.value === "number" && cell.numFmt) {
          betraege.push(formatCents(Math.round(cell.value * 100)));
        }
      });
    });
    return betraege;
  }

  const EURO_RE = /\d{1,3}(?:\.\d{3})*,\d{2}\s€/g;

  function pdfBetraege(texte: string[]): string[] {
    return texte.flatMap((text) => text.match(EURO_RE) ?? []);
  }

  // Label/Betrag-Paare des PDF: in einer Tabellenzeile (`[label, { text: betrag }]`) folgt der
  // Betrag im flachen Textstrom direkt auf sein Label.
  function pdfPaare(texte: string[]): [string, string][] {
    return texte.slice(0, -1).map((text, index): [string, string] => [text, texte[index + 1]]);
  }

  // Excel-Zeilen mit Beschriftung in Spalte 1 und Betrag in Spalte 2 (Ergebnis-Abschnitt).
  function excelPaare(sheet: ExcelJS.Worksheet): [string, string][] {
    const paare: [string, string][] = [];
    sheet.eachRow((row) => {
      const label = row.getCell(1).value;
      const betrag = row.getCell(2).value;
      if (typeof label === "string" && typeof betrag === "number" && row.getCell(2).numFmt) {
        paare.push([label, formatCents(Math.round(betrag * 100))]);
      }
    });
    return paare;
  }

  it("should_showTheSameAmounts_when_bothFormatsRenderTheSameModell", async () => {
    const excel = excelBetraege(await ladeGetraenkeBlatt());
    const pdf = pdfBetraege(sammleDokumentTexte(berichtPdfGetraenkeDokument(zweiTeilnehmer)));

    // Erwartete Beträge, unabhängig aus den Eingabedaten hergeleitet: Einzelpreise 2,50/4,00,
    // Zeilensummen 5,00 (2×2,50) und 12,00 (3×4,00), Tagessumme 17,00, Auslagen 3,00 und 7,00,
    // Ergebnis 17,00 (Verzehr) und 3,00 (nur die erstattete Getränke-Auslage).
    const erwartet = ["12,00 €", "17,00 €", "2,50 €", "3,00 €", "4,00 €", "5,00 €", "7,00 €"];
    expect([...new Set(excel)].sort()).toEqual(erwartet);
    expect([...new Set(pdf)].sort()).toEqual(erwartet);
  });

  it("should_labelTheTwoErgebnisSumsIdentically_when_bothFormatsRendered", async () => {
    const excel = excelPaare(await ladeGetraenkeBlatt());
    const pdf = pdfPaare(sammleDokumentTexte(berichtPdfGetraenkeDokument(zweiTeilnehmer)));

    // AC4/AC8: beide Formate weisen dieselben zwei Ergebnis-Zeilen mit denselben Beträgen aus.
    for (const zeile of [
      ["Verzehr-Umsatz Getränke", "17,00 €"],
      ["Auslagenerstattung Getränke", "3,00 €"],
    ]) {
      expect(excel).toContainEqual(zeile);
      expect(pdf).toContainEqual(zeile);
    }
  });
});
