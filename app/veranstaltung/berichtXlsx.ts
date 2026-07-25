import ExcelJS from "exceljs";
import { artikelBezeichnung, gesamtabrechnungsZeilen, type BerichtModell } from "./berichtModell";

// Excel-Renderer des Abschlussberichts (F9, #185, ADR-036 D5/D8). Konsumiert AUSSCHLIESSLICH das
// reine `BerichtModell` (Single Source ⇒ inhaltsgleich zum PDF, AC10). Node-nativ (exceljs), kein
// Headless-Browser; nur server-seitig genutzt (Route Handler) → kein Client-Bundle-Impact.
//
// Layout (ADR-036 D8): breite Artikel-Matrix wie das abgelöste Excel-Template. Artikel stehen als
// Spalten; eine Preiszeile unter der Kopfzeile zeigt den (eingefrorenen) Einzelpreis je Artikel,
// die Teilnehmerzellen die Menge (Strichzahl). Zeilenbetrag = Menge × Einzelpreis; die aggregierten
// Kategorie-/Verzehr-Spalten rechts weisen die Beträge zusätzlich explizit aus (AC4).

const EUR_NUM_FMT = "#,##0.00 €"; // de-DE-Betragsformat, echte Zahl in der Zelle (ADR-036 D8)

// OWASP-CSV-Cheatsheet-Präfixe, die Tabellenkalkulationen als Formel-/Kommando-Start lesen
// könnten. Defense-in-Depth (#189): die Zellen sind bereits reine Strings (keine `formula`-
// Werte), ein führendes `'` neutralisiert sie zusätzlich gegen künftige Formel-fähige Pfade
// (z. B. CSV-Export, Copy&Paste in ein anderes Tool).
const FORMEL_PRAEFIXE = ["=", "+", "-", "@", "\t", "\r"];

export function neutralisiereFormelPraefix(wert: string): string {
  if (wert === "" || wert.startsWith("'")) return wert;
  return FORMEL_PRAEFIXE.some((praefix) => wert.startsWith(praefix)) ? `'${wert}` : wert;
}

type Artikel = { name: string; size: string; einzelpreisCents: number };

// Schlüssel identifiziert einen Artikel als Matrix-Spalte. Name+Größe genügt: ein Katalogartikel
// hat genau eine Kategorie und (nach dem Abschluss) einen eindeutigen eingefrorenen Preis.
function artikelKey(artikel: { name: string; size: string }): string {
  return `${artikel.name} ${artikel.size}`;
}

// Alle im Bericht vorkommenden Artikel in stabiler Spaltenreihenfolge. Die Positionen im Modell
// sind bereits nach Kategorie → Name → Größe sortiert, also übernimmt die Map die Erst-Sicht-Ordnung.
function sammleArtikel(modell: BerichtModell): Artikel[] {
  const bekannt = new Map<string, Artikel>();
  for (const teilnehmer of modell.teilnehmer) {
    for (const position of teilnehmer.positionen) {
      const key = artikelKey(position);
      if (!bekannt.has(key)) {
        bekannt.set(key, {
          name: position.name,
          size: position.size,
          einzelpreisCents: position.einzelpreisCents,
        });
      }
    }
  }
  return [...bekannt.values()];
}

function euro(cents: number): number {
  return cents / 100;
}

function setzeBetrag(cell: ExcelJS.Cell, cents: number): void {
  cell.value = euro(cents);
  cell.numFmt = EUR_NUM_FMT;
}

