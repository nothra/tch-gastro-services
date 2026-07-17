import { and, eq, sql } from "drizzle-orm";
import { db } from "./index";
import {
  catalogItems,
  veranstaltungZeile,
  verzehrPosition,
  type CatalogCategory,
  type VerzehrPosition,
} from "./schema";

// Data-Layer der Verzehr-Erfassung (F5, #52, ADR-025). Einziger Ort mit Drizzle-Queries auf
// verzehr_position – Actions/UI greifen nie direkt zu (Separation of Concerns). Bewusst
// rollen-neutral; der RBAC-Guard sitzt in der Action (ADR-025 D6), damit F7 (#54) dieselbe
// Data-Layer mit einer token-scoped Action wiederverwenden kann.

// Eine Position je Zeile mit aufgelöstem Katalog-Preis/-Name/-Kategorie (Read-Time-Join,
// ADR-025 D2: Live-Katalog solange offen, kein Snapshot in F5). `active` macht den
// Soft-Delete-Status des Artikels explizit sichtbar (ADR-026 D1) – der Join selbst bleibt
// ohne `active`-Filter, die Preisauflösung gelingt weiterhin immer.
export type VerzehrPositionRow = {
  zeileId: string;
  catalogItemId: string;
  menge: number;
  name: string;
  priceCents: number;
  category: CatalogCategory;
  active: boolean;
};

// Atomarer Upsert mit Delta (ADR-025 D3): Der Client sendet nie ein absolutes `menge`, sondern
// ein Delta (±1). `menge + delta` wird in der DB unter Zeilensperre ausgewertet → kein Lost
// Update bei gleichzeitigen Schreibern. `GREATEST(0, …)` klemmt bei 0 (auch nebenläufig) und
// deckt „keine negativen Mengen" DB-seitig ab. Gibt die autoritative neue Menge zurück (das
// RETURNING); `Promise<T | undefined>`, da Upserts leer zurückkommen können (Codify #50).
export async function adjustMenge(
  zeileId: string,
  catalogItemId: string,
  delta: number,
): Promise<VerzehrPosition | undefined> {
  const [row] = await db
    .insert(verzehrPosition)
    .values({ zeileId, catalogItemId, menge: sql`GREATEST(0, ${delta})` })
    .onConflictDoUpdate({
      target: [verzehrPosition.zeileId, verzehrPosition.catalogItemId],
      set: {
        menge: sql`GREATEST(0, ${verzehrPosition.menge} + ${delta})`,
        updatedAt: new Date(),
      },
    })
    .returning();
  return row;
}

// Alle Positionen einer Veranstaltung (über ihre Zeilen) mit aufgelöstem Katalog. Gefiltert
// über veranstaltungId (nicht über zeileId) → eine Query für die ganze Teilnehmerliste.
export function listPositionen(veranstaltungId: string): Promise<VerzehrPositionRow[]> {
  return db
    .select({
      zeileId: verzehrPosition.zeileId,
      catalogItemId: verzehrPosition.catalogItemId,
      menge: verzehrPosition.menge,
      name: catalogItems.name,
      priceCents: catalogItems.priceCents,
      category: catalogItems.category,
      active: catalogItems.active,
    })
    .from(verzehrPosition)
    .innerJoin(veranstaltungZeile, eq(verzehrPosition.zeileId, veranstaltungZeile.id))
    .innerJoin(catalogItems, eq(verzehrPosition.catalogItemId, catalogItems.id))
    .where(eq(veranstaltungZeile.veranstaltungId, veranstaltungId));
}

// Existenz-Prüfung einer bestehenden Position (ADR-026 D2): erlaubt der Guard in
// `adjustVerzehrAction` eine Anpassung auf einem soft-gelöschten Artikel nur, wenn dafür
// bereits Verzehr erfasst wurde (kein Neu-Erfassen). Reiner Lese-Zugriff, `T | undefined`
// nach Codify #50.
export async function getPosition(
  zeileId: string,
  catalogItemId: string,
): Promise<VerzehrPosition | undefined> {
  const [row] = await db
    .select()
    .from(verzehrPosition)
    .where(and(eq(verzehrPosition.zeileId, zeileId), eq(verzehrPosition.catalogItemId, catalogItemId)))
    .limit(1);
  return row;
}
