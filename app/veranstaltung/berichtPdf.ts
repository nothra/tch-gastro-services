import pdfMake from "pdfmake";
import type { Content, TableCell, TDocumentDefinitions } from "pdfmake/interfaces";
import { formatCents } from "@/lib/money";
import {
  artikelBezeichnung,
  gesamtabrechnungsZeilen,
  getraenkeErgebnisZeilen,
  type BerichtAuslage,
  type BerichtGetraenkeModell,
  type BerichtKopf,
  type BerichtModell,
  type BerichtPosition,
  type BerichtTeilnehmer,
} from "./berichtModell";

// PDF-Renderer des Abschlussberichts (F9, #185, ADR-036 D5/D8). Konsumiert AUSSCHLIESSLICH die
// reinen Bericht-Modelle (Single Source ⇒ inhaltsgleich zum Excel, AC10). Node-nativ (pdfmake, kein
// Headless-Browser); nur server-seitig genutzt (Route Handler) → kein Client-Bundle-Impact.
//
// Layout (ADR-036 D8): kompakte Unterliste je Teilnehmer (Hochformat, druckfreundlich) statt der
// breiten Excel-Matrix. Je Teilnehmer eine kleine Artikeltabelle (Menge + eingefrorener Einzelpreis
// + Zeilenbetrag, AC4) und darunter die Zeilensummen; der Informationsgehalt ist identisch zum Excel.
//
// Das Modul stellt ZWEI Renderer bereit (ADR-046 D3): `berichtPdf` für den vollständigen Bericht
// und `berichtPdfGetraenke` für die Variante „nur Getränke" (#324) – eigene Funktionen statt eines
// Umfangs-Zweigs, damit der etablierte vollständige Bericht unberührt bleibt (spec-324 AC6). Die
// Dokument-Definitionen sind je Renderer als reine Funktion herausgezogen (`*Dokument`), damit der
// Inhalt ohne PDF-Parsing prüfbar ist.

// pdfmake läuft hier in Node: die 14 PDF-Standardschriften (Helvetica) sind in pdfkit eingebaut,
// darum wird KEIN Virtual File System / kein Font-Download gebraucht. Die Access-Policies werden
// fail-closed gesetzt (keine externen URL-/Datei-Zugriffe beim Rendern) – Modul-Singleton, einmalig.
//
// Die eingebauten Standardschriften reicht pdfmake als „lokale Datei" (den Font-Namen) durch die
// Local-Access-Policy; ein pauschales Deny würde sie mitblockieren. Darum werden genau die hier
// registrierten Helvetica-Varianten erlaubt und jeder echte Dateipfad weiterhin abgelehnt.
const STANDARD_FONTS: Record<string, string> = {
  normal: "Helvetica",
  bold: "Helvetica-Bold",
  italics: "Helvetica-Oblique",
  bolditalics: "Helvetica-BoldOblique",
};
const ERLAUBTE_FONT_DATEIEN = new Set(Object.values(STANDARD_FONTS));

pdfMake.setFonts({ Helvetica: STANDARD_FONTS });
pdfMake.setUrlAccessPolicy(() => false);
pdfMake.setLocalAccessPolicy((path) => ERLAUBTE_FONT_DATEIEN.has(path));

const EUR = (cents: number): string => formatCents(cents);

// Kopfblock beider Berichtsformen. Der Titel macht bei der Variante den eingeschränkten Umfang
// erkennbar (spec-324 AC9).
function kopf(kopfDaten: BerichtKopf, titel: string): Content {
  return {
    stack: [
      { text: titel, style: "titel" },
      { text: `Bezeichnung: ${kopfDaten.bezeichnung}` },
      { text: `Datum: ${kopfDaten.datum}` },
      { text: `Kasse: ${kopfDaten.kasse}` },
      { text: `Status: ${kopfDaten.status}` },
    ],
    style: "kopf",
  };
}

// Abschnitt aus Label/Betrag-Paaren (Gesamtabrechnung bzw. Getränke-Ergebnis) mit Titelzeile.
function betragsZeilen(titel: string, zeilen: [string, number][]): Content {
  return {
    stack: [
      { text: titel, style: "abschnitt" },
      {
        table: {
          widths: ["*", "auto"],
          body: zeilen.map(([label, cents]) => [label, { text: EUR(cents), alignment: "right" }]),
        },
        layout: "lightHorizontalLines",
      },
    ],
  };
}

