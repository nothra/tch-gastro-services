import type { CatalogItem, VeranstaltungZeile } from "@/db/schema";
import type { VerzehrArtikel } from "./artikel-anzeige";
import type { VerzehrZeile } from "./VerzehrErfassung";

// Adapter von DB-Zeilen (VeranstaltungZeile, CatalogItem) auf die route-neutralen
// VerzehrErfassung-Props: reduziert die geladenen Spalten auf die Anzeige-relevanten Felder.
// Gemeinsam genutzt von der authentifizierten F5-Seite und der token-scoped F7-Selbstbedienung
// (Codify #105: geteilter Code gehört in ein neutrales Modul, nicht dupliziert je Aufrufer).

export function toVerzehrZeilen(zeilen: readonly VeranstaltungZeile[]): VerzehrZeile[] {
  return zeilen.map((zeile) => ({ id: zeile.id, anzeigename: zeile.anzeigename }));
}

export function toVerzehrArtikelListe(artikel: readonly CatalogItem[]): VerzehrArtikel[] {
  return artikel.map((item) => ({
    id: item.id,
    name: item.name,
    size: item.size,
    priceCents: item.priceCents,
    category: item.category,
  }));
}
