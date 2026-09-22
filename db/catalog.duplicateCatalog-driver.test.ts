import { beforeEach, describe, expect, it, vi } from "vitest";
import { catalog, catalogItems, type Catalog, type CatalogItem } from "./schema";

// Review-Finding #345 Runde 2 (Kritisch): `duplicateCatalog` rief bisher `db.transaction()`
// direkt auf, statt der projektweiten Atomaritäts-Klammer `runAtomic` (db/atomic.ts). Der in
// INT/PRD verwendete Neon-HTTP-Treiber unterstützt aber keine interaktive `.transaction()`
// (wirft dort unconditional, siehe db/atomic.ts-Kommentar) – AK2 schlug damit in der
// Zielumgebung bei JEDEM Aufruf fehl, obwohl die Integrationstests in catalog.test.ts (laufen
// über node-postgres, DEV/CI) grün blieben. Ein reiner Integrationstest kann diese
// treiber-spezifische Diskrepanz nicht aufdecken (node-postgres unterstützt `.transaction()`
// echt) – deshalb hier ein gezielter Mock-Test auf Modulebene, der beweist, dass
// `duplicateCatalog` über `runAtomic` läuft statt `db.transaction()` direkt aufzurufen.
//
// `db/catalog.test.ts` bleibt ein reiner Integrationstest (hasDb-Gate, echte DB) – ein
// `vi.mock("./index")` in derselben Datei würde dessen reale DB-Zugriffe für alle Tests der
// Datei kaputt machen. Diese treiber-fokussierte Prüfung braucht deshalb eine eigene Datei.

const runAtomicMock = vi.fn();
vi.mock("./atomic", () => ({ runAtomic: runAtomicMock }));

// `db.transaction` fehlt in diesem Fake absichtlich als funktionierende Methode: ruft
// `duplicateCatalog` sie dennoch auf (die alte Implementierung), schlägt der Aufruf fehl statt
// still durchzulaufen – das macht die alte Implementierung hier zuverlässig RED.
const dbTransactionMock = vi.fn(() => {
  throw new Error(
    "db.transaction() darf hier nicht aufgerufen werden – Neon-HTTP unterstützt das nicht " +
      "(siehe db/atomic.ts). duplicateCatalog muss runAtomic verwenden.",
  );
});

const sourceItems: CatalogItem[] = [
  {
    id: "item-active",
    catalogId: "source-catalog",
    name: "Bier",
    size: "0.5l",
    priceCents: 250,
    category: "getraenk",
    sortOrder: 0,
    active: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  },
];

const selectWhereMock = vi.fn().mockResolvedValue(sourceItems);
const selectFromMock = vi.fn(() => ({ where: selectWhereMock }));
const dbSelectMock = vi.fn(() => ({ from: selectFromMock }));

vi.mock("./index", () => ({
  db: {
    transaction: dbTransactionMock,
    select: dbSelectMock,
  },
}));

const newCatalogRow: Catalog = {
  id: "new-catalog-id",
  name: "Kopie",
  active: true,
  sortOrder: 0,
  createdAt: new Date("2026-01-02T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
};

// Fake-Executor für den `runAtomic`-Build-Callback: verhält sich wie `db`/`tx` aus
// SqlExecutor (nur `insert` wird von `duplicateCatalog` benötigt), zeichnet aber jeden
// `insert(...).values(...)`-Aufruf auf, damit die Query-Liste inspiziert werden kann.
function makeExec() {
  const insertCalls: { table: unknown; values: unknown }[] = [];
  const insert = vi.fn((table: unknown) => ({
    values: vi.fn((values: unknown) => {
      insertCalls.push({ table, values });
      if (table === catalog) {
        return { returning: vi.fn().mockResolvedValue([newCatalogRow]) };
      }
      // catalogItems-Inserts nutzen kein `.returning()` – das `values(...)`-Ergebnis muss
      // trotzdem selbst awaitbar sein, weil es direkt als Array-Element in `runAtomic`s
      // Query-Liste steht (analog `abschliessenVeranstaltung` in db/veranstaltung.ts).
      return Promise.resolve(undefined);
    }),
  }));
  return { exec: { insert }, insertCalls };
}

beforeEach(() => {
  vi.clearAllMocks();
  selectWhereMock.mockResolvedValue(sourceItems);
  dbTransactionMock.mockImplementation(() => {
    throw new Error(
      "db.transaction() darf hier nicht aufgerufen werden – Neon-HTTP unterstützt das nicht.",
    );
  });
});

describe("duplicateCatalog – Treiber-Kompatibilität (Review #345 Runde 2, Kritisch)", () => {
  it("should_useRunAtomic_notDbTransaction_when_duplicatingCatalog", async () => {
    const { exec, insertCalls } = makeExec();
    runAtomicMock.mockImplementation(
      async (build: (exec: unknown) => readonly PromiseLike<unknown>[]) => {
        const queries = build(exec);
        return Promise.all(queries);
      },
    );

    const { duplicateCatalog } = await import("./catalog");
    const result = await duplicateCatalog("source-catalog", "Kopie");

    // Kern der Regression: runAtomic wird genutzt, db.transaction() nie direkt aufgerufen.
    expect(runAtomicMock).toHaveBeenCalledTimes(1);
    expect(dbTransactionMock).not.toHaveBeenCalled();

    // Die Query-Liste enthält den neuen Katalog-Insert plus einen Insert je aktivem Artikel.
    expect(insertCalls).toHaveLength(1 + sourceItems.length);
    expect(insertCalls[0].table).toBe(catalog);
    expect(insertCalls[1].table).toBe(catalogItems);

    const newCatalogValues = insertCalls[0].values as { id: string; name: string };
    const itemValues = insertCalls[1].values as { catalogId: string; name: string };
    expect(newCatalogValues).toMatchObject({ name: "Kopie", active: true, sortOrder: 0 });
    // Client-seitig vorab erzeugte Id (`$defaultFn`, db/schema.ts) verbindet beide Inserts –
    // genau der Mechanismus, der `duplicateCatalog` ohne interaktive `.transaction()` erlaubt.
    expect(itemValues.catalogId).toBe(newCatalogValues.id);
    expect(itemValues).toMatchObject({
      name: "Bier",
      size: "0.5l",
      priceCents: 250,
      category: "getraenk",
    });

    expect(result).toEqual({ catalog: newCatalogRow, itemCount: sourceItems.length });
  });
});
