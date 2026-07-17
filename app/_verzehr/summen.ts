import type { CatalogCategory } from "@/db/schema";

// Reine, DB-freie Summen-Logik der Verzehr-Erfassung (ADR-025 D5). Bewusst ohne Drizzle/DOM,
// damit sie zu 100 % unit-testbar ist. Der Split „Getränke (Theke)" vs. „Sonstige (Essen +
// Kaffee)" ist eine Lese-Gruppierung nach `catalog_category` (ADR-025 D1), keine Struktur.

export type VerzehrPositionSum = {
  menge: number;
  priceCents: number;
  category: CatalogCategory;
};

export type ZeileSummen = {
  getraenkeCents: number;
  sonstigeCents: number;
};

// Beträge sind ganzzahlige Cent (ADR-021) → Σ menge × priceCents ist exakt ganzzahlig,
// keine Rundung nötig; die 2-Nachkommastellen-Anzeige übernimmt `formatCents` (de-DE).
export function zeileSummen(positionen: readonly VerzehrPositionSum[]): ZeileSummen {
  let getraenkeCents = 0;
  let sonstigeCents = 0;
  for (const position of positionen) {
    const betrag = position.menge * position.priceCents;
    if (position.category === "getraenk") {
      getraenkeCents += betrag;
    } else {
      sonstigeCents += betrag;
    }
  }
  return { getraenkeCents, sonstigeCents };
}