// Kleine Artikeltabelle einer Teilnehmerzeile: Menge (Strichzahl) + eingefrorener Einzelpreis +
// Zeilenbetrag (Menge × Einzelpreis, AC4). Leer, wenn nichts konsumiert wurde.
function positionenTabelle(positionen: BerichtPosition[]): Content {
  const kopfzeile: TableCell[] = [
    { text: "Artikel", bold: true },
    { text: "Menge", bold: true, alignment: "right" },
    { text: "Einzelpreis", bold: true, alignment: "right" },
    { text: "Betrag", bold: true, alignment: "right" },
  ];
  const zeilen: TableCell[][] = positionen.map((position) => [
    artikelBezeichnung(position),
    { text: String(position.menge), alignment: "right" },
    { text: EUR(position.einzelpreisCents), alignment: "right" },
    { text: EUR(position.zeilenbetragCents), alignment: "right" },
  ]);
  return {
    table: { headerRows: 1, widths: ["*", "auto", "auto", "auto"], body: [kopfzeile, ...zeilen] },
    layout: "lightHorizontalLines",
    margin: [0, 2, 0, 4],
  };
}

// Zeilensummen eines Teilnehmers (AC5): Getränke, Sonstige (Essen + Kaffee), Verzehr-Gesamt,
// Erhalten, Spende. Auslagen mindern den Verzehr NICHT (getrennter Vorgang, ADR-023).
function summenZeile(teilnehmer: BerichtTeilnehmer): Content {
  const erhalten = teilnehmer.erhaltenCents === null ? "–" : EUR(teilnehmer.erhaltenCents);
  return {
    text: [
      `Getränke ${EUR(teilnehmer.getraenkeCents)}  ·  `,
      `Sonstige ${EUR(teilnehmer.sonstigeCents)}  ·  `,
      `Verzehr-Gesamt ${EUR(teilnehmer.verzehrGesamtCents)}  ·  `,
      `Erhalten ${erhalten}  ·  `,
      `Spende ${EUR(teilnehmer.spendeCents)}`,
    ],
    style: "summe",
  };
}

function teilnehmerAbschnitt(modell: BerichtModell): Content[] {
  if (modell.teilnehmer.length === 0) {
    return [{ text: "Keine Teilnehmer erfasst.", italics: true, margin: [0, 0, 0, 8] }];
  }
  return modell.teilnehmer.flatMap((teilnehmer) => {
    const abschnitt: Content[] = [{ text: teilnehmer.anzeigename, style: "teilnehmer" }];
    if (teilnehmer.positionen.length > 0) {
      abschnitt.push(positionenTabelle(teilnehmer.positionen));
    }
    abschnitt.push(summenZeile(teilnehmer));
    return abschnitt;
  });
}

// Tagessummen (AC6): entsprechen der Summe der Zeilenwerte (aus dem Modell, kein zweiter Rechenpfad).
function tagessummen(modell: BerichtModell): Content {
  const t = modell.tagessummen;
  return {
    table: {
      widths: ["*", "auto"],
      body: [
        [{ text: "Tagessummen", bold: true }, ""],
        ["Getränke", { text: EUR(t.getraenkeCents), alignment: "right" }],
        ["Sonstige (Essen + Kaffee)", { text: EUR(t.sonstigeCents), alignment: "right" }],
        ["Verzehr-Gesamt", { text: EUR(t.verzehrGesamtCents), alignment: "right" }],
        ["Erhalten", { text: EUR(t.erhaltenCents), alignment: "right" }],
        ["Spende", { text: EUR(t.spendeCents), alignment: "right" }],
      ],
    },
    layout: "lightHorizontalLines",
    margin: [0, 6, 0, 10],
  };
}

// Auslagen-Einzelnachweis (AC7): jede Auslage einzeln (Teilnehmer, Kategorie, Betrag, Status) –
// bewusst getrennt von den Teilnehmerzeilen, da Auslagen den Verzehr nicht mindern.
function auslagenAbschnitt(auslagen: BerichtAuslage[]): Content {
  const kopfzeile: TableCell[] = [
    { text: "Teilnehmer", bold: true },
    { text: "Kategorie", bold: true },
    { text: "Betrag", bold: true, alignment: "right" },
    { text: "Status", bold: true },
  ];
  const zeilen: TableCell[][] =
    auslagen.length === 0
      ? [[{ text: "Keine Auslagen.", colSpan: 4, italics: true }, {}, {}, {}]]
      : auslagen.map((auslage) => [
          auslage.anzeigename,
          auslage.kategorie,
          { text: EUR(auslage.betragCents), alignment: "right" },
          auslage.status,
        ]);
  return {
    stack: [
      { text: "Auslagenerstattungen", style: "abschnitt" },
      {
        table: {
          headerRows: 1,
          widths: ["*", "auto", "auto", "auto"],
          body: [kopfzeile, ...zeilen],
        },
        layout: "lightHorizontalLines",
      },
    ],
    margin: [0, 0, 0, 10],
  };
}

// ── Getränke-Variante (#324, spec-324, ADR-046 D3) ────────────────────────────────────────────

