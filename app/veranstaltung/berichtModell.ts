import type {
  AuslageKategorie,
  AuslageStatus,
  CatalogCategory,
  Kasse,
  VeranstaltungStatus,
} from "@/db/schema";
import { zeileSummen, type VerzehrPositionSum } from "@/app/_verzehr/summen";
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
// `gesamtabrechnung`, `auslagenSummen`) – kein zweiter Wahrheitspfad. Beträge sind ganzzahlige
// Cent (ADR-021); die Renderer formatieren (de-DE, 2 Nachkommastellen).

// Anzeigereihenfolge der Verzehr-Kategorien im Bericht (getrennt von der Auslagen-Ordnung, die eine
// andere Wertmenge hat). Eine Quelle für die Sortierung der Pro-Artikel-Striche.
const CATEGORY_ORDER: Record<CatalogCategory, number> = { getraenk: 0, essen: 1, kaffee: 2 };

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
// via COALESCE eingefroren, ADR-033 D2). `VerzehrPositionSum` liefert menge/priceCents/category.
export type BerichtPositionInput = VerzehrPositionSum & {
  zeileId: string;
  name: string;
  size: string;
};

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

// Ein konsumierter Artikel einer Teilnehmerzeile mit Menge (Strichzahl) und Zeilenbetrag
// (Menge × eingefrorener Einzelpreis) – der Kern der Pro-Artikel-Striche (AC4).
export type BerichtPosition = {
  name: string;
  size: string;
  category: CatalogCategory;
  menge: number;
  einzelpreisCents: number;
  zeilenbetragCents: number;
};

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

function gruppiereNachZeile(
  positionen: readonly BerichtPositionInput[],
): Map<string, BerichtPositionInput[]> {
  const map = new Map<string, BerichtPositionInput[]>();
  for (const position of positionen) {
    const liste = map.get(position.zeileId) ?? [];
    liste.push(position);
    map.set(position.zeileId, liste);
  }
  return map;
}

// Sichtbare Pro-Artikel-Striche einer Zeile: nur tatsächlich konsumierte Artikel (menge > 0,
// AC4 „konsumierten Artikel"), deterministisch sortiert nach Kategorie → Name → Größe.
function berichtPositionen(positionen: readonly BerichtPositionInput[]): BerichtPosition[] {
  return positionen
    .filter((position) => position.menge > 0)
    .map((position) => ({
      name: position.name,
      size: position.size,
      category: position.category,
      menge: position.menge,
      einzelpreisCents: position.priceCents,
      zeilenbetragCents: position.menge * position.priceCents,
    }))
    .sort(
      (a, b) =>
        CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category] ||
        a.name.localeCompare(b.name, "de-DE") ||
        a.size.localeCompare(b.size, "de-DE"),
    );
}

export function berichtModell(input: {
  veranstaltung: BerichtVeranstaltungInput;
  zeilen: readonly BerichtZeileInput[];
  positionen: readonly BerichtPositionInput[];
  auslagen: readonly BerichtAuslageInput[];
}): BerichtModell {
  const { veranstaltung, zeilen, positionen, auslagen } = input;
  const positionenJeZeile = gruppiereNachZeile(positionen);

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
      positionen: berichtPositionen(positionenJeZeile.get(zeile.id) ?? []),
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
