import { and, asc, eq } from "drizzle-orm";
import { db } from "./index";
import { catalogItems, type CatalogItem, type NewCatalogItem } from "./schema";

// Data-Layer des Getränke-Katalogs (F2, #49). Einziger Ort mit Drizzle-Queries auf
// catalog_item – Actions/UI greifen nie direkt auf die Tabelle zu (PROJECT-CONTEXT,
// Separation of Concerns). Preise sind hier immer ganzzahlige Cent (ADR-021).
// Seit #59 ist jeder Zugriff katalog-gebunden: der Katalog ist das Preis-Template
// (ADR-050 D1), `catalogId` ist überall Pflichtparameter ohne Default (ADR-050 D4) –
// so findet der Compiler in #346 jede Aufrufstelle, die auf den Veranstaltungs-Katalog
// umzustellen ist. Ein Default-Wert würde genau diese Prüfung ausschalten.

// Stabiler Text-Key des von der Migration geseedeten Standard-Katalogs (ADR-050 D3).
// Der Key kodiert den Namen bewusst NICHT – ein Umbenennen des Katalogs ist damit
// folgenlos (spec-59 AK5). Übergangsmechanik: fällt mit #346 aus den Aufrufpfaden.
// Das Literal liegt zusätzlich in der Seed-Migration; ein Drift-Guard in catalog.test.ts
// hält beide gegeneinander.
export const STANDARD_CATALOG_ID = "standard";

const catalogOrder = [asc(catalogItems.sortOrder), asc(catalogItems.name), asc(catalogItems.size)];

// Vollständiger Katalog inkl. deaktivierter Artikel – für die Verwalter-Pflegeansicht.
export function listCatalog(catalogId: string): Promise<CatalogItem[]> {
  return db
    .select()
    .from(catalogItems)
    .where(eq(catalogItems.catalogId, catalogId))
    .orderBy(...catalogOrder);
}

// Nur aktive Artikel – für die Auswahl in der Verzehrerfassung und an der Theke (F5/F7).
// Filtert bewusst nur `catalog_item.active`, nicht `catalog.active` (ADR-050 D7).
export function listActiveCatalog(catalogId: string): Promise<CatalogItem[]> {
  return db
    .select()
    .from(catalogItems)
    .where(and(eq(catalogItems.catalogId, catalogId), eq(catalogItems.active, true)))
    .orderBy(...catalogOrder);
}

// Einzelner Artikel per id – u. a. für die Preis-/Aktiv-Prüfung an der Verzehr-Action-Grenze
// (F5, ADR-025 D6): die Action lädt den Artikel und prüft `active` (Soft-Delete, Codify #51).
// Der Katalog-Schlüssel gehört ins WHERE, nicht nur der Primärschlüssel (Parent-Key,
// Kern-Kurzregel 2): ein Artikel aus einem fremden Katalog ist kein Treffer.
export async function getCatalogItem(
  id: string,
  catalogId: string,
): Promise<CatalogItem | undefined> {
  const [row] = await db
    .select()
    .from(catalogItems)
    .where(and(eq(catalogItems.id, id), eq(catalogItems.catalogId, catalogId)))
    .limit(1);
  return row;
}

// `catalogId` ist aus den Schreibdaten heraus-`Omit`tet (ADR-050 D4): er wird serverseitig
// gesetzt und nie aus `FormData` geparst – das Zod-Schema der Katalogpflege bleibt unverändert
// (spec-59 AK7), und ein Client kann keinen fremden Katalog als Schreibziel angeben.
export type CatalogItemData = Omit<
  NewCatalogItem,
  "id" | "catalogId" | "createdAt" | "updatedAt" | "active"
>;

export async function createItem(
  catalogId: string,
  data: CatalogItemData,
): Promise<CatalogItem> {
  const [created] = await db
    .insert(catalogItems)
    .values({ ...data, catalogId })
    .returning();
  return created;
}

// Rückgabe `CatalogItem | undefined`: bei No-Match ist das `.returning()`-Array leer
// (Kern-Kurzregel 1) – seit #59 auch dann, wenn der Artikel in einem anderen Katalog liegt.
export async function updateItem(
  id: string,
  catalogId: string,
  data: CatalogItemData,
): Promise<CatalogItem | undefined> {
  const [updated] = await db
    .update(catalogItems)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(catalogItems.id, id), eq(catalogItems.catalogId, catalogId)))
    .returning();
  return updated;
}

// Deaktivieren/Reaktivieren statt hartem Löschen (spec-49): historische Veranstaltungen behalten
// den Artikel, neue Erfassungen sehen nur aktive.
export async function setItemActive(
  id: string,
  catalogId: string,
  active: boolean,
): Promise<CatalogItem | undefined> {
  const [updated] = await db
    .update(catalogItems)
    .set({ active, updatedAt: new Date() })
    .where(and(eq(catalogItems.id, id), eq(catalogItems.catalogId, catalogId)))
    .returning();
  return updated;
}