export async function berichtXlsx(modell: BerichtModell): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Abschlussbericht");

  // ── Kopf (AC11) ────────────────────────────────────────────────────────────
  sheet.addRow(["Abschlussbericht"]);
  sheet.addRow(["Bezeichnung", neutralisiereFormelPraefix(modell.kopf.bezeichnung)]);
  sheet.addRow(["Datum", modell.kopf.datum]);
  sheet.addRow(["Kasse", modell.kopf.kasse]);
  sheet.addRow(["Status", modell.kopf.status]);
  sheet.addRow([]);

  // ── Teilnehmertabelle mit Pro-Artikel-Strichen (AC4–AC6) ────────────────────
  const artikel = sammleArtikel(modell);
  const spalteJeArtikel = new Map<string, number>();
  artikel.forEach((eintrag, index) => spalteJeArtikel.set(artikelKey(eintrag), index));

  const summenSpalten = ["Getränke", "Sonstige", "Verzehr-Gesamt", "Erhalten", "Spende"];
  sheet.addRow(["Teilnehmer", ...artikel.map(artikelBezeichnung), ...summenSpalten]);

  // Preiszeile: eingefrorener Einzelpreis je Artikel-Spalte (encodiert mit der Menge den Zeilenbetrag).
  const preisRow = sheet.addRow([
    "Einzelpreis",
    ...artikel.map((eintrag) => euro(eintrag.einzelpreisCents)),
  ]);
  artikel.forEach((_, index) => {
    preisRow.getCell(2 + index).numFmt = EUR_NUM_FMT;
  });

  const summenStart = 2 + artikel.length;
  for (const teilnehmer of modell.teilnehmer) {
    const mengeJeSpalte = new Map<number, number>();
    for (const position of teilnehmer.positionen) {
      // `spalte` ist immer definiert: `spalteJeArtikel` wird aus genau denselben Positionen
      // aufgebaut (`sammleArtikel` läuft über alle `modell.teilnehmer`), die hier durchlaufen
      // werden – kein Positions-Artikel kann fehlen (Codify #185-Refactor).
      const spalte = spalteJeArtikel.get(artikelKey(position))!;
      mengeJeSpalte.set(spalte, (mengeJeSpalte.get(spalte) ?? 0) + position.menge);
    }
    const row = sheet.addRow([
      neutralisiereFormelPraefix(teilnehmer.anzeigename),
      ...artikel.map((_, index) => mengeJeSpalte.get(index) ?? null),
    ]);
    setzeBetrag(row.getCell(summenStart), teilnehmer.getraenkeCents);
    setzeBetrag(row.getCell(summenStart + 1), teilnehmer.sonstigeCents);
    setzeBetrag(row.getCell(summenStart + 2), teilnehmer.verzehrGesamtCents);
    if (teilnehmer.erhaltenCents !== null) {
      setzeBetrag(row.getCell(summenStart + 3), teilnehmer.erhaltenCents);
    }
    setzeBetrag(row.getCell(summenStart + 4), teilnehmer.spendeCents);
  }

  // Tagessummen (AC6): unter der Matrix, in den Summen-Spalten.
  const tagesRow = sheet.addRow(["Summe"]);
  setzeBetrag(tagesRow.getCell(summenStart), modell.tagessummen.getraenkeCents);
  setzeBetrag(tagesRow.getCell(summenStart + 1), modell.tagessummen.sonstigeCents);
  setzeBetrag(tagesRow.getCell(summenStart + 2), modell.tagessummen.verzehrGesamtCents);
  setzeBetrag(tagesRow.getCell(summenStart + 3), modell.tagessummen.erhaltenCents);
  setzeBetrag(tagesRow.getCell(summenStart + 4), modell.tagessummen.spendeCents);
  sheet.addRow([]);

  // ── Auslagenerstattungen (Einzelnachweis, AC7) ──────────────────────────────
  sheet.addRow(["Auslagenerstattungen"]);
  sheet.addRow(["Teilnehmer", "Kategorie", "Betrag", "Status"]);
  for (const auslage of modell.auslagen) {
    const row = sheet.addRow([
      neutralisiereFormelPraefix(auslage.anzeigename),
      auslage.kategorie,
      null,
      auslage.status,
    ]);
    setzeBetrag(row.getCell(3), auslage.betragCents);
  }
  sheet.addRow([]);

  // ── Gesamtabrechnung (AC8) ──────────────────────────────────────────────────
  sheet.addRow([`Gesamtabrechnung (Kasse: ${modell.kopf.kasse})`]);
  for (const [label, cents] of gesamtabrechnungsZeilen(modell.gesamtabrechnung)) {
    const row = sheet.addRow([label, null]);
    setzeBetrag(row.getCell(2), cents);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
