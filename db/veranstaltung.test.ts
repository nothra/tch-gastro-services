import { afterEach, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";
import { db } from "./index";
import { teilnehmer, veranstaltung } from "./schema";
import { createTeilnehmer } from "./teilnehmer";
import {
  addZeile,
  createVeranstaltung,
  ensureThekeForKasse,
  getThekeForKasse,
  getVeranstaltung,
  listVeranstaltungen,
  listZeilen,
  removeZeile,
  setStatus,
  type VeranstaltungData,
} from "./veranstaltung";

// Integrationstests gegen eine echte, migrierte Postgres-DB (analog catalog.test.ts).
// Voraussetzung: `pnpm db:up` + `pnpm db:migrate` (DATABASE_URL gesetzt). Ohne DB in CI
// übersprungen – die reine Logik (Zod, Actions) ist dort mockfrei abgedeckt. Nicht-destruktiv:
// nur selbst angelegte Zeilen per id abgeräumt (veranstaltung_zeile via ON DELETE CASCADE).
const hasDb = Boolean(process.env.DATABASE_URL);

const TEST_PREFIX = "__test__";
const createdVeranstaltungen: string[] = [];
const createdTeilnehmer: string[] = [];

function datierte(overrides: Partial<VeranstaltungData> = {}): VeranstaltungData {
  return {
    bezeichnung: `${TEST_PREFIX}Montagsrunde`,
    datum: new Date("2026-07-13"),
    kasse: "montagsrunde",
    ...overrides,
  };
}

async function trackVeranstaltung(data: VeranstaltungData) {
  const row = await createVeranstaltung(data);
  createdVeranstaltungen.push(row.id);
  return row;
}

async function trackTeilnehmer(name: string) {
  const row = await createTeilnehmer({ name: `${TEST_PREFIX}${name}`, typ: "person", mitglied: false });
  createdTeilnehmer.push(row.id);
  return row;
}

describe.skipIf(!hasDb)("veranstaltung data-layer (integration)", () => {
  afterEach(async () => {
    if (createdVeranstaltungen.length > 0) {
      await db.delete(veranstaltung).where(inArray(veranstaltung.id, createdVeranstaltungen.splice(0)));
    }
    if (createdTeilnehmer.length > 0) {
      await db.delete(teilnehmer).where(inArray(teilnehmer.id, createdTeilnehmer.splice(0)));
    }
  });

  it("should_createDatierteVeranstaltungOffen_when_created", async () => {
    const row = await trackVeranstaltung(datierte());
    expect(row.typ).toBe("veranstaltung");
    expect(row.status).toBe("offen");
    expect(row.token).toBeTruthy();
  });

  it("should_returnCreatedVeranstaltung_when_getById", async () => {
    const row = await trackVeranstaltung(datierte());
    const found = await getVeranstaltung(row.id);
    expect(found?.id).toBe(row.id);
  });

  it("should_listDatierteButNotTheke_when_listing", async () => {
    const dated = await trackVeranstaltung(datierte());
    const theke = await ensureThekeForKasse("vereinskasse");
    createdVeranstaltungen.push(theke.id);

    const list = await listVeranstaltungen();
    expect(list.some((row) => row.id === dated.id)).toBe(true);
    expect(list.some((row) => row.id === theke.id)).toBe(false);
  });

  it("should_updateStatus_when_setStatus", async () => {
    const row = await trackVeranstaltung(datierte());
    const closed = await setStatus(row.id, "abgeschlossen");
    expect(closed?.status).toBe("abgeschlossen");
    const reopened = await setStatus(row.id, "offen");
    expect(reopened?.status).toBe("offen");
  });

  it("should_rejectMissingDatum_when_typVeranstaltung", async () => {
    await expect(
      db
        .insert(veranstaltung)
        .values({ typ: "veranstaltung", bezeichnung: `${TEST_PREFIX}NoDate`, kasse: "montagsrunde", datum: null })
        .returning(),
    ).rejects.toThrow();
  });

  it("should_rejectInvalidKasse_when_notInSet", async () => {
    await expect(
      db
        .insert(veranstaltung)
        // `kasse` ist auf DB-Ebene `text` (kein TS-Enum) – der ungültige Wert ist für
        // TypeScript ein normaler String, der Fehler kommt ausschließlich aus der
        // Postgres-CHECK `veranstaltung_kasse_gueltig` zur Laufzeit.
        .values({ bezeichnung: `${TEST_PREFIX}BadKasse`, kasse: "sparkasse", datum: new Date("2026-07-13") })
        .returning(),
    ).rejects.toThrow();
  });

  it("should_beIdempotent_when_ensureThekeCalledTwice", async () => {
    const first = await ensureThekeForKasse("montagsrunde");
    createdVeranstaltungen.push(first.id);
    const second = await ensureThekeForKasse("montagsrunde");
    expect(second.id).toBe(first.id);
    expect(first.datum).toBeNull();
    expect(first.typ).toBe("theke");
  });

  it("should_findThekeForKasse_when_provisioned", async () => {
    const theke = await ensureThekeForKasse("vereinskasse");
    createdVeranstaltungen.push(theke.id);
    const found = await getThekeForKasse("vereinskasse");
    expect(found?.id).toBe(theke.id);
  });

  it("should_addZeileWithNameSnapshot_when_addZeile", async () => {
    const v = await trackVeranstaltung(datierte());
    const person = await trackTeilnehmer("Anna");

    const zeile = await addZeile(v.id, person);
    expect(zeile.anzeigename).toBe(person.name);
    expect(zeile.teilnehmerId).toBe(person.id);

    const zeilen = await listZeilen(v.id);
    expect(zeilen).toHaveLength(1);
  });

  it("should_keepSnapshot_when_teilnehmerRenamedAfterwards", async () => {
    const v = await trackVeranstaltung(datierte());
    const person = await trackTeilnehmer("Bernd");
    const zeile = await addZeile(v.id, person);

    // Name in den Stammdaten ändern → die Zeile bleibt namenstreu (ADR-022-Vertrag).
    await db.update(teilnehmer).set({ name: `${TEST_PREFIX}Geändert` }).where(inArray(teilnehmer.id, [person.id]));

    const [refetched] = await listZeilen(v.id);
    expect(refetched.anzeigename).toBe(zeile.anzeigename);
  });

  it("should_rejectDuplicateTeilnehmer_when_addedTwice", async () => {
    const v = await trackVeranstaltung(datierte());
    const person = await trackTeilnehmer("Clara");
    await addZeile(v.id, person);
    await expect(addZeile(v.id, person)).rejects.toThrow();
  });

  it("should_removeZeile_when_removeZeile", async () => {
    const v = await trackVeranstaltung(datierte());
    const person = await trackTeilnehmer("Dora");
    const zeile = await addZeile(v.id, person);

    const removed = await removeZeile(zeile.id, v.id);
    expect(removed?.id).toBe(zeile.id);
    expect(await listZeilen(v.id)).toHaveLength(0);
  });

  it("should_notRemoveZeileOfOtherVeranstaltung_when_veranstaltungIdMismatch", async () => {
    const fremde = await trackVeranstaltung(datierte());
    const eigene = await trackVeranstaltung(datierte());
    const person = await trackTeilnehmer("Emil");
    const zeile = await addZeile(fremde.id, person);

    // Löschversuch mit der id einer fremden Zeile, aber der eigenen (offenen) Veranstaltung:
    // die Bindung an veranstaltungId muss das verhindern (Schreibschutz nicht umgehbar).
    const removed = await removeZeile(zeile.id, eigene.id);

    expect(removed).toBeUndefined();
    expect(await listZeilen(fremde.id)).toHaveLength(1);
  });

  it("should_rejectSecondThekeForSameKasse_when_insertedDirectly", async () => {
    const theke = await ensureThekeForKasse("montagsrunde");
    createdVeranstaltungen.push(theke.id);
    await expect(
      db
        .insert(veranstaltung)
        .values({ typ: "theke", bezeichnung: `${TEST_PREFIX}Zweite`, kasse: "montagsrunde", datum: null })
        .returning(),
    ).rejects.toThrow();
  });
});
