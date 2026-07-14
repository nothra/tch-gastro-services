import { afterEach, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";
import { db } from "./index";
import { teilnehmer } from "./schema";
import {
  createTeilnehmer,
  findActiveByName,
  listActiveTeilnehmer,
  listTeilnehmer,
  setTeilnehmerActive,
  updateTeilnehmer,
  type TeilnehmerData,
} from "./teilnehmer";

// Integrationstests gegen eine echte, migrierte Postgres-DB. Voraussetzung:
// `pnpm db:up` + `pnpm db:migrate` (DATABASE_URL gesetzt). In CI ohne DB werden sie
// übersprungen – die reine Logik (Zod-Schema, Actions) ist dort mockfrei abgedeckt.
// Tests sind nicht-destruktiv: sie räumen nur die selbst angelegten Zeilen per id wieder ab.
const hasDb = Boolean(process.env.DATABASE_URL);

// Präfix, damit Testdaten nie mit echten Namen kollidieren.
const TEST_PREFIX = "__test__";
const created: string[] = [];

function person(name: string, overrides: Partial<TeilnehmerData> = {}): TeilnehmerData {
  return {
    name: `${TEST_PREFIX}${name}`,
    typ: "person",
    mitglied: false,
    ...overrides,
  };
}

async function track(data: TeilnehmerData) {
  const row = await createTeilnehmer(data);
  created.push(row.id);
  return row;
}

describe.skipIf(!hasDb)("teilnehmer data-layer (integration)", () => {
  afterEach(async () => {
    if (created.length > 0) {
      await db.delete(teilnehmer).where(inArray(teilnehmer.id, created.splice(0)));
    }
  });

  it("should_persistAndListTeilnehmer_when_created", async () => {
    const row = await track(person("Anna", { mitglied: true }));

    const all = await listTeilnehmer();
    const found = all.find((r) => r.id === row.id);
    expect(found).toBeDefined();
    expect(found?.mitglied).toBe(true);
    expect(found?.typ).toBe("person");
    expect(found?.active).toBe(true);
  });

  it("should_allowDuplicateNames_when_sameName", async () => {
    const first = await track(person("Familie Müller", { typ: "familie" }));
    const second = await track(person("Familie Müller", { typ: "familie" }));
    expect(first.id).not.toBe(second.id);
  });

  it("should_excludeInactive_when_listingActiveTeilnehmer", async () => {
    const row = await track(person("ToDeactivate"));
    await setTeilnehmerActive(row.id, false);

    const active = await listActiveTeilnehmer();
    expect(active.some((r) => r.id === row.id)).toBe(false);

    await setTeilnehmerActive(row.id, true);
    const activeAgain = await listActiveTeilnehmer();
    expect(activeAgain.some((r) => r.id === row.id)).toBe(true);
  });

  it("should_keepDeactivatedTeilnehmerInFullList_when_deactivated", async () => {
    // Spec-50: deaktivierter Teilnehmer bleibt in der Verwalter-Ansicht (listTeilnehmer)
    // sichtbar; nur listActiveTeilnehmer (für neue Abende) schließt ihn aus.
    const row = await track(person("DeactivatedVisible"));
    await setTeilnehmerActive(row.id, false);

    const all = await listTeilnehmer();
    const found = all.find((r) => r.id === row.id);
    expect(found, "Deaktivierter Teilnehmer muss in listTeilnehmer() erscheinen").toBeDefined();
    expect(found?.active).toBe(false);
  });

  it("should_updateNameAndMitglied_when_updated", async () => {
    const row = await track(person("Umbenennen", { mitglied: false }));
    const updated = await updateTeilnehmer(
      row.id,
      person("Umbenannt", { mitglied: true }),
    );
    expect(updated.name).toBe(`${TEST_PREFIX}Umbenannt`);
    expect(updated.mitglied).toBe(true);
  });

  it("should_findOnlyActiveByName_when_matchingNameExists", async () => {
    const row = await track(person("Suchbar"));
    const match = await findActiveByName(`${TEST_PREFIX}Suchbar`);
    expect(match?.id).toBe(row.id);

    await setTeilnehmerActive(row.id, false);
    const afterDeactivate = await findActiveByName(`${TEST_PREFIX}Suchbar`);
    expect(afterDeactivate).toBeUndefined();
  });
});