// Teilnehmerabschnitt der Variante: je Teilnehmer die Getränke-Artikeltabelle und die
// Getränke-Summe – ohne Sonstige/Verzehr-Gesamt/Erhalten/Spende (AC5). Teilnehmer ohne
// Getränke-Position sind bereits im Modell weggefallen (AC12).
function getraenkeTeilnehmerAbschnitt(modell: BerichtGetraenkeModell): Content[] {
  if (modell.teilnehmer.length === 0) {
    return [{ text: "Keine Teilnehmer mit Getränken.", italics: true, margin: [0, 0, 0, 8] }];
  }
  return modell.teilnehmer.flatMap((teilnehmer) => [
    { text: teilnehmer.anzeigename, style: "teilnehmer" },
    positionenTabelle(teilnehmer.positionen),
    { text: `Getränke ${EUR(teilnehmer.getraenkeCents)}`, style: "summe" },
  ]);
}

// Tagessumme der Variante: Σ Getränke über alle Teilnehmer (aus dem Modell, kein zweiter Rechenpfad).
function getraenkeTagessumme(modell: BerichtGetraenkeModell): Content {
  return {
    table: {
      widths: ["*", "auto"],
      body: [
        [{ text: "Tagessumme", bold: true }, ""],
        ["Getränke", { text: EUR(modell.getraenkeGesamtCents), alignment: "right" }],
      ],
    },
    layout: "lightHorizontalLines",
    margin: [0, 6, 0, 10],
  };
}

// Auslagen-Einzelnachweis der Variante (AC3): je Auslage Teilnehmer, Betrag und Status. Keine
// Kategorie-Spalte – alle Zeilen sind per Filter Getränke.
function getraenkeAuslagenAbschnitt(auslagen: BerichtAuslage[]): Content {
  const kopfzeile: TableCell[] = [
    { text: "Teilnehmer", bold: true },
    { text: "Betrag", bold: true, alignment: "right" },
    { text: "Status", bold: true },
  ];
  const zeilen: TableCell[][] =
    auslagen.length === 0
      ? [[{ text: "Keine Getränke-Auslagen.", colSpan: 3, italics: true }, {}, {}]]
      : auslagen.map((auslage) => [
          auslage.anzeigename,
          { text: EUR(auslage.betragCents), alignment: "right" },
          auslage.status,
        ]);
  return {
    stack: [
      { text: "Auslagenerstattungen Getränke", style: "abschnitt" },
      {
        table: { headerRows: 1, widths: ["*", "auto", "auto"], body: [kopfzeile, ...zeilen] },
        layout: "lightHorizontalLines",
      },
    ],
    margin: [0, 0, 0, 10],
  };
}

// Gemeinsame Dokument-Rahmenwerte beider Berichtsformen (Schrift, Ränder, Stile).
const DOKUMENT_RAHMEN = {
  defaultStyle: { font: "Helvetica", fontSize: 10 },
  pageMargins: [40, 40, 40, 40],
  styles: {
    titel: { fontSize: 18, bold: true, margin: [0, 0, 0, 6] },
    kopf: { margin: [0, 0, 0, 12] },
    abschnitt: { fontSize: 13, bold: true, margin: [0, 0, 0, 4] },
    teilnehmer: { fontSize: 12, bold: true, margin: [0, 6, 0, 0] },
    summe: { fontSize: 9, margin: [0, 0, 0, 8] },
  },
} satisfies Omit<TDocumentDefinitions, "content">;

export function berichtPdfDokument(modell: BerichtModell): TDocumentDefinitions {
  return {
    ...DOKUMENT_RAHMEN,
    content: [
      kopf(modell.kopf, "Abschlussbericht"),
      { text: "Teilnehmer", style: "abschnitt" },
      ...teilnehmerAbschnitt(modell),
      tagessummen(modell),
      auslagenAbschnitt(modell.auslagen),
      // Gesamtabrechnung (AC8): Verzehr-Umsatz je Kategorie, Σ Spende separat, Auslagenerstattung
      // je Kategorie + gesamt, Kassenveränderung (je zugeordneter Kasse).
      betragsZeilen(
        `Gesamtabrechnung (Kasse: ${modell.kopf.kasse})`,
        gesamtabrechnungsZeilen(modell.gesamtabrechnung),
      ),
    ],
  };
}

export function berichtPdfGetraenkeDokument(modell: BerichtGetraenkeModell): TDocumentDefinitions {
  return {
    ...DOKUMENT_RAHMEN,
    content: [
      kopf(modell.kopf, "Abschlussbericht – nur Getränke"),
      { text: "Teilnehmer", style: "abschnitt" },
      ...getraenkeTeilnehmerAbschnitt(modell),
      getraenkeTagessumme(modell),
      getraenkeAuslagenAbschnitt(modell.auslagen),
      // Ergebnis: genau zwei Summen (AC4).
      betragsZeilen(`Ergebnis (Kasse: ${modell.kopf.kasse})`, getraenkeErgebnisZeilen(modell)),
    ],
  };
}

export async function berichtPdf(modell: BerichtModell): Promise<Buffer> {
  return pdfMake.createPdf(berichtPdfDokument(modell)).getBuffer();
}

export async function berichtPdfGetraenke(modell: BerichtGetraenkeModell): Promise<Buffer> {
  return pdfMake.createPdf(berichtPdfGetraenkeDokument(modell)).getBuffer();
}
