import { afterEach, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";
import { db } from "./index";
import { catalogItems } from "./schema";
import {
  createItem,
  listActiveCatalog,
  listCatalog,
  setItemActive,
  updateItem,
  type CatalogItemData,
} from "./catalog";

// Integrationstests gegen eine echte, migrierte Postgres-DB. Voraussetzung:
// `pnpm db:up` + `pnpm db:migrate` (DATABASE_URL gesetzt). In CI ohne DB werden sie
// übersprungen – die reine Logik (money.ts, Zod-Schema, Actions) ist dort mockfrei
// abgedeckt. Tests sind nicht-destruktiv: sie räumen nur die selbst angelegten Zeilen
// per id wieder ab und lassen den geseedeten Referenzbestand unangetastet.
const hasDb = Boolean(process.env.DATABASE_URL);

// Präfix, damit Testdaten nie mit echten/geseedeten Bezeichnungen kollidieren.
const TEST_PREFIX = "__test__";
const created: string[] = [];

function drink(name: string, overrides: Partial<CatalogItemData> = {}): CatalogItemData {
  return {
    name: `${TEST_PREFIX}${name}`,
    size: "0,5 l",
    priceCents: 200,
    category: "getraenk",
    sortOrder: 0,
    ...overrides,
  };
}

async function track(data: CatalogItemData) {
  const item = await createItem(data);
  created.push(item.id);
  return item;
}

describe.skipIf(!hasDb)("catalog data-layer (integration)", () => {
  afterEach(async () => {
    if (created.length > 0) {
      await db.delete(catalogItems).where(inArray(catalogItems.id, created.splice(0)));
    }
  });

  it("should_persistAndListItem_when_created", async () => {
    const item = await track(drink("Testcola", { priceCents: 250 }));

    const all = await listCatalog();
    const found = all.find((row) => row.id === item.id);
    expect(found).toBeDefined();
    expect(found?.priceCents).toBe(250);
    expect(found?.active).toBe(true);
  });

  it("should_rejectDuplicate_when_sameNameAndSize", async () => {
    await track(drink("DupItem"));
    await expect(track(drink("DupItem"))).rejects.toThrow();
  });

  it("should_allowMultipleCoffees_when_sameEmptySizeDifferentNames", async () => {
    const coffee = await track(drink("Kaffee", { size: "", category: "kaffee", priceCents: 100 }));
    const cappuccino = await track(
      drink("Cappuccino", { size: "", category: "kaffee", priceCents: 180 }),
    );
    expect(coffee.id).not.toBe(cappuccino.id);
  });

  it("should_excludeInactive_when_listingActiveCatalog", async () => {
    const item = await track(drink("ToDeactivate"));
    await setItemActive(item.id, false);

    const active = await listActiveCatalog();
    expect(active.some((row) => row.id === item.id)).toBe(false);

    await setItemActive(item.id, true);
    const activeAgain = await listActiveCatalog();
    expect(activeAgain.some((row) => row.id === item.id)).toBe(true);
  });

  it("should_updatePrice_when_updated", async () => {
    const item = await track(drink("PriceChange", { priceCents: 200 }));
    const updated = await updateItem(item.id, drink("PriceChange", { priceCents: 350 }));
    expect(updated.priceCents).toBe(350);
  });

  it("should_containSeededReferenceList_when_freshlyMigrated", async () => {
    const all = await listCatalog();
    const iso = all.find((row) => row.name === "ISO-Sportdrink" && row.size === "0,5 l");
    expect(iso, "Referenz-Preisliste sollte geseedet sein").toBeDefined();
    expect(iso?.priceCents).toBe(200);
    expect(all.some((row) => row.category === "kaffee")).toBe(true);
  });

  it("should_keepDeactivatedItemInFullCatalog_when_deactivated", async () => {
    // Spec-49: deaktivierter Artikel bleibt in der Verwalter-Ansicht (listCatalog)
    // sichtbar; nur listActiveCatalog (für neue Abende) schließt ihn aus.
    const item = await track(drink("DeactivatedVisible"));
    await setItemActive(item.id, false);

    const active = await listActiveCatalog();
    expect(active.some((row) => row.id === item.id)).toBe(false);

    const all = await listCatalog();
    const found = all.find((row) => row.id === item.id);
    expect(found, "Deaktivierter Artikel muss in listCatalog() erscheinen").toBeDefined();
    expect(found?.active).toBe(false);
  });
});
