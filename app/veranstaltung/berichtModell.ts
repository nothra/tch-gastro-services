import type { AuslageKategorie, AuslageStatus, Kasse, VeranstaltungStatus } from "@/db/schema";
import { zeileSummen } from "@/app/_verzehr/summen";
import {
  gruppierePositionenNachZeile,
  verzehrPositionen,
  type VerzehrPositionDetail,
  type VerzehrPositionDetailInput,
} from "@/app/_verzehr/positionen";
import { gesamtabrechnung, kassierTagessummen, kassierZeile } from "./kassierSummen";
import { auslagenSummen } from "./auslagenSummen";
import {
  AUSLAGE_KATEGORIE_LABEL,
  AUSLAGE_STATUS_LABEL,
  KASSE_LABEL,
  STATUS_LABEL,
  formatDatum,
} from "./labels";

// Reines, DB-freies Bericht-Modell (F9, #185, ADR-036 D6): die SINGLE SOURCE für beide
// Format-Renderer (Excel/PDF). Bewusst ohne Drizzle/DOM, damit es zu 100 % unit-testbar ist und
// die Werte in beiden Formaten per Konstruktion identisch sind (AC10). Es nutzt ausschließlich die
// bestehenden reinen Summen-Funktionen (`zeileSummen`, `kassierZeile`, `kassierTagessummen`,
// `gesamtabrechnung`, `auslagenSummen`) und die Pro-Artikel-Aufbereitung (`verzehrPositionen`) –
// kein zweiter Wahrheitspfad. Beträge sind ganzzahlige Cent (ADR-021); die Renderer formatieren
// (de-DE, 2 Nachkommastellen).

// `artikelBezeichnung` (Name + Größe) lebt route-neutral in `_verzehr/positionen` (SINGLE SOURCE
// mit der Kassier-Aufschlüsselung, #206) – hier als Fassade re-exportiert, weil beide Renderer
// (Excel/PDF) es aus dem Bericht-Modell beziehen.
export { artikelBezeichnung } from "@/app/_verzehr/positionen";

export type BerichtVeranstaltungInput = {
  bezeichnung: string;
  datum: Date | null;
  kasse: Kasse;
  status: VeranstaltungStatus;
};

export type BerichtZeileInput = {
  id: string;
  anzeigename: string;
  erhaltenCents: number | null;
};

// Eine erfasste Position mit aufgelöstem Katalog-Namen/-Preis (aus `listPositionen`, F5, Preis
// via COALESCE eingefroren, ADR-033 D2) plus ihrer Zeilen-Zuordnung.
export type BerichtPositionInput = VerzehrPositionDetailInput & { zeileId: string };

// Eine Auslage mit bereits aufgelöstem Anzeigenamen (aus `listAuslagen`, LEFT JOIN + COALESCE-
// Fallback, Codify #53) – bleibt sichtbar, auch wenn die Teilnehmerzeile gelöscht wurde.
export type BerichtAuslageInput = {
  anzeigename: string;
  kategorie: AuslageKategorie;
  betragCents: number;
  status: AuslageStatus;
};

export type BerichtKopf = {
  bezeichnung: string;
  datum: string; // formatiert de-DE (UTC), z. B. "14.07.2026"
  kasse: string; // Anzeige-Label, z. B. "Montagsrunde"
  status: string; // Anzeige-Label, z. B. "abgeschlossen"
};

// Ein konsumierter Artikel einer Teilnehmerzeile (AC4). Alias auf die route-neutrale SINGLE
// SOURCE `VerzehrPositionDetail`; als Bericht-Name beibehalten, weil beide Renderer ihn nutzen.
export type BerichtPosition = VerzehrPositionDetail;

export type BerichtTeilnehmer = {
  anzeigename: string;
  positionen: BerichtPosition[];
  getraenkeCents: number;
  sonstigeCents: number; // Essen + Kaffee
  verzehrGesamtCents: number;
  erhaltenCents: number | null;
  spendeCents: number;
};

export type BerichtTagessummen = {
  getraenkeCents: number;
  sonstigeCents: number;
  verzehrGesamtCents: number;
  erhaltenCents: number;
  spendeCents: number;
};

export type BerichtAuslage = {
  anzeigename: string;
  kategorie: string; // Anzeige-Label
  betragCents: number;
  status: string; // Anzeige-Label
};

export type BerichtGesamtabrechnung = {
  verzehrGetraenkeCents: number;
  verzehrEssenCents: number;
  verzehrKaffeeCents: number;
  spendeCents: number;
  einnahmenCents: number; // Σ Erhalten
  auslagenErstattung: {
    getraenkeCents: number;
    essenCents: number;
    sonstigesCents: number;
    gesamtCents: number;
  };
  kassenveraenderungCents: number; // Σ Erhalten − Σ Auslagenerstattungen (erstattet)
};

