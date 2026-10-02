import type { CatalogCategory } from "@/db/schema";
import type { VerzehrPositionRow } from "@/db/verzehr";
import type { VerzehrArtikel } from "./artikel-anzeige";

// Reine, DB-freie Ableitung der Einträge des Kategorie-Umschalters (ADR-054 D1/D2/D4). Bewusst
// ohne React, damit Reihenfolge und Fallbacks ohne Rendering testbar sind.

// „inaktiv" ist kein Katalog-Wert, sondern der Sammel-Eintrag für Positionen auf inzwischen
// deaktivierten Artikeln (ADR-026 D3) – er erscheint nur bei Personen, die solche Positionen haben.
export type VerzehrKategorie = CatalogCategory | "inaktiv";

// Getränke, Kaffee, Essen – Reihenfolge des Umschalters und seiner Vorwahl (spec AK2.4).
const KATEGORIE_REIHENFOLGE: readonly CatalogCategory[] = ["getraenk", "kaffee", "essen"];

// Eigene Labels statt `CATEGORY_LABEL`: der Umschalter benennt die Gruppe („Getränke"), die
// Verwaltung den einzelnen Artikel („Getränk").
export const KATEGORIE_LABEL: Record<VerzehrKategorie, string> = {
  getraenk: "Getränke",
  kaffee: "Kaffee",
  essen: "Essen",
  inaktiv: "Nicht mehr im Katalog",
};

// Positionen auf deaktivierten Artikeln, die noch korrigierbar bleiben müssen (ADR-026 D3).
// menge=0 fällt heraus – re-erfassen ist dann bewusst nicht mehr möglich (Soft-Delete-Zweck).
export function inaktivePositionen(
  positionen: readonly VerzehrPositionRow[],
): VerzehrPositionRow[] {
  return positionen.filter((position) => !position.active && position.menge > 0);
}

// Kategorien mit mindestens einem aktiven Artikel, plus „inaktiv", wenn die Person solche
// Positionen hat. Leere Kategorien erscheinen nicht (spec AK2.3).
export function sichtbareKategorien(
  artikel: readonly VerzehrArtikel[],
  positionenDerPerson: readonly VerzehrPositionRow[],
): VerzehrKategorie[] {
  const kategorien: VerzehrKategorie[] = KATEGORIE_REIHENFOLGE.filter((kategorie) =>
    artikel.some((item) => item.category === kategorie),
  );
  if (inaktivePositionen(positionenDerPerson).length > 0) kategorien.push("inaktiv");
  return kategorien;
}

// Die Einträge der sichtbaren Kategorie als Artikel – für „inaktiv" aus den Positionen der Person
// abgeleitet (Name/Größe/eingefrorener Preis stehen an der Position), damit beide Fälle dasselbe
// Zeilenmuster durchlaufen (spec AK3).
export function artikelDerKategorie(
  kategorie: VerzehrKategorie,
  artikel: readonly VerzehrArtikel[],
  positionenDerPerson: readonly VerzehrPositionRow[],
): VerzehrArtikel[] {
  if (kategorie !== "inaktiv") return artikel.filter((item) => item.category === kategorie);
  return inaktivePositionen(positionenDerPerson).map((position) => ({
    id: position.catalogItemId,
    name: position.name,
    size: position.size,
    priceCents: position.priceCents,
    category: position.category,
  }));
}

// Die gewählte Kategorie bleibt über Personenwechsel erhalten (spec AK2.4); fehlt sie bei der
// aktuellen Person, gilt die erste vorhandene. Beim Rendern abgeleitet, nicht per Effekt
// nachgezogen (Lesson `set-state-in-effect`).
export function sichtbareKategorie(
  gewaehlt: VerzehrKategorie | null,
  verfuegbar: readonly VerzehrKategorie[],
): VerzehrKategorie | null {
  if (gewaehlt !== null && verfuegbar.includes(gewaehlt)) return gewaehlt;
  return verfuegbar[0] ?? null;
}
