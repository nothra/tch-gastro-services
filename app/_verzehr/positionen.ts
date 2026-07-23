import type { CatalogCategory } from "@/db/schema";
import type { VerzehrPositionSum } from "./summen";

// Route-neutrale, DB-freie Aufbereitung der itemisierten Verzehr-Positionen einer Zeile (ADR-025 D5):
// SINGLE SOURCE sowohl für den Abschlussbericht (F9, #185, `berichtModell`) als auch für die
// Kassier-Aufschlüsselung (F8, #206). Bewusst ohne Drizzle/DOM, damit sie zu 100 % unit-testbar ist
// und die Positionen in beiden Konsumenten per Konstruktion identisch sind – kein zweiter
// Wahrheitspfad. Beträge sind ganzzahlige Cent (ADR-021); die 2-Nachkommastellen-Anzeige übernimmt
// `formatCents` (de-DE).

// Anzeigereihenfolge der Verzehr-Kategorien (getrennt von der Auslagen-Ordnung, die eine andere
// Wertmenge hat). Eine Quelle für die Sortierung der Pro-Artikel-Striche.
export const CATEGORY_ORDER: Record<CatalogCategory, number> = { getraenk: 0, essen: 1, kaffee: 2 };

// Eine erfasste Position mit aufgelöstem Katalog-Namen/-Größe/-Preis (aus `listPositionen`, F5,
// Preis via COALESCE eingefroren, ADR-033 D2). `VerzehrPositionSum` liefert menge/priceCents/category.
export type VerzehrPositionDetailInput = VerzehrPositionSum & { name: string; size: string };

// Ein konsumierter Artikel einer Zeile mit Menge (Strichzahl) und Positionsbetrag
// (Menge × eingefrorener Einzelpreis) – der Kern der Pro-Artikel-Striche.
export type VerzehrPositionDetail = {
  name: string;
  size: string;
  category: CatalogCategory;
  menge: number;
  einzelpreisCents: number;
  zeilenbetragCents: number;
};

// Anzeigename einer Position (Name + Größe, falls vorhanden) – von Bericht-Renderern und der
// Kassier-Aufschlüsselung genutzt, damit die Bezeichnung nicht mehrfach gepflegt wird.
export function artikelBezeichnung(artikel: { name: string; size: string }): string {
  return artikel.size ? `${artikel.name} (${artikel.size})` : artikel.name;
}

// Gruppiert Positionen nach ihrer Zeile; je Gruppe bleibt die Einfüge-Reihenfolge stabil.
export function gruppierePositionenNachZeile<T extends { zeileId: string }>(
  positionen: readonly T[],
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const position of positionen) {
    const liste = map.get(position.zeileId) ?? [];
    liste.push(position);
    map.set(position.zeileId, liste);
  }
  return map;
}

// Sichtbare Pro-Artikel-Striche einer Zeile: nur tatsächlich konsumierte Artikel (menge > 0),
// deterministisch sortiert nach Kategorie → Name → Größe.
export function verzehrPositionen(
  positionen: readonly VerzehrPositionDetailInput[],
): VerzehrPositionDetail[] {
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
