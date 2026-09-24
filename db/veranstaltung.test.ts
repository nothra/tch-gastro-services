import { afterEach, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";
import { db } from "./index";
import { catalog, catalogItems, teilnehmer, veranstaltung } from "./schema";
import { createTeilnehmer } from "./teilnehmer";
import { STANDARD_CATALOG_ID, createItem, updateItem } from "./catalog";
import { adjustMenge, listPositionen } from "./verzehr";
import { listEreignisse } from "./veranstaltung-ereignis";
import {
  abschliessenVeranstaltung,
  addZeile,
  createVeranstaltung,
  ensureThekeForKasse,
  getThekeForKasse,
  getVeranstaltung,
  getVeranstaltungByToken,
  getZeileByTeilnehmer,
  listVeranstaltungen,
  listZeilen,
  removeZeile,
  setErhalten,
  setVeranstaltungCatalog,
  wiedereroeffnenVeranstaltung,
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
const createdItems: string[] = [];
const createdCatalogs: string[] = [];

const AKTEUR = { userId: null, name: `${TEST_PREFIX}Vera` };

// Eigenes Namensfenster für Katalogartikel (#347): `catalog_item` trägt eine Unique-Constraint
// auf (catalog_id, name, size), und die DB-Testdateien laufen parallel gegen dieselbe DB. Ohne
// datei-eigenes Präfix kollidieren gleichnamige Artikel verschiedener Dateien im
// Standard-Katalog – reihenfolge-abhängig rot (testing-standards.md: keine
// Test-Reihenfolge-Abhängigkeiten). Teilnehmer-/Veranstaltungsnamen brauchen das nicht: dort
// gibt es keine Unique-Constraint auf dem Namen.
const ITEM_PREFIX = `${TEST_PREFIX}veranstaltung-`;

// Der Default-Parameter ist bewusst nur im Test: ADR-050 D4 verbietet ihn in der
// Data-Layer-Signatur, damit der Compiler in #346 jede Aufrufstelle meldet – dieser Helfer
// reicht `catalogId` seinerseits explizit an `createItem` durch.
async function trackItem(name: string, priceCents: number, catalogId = STANDARD_CATALOG_ID) {
  const item = await createItem(catalogId, {
    name: `${ITEM_PREFIX}${name}`,
    size: "",
    priceCents,
    category: "getraenk",
    sortOrder: 0,
  });
  createdItems.push(item.id);
  return item;
}

// Zweiter Katalog für den D5-Guard unten. Bis #345 gibt es keinen Pflege-Weg – der Test legt
// ihn deshalb direkt auf der Tabelle an (wie in catalog.test.ts).
async function trackCatalog(name: string) {
  const [row] = await db
    .insert(catalog)
    .values({ name: `${TEST_PREFIX}${name}` })
    .returning();
  createdCatalogs.push(row.id);
  return row;
}

function datierte(overrides: Partial<VeranstaltungData> = {}): VeranstaltungData {
  return {
    bezeichnung: `${TEST_PREFIX}Montagsrunde`,
    datum: new Date("2026-07-13"),
    kasse: "montagsrunde",
    catalogId: STANDARD_CATALOG_ID,
    ...overrides,
  };
}

async function trackVeranstaltung(data: VeranstaltungData) {
  const row = await createVeranstaltung(data);
  createdVeranstaltungen.push(row.id);
  return row;
}

async function trackTeilnehmer(name: string) {
  const row = await createTeilnehmer({
    name: `${TEST_PREFIX}${name}`,
    typ: "person",
    mitglied: false,
  });
  createdTeilnehmer.push(row.id);
  return row;
}

describe.skipIf(!hasDb)("veranstaltung data-layer (integration)", () => {
  afterEach(async () => {
    if (createdVeranstaltungen.length > 0) {
      await db
        .delete(veranstaltung)
        .where(inArray(veranstaltung.id, createdVeranstaltungen.splice(0)));
    }
    if (createdTeilnehmer.length > 0) {
      await db.delete(teilnehmer).where(inArray(teilnehmer.id, createdTeilnehmer.splice(0)));
    }
    if (createdItems.length > 0) {
      await db.delete(catalogItems).where(inArray(catalogItems.id, createdItems.splice(0)));
    }
    // Kataloge zuletzt: der Pflicht-FK ohne ON DELETE (ADR-050 D2) verbietet die umgekehrte
    // Reihenfolge.
    if (createdCatalogs.length > 0) {
      await db.delete(catalog).where(inArray(catalog.id, createdCatalogs.splice(0)));
    }
  });

  it("should_createDatierteVeranstaltungOffen_when_created", async () => {
    const row = await trackVeranstaltung(datierte());
    expect(row.typ).toBe("veranstaltung");
    expect(row.status).toBe("offen");
    expect(row.token).toBeTruthy();
  });

  it("should_useGivenCatalog_when_created", async () => {
    // #346 AK1 auf Data-Layer-Ebene: der Katalog kommt aus den Anlage-Daten, nicht aus dem
    // Spalten-Default. Ohne Durchreichen liefe jede Veranstaltung weiter auf 'standard'.
    const eigener = await trackCatalog("AK1-Anlagekatalog");
    const row = await trackVeranstaltung(datierte({ catalogId: eigener.id }));
    expect(row.catalogId).toBe(eigener.id);
  });

  it("should_useStandardCatalog_when_thekeProvisioned", async () => {
    // #346 AK7: die Theke bekommt keine eigene Auswahl – sie fällt auf den Spalten-DEFAULT
    // 'standard' zurück, weil `ensureThekeForKasse` `catalogId` bewusst nicht setzt.
    const theke = await ensureThekeForKasse("vereinskasse");
    createdVeranstaltungen.push(theke.id);
    expect(theke.catalogId).toBe(STANDARD_CATALOG_ID);
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

  it("should_rejectMissingDatum_when_typVeranstaltung", async () => {
    await expect(
      db
        .insert(veranstaltung)
        .values({
          typ: "veranstaltung",
          bezeichnung: `${TEST_PREFIX}NoDate`,
          kasse: "montagsrunde",
          datum: null,
        })
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
        .values({
          bezeichnung: `${TEST_PREFIX}BadKasse`,
          kasse: "sparkasse",
          datum: new Date("2026-07-13"),
        })
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

  it("should_returnVeranstaltung_when_getByToken", async () => {
    const row = await trackVeranstaltung(datierte());
    const found = await getVeranstaltungByToken(row.token);
    expect(found?.id).toBe(row.id);
  });

  it("should_returnUndefined_when_tokenUnknown", async () => {
    const found = await getVeranstaltungByToken("__does_not_exist__");
    expect(found).toBeUndefined();
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
    await db
      .update(teilnehmer)
      .set({ name: `${TEST_PREFIX}Geändert` })
      .where(inArray(teilnehmer.id, [person.id]));

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

  it("should_findZeile_when_teilnehmerBelongsToVeranstaltung", async () => {
    const v = await trackVeranstaltung(datierte());
    const person = await trackTeilnehmer("Frank");
    const zeile = await addZeile(v.id, person);

    const found = await getZeileByTeilnehmer(v.id, person.id);
    expect(found?.id).toBe(zeile.id);
  });

  it("should_returnUndefined_when_teilnehmerNotInVeranstaltung", async () => {
    const v = await trackVeranstaltung(datierte());
    const person = await trackTeilnehmer("Greta");

    const found = await getZeileByTeilnehmer(v.id, person.id);
    expect(found).toBeUndefined();
  });

  it("should_rejectSecondThekeForSameKasse_when_insertedDirectly", async () => {
    const theke = await ensureThekeForKasse("montagsrunde");
    createdVeranstaltungen.push(theke.id);
    await expect(
      db
        .insert(veranstaltung)
        .values({
          typ: "theke",
          bezeichnung: `${TEST_PREFIX}Zweite`,
          kasse: "montagsrunde",
          datum: null,
        })
        .returning(),
    ).rejects.toThrow();
  });

  // --- F8 Kassieren/Abschluss (#55, ADR-033 D2/D3/D4/D6) -------------------------------------

  it("should_setAndResetErhalten_when_setErhalten", async () => {
    const v = await trackVeranstaltung(datierte());
    const person = await trackTeilnehmer("Hilde");
    const zeile = await addZeile(v.id, person);

    const set = await setErhalten(zeile.id, v.id, 1500);
    expect(set?.erhaltenCents).toBe(1500);

    // `null` = Erhalten zurücksetzen (noch nicht kassiert) – von „0 kassiert" unterschieden.
    const reset = await setErhalten(zeile.id, v.id, null);
    expect(reset?.erhaltenCents).toBeNull();
  });

  it("should_notSetErhaltenOfOtherVeranstaltung_when_veranstaltungIdMismatch", async () => {
    const fremde = await trackVeranstaltung(datierte());
    const eigene = await trackVeranstaltung(datierte());
    const person = await trackTeilnehmer("Ida");
    const zeile = await addZeile(fremde.id, person);

    // IDOR-Bindung (Codify #51): die veranstaltungId muss zur Zeile passen, sonst kein Schreibzugriff.
    const updated = await setErhalten(zeile.id, eigene.id, 999);

    expect(updated).toBeUndefined();
    const [unchanged] = await listZeilen(fremde.id);
    expect(unchanged.erhaltenCents).toBeNull();
  });

  it("should_switchCatalog_when_veranstaltungOffen", async () => {
    // #346 AK3 auf Data-Layer-Ebene. Die fachlichen Vorbedingungen (aktiver Zielkatalog, noch
    // kein Verzehr) prüft die Action – hier zählt nur, dass der guarded UPDATE schreibt.
    const ziel = await trackCatalog("AK3-Zielkatalog");
    const v = await trackVeranstaltung(datierte());

    const updated = await setVeranstaltungCatalog(v.id, ziel.id);

    expect(updated?.catalogId).toBe(ziel.id);
    expect((await getVeranstaltung(v.id))?.catalogId).toBe(ziel.id);
  });

  it("should_returnUndefined_when_switchCatalogOnAbgeschlossen", async () => {
    // #346 AK5: eine abgeschlossene Veranstaltung ist schreibgeschützt. Der guarded UPDATE
    // (`WHERE status = 'offen'`) trifft keine Zeile → `undefined` statt stillem Erfolg.
    const ziel = await trackCatalog("AK5-Zielkatalog");
    const v = await trackVeranstaltung(datierte());
    await abschliessenVeranstaltung(v.id, AKTEUR);

    const updated = await setVeranstaltungCatalog(v.id, ziel.id);

    expect(updated).toBeUndefined();
    expect((await getVeranstaltung(v.id))?.catalogId).toBe(STANDARD_CATALOG_ID);
  });

  it("should_returnUndefined_when_switchCatalogOnUnknownVeranstaltung", async () => {
    // #346 FS4: unbekannte Veranstaltungs-Id meldet No-Match, nicht stillen Erfolg.
    expect(
      await setVeranstaltungCatalog("__does_not_exist__", STANDARD_CATALOG_ID),
    ).toBeUndefined();
  });

  it("should_freezePriceAndLogEvent_when_abschliessen", async () => {
    const v = await trackVeranstaltung(datierte());
    const person = await trackTeilnehmer("Jörg");
    const zeile = await addZeile(v.id, person);
    const item = await trackItem("Cola", 250);
    await adjustMenge(zeile.id, item.id, 1);

    const closed = await abschliessenVeranstaltung(v.id, AKTEUR);
    expect(closed?.status).toBe("abgeschlossen");

    // Der Verwalter ändert danach den Katalogpreis – die abgeschlossene Veranstaltung bleibt stabil
    // (Tagessummen fixiert, ADR-033 D2), weil der Preis beim Abschluss eingefroren wurde.
    await updateItem(item.id, STANDARD_CATALOG_ID, {
      name: item.name,
      size: item.size,
      priceCents: 300,
      category: "getraenk",
      sortOrder: item.sortOrder,
    });

    const [position] = await listPositionen(v.id);
    expect(position.priceCents).toBe(250); // eingefrorener Snapshot, nicht der neue Live-Preis 300

    const ereignisse = await listEreignisse(v.id);
    expect(ereignisse).toHaveLength(1);
    expect(ereignisse[0].art).toBe("abgeschlossen");
    expect(ereignisse[0].akteurName).toBe(AKTEUR.name);
  });

  it("should_resolveAndFreezePosition_when_itemBelongsToForeignCatalog", async () => {
    // Regressionsguard für ADR-050 D5: Anzeige-Join (db/verzehr.ts) und Freeze-Subquery (oben)
    // bleiben katalog-frei. Der Artikel liegt hier bewusst NICHT im Standard-Katalog – genau die
    // Konstellation, die #346 erzeugt, sobald Veranstaltungen verschiedene Kataloge nutzen.
    // Käme in einem der beiden Pfade eine `catalog_id`-Bedingung dazu, fiele die Position aus dem
    // Join bzw. der Freeze liefe auf NULL und die abgeschlossene Abrechnung rechnete wieder live.
    const fremder = await trackCatalog("D5-Fremdkatalog");
    const v = await trackVeranstaltung(datierte());
    const person = await trackTeilnehmer("Mira");
    const zeile = await addZeile(v.id, person);
    const item = await trackItem("FremdkatalogBier", 250, fremder.id);
    await adjustMenge(zeile.id, item.id, 2);

    // (1) Auflösung: der Join findet den Artikel über seine global eindeutige id.
    expect((await listPositionen(v.id)).find((p) => p.catalogItemId === item.id)).toMatchObject({
      menge: 2,
      priceCents: 250,
    });

    // (2) Freeze: Abschluss schreibt den Snapshot, eine spätere Preisänderung bleibt folgenlos.
    await abschliessenVeranstaltung(v.id, AKTEUR);
    await updateItem(item.id, fremder.id, {
      name: item.name,
      size: item.size,
      priceCents: 300,
      category: "getraenk",
      sortOrder: item.sortOrder,
    });

    const position = (await listPositionen(v.id)).find((p) => p.catalogItemId === item.id);
    expect(position?.priceCents).toBe(250); // eingefroren, nicht der neue Live-Preis 300
  });

  it("should_returnUndefined_when_abschliessenAlreadyClosed", async () => {
    const v = await trackVeranstaltung(datierte());
    await abschliessenVeranstaltung(v.id, AKTEUR);

    // Guarded UPDATE (`WHERE status = 'offen'`, ADR-033 D3) → ein Zweit-Abschluss trifft keine Zeile.
    const second = await abschliessenVeranstaltung(v.id, AKTEUR);
    expect(second).toBeUndefined();

    // Dokumentierte Ist-Semantik (Review-Finding W1, #55): nur der Status-UPDATE ist guarded –
    // der Ereignis-Insert läuft innerhalb der atomaren Klammer UNBEDINGT. Der Zweit-Aufruf
    // schreibt daher ein zweites „abgeschlossen"-Ereignis. Die Data-Layer-Funktion ist bewusst
    // ein reiner atomarer Writer; der Idempotenz-Guard sitzt eine Ebene höher in `setStatusAction`
    // (Status-Vor-Check + Auswertung des `undefined`-Rückgabewerts). Der verbleibende Rest ist die
    // in ADR-033 D3 bewusst akzeptierte TOCTOU eines echten Nebenläufigkeits-Rennens.
    expect(await listEreignisse(v.id)).toHaveLength(2);
  });

  it("should_resetPriceAndLogEvent_when_wiedereroeffnen", async () => {
    const v = await trackVeranstaltung(datierte());
    const person = await trackTeilnehmer("Klara");
    const zeile = await addZeile(v.id, person);
    const item = await trackItem("Fanta", 250);
    await adjustMenge(zeile.id, item.id, 1);
    await abschliessenVeranstaltung(v.id, AKTEUR);
    await updateItem(item.id, STANDARD_CATALOG_ID, {
      name: item.name,
      size: item.size,
      priceCents: 300,
      category: "getraenk",
      sortOrder: item.sortOrder,
    });

    const reopened = await wiedereroeffnenVeranstaltung(v.id, AKTEUR);
    expect(reopened?.status).toBe("offen");

    // Nach Wiederöffnung ist der Snapshot auf NULL zurückgesetzt → Position rechnet wieder live (300).
    const [position] = await listPositionen(v.id);
    expect(position.priceCents).toBe(300);

    const ereignisse = await listEreignisse(v.id);
    expect(ereignisse).toHaveLength(2);
    expect(ereignisse[0].art).toBe("wiedereroeffnet"); // neueste zuerst
  });

  it("should_returnUndefined_when_wiedereroeffnenAlreadyOffen", async () => {
    const v = await trackVeranstaltung(datierte());

    // Guarded UPDATE (`WHERE status = 'abgeschlossen'`, ADR-033 D3) → Wiederöffnen einer bereits
    // offenen Veranstaltung trifft keine Zeile (die Action gatet zusätzlich davor).
    const result = await wiedereroeffnenVeranstaltung(v.id, AKTEUR);
    expect(result).toBeUndefined();

    // Dokumentierte Ist-Semantik (Review-Finding W1, #55): der Ereignis-Insert ist ungeguarded –
    // der Aufruf gegen eine ohnehin offene Veranstaltung schreibt trotz No-op-Status ein
    // „wiedereroeffnet"-Ereignis. Produktiv verhindert `setStatusAction` diesen Aufruf über den
    // Status-Vor-Check; die rohe Data-Layer-Funktion bleibt ein reiner atomarer Writer (s. o.).
    expect(await listEreignisse(v.id)).toHaveLength(1);
  });
});
