import { afterEach, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";
import { db } from "./index";
import { auslage, teilnehmer, veranstaltung } from "./schema";
import { createTeilnehmer } from "./teilnehmer";
import { addZeile, createVeranstaltung, removeZeile } from "./veranstaltung";
import {
  createAuslage,
  listAuslagen,
  removeAuslage,
  setAuslageStatus,
  updateAuslage,
  type AuslageData,
} from "./auslage";

// Integrationstests gegen eine echte, migrierte Postgres-DB (analog veranstaltung.test.ts).
// Voraussetzung: `pnpm db:up` + `pnpm db:migrate` (DATABASE_URL gesetzt). Ohne DB in CI
// übersprungen. Nicht-destruktiv: nur selbst angelegte Zeilen per id abgeräumt.
const hasDb = Boolean(process.env.DATABASE_URL);

const TEST_PREFIX = "__test__";
const createdVeranstaltungen: string[] = [];
const createdTeilnehmer: string[] = [];

async function trackVeranstaltung() {
  const row = await createVeranstaltung({
    bezeichnung: `${TEST_PREFIX}Montagsrunde`,
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

async function setupZeile(name: string) {
  const v = await trackVeranstaltung();
  const person = await trackTeilnehmer(name);
  const zeile = await addZeile(v.id, person);
  return { veranstaltungId: v.id, teilnehmerId: person.id, zeileId: zeile.id };
}

function auslageData(overrides: Partial<AuslageData> & Pick<AuslageData, "veranstaltungId" | "teilnehmerId">): AuslageData {
  return {
    kategorie: "sonstiges",
    betragCents: 500,
    zweck: `${TEST_PREFIX}Grillfleisch`,
    ...overrides,
  };
}

describe.skipIf(!hasDb)("auslage data-layer (integration)", () => {
  afterEach(async () => {
    if (createdVeranstaltungen.length > 0) {
      await db.delete(veranstaltung).where(inArray(veranstaltung.id, createdVeranstaltungen.splice(0)));
    }
    if (createdTeilnehmer.length > 0) {
      await db.delete(teilnehmer).where(inArray(teilnehmer.id, createdTeilnehmer.splice(0)));
    }
  });

  it("should_createAuslageOffen_when_created", async () => {
    const { veranstaltungId, teilnehmerId } = await setupZeile("Anna");
    const created = await createAuslage(auslageData({ veranstaltungId, teilnehmerId }));
    expect(created.status).toBe("offen");
    expect(created.betragCents).toBe(500);
  });

  it("should_rejectNonPositiveBetrag_when_insertedDirectly", async () => {
    const { veranstaltungId, teilnehmerId } = await setupZeile("Bernd");
    await expect(
      db
        .insert(auslage)
        .values({ veranstaltungId, teilnehmerId, kategorie: "sonstiges", betragCents: 0, zweck: null })
        .returning(),
    ).rejects.toThrow();
  });

  it("should_listWithAnzeigename_when_listing", async () => {
    const { veranstaltungId, teilnehmerId } = await setupZeile("Clara");
    await createAuslage(auslageData({ veranstaltungId, teilnehmerId }));

    const list = await listAuslagen(veranstaltungId);
    expect(list).toHaveLength(1);
    expect(list[0].anzeigename).toBe(`${TEST_PREFIX}Clara`);
  });

  // Review K1: Wird die Teilnehmerzeile gelöscht, darf die (ggf. bereits erstattete) Auslage NICHT
  // still aus Übersicht/Summen/F8 verschwinden (stiller Kassen-Datenverlust). Der LEFT JOIN hält
  // sie sichtbar; der Anzeigename fällt auf den aktuellen Teilnehmernamen zurück.
  it("should_keepAuslageVisibleWithFallbackName_when_zeileDeleted", async () => {
    const { veranstaltungId, teilnehmerId, zeileId } = await setupZeile("Nora");
    await createAuslage(auslageData({ veranstaltungId, teilnehmerId }));

    await removeZeile(zeileId, veranstaltungId);

    const list = await listAuslagen(veranstaltungId);
    expect(list).toHaveLength(1);
    expect(list[0].anzeigename).toBe(`${TEST_PREFIX}Nora`);
  });

  it("should_notListAuslageOfOtherVeranstaltung_when_listing", async () => {
    const eigene = await setupZeile("Dora");
    const fremde = await setupZeile("Emil");
    await createAuslage(auslageData({ veranstaltungId: fremde.veranstaltungId, teilnehmerId: fremde.teilnehmerId }));

    const list = await listAuslagen(eigene.veranstaltungId);
    expect(list).toHaveLength(0);
  });

  it("should_updateFields_when_updateAuslage", async () => {
    const { veranstaltungId, teilnehmerId } = await setupZeile("Frank");
    const created = await createAuslage(auslageData({ veranstaltungId, teilnehmerId }));

    const updated = await updateAuslage(created.id, veranstaltungId, {
      teilnehmerId,
      kategorie: "essen",
      betragCents: 750,
      zweck: null,
    });
    expect(updated?.kategorie).toBe("essen");
    expect(updated?.betragCents).toBe(750);
    expect(updated?.zweck).toBeNull();
  });

  it("should_returnUndefined_when_updateAuslageVeranstaltungMismatch", async () => {
    const eigene = await setupZeile("Greta");
    const fremde = await setupZeile("Hans");
    const created = await createAuslage(
      auslageData({ veranstaltungId: fremde.veranstaltungId, teilnehmerId: fremde.teilnehmerId }),
    );

    const updated = await updateAuslage(created.id, eigene.veranstaltungId, {
      teilnehmerId: fremde.teilnehmerId,
      kategorie: "essen",
      betragCents: 999,
      zweck: null,
    });

    expect(updated).toBeUndefined();
    const stillOriginal = await listAuslagen(fremde.veranstaltungId);
    expect(stillOriginal[0].betragCents).toBe(500);
  });

  it("should_toggleStatusBothDirections_when_setAuslageStatus", async () => {
    const { veranstaltungId, teilnehmerId } = await setupZeile("Ida");
    const created = await createAuslage(auslageData({ veranstaltungId, teilnehmerId }));

    const erstattet = await setAuslageStatus(created.id, veranstaltungId, "erstattet");
    expect(erstattet?.status).toBe("erstattet");

    const zurueckgesetzt = await setAuslageStatus(created.id, veranstaltungId, "offen");
    expect(zurueckgesetzt?.status).toBe("offen");
  });

  it("should_returnUndefined_when_setStatusVeranstaltungMismatch", async () => {
    const eigene = await setupZeile("Jonas");
    const fremde = await setupZeile("Klaus");
    const created = await createAuslage(
      auslageData({ veranstaltungId: fremde.veranstaltungId, teilnehmerId: fremde.teilnehmerId }),
    );

    const result = await setAuslageStatus(created.id, eigene.veranstaltungId, "erstattet");

    expect(result).toBeUndefined();
    const stillOffen = await listAuslagen(fremde.veranstaltungId);
    expect(stillOffen[0].status).toBe("offen");
  });

  it("should_removeAuslage_when_removeAuslage", async () => {
    const { veranstaltungId, teilnehmerId } = await setupZeile("Lena");
    const created = await createAuslage(auslageData({ veranstaltungId, teilnehmerId }));

    const removed = await removeAuslage(created.id, veranstaltungId);
    expect(removed?.id).toBe(created.id);
    expect(await listAuslagen(veranstaltungId)).toHaveLength(0);
  });

  it("should_notRemoveAuslageOfOtherVeranstaltung_when_veranstaltungIdMismatch", async () => {
    const eigene = await setupZeile("Mira");
    const fremde = await setupZeile("Noah");
    const created = await createAuslage(
      auslageData({ veranstaltungId: fremde.veranstaltungId, teilnehmerId: fremde.teilnehmerId }),
    );

    const removed = await removeAuslage(created.id, eigene.veranstaltungId);

    expect(removed).toBeUndefined();
    expect(await listAuslagen(fremde.veranstaltungId)).toHaveLength(1);
  });
});
