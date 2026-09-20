import { and, asc, eq } from "drizzle-orm";
import { db } from "./index";
import { catalog, catalogItems, type CatalogItem, type NewCatalogItem, type Catalog } from "./schema";

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

export async function createItem(catalogId: string, data: CatalogItemData): Promise<CatalogItem> {
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

// ─────────────────────────────────────────────────────────────────────────────
// Katalog-CRUD (#345): Preislisten verwalten
// ─────────────────────────────────────────────────────────────────────────────

// Alle Kataloge (aktiv + inaktiv), sortiert für den Umschalter in der Verwaltung (AK1, AK3, AK6).
// Der Sortier-Standard ist etabliert: `sortOrder` für die Admin-Reihenfolge, `name` als Fallback
// für alphabetische Ordnung (dieselbe Reihenfolge wie `catalogOrder` für Artikel, ADR-050).
export function listCatalogs(): Promise<Catalog[]> {
  return db.select().from(catalog).orderBy(asc(catalog.sortOrder), asc(catalog.name));
}

// Nur aktive Kataloge für die Duplizier-Quellenauswahl (AK5). Diese Funktion ist auch die
// serverseitige Durchsetzung (Defense in Depth): ein unbekannter oder inaktiver Katalog
// wird in der Duplizier-Action abgelehnt.
export function listDuplicatableCatalogs(): Promise<Catalog[]> {
  return db
    .select()
    .from(catalog)
    .where(eq(catalog.active, true))
    .orderBy(asc(catalog.sortOrder), asc(catalog.name));
}

// Neuen Katalog anlegen (AK1). Unique-Violation auf `catalog.name` wird in der Server Action
// via `runWithUniqueCheck` zu einer Nutzermeldung übersetzt (FS1).
export async function createCatalog(name: string): Promise<Catalog> {
  const [created] = await db
    .insert(catalog)
    .values({ name, active: true, sortOrder: 0 })
    .returning();
  return created;
}

// Katalog umbenennen (AK3). Unique-Violation auf `catalog.name` wird in der Server Action
// via `runWithUniqueCheck` zu einer Nutzermeldung übersetzt (FS1). `undefined` bei No-Match
// ist Kern-Kurzregel 1 (Lesson #55): guarded UPDATE, Rückgabewert auswerten (FS2).
export async function renameCatalog(
  id: string,
  name: string,
): Promise<Catalog | undefined> {
  const [updated] = await db
    .update(catalog)
    .set({ name, updatedAt: new Date() })
    .where(eq(catalog.id, id))
    .returning();
  return updated;
}

// Katalog deaktivieren/reaktivieren (AK4). Soft-Delete analog `catalogItems.active`.
// `undefined` bei No-Match (FS2).
export async function setCatalogActive(
  id: string,
  active: boolean,
): Promise<Catalog | undefined> {
  const [updated] = await db
    .update(catalog)
    .set({ active, updatedAt: new Date() })
    .where(eq(catalog.id, id))
    .returning();
  return updated;
}

// Katalog duplizieren (AK2): neuer Katalog + nur aktive Artikel kopieren. Beide Schritte
// (Katalog + Artikel) gehören in eine Transaktion (ADR-050 D4), damit kein halb-befüllter
// Katalog zurückbleibt, falls die Kopie mitten in der Schleife abbricht. Unique-Violation
// auf den neuen Katalog wird in der Server Action via `runWithUniqueCheck` übersetzt (FS1).
export async function duplicateCatalog(
  sourceId: string,
  newName: string,
): Promise<{ catalog: Catalog; itemCount: number }> {
  return db.transaction(async (tx) => {
    // Neuer Katalog
    const [newCatalog] = await tx
      .insert(catalog)
      .values({ name: newName, active: true, sortOrder: 0 })
      .returning();

    // Nur aktive Artikel aus der Quelle kopieren (AK2)
    const sourceItems = await tx
      .select()
      .from(catalogItems)
      .where(and(eq(catalogItems.catalogId, sourceId), eq(catalogItems.active, true)));

    // Artikel in den neuen Katalog kopieren – keine Bulk-Operation nötig, die Artikelanzahl
    // ist klein (ADR-050 „Performance & Skalierung", Nichtanforderung).
    for (const item of sourceItems) {
      await tx.insert(catalogItems).values({
        name: item.name,
        size: item.size,
        priceCents: item.priceCents,
        category: item.category,
        sortOrder: item.sortOrder,
        catalogId: newCatalog.id,
      });
    }

    return {
      catalog: newCatalog,
      itemCount: sourceItems.length,
    };
  });
}
