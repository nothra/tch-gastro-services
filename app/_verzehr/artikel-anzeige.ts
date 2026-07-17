import type { CatalogCategory } from "@/db/schema";

// Route-neutraler Helfer (ADR-027 D3): DB-frei und ohne Feature-Imports (ADR-025 D5),
// damit Gruppierung/Label-Ableitung unabhängig von der Render-Komponente testbar bleiben.

export type VerzehrArtikel = {
  id: string;
  name: string;
  size: string;
  priceCents: number;
  category: CatalogCategory;
};

export type VerzehrArtikelGruppe = {
  name: string;
  varianten: readonly VerzehrArtikel[];
};

export function groessenSuffix(size: string): string {
  const trimmed = size.trim();
  return trimmed === "" ? "" : ` · ${trimmed}`;
}

// Für Varianten-Zeilen innerhalb einer Namensgruppe (ArtikelGruppe): der Name steht bereits
// als Gruppenüberschrift, die Zeile selbst braucht daher immer ein Label – nie ein leeres
// Suffix ohne Kontext wie bei groessenSuffix.
export function groessenLabel(size: string): string {
  const trimmed = size.trim();
  return trimmed === "" ? "ohne Größe" : trimmed;
}

// Stabiles group-by `name`: Gruppen erscheinen in der Reihenfolge des ersten Auftretens ihres
// Namens, Varianten in Eingabereihenfolge – kein Re-Sort, damit die sortOrder-Kuratierung des
// Katalogs (bereits sortiert übergeben) erhalten bleibt (ADR-027 D3).
export function gruppiereArtikel(artikel: readonly VerzehrArtikel[]): VerzehrArtikelGruppe[] {
  const indexByName = new Map<string, number>();
  const gruppen: { name: string; varianten: VerzehrArtikel[] }[] = [];

  for (const item of artikel) {
    const index = indexByName.get(item.name);
    if (index === undefined) {
      indexByName.set(item.name, gruppen.length);
      gruppen.push({ name: item.name, varianten: [item] });
    } else {
      gruppen[index].varianten.push(item);
    }
  }

  return gruppen;
}
