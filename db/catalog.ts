import { asc, eq } from "drizzle-orm";
import { db } from "./index";
import { catalogItems, type CatalogItem, type NewCatalogItem } from "./schema";

// Data-Layer des Getränke-Katalogs (F2, #49). Einziger Ort mit Drizzle-Queries auf
// catalog_item – Actions/UI greifen nie direkt auf die Tabelle zu (PROJECT-CONTEXT,
// Separation of Concerns). Preise sind hier immer ganzzahlige Cent (ADR-021).

const catalogOrder = [asc(catalogItems.sortOrder), asc(catalogItems.name), asc(catalogItems.size)];

// Vollständiger Katalog inkl. deaktivierter Artikel – für die Verwalter-Pflegeansicht.
export function listCatalog(): Promise<CatalogItem[]> {
  return db
    .select()
    .from(catalogItems)
    .orderBy(...catalogOrder);
}

// Nur aktive Artikel – für die Auswahl in neuen Abenden (F4/F5).
export function listActiveCatalog(): Promise<CatalogItem[]> {
  return db
    .select()
    .from(catalogItems)
    .where(eq(catalogItems.active, true))
    .orderBy(...catalogOrder);
}

// Einzelner Artikel per id – u. a. für die Preis-/Aktiv-Prüfung an der Verzehr-Action-Grenze
// (F5, ADR-025 D6): die Action lädt den Artikel und prüft `active` (Soft-Delete, Codify #51).
export async function getCatalogItem(id: string): Promise<CatalogItem | undefined> {
  const [row] = await db.select().from(catalogItems).where(eq(catalogItems.id, id)).limit(1);
  return row;
}

export type CatalogItemData = Omit<NewCatalogItem, "id" | "createdAt" | "updatedAt" | "active">;

export async function createItem(data: CatalogItemData): Promise<CatalogItem> {
  const [created] = await db.insert(catalogItems).values(data).returning();
  return created;
}

export async function updateItem(id: string, data: CatalogItemData): Promise<CatalogItem> {
  const [updated] = await db
    .update(catalogItems)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(catalogItems.id, id))
    .returning();
  return updated;
}

// Deaktivieren/Reaktivieren statt hartem Löschen (spec-49): historische Abende behalten
// den Artikel, neue Abende sehen nur aktive.
export async function setItemActive(id: string, active: boolean): Promise<CatalogItem> {
  const [updated] = await db
    .update(catalogItems)
    .set({ active, updatedAt: new Date() })
    .where(eq(catalogItems.id, id))
    .returning();
  return updated;
}
