import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { Client } from "pg";
import { db } from "./index";
import { catalog, catalogItems } from "./schema";
import {
  STANDARD_CATALOG_ID,
  createItem,
  getCatalogItem,
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
const createdCatalogs: string[] = [];

// ─────────────────────────────────────────────────────────────────────────────
// Drift-Guard: Konstante im Code gegen Literal in der Seed-Migration (ADR-050)
// ─────────────────────────────────────────────────────────────────────────────

// Der Standard-Katalog-Key lebt doppelt – als Konstante `STANDARD_CATALOG_ID` in db/catalog.ts
// und als Literal in der Seed-Migration (ADR-050, Trade-off unter „Negativ"). Ohne Guard driftet
// er lautlos: die Migration seedet 'standard', der Code fragt etwas anderes ab, und jede
// Katalog-Abfrage liefert leere Listen statt eines Fehlers.
const MIGRATION_FILE = "db/migrations/0012_catalog_als_entitaet.sql";
const STATEMENT_SEPARATOR = "--> statement-breakpoint";

// SQL-Anweisungen der Migration ohne Kommentarzeilen. Wirft absichtlich, wenn die Quelle fehlt
// oder unlesbar ist (Lesson „Kopplungs-/Drift-Guard", #214): ein stiller `[]`-Fallback würde
// jeden Anker unten wirkungslos machen und den Guard in ein Dauergrün verwandeln.
function migrationStatements(file = MIGRATION_FILE): string[] {
  return readFileSync(resolve(process.cwd(), file), "utf8")
    .split(STATEMENT_SEPARATOR)
    .map((block) =>
      block
        .split("\n")
        .filter((line) => !line.trimStart().startsWith("--"))
        .join("\n")
        .trim(),
    )
    .filter((statement) => statement.length > 0);
}

// Genau eine Anweisung mit diesem Präfix – mehr oder weniger ist ein Fehler, nicht ein Treffer.
function statementStartingWith(prefix: string, file = MIGRATION_FILE): string {
  const matches = migrationStatements(file).filter((statement) => statement.startsWith(prefix));
  expect(matches, `${file} enthält nicht genau eine Anweisung mit "${prefix}"`).toHaveLength(1);
  return matches[0];
}

describe("Standard-Katalog-Key: Konstante gegen Seed-Migration (ADR-050 D3)", () => {
  // Anker ist die VOLLE Anweisung, kein Fragment (Lesson #114 ff.): ein Fragment-Grep würde ein
  // geändertes Literal an anderer Stelle derselben Zeile übersehen.
  it("should_seedConstantAsCatalogId_when_migrationInsertsStandardCatalog", () => {
    expect(statementStartingWith('INSERT INTO "catalog"')).toBe(
      `INSERT INTO "catalog" ("id", "name", "sort_order") VALUES ('${STANDARD_CATALOG_ID}', 'Montagsrunde', 0) ON CONFLICT ("id") DO NOTHING;`,
    );
  });

  it("should_backfillWithConstant_when_migrationAssignsExistingItems", () => {
    expect(statementStartingWith('UPDATE "catalog_item"')).toBe(
      `UPDATE "catalog_item" SET "catalog_id" = '${STANDARD_CATALOG_ID}' WHERE "catalog_id" IS NULL;`,
    );
  });

  it("should_throw_when_migrationSourceUnreadable", () => {
    // Fail-closed: eine unlesbare Quelle darf nicht als „kein Drift" gelesen werden.
    expect(() => migrationStatements("db/migrations/diese-datei-gibt-es-nicht.sql")).toThrow();
  });

  it("should_throw_when_anchoredStatementAbsent", () => {
    // Belegt, dass der Anker wirklich gefordert wird – verschwindet die Anweisung aus der
    // Migration, schlägt der Guard fehl statt die fehlende Zeile stillschweigend zu erlauben.
    expect(() => statementStartingWith('INSERT INTO "gibt_es_nicht"')).toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Data-Layer (Integration)
// ─────────────────────────────────────────────────────────────────────────────

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

async function track(data: CatalogItemData, catalogId: string = STANDARD_CATALOG_ID) {
  const item = await createItem(catalogId, data);
  created.push(item.id);
  return item;
}

// Zweiter Katalog für die katalog-übergreifenden Fälle (AK4/AK6/FS5). Bis #345 gibt es keinen
// Pflege-Weg – der Test legt ihn deshalb direkt über die Data-Layer-Tabelle an.
async function trackCatalog(name: string) {
  const [row] = await db
    .insert(catalog)
    .values({ name: `${TEST_PREFIX}${name}` })
    .returning();
  createdCatalogs.push(row.id);
  return row;
}

// Einzelne Verbindung (kein Pool): nötig für die `SET search_path`-Sitzung im AK9-Replay und
// für den Roh-INSERT in FS1, der die typisierte Data-Layer-Grenze absichtlich umgeht.
async function withClient<T>(run: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    return await run(client);
  } finally {
    await client.end();
  }
}

describe.skipIf(!hasDb)("catalog data-layer (integration)", () => {
  afterEach(async () => {
    // Artikel vor Katalogen löschen – der Pflicht-FK ohne ON DELETE (ADR-050 D2) verbietet die
    // umgekehrte Reihenfolge.
    if (created.length > 0) {
      await db.delete(catalogItems).where(inArray(catalogItems.id, created.splice(0)));
    }
    if (createdCatalogs.length > 0) {
      await db.delete(catalog).where(inArray(catalog.id, createdCatalogs.splice(0)));
    }
  });

  it("should_persistAndListItem_when_created", async () => {
    const item = await track(drink("Testcola", { priceCents: 250 }));

    const all = await listCatalog(STANDARD_CATALOG_ID);
    const found = all.find((row) => row.id === item.id);
    expect(found).toBeDefined();
    expect(found?.priceCents).toBe(250);
    expect(found?.active).toBe(true);
    expect(found?.catalogId).toBe(STANDARD_CATALOG_ID);
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
    await setItemActive(item.id, STANDARD_CATALOG_ID, false);

    const active = await listActiveCatalog(STANDARD_CATALOG_ID);
    expect(active.some((row) => row.id === item.id)).toBe(false);

    await setItemActive(item.id, STANDARD_CATALOG_ID, true);
    const activeAgain = await listActiveCatalog(STANDARD_CATALOG_ID);
    expect(activeAgain.some((row) => row.id === item.id)).toBe(true);
  });

  it("should_updatePrice_when_updated", async () => {
    const item = await track(drink("PriceChange", { priceCents: 200 }));
    const updated = await updateItem(
      item.id,
      STANDARD_CATALOG_ID,
      drink("PriceChange", { priceCents: 350 }),
    );
    expect(updated?.priceCents).toBe(350);
  });

  it("should_containSeededReferenceList_when_freshlyMigrated", async () => {
    const all = await listCatalog(STANDARD_CATALOG_ID);
    const iso = all.find((row) => row.name === "ISO-Sportdrink" && row.size === "0,5 l");
    expect(iso, "Referenz-Preisliste sollte geseedet sein").toBeDefined();
    expect(iso?.priceCents).toBe(200);
    expect(all.some((row) => row.category === "kaffee")).toBe(true);
  });

  it("should_keepDeactivatedItemInFullCatalog_when_deactivated", async () => {
    // Spec-49: deaktivierter Artikel bleibt in der Verwalter-Ansicht (listCatalog)
    // sichtbar; nur listActiveCatalog (für die Erfassung) schließt ihn aus.
    const item = await track(drink("DeactivatedVisible"));
    await setItemActive(item.id, STANDARD_CATALOG_ID, false);

    const active = await listActiveCatalog(STANDARD_CATALOG_ID);
    expect(active.some((row) => row.id === item.id)).toBe(false);

    const all = await listCatalog(STANDARD_CATALOG_ID);
    const found = all.find((row) => row.id === item.id);
    expect(found, "Deaktivierter Artikel muss in listCatalog() erscheinen").toBeDefined();
    expect(found?.active).toBe(false);
  });

  // ── AK1 – Katalog-Entität ──────────────────────────────────────────────────

  it("should_exposeNameActiveAndSortOrder_when_catalogCreated", async () => {
    const k = await trackCatalog("AK1-Katalog");

    expect(k.name).toBe(`${TEST_PREFIX}AK1-Katalog`);
    expect(k.active).toBe(true);
    expect(k.sortOrder).toBe(0);
  });

  it("should_rejectSecondCatalog_when_nameAlreadyUsed", async () => {
    await trackCatalog("AK1-Unique");

    await expect(trackCatalog("AK1-Unique")).rejects.toThrow();
  });

  // ── AK2 – Standard-Katalog „Montagsrunde" mit allen Artikeln ───────────────

  it("should_haveSeededActiveStandardCatalog_when_migrated", async () => {
    const [standard] = await db.select().from(catalog).where(eq(catalog.id, STANDARD_CATALOG_ID));

    expect(standard, `Standard-Katalog '${STANDARD_CATALOG_ID}' muss geseedet sein`).toBeDefined();
    expect(standard.name).toBe("Montagsrunde");
    expect(standard.active).toBe(true);
  });

  it("should_assignEveryPreexistingItemToStandardCatalog_when_migrated", async () => {
    // Bestandsartikel = alles ohne Test-Präfix. Nach der Migration hängt jeder davon am
    // Standard-Katalog; ein Artikel ganz ohne Bezug ist durch NOT NULL bereits unmöglich (AK3).
    const bestand = (await db.select().from(catalogItems)).filter(
      (row) => !row.name.startsWith(TEST_PREFIX),
    );

    expect(bestand.length, "Es sollte geseedeten Bestand geben").toBeGreaterThan(0);
    expect(bestand.every((row) => row.catalogId === STANDARD_CATALOG_ID)).toBe(true);
  });

  // ── AK3 / FS1 – Katalogbezug ist DB-Pflicht ────────────────────────────────

  it("should_rejectItemWithoutCatalog_when_insertedBypassingDataLayer", async () => {
    // Roh-INSERT ohne catalog_id: prüft die DB-Zusicherung „fail-closed, unabhängig vom
    // Aufrufweg" (AK3/FS1) – die typisierte Data-Layer-Signatur allein belegt sie nicht.
    await withClient(async (client) => {
      await expect(
        client.query(
          `INSERT INTO "catalog_item" ("id", "name", "size", "price_cents", "category", "sort_order")
           VALUES ($1, $2, '', 100, 'getraenk', 0)`,
          [`${TEST_PREFIX}fs1`, `${TEST_PREFIX}OhneKatalog`],
        ),
      ).rejects.toThrow(/null value in column "catalog_id"|not-null/i);
    });
  });

  it("should_rejectItem_when_catalogDoesNotExist", async () => {
    // Referenzieller Teil von AK3: der Bezug muss auf einen existierenden Katalog zeigen.
    await expect(track(drink("FremderKatalog"), "gibt-es-nicht")).rejects.toThrow();
  });

  // ── AK4 – Duplikat-Regel gilt je Katalog (beide Richtungen) ────────────────

  // Nachfolger des spec-49-Tests „gleicher Name+Größe wird abgelehnt": die Regel gilt seit
  // ADR-050 D2 je Katalog, nicht mehr global. Der alte Test hatte denselben Rumpf und ist hier
  // aufgegangen, statt als zweite Variante daneben stehen zu bleiben.
  it("should_rejectDuplicate_when_sameNameAndSizeInSameCatalog", async () => {
    await track(drink("Bier", { size: "0,5 l" }));

    await expect(track(drink("Bier", { size: "0,5 l" }))).rejects.toThrow();
  });

  it("should_allowDuplicate_when_sameNameAndSizeInOtherCatalog", async () => {
    // Spiegel-Richtung zum Test darüber (Lesson „Spiegel-/Symmetrie-AK", #211): dieselbe
    // Kombination ist in einem ZWEITEN Katalog erlaubt – das ist der eigentliche Zweck von #59.
    const k2 = await trackCatalog("AK4-K2");
    const inStandard = await track(drink("Bier", { size: "0,5 l" }));

    const inK2 = await track(drink("Bier", { size: "0,5 l", priceCents: 400 }), k2.id);

    expect(inK2.id).not.toBe(inStandard.id);
    expect(inK2.catalogId).toBe(k2.id);
    expect(inK2.priceCents).toBe(400);
  });

  // ── AK5 – Umbenennen bricht nichts ─────────────────────────────────────────

  it("should_resolveUnchanged_when_standardCatalogRenamed", async () => {
    const item = await track(drink("RenameProbe"));
    const vorher = (await listActiveCatalog(STANDARD_CATALOG_ID)).map((row) => row.id);
    expect(vorher).toContain(item.id);

    await db
      .update(catalog)
      .set({ name: `${TEST_PREFIX}Montagsrunde 2026` })
      .where(eq(catalog.id, STANDARD_CATALOG_ID));
    try {
      // Die Auflösung wertet den Namen nicht aus (ADR-050 D3) – Auswahl bleibt identisch.
      expect((await listActiveCatalog(STANDARD_CATALOG_ID)).map((row) => row.id)).toEqual(vorher);
      expect((await listCatalog(STANDARD_CATALOG_ID)).some((row) => row.id === item.id)).toBe(true);
      expect(await getCatalogItem(item.id, STANDARD_CATALOG_ID)).toBeDefined();
    } finally {
      // Namen zurücksetzen: AK2 prüft ihn, und Tests dürfen nicht reihenfolge-abhängig werden.
      await db
        .update(catalog)
        .set({ name: "Montagsrunde" })
        .where(eq(catalog.id, STANDARD_CATALOG_ID));
    }
  });

  // ── AK6 – Artikel-Abfrage ist katalog-gebunden ─────────────────────────────

  it("should_returnUndefined_when_itemRequestedWithForeignCatalog", async () => {
    const k2 = await trackCatalog("AK6-K2");
    const item = await track(drink("NurInStandard"));

    expect(await getCatalogItem(item.id, k2.id)).toBeUndefined();
    // Diskriminierungs-Kontrolle: im eigenen Katalog ist derselbe Artikel ein Treffer – sonst
    // könnte das `undefined` oben auch von einem generell kaputten Lesepfad kommen.
    expect((await getCatalogItem(item.id, STANDARD_CATALOG_ID))?.id).toBe(item.id);
  });

  it("should_notList_when_itemBelongsToOtherCatalog", async () => {
    const k2 = await trackCatalog("AK6-Liste");
    const inK2 = await track(drink("NurInK2"), k2.id);

    expect((await listCatalog(STANDARD_CATALOG_ID)).some((row) => row.id === inK2.id)).toBe(false);
    expect((await listActiveCatalog(STANDARD_CATALOG_ID)).some((row) => row.id === inK2.id)).toBe(
      false,
    );
    expect((await listCatalog(k2.id)).some((row) => row.id === inK2.id)).toBe(true);
  });

  it("should_returnUndefinedAndNotWrite_when_updateAddressesForeignCatalog", async () => {
    const k2 = await trackCatalog("AK6-Update");
    const item = await track(drink("UpdateGuard", { priceCents: 200 }));

    const updated = await updateItem(item.id, k2.id, drink("UpdateGuard", { priceCents: 999 }));

    expect(updated).toBeUndefined();
    expect((await getCatalogItem(item.id, STANDARD_CATALOG_ID))?.priceCents).toBe(200);
  });

  it("should_returnUndefinedAndNotWrite_when_setActiveAddressesForeignCatalog", async () => {
    const k2 = await trackCatalog("AK6-SetActive");
    const item = await track(drink("ActiveGuard"));

    const changed = await setItemActive(item.id, k2.id, false);

    expect(changed).toBeUndefined();
    expect((await getCatalogItem(item.id, STANDARD_CATALOG_ID))?.active).toBe(true);
  });

  // ── FS4 – Soft-Delete bleibt katalog-gebunden auflösbar ────────────────────

  it("should_keepCatalogAssignment_when_itemDeactivated", async () => {
    const item = await track(drink("SoftDeleteBezug"));

    await setItemActive(item.id, STANDARD_CATALOG_ID, false);

    const geladen = await getCatalogItem(item.id, STANDARD_CATALOG_ID);
    expect(geladen?.active).toBe(false);
    expect(geladen?.catalogId).toBe(STANDARD_CATALOG_ID);
  });

  // ── FS5 – Referenz-Schutz ──────────────────────────────────────────────────

  it("should_rejectCatalogDeletion_when_itemsStillAssigned", async () => {
    const k2 = await trackCatalog("FS5-K2");
    await track(drink("HaengtDran"), k2.id);

    // Kein ON DELETE (ADR-050 D2): der FK ist der Guard, es kann keinen Artikel ohne Katalog geben.
    await expect(db.delete(catalog).where(eq(catalog.id, k2.id))).rejects.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AK9 – Wiederholbarkeit der Daten-Schritte der Migration
// ─────────────────────────────────────────────────────────────────────────────

// Ein zweites `db:migrate` führt 0012 wegen des drizzle-Journals gar nicht erneut aus – es wäre
// also kein Beleg. Geprüft wird stattdessen genau das, was das Journal NICHT abdeckt: die beiden
// Daten-Anweisungen (`ON CONFLICT DO NOTHING`, `WHERE catalog_id IS NULL`) laufen zweimal über
// denselben Bestand, ohne einen zweiten Standard-Katalog oder eine Umzuordnung zu erzeugen.
// Die Anweisungen werden dabei UNVERÄNDERT aus der Migrationsdatei gelesen; ein Wegwerf-Schema
// plus `search_path` ohne `public` hält sie fail-closed von den echten Tabellen fern.
describe.skipIf(!hasDb)("Migration 0012: Daten-Schritte sind wiederholbar (AK9)", () => {
  it("should_keepSingleStandardCatalogAndAssignments_when_dataStatementsRunTwice", async () => {
    const seed = statementStartingWith('INSERT INTO "catalog"');
    const backfill = statementStartingWith('UPDATE "catalog_item"');
    const schemaName = `__test_ak9_${Date.now()}`;

    await withClient(async (client) => {
      await client.query(`CREATE SCHEMA "${schemaName}"`);
      try {
        // search_path OHNE public: würde eine Anweisung doch auf die echten Tabellen zielen,
        // schlägt sie fehl statt still Produktionsdaten zu verändern.
        await client.query(`SET search_path TO "${schemaName}"`);
        await client.query(`CREATE TABLE "catalog" (
          "id" text PRIMARY KEY,
          "name" text NOT NULL UNIQUE,
          "sort_order" integer NOT NULL DEFAULT 0
        )`);
        await client.query(`CREATE TABLE "catalog_item" (
          "id" text PRIMARY KEY,
          "name" text NOT NULL,
          "catalog_id" text REFERENCES "catalog"("id")
        )`);
        await client.query(`INSERT INTO "catalog_item" ("id", "name") VALUES ('bestand', 'Cola')`);

        const runDataSteps = async () => {
          await client.query(seed);
          await client.query(backfill);
        };
        // Namen je id – unabhängig von der Sortier-Collation des Servers.
        const katalogNamen = async (): Promise<Record<string, string>> =>
          Object.fromEntries(
            (await client.query(`SELECT "id", "name" FROM "catalog"`)).rows.map(
              (row: { id: string; name: string }) => [row.id, row.name],
            ),
          );
        const zuordnung = async (id: string) =>
          (await client.query(`SELECT "catalog_id" FROM "catalog_item" WHERE "id" = $1`, [id]))
            .rows[0].catalog_id;

        // Erster Lauf: Standard-Katalog entsteht, Bestandsartikel wird zugeordnet.
        await runDataSteps();
        expect(await katalogNamen()).toEqual({ [STANDARD_CATALOG_ID]: "Montagsrunde" });
        expect(await zuordnung("bestand")).toBe(STANDARD_CATALOG_ID);

        // Echte Divergenz vor dem Zielfall (Lesson #253): ohne sie könnte der zweite Lauf
        // „nichts kaputt gemacht" nicht von „nichts zu tun gehabt" unterschieden werden.
        // Umbenennen + Umzuordnen sind genau die zwei Zustände, die ein Re-Apply zerstören würde.
        await client.query(`UPDATE "catalog" SET "name" = 'Montagsrunde 2026'`);
        await client.query(`INSERT INTO "catalog" ("id", "name") VALUES ('zweiter', 'Dorffest')`);
        await client.query(`UPDATE "catalog_item" SET "catalog_id" = 'zweiter'`);
        // Neuer, noch unzugeordneter Artikel: Positivkontrolle, dass der Backfill im zweiten
        // Lauf überhaupt noch greift – sonst wäre „nichts verändert" trivial erfüllt.
        await client.query(`INSERT INTO "catalog_item" ("id", "name") VALUES ('neu', 'Fanta')`);

        // Zweiter Lauf.
        await runDataSteps();

        // Kein zweiter Standard-Katalog (ON CONFLICT DO NOTHING) und kein zurückgesetzter Name.
        expect(await katalogNamen()).toEqual({
          [STANDARD_CATALOG_ID]: "Montagsrunde 2026",
          zweiter: "Dorffest",
        });
        expect(await zuordnung("bestand"), "bestehende Zuordnung bleibt unangetastet").toBe(
          "zweiter",
        );
        expect(await zuordnung("neu"), "unzugeordneter Artikel wird noch zugeordnet").toBe(
          STANDARD_CATALOG_ID,
        );
      } finally {
        await client.query(`SET search_path TO public`);
        await client.query(`DROP SCHEMA "${schemaName}" CASCADE`);
      }
    });
  });
});