export type BerichtModell = {
  kopf: BerichtKopf;
  teilnehmer: BerichtTeilnehmer[];
  tagessummen: BerichtTagessummen;
  auslagen: BerichtAuslage[];
  gesamtabrechnung: BerichtGesamtabrechnung;
};

// Die zehn Zeilen der Gesamtabrechnung (AC8) als Label/Betrag-Paare – von beiden Format-Renderern
// genutzt, damit Reihenfolge und Beschriftung nicht zweifach gepflegt werden.
export function gesamtabrechnungsZeilen(g: BerichtGesamtabrechnung): [string, number][] {
  return [
    ["Verzehr-Umsatz Getränke", g.verzehrGetraenkeCents],
    ["Verzehr-Umsatz Essen", g.verzehrEssenCents],
    ["Verzehr-Umsatz Kaffee", g.verzehrKaffeeCents],
    ["Spende", g.spendeCents],
    ["Einnahmen (Σ Erhalten)", g.einnahmenCents],
    ["Auslagenerstattung Getränke", g.auslagenErstattung.getraenkeCents],
    ["Auslagenerstattung Essen", g.auslagenErstattung.essenCents],
    ["Auslagenerstattung Sonstiges", g.auslagenErstattung.sonstigesCents],
    ["Auslagenerstattung gesamt", g.auslagenErstattung.gesamtCents],
    ["Kassenveränderung", g.kassenveraenderungCents],
  ];
}

export function berichtModell(input: {
  veranstaltung: BerichtVeranstaltungInput;
  zeilen: readonly BerichtZeileInput[];
  positionen: readonly BerichtPositionInput[];
  auslagen: readonly BerichtAuslageInput[];
}): BerichtModell {
  const { veranstaltung, zeilen, positionen, auslagen } = input;
  const positionenJeZeile = gruppierePositionenNachZeile(positionen);

  // Eine Zeile → eine `kassierZeile` (single source der Zeilenberechnung). `zeileSummen` liefert die
  // Kategorie-Summen; `kassierZeile` leitet Sonstige/Verzehr-Gesamt/Spende ab (Auslagen mindern
  // den Verzehr NICHT). Zusätzlich die sichtbaren Pro-Artikel-Striche.
  const kassierZeilen = zeilen.map((zeile) => {
    const summen = zeileSummen(positionenJeZeile.get(zeile.id) ?? []);
    return kassierZeile({
      getraenkeCents: summen.getraenkeCents,
      essenCents: summen.essenCents,
      kaffeeCents: summen.kaffeeCents,
      erhaltenCents: zeile.erhaltenCents,
    });
  });

  const teilnehmer: BerichtTeilnehmer[] = zeilen.map((zeile, index) => {
    const kassier = kassierZeilen[index];
    return {
      anzeigename: zeile.anzeigename,
      positionen: verzehrPositionen(positionenJeZeile.get(zeile.id) ?? []),
      getraenkeCents: kassier.getraenkeCents,
      sonstigeCents: kassier.sonstigeCents,
      verzehrGesamtCents: kassier.verzehrGesamtCents,
      erhaltenCents: kassier.erhaltenCents,
      spendeCents: kassier.spendeCents,
    };
  });

  const tages = kassierTagessummen(kassierZeilen);
  const ausgaben = auslagenSummen(auslagen);
  const abrechnung = gesamtabrechnung(tages.erhaltenCents, ausgaben.gesamt.erstattetCents);

  return {
    kopf: {
      bezeichnung: veranstaltung.bezeichnung,
      datum: formatDatum(veranstaltung.datum),
      kasse: KASSE_LABEL[veranstaltung.kasse],
      status: STATUS_LABEL[veranstaltung.status],
    },
    teilnehmer,
    tagessummen: {
      getraenkeCents: tages.getraenkeCents,
      sonstigeCents: tages.sonstigeCents,
      verzehrGesamtCents: tages.verzehrGesamtCents,
      erhaltenCents: tages.erhaltenCents,
      spendeCents: tages.spendeCents,
    },
    auslagen: auslagen.map((auslage) => ({
      anzeigename: auslage.anzeigename,
      kategorie: AUSLAGE_KATEGORIE_LABEL[auslage.kategorie],
      betragCents: auslage.betragCents,
      status: AUSLAGE_STATUS_LABEL[auslage.status],
    })),
    gesamtabrechnung: {
      verzehrGetraenkeCents: tages.getraenkeCents,
      verzehrEssenCents: tages.essenCents,
      verzehrKaffeeCents: tages.kaffeeCents,
      spendeCents: tages.spendeCents,
      einnahmenCents: abrechnung.einnahmenCents,
      auslagenErstattung: {
        getraenkeCents: ausgaben.getraenke.erstattetCents,
        essenCents: ausgaben.essen.erstattetCents,
        sonstigesCents: ausgaben.sonstiges.erstattetCents,
        gesamtCents: ausgaben.gesamt.erstattetCents,
      },
      kassenveraenderungCents: abrechnung.kassenveraenderungCents,
    },
  };
}
