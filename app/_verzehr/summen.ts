import type { CatalogCategory } from "@/db/schema";

// Reine, DB-freie Summen-Logik der Verzehr-Erfassung (ADR-025 D5). Bewusst ohne Drizzle/DOM,
// damit sie zu 100 % unit-testbar ist. Getränke, Essen und Kaffee sind je eine eigene
// Lese-Gruppierung nach `catalog_category` (ADR-027), keine Struktur.

export type VerzehrPositionSum = {
  menge: number;
  priceCents: number;
  category: CatalogCategory;
};

export type ZeileSummen = {
  getraenkeCents: number;
  essenCents: number;
  kaffeeCents: number;
};

// Beträge sind ganzzahlige Cent (ADR-021) → Σ menge × priceCents ist exakt ganzzahlig,
// keine Rundung nötig; die 2-Nachkommastellen-Anzeige übernimmt `formatCents` (de-DE).
export function zeileSummen(positionen: readonly VerzehrPositionSum[]): ZeileSummen {
  let getraenkeCents = 0;
  let essenCents = 0;
  let kaffeeCents = 0;
  for (const position of positionen) {
    const betrag = position.menge * position.priceCents;
    if (position.category === "getraenk") {
      getraenkeCents += betrag;
    } else if (position.category === "essen") {
      essenCents += betrag;
    } else if (position.category === "kaffee") {
      kaffeeCents += betrag;
    } else {
      // Exhaustiveness-Guard: löst einen Compile-Fehler aus, sobald `CatalogCategory` um
      // einen vierten Wert erweitert wird, statt ihn hier still als Kaffee mitzuzählen.
      const _exhaustive: never = position.category;
      throw new Error(`Unbekannte Kategorie: ${String(_exhaustive)}`);
    }
  }
  return { getraenkeCents, essenCents, kaffeeCents };
}
