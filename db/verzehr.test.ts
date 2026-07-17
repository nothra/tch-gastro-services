import { afterEach, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";
import { db } from "./index";
import { catalogItems, teilnehmer, veranstaltung } from "./schema";
import { createItem } from "./catalog";
import { createTeilnehmer } from "./teilnehmer";
import { addZeile, createVeranstaltung } from "./veranstaltung";
import { adjustMenge, listPositionen } from "./verzehr";

// Integrationstests gegen eine echte, migrierte Postgres-DB (analog veranstaltung.test.ts).
// Voraussetzung: `pnpm db:up` + `pnpm db:migrate`. Ohne DB in CI übersprungen. Nicht-destruktiv:
// nur selbst angelegte Zeilen abgeräumt (verzehr_position via ON DELETE CASCADE der Zeile).
const hasDb = Boolean(process.env.DATABASE_URL);

const TEST_PREFIX = "__test__";
const createdVeranstaltungen: string[] = [];
const createdTeilnehmer: string[] = [];
const createdItems: string[] = [];

async function trackVeranstaltung() {
  const row = await createVeranstaltung({
    bezeichnung: `${TEST_PREFIX}Verzehr`,
    datum: new Date("2026-07-13"),
    kasse: "montagsrunde",
  });
  createdVeranstaltungen.push(row.id);
  return row;
}

async function trackTeilnehmer(name: string) {
  const row = await createTeilnehmer({ name: `${TEST_PREFIX}${name}`, typ: "person", mitglied: false });
  createdTeilnehmer.push(row.id);
  return row;
}

async function trackItem(name: string, priceCents: number, category: "getraenk" | "kaffee" | "essen") {
  const row = await createItem({ name: `${TEST_PREFIX}${name}`, size: "", priceCents, category, sortOrder: 0 });
  createdItems.push(row.id);
  return row;
}

describe.skipIf(!hasDb)("verzehr data-layer (integration)", () => {
  afterEach(async () => {
    if (createdVeranstaltungen.length > 0) {
      await db.delete(veranstaltung).where(inArray(veranstaltung.id, createdVeranstaltungen.splice(0)));
    }
    if (createdTeilnehmer.length > 0) {
      await db.delete(teilnehmer).where(inArray(teilnehmer.id, createdTeilnehmer.splice(0)));
    }
    if (createdItems.length > 0) {
      await db.delete(catalogItems).where(inArray(catalogItems.id, createdItems.splice(0)));
    }
  });

  async function setup() {
    const v = await trackVeranstaltung();
    const person = await trackTeilnehmer("Anna");
    const zeile = await addZeile(v.id, person);
    return { v, zeile };
  }

  it("should_createPositionWithMenge1_when_firstIncrement", async () => {
    const { zeile } = await setup();
    const item = await trackItem("Cola", 250, "getraenk");

    const row = await adjustMenge(zeile.id, item.id, 1);

    expect(row?.menge).toBe(1);
  });

  it("should_accumulateMenge_when_incrementedRepeatedly", async () => {
    const { zeile } = await setup();
    const item = await trackItem("Bier", 300, "getraenk");

    await adjustMenge(zeile.id, item.id, 1);
    await adjustMenge(zeile.id, item.id, 1);
    const row = await adjustMenge(zeile.id, item.id, 1);

    expect(row?.menge).toBe(3);
  });

  it("should_createZeroMenge_when_firstCallIsNegativeDelta", async () => {
    // FS1: Erste Operation mit delta=-1 (noch keine Zeile existiert).
    // INSERT-Pfad: menge = GREATEST(0, delta) = GREATEST(0, -1) = 0.
    // Würde GREATEST aus dem INSERT-Values entfernt, entstünde menge=-1 → DB-CHECK-Verletzung
    // oder, ohne CHECK, ein negativer Wert. Dieses Test sichert den INSERT-Branch ab.
    const { zeile } = await setup();
    const item = await trackItem("Saft", 200, "getraenk");

    const row = await adjustMenge(zeile.id, item.id, -1);

    expect(row?.menge).toBe(0);
  });

  it("should_clampAtZero_when_decrementedBelowZero", async () => {
    const { zeile } = await setup();
    const item = await trackItem("Wasser", 150, "getraenk");

    await adjustMenge(zeile.id, item.id, 1);
    const row = await adjustMenge(zeile.id, item.id, -1);
    const stillZero = await adjustMenge(zeile.id, item.id, -1);

    expect(row?.menge).toBe(0);
    expect(stillZero?.menge).toBe(0);
  });

  it("should_keepBothChanges_when_separatePositions", async () => {
    const { v, zeile } = await setup();
    const cola = await trackItem("Cola", 250, "getraenk");
    const kaffee = await trackItem("Kaffee", 100, "kaffee");

    await adjustMenge(zeile.id, cola.id, 1);
    await adjustMenge(zeile.id, kaffee.id, 1);

    const positionen = await listPositionen(v.id);
    expect(positionen.find((p) => p.catalogItemId === cola.id)?.menge).toBe(1);
    expect(positionen.find((p) => p.catalogItemId === kaffee.id)?.menge).toBe(1);
  });

  it("should_joinPriceAndCategory_when_listingPositionen", async () => {
    const { v, zeile } = await setup();
    const essen = await trackItem("Schnitzel", 890, "essen");
    await adjustMenge(zeile.id, essen.id, 2);

    const positionen = await listPositionen(v.id);
    const eintrag = positionen.find((p) => p.catalogItemId === essen.id);

    expect(eintrag).toMatchObject({ zeileId: zeile.id, menge: 2, priceCents: 890, category: "essen" });
    expect(eintrag?.name).toContain("Schnitzel");
  });

  it("should_onlyReturnPositionsOfGivenVeranstaltung_when_listing", async () => {
    const { v, zeile } = await setup();
    const item = await trackItem("Cola", 250, "getraenk");
    await adjustMenge(zeile.id, item.id, 1);

    const fremde = await trackVeranstaltung();
    const positionen = await listPositionen(fremde.id);

    expect(positionen.some((p) => p.zeileId === zeile.id)).toBe(false);
    expect((await listPositionen(v.id)).some((p) => p.zeileId === zeile.id)).toBe(true);
  });
});
