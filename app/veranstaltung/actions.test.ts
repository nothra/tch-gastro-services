import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Session } from "next-auth";
import type {
  Auslage,
  Catalog,
  CatalogItem,
  Teilnehmer,
  Veranstaltung,
  VeranstaltungZeile,
} from "@/db/schema";
import { ForbiddenError } from "@/lib/authz";

// Gemockt wird die externe Grenze (auth()) sowie Data-Layer und Cache. Der Rollen-Guard
// (lib/authz) läuft echt – er gehört zur selben Server-Schicht (Testing-Standards).
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/db/veranstaltung", () => ({
  createVeranstaltung: vi.fn(),
  addZeile: vi.fn(),
  removeZeile: vi.fn(),
  setErhalten: vi.fn(),
  abschliessenVeranstaltung: vi.fn(),
  wiedereroeffnenVeranstaltung: vi.fn(),
  getVeranstaltung: vi.fn(),
  getVeranstaltungByToken: vi.fn(),
  getZeile: vi.fn(),
  getZeileByTeilnehmer: vi.fn(),
  listZeilen: vi.fn(),
  ensureThekeForKasse: vi.fn(),
  setVeranstaltungCatalog: vi.fn(),
  updateVeranstaltungMeta: vi.fn(),
  deleteVeranstaltung: vi.fn(),
}));
vi.mock("@/db/teilnehmer", () => ({ getTeilnehmer: vi.fn(), createTeilnehmer: vi.fn() }));
// Der Mock ersetzt das ganze Modul – die Konstante muss mitgeliefert werden, sonst reichte die
// Action `undefined` als Katalogbezug durch und die Wiring-Assertion unten wäre wertlos.
vi.mock("@/db/catalog", () => ({
  getCatalogItem: vi.fn(),
  getCatalogById: vi.fn(),
  STANDARD_CATALOG_ID: "standard",
}));
vi.mock("@/db/verzehr", () => ({
  adjustMenge: vi.fn(),
  getPosition: vi.fn(),
  listPositionen: vi.fn(),
}));
vi.mock("@/db/auslage", () => ({
  createAuslage: vi.fn(),
  updateAuslage: vi.fn(),
  setAuslageStatus: vi.fn(),
  removeAuslage: vi.fn(),
  listAuslagen: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
// Der echte `redirect` wirft eine NEXT_REDIRECT-Kontrollfluss-Exception; der Mock tut das nicht.
// Für die Tests reicht das: geprüft wird, OB und WOHIN umgeleitet wird – und beim Ablehnungspfad,
// dass es gar nicht passiert.
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
// Der Limiter ist modul-lokaler Singleton-State (ADR-044 D1) – gemockt, damit jeder Test
// seinen Zustand selbst setzt und keine Testreihenfolge-Abhängigkeit entsteht. Die echte
// Fenster-Arithmetik inkl. der produktiven Parameter ist in `lib/rate-limit.test.ts` getestet.
vi.mock("@/lib/rate-limit", () => ({
  selfServiceVerzehrRateLimiter: { tryAcquire: vi.fn() },
}));

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { selfServiceVerzehrRateLimiter } from "@/lib/rate-limit";
import { auth } from "@/auth";
import { createTeilnehmer, getTeilnehmer } from "@/db/teilnehmer";
import { getCatalogById, getCatalogItem } from "@/db/catalog";
import { adjustMenge, getPosition, listPositionen } from "@/db/verzehr";
import {
  abschliessenVeranstaltung,
  addZeile,
  createVeranstaltung,
  deleteVeranstaltung,
  ensureThekeForKasse,
  getVeranstaltung,
  getVeranstaltungByToken,
  getZeile,
  getZeileByTeilnehmer,
  listZeilen,
  removeZeile,
  setErhalten,
  setVeranstaltungCatalog,
  updateVeranstaltungMeta,
  wiedereroeffnenVeranstaltung,
} from "@/db/veranstaltung";
import {
  createAuslage,
  listAuslagen,
  removeAuslage,
  setAuslageStatus,
  updateAuslage,
} from "@/db/auslage";
import {
  addZeileAction,
  adjustVerzehrAction,
  adjustVerzehrByTokenAction,
  createAuslageAction,
  createVeranstaltungAction,
  createWalkInAction,
  deleteVeranstaltungAction,
  ensureThekeAction,
  kassiereZeileAction,
  removeAuslageAction,
  removeZeileAction,
  setAuslageStatusAction,
  setStatusAction,
  setVeranstaltungCatalogAction,
  updateAuslageAction,
  updateVeranstaltungMetaAction,
} from "./actions";

const authMock = vi.mocked(auth as unknown as () => Promise<Session | null>);
const createMock = vi.mocked(createVeranstaltung);
const addZeileMock = vi.mocked(addZeile);
const removeZeileMock = vi.mocked(removeZeile);
const setErhaltenMock = vi.mocked(setErhalten);
const revalidatePathMock = vi.mocked(revalidatePath);
const abschliessenMock = vi.mocked(abschliessenVeranstaltung);
const wiedereroeffnenMock = vi.mocked(wiedereroeffnenVeranstaltung);
const getVeranstaltungMock = vi.mocked(getVeranstaltung);
const getVeranstaltungByTokenMock = vi.mocked(getVeranstaltungByToken);
const getZeileMock = vi.mocked(getZeile);
const getZeileByTeilnehmerMock = vi.mocked(getZeileByTeilnehmer);
const listZeilenMock = vi.mocked(listZeilen);
const listPositionenMock = vi.mocked(listPositionen);
const ensureThekeMock = vi.mocked(ensureThekeForKasse);
const getTeilnehmerMock = vi.mocked(getTeilnehmer);
const createTeilnehmerMock = vi.mocked(createTeilnehmer);
const getCatalogItemMock = vi.mocked(getCatalogItem);
const getCatalogByIdMock = vi.mocked(getCatalogById);
const setVeranstaltungCatalogMock = vi.mocked(setVeranstaltungCatalog);
const updateVeranstaltungMetaMock = vi.mocked(updateVeranstaltungMeta);
const deleteVeranstaltungMock = vi.mocked(deleteVeranstaltung);
const listAuslagenMock = vi.mocked(listAuslagen);
const redirectMock = vi.mocked(redirect);
const adjustMengeMock = vi.mocked(adjustMenge);
const tryAcquireMock = vi.mocked(selfServiceVerzehrRateLimiter.tryAcquire);
const getPositionMock = vi.mocked(getPosition);
const createAuslageMock = vi.mocked(createAuslage);
const updateAuslageMock = vi.mocked(updateAuslage);
const setAuslageStatusMock = vi.mocked(setAuslageStatus);
const removeAuslageMock = vi.mocked(removeAuslage);

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
}

function sessionWithRoles(roles: string[]): Session {
  return {
    user: { id: "u1", name: "Vera Veranstalter", roles },
    expires: "2099-01-01T00:00:00.000Z",
  } as Session;
}

// Bewusst NICHT der Standard-Katalog (#346): nur so unterscheidet die Wiring-Assertion an der
// Verzehr-Grenze zwischen „löst über veranstaltung.catalogId auf" und „nimmt weiter die
// Konstante". Mit 'standard' als Fixture-Wert wäre sie in beiden Fällen grün.
const KATALOG_B_ID = "kat-b";

const offeneVeranstaltung: Veranstaltung = {
  id: "v1",
  typ: "veranstaltung",
  bezeichnung: "Montagsrunde",
  datum: new Date("2026-07-13"),
  kasse: "montagsrunde",
  catalogId: KATALOG_B_ID,
  status: "offen",
  token: "tok",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const katalogB: Catalog = {
  id: KATALOG_B_ID,
  name: "Dorfmeisterschaften",
  active: true,
  sortOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const person: Teilnehmer = {
  id: "t1",
  name: "Anna Beispiel",
  typ: "person",
  mitglied: true,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const validVeranstaltung = {
  bezeichnung: "Montagsrunde",
  datum: "2026-07-13",
  kasse: "montagsrunde",
  catalogId: KATALOG_B_ID,
};

const zeile: VeranstaltungZeile = {
  id: "z1",
  veranstaltungId: "v1",
  teilnehmerId: "t1",
  anzeigename: "Anna Beispiel",
  erhaltenCents: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Soll-Wert als Literal, nicht aus dem Mock gelesen (Testing-Standards). Der Drift-Guard in
// db/catalog.test.ts hält Produktions-Konstante und Migrations-Literal gegeneinander – er liest
// dieses Literal hier nicht mit; es ist unabhängig auf denselben Wert gesetzt.
const STANDARD_CATALOG_ID = "standard";

const cola: CatalogItem = {
  id: "c1",
  catalogId: KATALOG_B_ID,
  name: "Cola",
  size: "",
  priceCents: 250,
  category: "getraenk",
  sortOrder: 0,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const auslage: Auslage = {
  id: "a1",
  veranstaltungId: "v1",
  teilnehmerId: "t1",
  kategorie: "sonstiges",
  betragCents: 550,
  zweck: "Grillfleisch",
  status: "offen",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const validAuslage = {
  teilnehmerId: "t1",
  kategorie: "sonstiges",
  betrag: "5,50",
  zweck: "Grillfleisch",
};

beforeEach(() => {
  vi.resetAllMocks();
  authMock.mockResolvedValue(sessionWithRoles(["veranstalter"]));
  getVeranstaltungMock.mockResolvedValue(offeneVeranstaltung);
  getVeranstaltungByTokenMock.mockResolvedValue(offeneVeranstaltung);
  getZeileMock.mockResolvedValue(zeile);
  getZeileByTeilnehmerMock.mockResolvedValue(zeile);
  listZeilenMock.mockResolvedValue([]);
  listPositionenMock.mockResolvedValue([]);
  setErhaltenMock.mockResolvedValue(zeile);
  abschliessenMock.mockResolvedValue({ ...offeneVeranstaltung, status: "abgeschlossen" });
  wiedereroeffnenMock.mockResolvedValue(offeneVeranstaltung);
  getTeilnehmerMock.mockResolvedValue(person);
  createTeilnehmerMock.mockResolvedValue(person);
  getCatalogItemMock.mockResolvedValue(cola);
  getCatalogByIdMock.mockResolvedValue(katalogB);
  setVeranstaltungCatalogMock.mockResolvedValue({ ...offeneVeranstaltung, catalogId: "kat-c" });
  listAuslagenMock.mockResolvedValue([]);
  updateVeranstaltungMetaMock.mockResolvedValue(offeneVeranstaltung);
  deleteVeranstaltungMock.mockResolvedValue(offeneVeranstaltung);
  createAuslageMock.mockResolvedValue(auslage);
  updateAuslageMock.mockResolvedValue(auslage);
  setAuslageStatusMock.mockResolvedValue(auslage);
  removeAuslageMock.mockResolvedValue(auslage);
  adjustMengeMock.mockResolvedValue({
    id: "p1",
    zeileId: "z1",
    catalogItemId: "c1",
    einzelpreisCents: null,
    menge: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  tryAcquireMock.mockReturnValue(true);
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("createVeranstaltungAction", () => {
  it("should_createDatierteVeranstaltung_when_inputValid", async () => {
    const result = await createVeranstaltungAction(undefined, form(validVeranstaltung));

    expect(result).toEqual({ ok: true });
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ bezeichnung: "Montagsrunde", kasse: "montagsrunde" }),
    );
    expect(createMock.mock.calls[0][0].datum).toBeInstanceOf(Date);
  });

  it("should_rejectAndNotPersist_when_userLacksVeranstalterRole", async () => {
    authMock.mockResolvedValue(sessionWithRoles(["verwalter"]));

    await expect(createVeranstaltungAction(undefined, form(validVeranstaltung))).rejects.toThrow(
      ForbiddenError,
    );
    expect(createMock).not.toHaveBeenCalled();
  });

  it("should_returnError_when_kasseMissing", async () => {
    const { kasse, ...withoutKasse } = validVeranstaltung;
    void kasse;
    const result = await createVeranstaltungAction(undefined, form(withoutKasse));

    expect(result.error).toBeDefined();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("should_returnError_when_datumMissing", async () => {
    const { datum, ...withoutDatum } = validVeranstaltung;
    void datum;
    const result = await createVeranstaltungAction(undefined, form(withoutDatum));

    expect(result.error).toBeDefined();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("should_persistChosenCatalog_when_catalogActive", async () => {
    // #346 AK1: der gewählte Katalog landet an der Veranstaltung – nicht der Spalten-Default.
    await createVeranstaltungAction(undefined, form(validVeranstaltung));

    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ catalogId: KATALOG_B_ID }));
  });

  it("should_returnErrorAndNotPersist_when_catalogUnknown", async () => {
    // #346 FS1: Server-Grenze, nicht nur die Optionsliste des Formulars.
    getCatalogByIdMock.mockResolvedValue(undefined);

    const result = await createVeranstaltungAction(undefined, form(validVeranstaltung));

    expect(result.error).toBe("Katalog nicht gefunden.");
    expect(createMock).not.toHaveBeenCalled();
  });

  it("should_returnErrorAndNotPersist_when_catalogInactive", async () => {
    // #346 AK6: ein deaktivierter Katalog ist nicht neu wählbar – auch nicht per direktem Request.
    getCatalogByIdMock.mockResolvedValue({ ...katalogB, active: false });

    const result = await createVeranstaltungAction(undefined, form(validVeranstaltung));

    expect(result.error).toBe("Der Katalog ist nicht aktiv.");
    expect(createMock).not.toHaveBeenCalled();
  });

  it("should_returnErrorAndNotPersist_when_catalogIdMissing", async () => {
    const { catalogId, ...withoutCatalog } = validVeranstaltung;
    void catalogId;

    const result = await createVeranstaltungAction(undefined, form(withoutCatalog));

    expect(result.error).toBe("Bitte einen Katalog wählen.");
    expect(createMock).not.toHaveBeenCalled();
  });
});

describe("setVeranstaltungCatalogAction", () => {
  const wechsel = { id: "v1", catalogId: "kat-c" };

  it("should_switchCatalog_when_noVerzehrErfasst", async () => {
    // #346 AK3: ohne erfassten Verzehr ist der Wechsel erlaubt.
    const result = await setVeranstaltungCatalogAction(undefined, form(wechsel));

    expect(result).toEqual({ ok: true });
    expect(setVeranstaltungCatalogMock).toHaveBeenCalledWith("v1", "kat-c");
    expect(revalidatePathMock).toHaveBeenCalledWith("/veranstaltung/v1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/veranstaltung/v1/verzehr");
  });

  it("should_rejectAndNotPersist_when_userLacksVeranstalterRole", async () => {
    // #346 AK8: das Rollen-Gate greift serverseitig, unabhängig von der UI.
    authMock.mockResolvedValue(sessionWithRoles(["verwalter"]));

    await expect(setVeranstaltungCatalogAction(undefined, form(wechsel))).rejects.toThrow(
      ForbiddenError,
    );
    expect(setVeranstaltungCatalogMock).not.toHaveBeenCalled();
  });

  it("should_returnErrorAndNotPersist_when_verzehrBereitsErfasst", async () => {
    // #346 AK4/FS2: die Sperre wird zum Zeitpunkt der Action geprüft, nicht beim Rendern.
    listPositionenMock.mockResolvedValue([
      {
        zeileId: "z1",
        catalogItemId: "c1",
        menge: 1,
        name: "Cola",
        size: "",
        priceCents: 250,
        category: "getraenk",
        active: true,
      },
    ]);

    const result = await setVeranstaltungCatalogAction(undefined, form(wechsel));

    expect(result.error).toBe(
      "Katalogwechsel nicht möglich: für diese Veranstaltung ist bereits Verzehr erfasst.",
    );
    expect(setVeranstaltungCatalogMock).not.toHaveBeenCalled();
  });

  it("should_switchCatalog_when_positionExistsButMengeZero", async () => {
    // #346 AK4, zweite Hälfte: eine auf 0 zurückgesetzte Position ist KEIN erfasster Verzehr –
    // eine reine Zeilen-Existenz-Prüfung auf verzehr_position würde hier falsch sperren.
    listPositionenMock.mockResolvedValue([
      {
        zeileId: "z1",
        catalogItemId: "c1",
        menge: 0,
        name: "Cola",
        size: "",
        priceCents: 250,
        category: "getraenk",
        active: true,
      },
    ]);

    const result = await setVeranstaltungCatalogAction(undefined, form(wechsel));

    expect(result).toEqual({ ok: true });
    expect(setVeranstaltungCatalogMock).toHaveBeenCalledWith("v1", "kat-c");
  });

  it("should_returnErrorAndNotPersist_when_veranstaltungNotFound", async () => {
    getVeranstaltungMock.mockResolvedValue(undefined);

    const result = await setVeranstaltungCatalogAction(undefined, form(wechsel));

    expect(result.error).toBe("Veranstaltung nicht gefunden.");
    expect(setVeranstaltungCatalogMock).not.toHaveBeenCalled();
  });

  it("should_returnErrorAndNotPersist_when_veranstaltungAbgeschlossen", async () => {
    // #346 AK5: abgeschlossene Veranstaltungen bleiben unveränderlich.
    getVeranstaltungMock.mockResolvedValue({ ...offeneVeranstaltung, status: "abgeschlossen" });

    const result = await setVeranstaltungCatalogAction(undefined, form(wechsel));

    expect(result.error).toBe("Die Veranstaltung ist abgeschlossen und schreibgeschützt.");
    expect(setVeranstaltungCatalogMock).not.toHaveBeenCalled();
  });

  it("should_returnErrorAndNotPersist_when_zielKatalogUnknown", async () => {
    getCatalogByIdMock.mockResolvedValue(undefined);

    const result = await setVeranstaltungCatalogAction(undefined, form(wechsel));

    expect(result.error).toBe("Katalog nicht gefunden.");
    expect(setVeranstaltungCatalogMock).not.toHaveBeenCalled();
  });

  it("should_returnErrorAndNotPersist_when_zielKatalogInactive", async () => {
    // #346 AK6/FS1: deaktivierter Zielkatalog wird serverseitig abgelehnt.
    getCatalogByIdMock.mockResolvedValue({ ...katalogB, active: false });

    const result = await setVeranstaltungCatalogAction(undefined, form(wechsel));

    expect(result.error).toBe("Der Katalog ist nicht aktiv.");
    expect(setVeranstaltungCatalogMock).not.toHaveBeenCalled();
  });

  it("should_returnError_when_idMissing", async () => {
    const result = await setVeranstaltungCatalogAction(undefined, form({ catalogId: "kat-c" }));

    expect(result.error).toBe("Keine Veranstaltung angegeben.");
    expect(setVeranstaltungCatalogMock).not.toHaveBeenCalled();
  });

  it("should_returnError_when_catalogIdMissing", async () => {
    const result = await setVeranstaltungCatalogAction(undefined, form({ id: "v1" }));

    expect(result.error).toBe("Bitte einen Katalog wählen.");
    expect(setVeranstaltungCatalogMock).not.toHaveBeenCalled();
  });

  it("should_returnError_when_guardedUpdateMatchedNoRow", async () => {
    // #346 FS2/FS4: der guarded UPDATE meldet den nebenläufigen Abschluss über `undefined` –
    // ohne Auswertung meldete die Action Erfolg für einen Schreibvorgang, der nie stattfand.
    setVeranstaltungCatalogMock.mockResolvedValue(undefined);

    const result = await setVeranstaltungCatalogAction(undefined, form(wechsel));

    expect(result.error).toBe("Die Veranstaltung ist abgeschlossen und schreibgeschützt.");
  });
});

describe("updateVeranstaltungMetaAction", () => {
  const meta = {
    id: "v1",
    bezeichnung: "Sommerfest",
    datum: "2026-08-01",
    kasse: "vereinskasse",
  };

  it("should_persistAllThreeFields_when_inputValid", async () => {
    // #352 AK1: Bezeichnung, Kasse und Datum werden übernommen; das Datum passiert die
    // Zod-Grenze als Date, nicht als String.
    const result = await updateVeranstaltungMetaAction(undefined, form(meta));

    expect(result).toEqual({ ok: true });
    expect(updateVeranstaltungMetaMock).toHaveBeenCalledWith("v1", {
      bezeichnung: "Sommerfest",
      datum: new Date("2026-08-01"),
      kasse: "vereinskasse",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/veranstaltung/v1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/veranstaltung");
  });

  it("should_revalidateEveryRouteShowingTheBezeichnung_when_metaChanged", async () => {
    // Die drei Unterseiten rendern `veranstaltung.bezeichnung` in ihrer Überschrift – ohne
    // Revalidierung zeigten sie nach dem Umbenennen weiter den alten Namen. Dieselbe Regel,
    // nach der der Katalogwechsel `verzehr` und der Statuswechsel `kassieren` mitnimmt.
    await updateVeranstaltungMetaAction(undefined, form(meta));

    expect(revalidatePathMock).toHaveBeenCalledWith("/veranstaltung/v1/verzehr");
    expect(revalidatePathMock).toHaveBeenCalledWith("/veranstaltung/v1/auslagen");
    expect(revalidatePathMock).toHaveBeenCalledWith("/veranstaltung/v1/kassieren");
  });

  it("should_notForwardCatalogId_when_itIsSubmittedAnyway", async () => {
    // #352: das Bearbeiten-Formular darf den Katalog nicht mitändern – sonst umginge es die
    // Verzehr-Sperre des eigenen Katalogwechsel-Wegs (#346 AK4).
    await updateVeranstaltungMetaAction(undefined, form({ ...meta, catalogId: "kat-fremd" }));

    expect(updateVeranstaltungMetaMock).toHaveBeenCalledWith(
      "v1",
      expect.not.objectContaining({ catalogId: expect.anything() }),
    );
    expect(setVeranstaltungCatalogMock).not.toHaveBeenCalled();
  });

  it("should_rejectAndNotPersist_when_userLacksVeranstalterRole", async () => {
    // #352 AK11: das Rollen-Gate greift serverseitig, unabhängig von der UI.
    authMock.mockResolvedValue(sessionWithRoles(["verwalter"]));

    await expect(updateVeranstaltungMetaAction(undefined, form(meta))).rejects.toThrow(
      ForbiddenError,
    );
    expect(updateVeranstaltungMetaMock).not.toHaveBeenCalled();
  });

  it("should_returnErrorAndNotPersist_when_bezeichnungEmpty", async () => {
    // #352 AK2, erste Hälfte – serverseitig, nicht nur per `required` im Formular.
    const result = await updateVeranstaltungMetaAction(
      undefined,
      form({ ...meta, bezeichnung: "   " }),
    );

    expect(result.error).toBe("Bezeichnung ist erforderlich.");
    expect(updateVeranstaltungMetaMock).not.toHaveBeenCalled();
  });

  it("should_returnErrorAndNotPersist_when_datumEmpty", async () => {
    // #352 AK2, zweite Hälfte: leeres Datum.
    const result = await updateVeranstaltungMetaAction(undefined, form({ ...meta, datum: "" }));

    expect(result.error).toBe("Datum ist erforderlich.");
    expect(updateVeranstaltungMetaMock).not.toHaveBeenCalled();
  });

  it("should_returnErrorAndNotPersist_when_datumInvalid", async () => {
    // #352 AK2, zweite Hälfte: ungültiges Datum – eigene Meldung, eigener Zweig.
    const result = await updateVeranstaltungMetaAction(
      undefined,
      form({ ...meta, datum: "kein-datum" }),
    );

    expect(result.error).toBe("Datum ist ungültig.");
    expect(updateVeranstaltungMetaMock).not.toHaveBeenCalled();
  });

  it("should_returnErrorAndNotPersist_when_veranstaltungNotFound", async () => {
    // #352 FS4: fremde/unbekannte Id läuft in einen neutralen Fehler, kein IDOR.
    getVeranstaltungMock.mockResolvedValue(undefined);

    const result = await updateVeranstaltungMetaAction(undefined, form(meta));

    expect(result.error).toBe("Veranstaltung nicht gefunden.");
    expect(updateVeranstaltungMetaMock).not.toHaveBeenCalled();
  });

  it("should_returnErrorAndNotPersist_when_veranstaltungAbgeschlossen", async () => {
    // #352 AK3/FS5: abgeschlossene Veranstaltungen bleiben schreibgeschützt.
    getVeranstaltungMock.mockResolvedValue({ ...offeneVeranstaltung, status: "abgeschlossen" });

    const result = await updateVeranstaltungMetaAction(undefined, form(meta));

    expect(result.error).toBe("Die Veranstaltung ist abgeschlossen und schreibgeschützt.");
    expect(updateVeranstaltungMetaMock).not.toHaveBeenCalled();
  });

  it("should_returnErrorAndNotPersist_when_typTheke", async () => {
    // #352 AK10: die stehende Theke ist nicht Teil dieses Features – serverseitig abgelehnt,
    // auch wenn die UI die Aktion ohnehin nicht anbietet.
    getVeranstaltungMock.mockResolvedValue({
      ...offeneVeranstaltung,
      typ: "theke",
      datum: null,
      bezeichnung: "Stehende Theke",
    });

    const result = await updateVeranstaltungMetaAction(undefined, form(meta));

    expect(result.error).toBe("Die stehende Theke kann nicht bearbeitet oder gelöscht werden.");
    expect(updateVeranstaltungMetaMock).not.toHaveBeenCalled();
  });

  it("should_returnError_when_idMissing", async () => {
    const { id, ...withoutId } = meta;
    void id;

    const result = await updateVeranstaltungMetaAction(undefined, form(withoutId));

    expect(result.error).toBe("Keine Veranstaltung angegeben.");
    expect(updateVeranstaltungMetaMock).not.toHaveBeenCalled();
  });

  it("should_returnError_when_guardedUpdateMatchedNoRow", async () => {
    // #352 FS3/FS5: der guarded UPDATE meldet den nebenläufigen Abschluss über `undefined` –
    // ohne Auswertung meldete die Action Erfolg für einen Schreibvorgang, der nie stattfand.
    updateVeranstaltungMetaMock.mockResolvedValue(undefined);

    const result = await updateVeranstaltungMetaAction(undefined, form(meta));

    expect(result.error).toBe("Die Veranstaltung ist abgeschlossen und schreibgeschützt.");
    expect(redirectMock).not.toHaveBeenCalled();
  });
});

describe("deleteVeranstaltungAction", () => {
  const loeschen = { id: "v1" };

  // Eine erfasste Verzehr-Position dieser Veranstaltung; `menge` variiert je Testfall.
  function position(menge: number) {
    return {
      zeileId: "z1",
      catalogItemId: "c1",
      menge,
      name: "Cola",
      size: "",
      priceCents: 250,
      category: "getraenk" as const,
      active: true,
    };
  }

  it("should_deleteAndRedirectToList_when_noVerzehrAndNoAuslage", async () => {
    // #352 AK4 + AK9: Hard-Delete, danach zurück zur Übersicht (die Detailseite existiert nicht
    // mehr) – deshalb `redirect` statt `revalidatePath` auf den Detailpfad.
    await deleteVeranstaltungAction(undefined, form(loeschen));

    expect(deleteVeranstaltungMock).toHaveBeenCalledWith("v1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/veranstaltung");
    expect(revalidatePathMock).not.toHaveBeenCalledWith("/veranstaltung/v1");
    expect(redirectMock).toHaveBeenCalledWith("/veranstaltung");
  });

  it("should_delete_when_zeilenExistButNothingKassiert", async () => {
    // #352 AK7 + FS6: Teilnehmer-Zeilen ohne Fachdaten sperren das Löschen NICHT. `erhaltenCents
    // = null` ist zugleich der Zustand nach einem zurückgenommenen Kassiervorgang
    // (`setErhalten(null)`) – auch der gibt das Löschen wieder frei.
    listZeilenMock.mockResolvedValue([zeile, { ...zeile, id: "z2", erhaltenCents: null }]);

    await deleteVeranstaltungAction(undefined, form(loeschen));

    expect(deleteVeranstaltungMock).toHaveBeenCalledWith("v1");
    expect(redirectMock).toHaveBeenCalledWith("/veranstaltung");
  });

  it("should_returnErrorAndNotDelete_when_geldKassiertOhneVerzehr", async () => {
    // #352 AK12: `kassiereZeile` verlangt keinen Verzehr – eine reine Spende hinterlässt eine
    // Zeile mit `erhaltenCents`, aber keine Position mit `menge > 0` und keine Auslage. Ohne
    // eigene Sperre fiele dieses Bargeld beim Hard-Delete lautlos aus der Kasse.
    listPositionenMock.mockResolvedValue([]);
    listAuslagenMock.mockResolvedValue([]);
    listZeilenMock.mockResolvedValue([{ ...zeile, erhaltenCents: 1000 }]);

    const result = await deleteVeranstaltungAction(undefined, form(loeschen));

    expect(result.error).toBe(
      "Löschen nicht möglich: für diese Veranstaltung ist bereits Geld kassiert.",
    );
    expect(deleteVeranstaltungMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("should_returnErrorAndNotDelete_when_kassiertBetragIsZero", async () => {
    // #352 AK12, Grenzfall: `0` heißt „kassiert, und zwar nichts" – nur `null` heißt „noch nicht
    // kassiert". Eine Truthiness-Prüfung statt `!== null` ließe genau diese Zeile durch.
    listZeilenMock.mockResolvedValue([{ ...zeile, erhaltenCents: 0 }]);

    const result = await deleteVeranstaltungAction(undefined, form(loeschen));

    expect(result.error).toBe(
      "Löschen nicht möglich: für diese Veranstaltung ist bereits Geld kassiert.",
    );
    expect(deleteVeranstaltungMock).not.toHaveBeenCalled();
  });

  it("should_rejectAndNotDelete_when_userLacksVeranstalterRole", async () => {
    // #352 AK11.
    authMock.mockResolvedValue(sessionWithRoles(["verwalter"]));

    await expect(deleteVeranstaltungAction(undefined, form(loeschen))).rejects.toThrow(
      ForbiddenError,
    );
    expect(deleteVeranstaltungMock).not.toHaveBeenCalled();
  });

  it("should_returnErrorAndNotDelete_when_verzehrErfasst", async () => {
    // #352 AK5/FS3: die Sperre wird zum Zeitpunkt der Action geprüft, nicht beim Rendern des
    // Bestätigungsdialogs. Eigene Meldung – die des Katalogwechsels spräche hier vom Wechsel.
    listPositionenMock.mockResolvedValue([position(1)]);

    const result = await deleteVeranstaltungAction(undefined, form(loeschen));

    expect(result.error).toBe(
      "Löschen nicht möglich: für diese Veranstaltung ist bereits Verzehr erfasst.",
    );
    expect(deleteVeranstaltungMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("should_deleteAndRedirect_when_positionExistsButMengeZero", async () => {
    // #352 FS1: `verzehr_position` löscht seine Zeile bei menge = 0 nicht. Eine reine
    // Zeilen-Existenz-Prüfung würde hier falsch sperren – gefiltert wird auf `menge > 0`.
    listPositionenMock.mockResolvedValue([position(0)]);

    await deleteVeranstaltungAction(undefined, form(loeschen));

    expect(deleteVeranstaltungMock).toHaveBeenCalledWith("v1");
    expect(redirectMock).toHaveBeenCalledWith("/veranstaltung");
  });

  it("should_returnErrorAndNotDelete_when_auslageErfasst", async () => {
    // #352 AK6: eine Auslage sperrt unabhängig von ihrem Status (offen/erstattet).
    listAuslagenMock.mockResolvedValue([
      {
        id: "a1",
        teilnehmerId: "t1",
        anzeigename: "Anna Beispiel",
        kategorie: "sonstiges",
        betragCents: 550,
        zweck: "Grillfleisch",
        status: "erstattet",
      },
    ]);

    const result = await deleteVeranstaltungAction(undefined, form(loeschen));

    expect(result.error).toBe(
      "Löschen nicht möglich: für diese Veranstaltung ist bereits eine Auslage erstattet oder erfasst.",
    );
    expect(deleteVeranstaltungMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("should_returnErrorAndNotDelete_when_veranstaltungNotFound", async () => {
    // #352 FS4: kein IDOR über eine fremde Veranstaltung.
    getVeranstaltungMock.mockResolvedValue(undefined);

    const result = await deleteVeranstaltungAction(undefined, form(loeschen));

    expect(result.error).toBe("Veranstaltung nicht gefunden.");
    expect(deleteVeranstaltungMock).not.toHaveBeenCalled();
  });

  it("should_returnErrorAndNotDelete_when_veranstaltungAbgeschlossen", async () => {
    // #352: abgeschlossene Veranstaltungen sind auch gegen Löschen geschützt.
    getVeranstaltungMock.mockResolvedValue({ ...offeneVeranstaltung, status: "abgeschlossen" });

    const result = await deleteVeranstaltungAction(undefined, form(loeschen));

    expect(result.error).toBe("Die Veranstaltung ist abgeschlossen und schreibgeschützt.");
    expect(deleteVeranstaltungMock).not.toHaveBeenCalled();
  });

  it("should_returnErrorAndNotDelete_when_typTheke", async () => {
    // #352 AK10: die stehende Theke lässt sich über diesen Weg nicht entfernen.
    getVeranstaltungMock.mockResolvedValue({
      ...offeneVeranstaltung,
      typ: "theke",
      datum: null,
      bezeichnung: "Stehende Theke",
    });

    const result = await deleteVeranstaltungAction(undefined, form(loeschen));

    expect(result.error).toBe("Die stehende Theke kann nicht bearbeitet oder gelöscht werden.");
    expect(deleteVeranstaltungMock).not.toHaveBeenCalled();
  });

  it("should_returnError_when_idMissing", async () => {
    const result = await deleteVeranstaltungAction(undefined, form({}));

    expect(result.error).toBe("Keine Veranstaltung angegeben.");
    expect(deleteVeranstaltungMock).not.toHaveBeenCalled();
  });

  it("should_returnErrorAndNotRedirect_when_guardedDeleteMatchedNoRow", async () => {
    // #352 FS3/FS4: der guarded DELETE meldet über `undefined`, dass er keine Zeile traf
    // (nebenläufiger Abschluss oder Zweit-Löschung). Ohne Auswertung leitete die Action nach
    // einem Löschvorgang weiter, der nie stattfand.
    deleteVeranstaltungMock.mockResolvedValue(undefined);

    const result = await deleteVeranstaltungAction(undefined, form(loeschen));

    expect(result.error).toBe("Die Veranstaltung ist abgeschlossen und schreibgeschützt.");
    expect(redirectMock).not.toHaveBeenCalled();
  });
});

describe("addZeileAction", () => {
  it("should_addZeileWithSnapshotName_when_inputValid", async () => {
    const result = await addZeileAction(
      undefined,
      form({ veranstaltungId: "v1", teilnehmerId: "t1" }),
    );

    expect(result).toEqual({ ok: true });
    expect(addZeileMock).toHaveBeenCalledWith("v1", person);
  });

  it("should_rejectAndNotPersist_when_userLacksVeranstalterRole", async () => {
    authMock.mockResolvedValue(sessionWithRoles(["verwalter"]));

    await expect(
      addZeileAction(undefined, form({ veranstaltungId: "v1", teilnehmerId: "t1" })),
    ).rejects.toThrow(ForbiddenError);
    expect(addZeileMock).not.toHaveBeenCalled();
  });

  it("should_returnError_when_veranstaltungClosed", async () => {
    getVeranstaltungMock.mockResolvedValue({ ...offeneVeranstaltung, status: "abgeschlossen" });

    const result = await addZeileAction(
      undefined,
      form({ veranstaltungId: "v1", teilnehmerId: "t1" }),
    );

    expect(result.error).toBeDefined();
    expect(addZeileMock).not.toHaveBeenCalled();
  });

  it("should_returnError_when_veranstaltungNotFound", async () => {
    getVeranstaltungMock.mockResolvedValue(undefined);

    const result = await addZeileAction(
      undefined,
      form({ veranstaltungId: "x", teilnehmerId: "t1" }),
    );

    expect(result.error).toBeDefined();
    expect(addZeileMock).not.toHaveBeenCalled();
  });

  it("should_returnFriendlyError_when_teilnehmerAlreadyAdded", async () => {
    addZeileMock.mockRejectedValue({ code: "23505" });

    const result = await addZeileAction(
      undefined,
      form({ veranstaltungId: "v1", teilnehmerId: "t1" }),
    );

    expect(result.error).toMatch(/bereits erfasst/);
  });

  it("should_returnErrorAndNotPersist_when_teilnehmerInactive", async () => {
    getTeilnehmerMock.mockResolvedValue({ ...person, active: false });

    const result = await addZeileAction(
      undefined,
      form({ veranstaltungId: "v1", teilnehmerId: "t1" }),
    );

    expect(result.error).toBeDefined();
    expect(addZeileMock).not.toHaveBeenCalled();
  });

  it("should_returnError_when_veranstaltungIdMissing", async () => {
    const result = await addZeileAction(undefined, form({ teilnehmerId: "t1" }));

    expect(result.error).toBeDefined();
    expect(addZeileMock).not.toHaveBeenCalled();
  });

  it("should_returnError_when_teilnehmerIdMissing", async () => {
    const result = await addZeileAction(undefined, form({ veranstaltungId: "v1" }));

    expect(result.error).toBeDefined();
    expect(addZeileMock).not.toHaveBeenCalled();
  });

  it("should_rethrow_when_addZeileThrowsNon23505Error", async () => {
    addZeileMock.mockRejectedValue(new Error("DB connection lost"));

    await expect(
      addZeileAction(undefined, form({ veranstaltungId: "v1", teilnehmerId: "t1" })),
    ).rejects.toThrow("DB connection lost");
  });
});

describe("createWalkInAction", () => {
  const walkIn = { veranstaltungId: "v1", name: "Neuer Gast", typ: "person", mitglied: "on" };

  it("should_createTeilnehmerAndAddZeile_when_inputValid", async () => {
    const result = await createWalkInAction(undefined, form(walkIn));

    expect(result).toEqual({ ok: true });
    expect(createTeilnehmerMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Neuer Gast", typ: "person" }),
    );
    expect(addZeileMock).toHaveBeenCalledWith("v1", person);
  });

  it("should_returnError_when_nameEmpty", async () => {
    const result = await createWalkInAction(undefined, form({ ...walkIn, name: "   " }));

    expect(result.error).toBeDefined();
    expect(createTeilnehmerMock).not.toHaveBeenCalled();
  });

  it("should_returnError_when_veranstaltungClosed", async () => {
    getVeranstaltungMock.mockResolvedValue({ ...offeneVeranstaltung, status: "abgeschlossen" });

    const result = await createWalkInAction(undefined, form(walkIn));

    expect(result.error).toBeDefined();
    expect(createTeilnehmerMock).not.toHaveBeenCalled();
  });

  it("should_rejectAndNotPersist_when_userLacksVeranstalterRole", async () => {
    authMock.mockResolvedValue(sessionWithRoles(["verwalter"]));

    await expect(createWalkInAction(undefined, form(walkIn))).rejects.toThrow(ForbiddenError);
    expect(createTeilnehmerMock).not.toHaveBeenCalled();
  });

  it("should_returnError_when_veranstaltungIdMissing", async () => {
    const { veranstaltungId, ...withoutId } = walkIn;
    void veranstaltungId;
    const result = await createWalkInAction(undefined, form(withoutId));

    expect(result.error).toBeDefined();
    expect(createTeilnehmerMock).not.toHaveBeenCalled();
  });
});

describe("removeZeileAction", () => {
  it("should_removeZeileBoundToVeranstaltung_when_veranstaltungOpen", async () => {
    await removeZeileAction(form({ veranstaltungId: "v1", zeileId: "z1" }));
    expect(removeZeileMock).toHaveBeenCalledWith("z1", "v1");
  });

  it("should_notRemove_when_veranstaltungClosed", async () => {
    getVeranstaltungMock.mockResolvedValue({ ...offeneVeranstaltung, status: "abgeschlossen" });
    await removeZeileAction(form({ veranstaltungId: "v1", zeileId: "z1" }));
    expect(removeZeileMock).not.toHaveBeenCalled();
  });

  it("should_silentlySkip_when_veranstaltungNotFound", async () => {
    getVeranstaltungMock.mockResolvedValue(undefined);
    await removeZeileAction(form({ veranstaltungId: "v1", zeileId: "z1" }));
    expect(removeZeileMock).not.toHaveBeenCalled();
  });

  it("should_rejectAndNotPersist_when_userLacksVeranstalterRole", async () => {
    authMock.mockResolvedValue(sessionWithRoles(["verwalter"]));
    await expect(removeZeileAction(form({ veranstaltungId: "v1", zeileId: "z1" }))).rejects.toThrow(
      ForbiddenError,
    );
    expect(removeZeileMock).not.toHaveBeenCalled();
  });

  it("should_silentlySkip_when_idsMissing", async () => {
    await removeZeileAction(form({}));
    expect(removeZeileMock).not.toHaveBeenCalled();
  });
});

describe("setStatusAction", () => {
  it("should_closeVeranstaltung_when_allLinesPaid", async () => {
    // Keine Zeilen → keine offene Zeile → abschließbar.
    const result = await setStatusAction(undefined, form({ id: "v1", status: "abgeschlossen" }));
    expect(result).toEqual({ ok: true });
    expect(abschliessenMock).toHaveBeenCalledWith("v1", {
      userId: "u1",
      name: "Vera Veranstalter",
    });
  });

  it("should_normalizeEmptyActorIdAndMissingName_when_sessionUserIncomplete", async () => {
    // `session.user.id || null` und `session.user.name ?? null` (ADR-033 D4/D7): ein leerer
    // String bzw. fehlender Name (theoretisch nicht authentifiziert, aber FK ist
    // nullable/onDelete set null) werden zu `null` normalisiert, nicht als leerer
    // String/`undefined` an den Protokoll-Snapshot übergeben.
    authMock.mockResolvedValue({
      user: { id: "", roles: ["veranstalter"] },
      expires: "2099-01-01T00:00:00.000Z",
    } as unknown as Session);

    const result = await setStatusAction(undefined, form({ id: "v1", status: "abgeschlossen" }));

    expect(result).toEqual({ ok: true });
    expect(abschliessenMock).toHaveBeenCalledWith("v1", { userId: null, name: null });
  });

  it("should_rejectClose_when_atLeastOneLineOpen", async () => {
    // Eine Zeile mit Verzehr 250 (1× Cola) und ohne Erhalten → offen.
    listZeilenMock.mockResolvedValue([{ ...zeile, erhaltenCents: null }]);
    listPositionenMock.mockResolvedValue([
      {
        zeileId: "z1",
        catalogItemId: "c1",
        menge: 1,
        name: "Cola",
        size: "",
        priceCents: 250,
        category: "getraenk",
        active: true,
      },
    ]);

    const result = await setStatusAction(undefined, form({ id: "v1", status: "abgeschlossen" }));

    expect(result.error).toContain("1 Zeile(n) noch offen");
    expect(abschliessenMock).not.toHaveBeenCalled();
  });

  it("should_reopenVeranstaltung_when_statusOffen", async () => {
    getVeranstaltungMock.mockResolvedValue({ ...offeneVeranstaltung, status: "abgeschlossen" });
    const result = await setStatusAction(undefined, form({ id: "v1", status: "offen" }));
    expect(result).toEqual({ ok: true });
    expect(wiedereroeffnenMock).toHaveBeenCalledWith("v1", {
      userId: "u1",
      name: "Vera Veranstalter",
    });
  });

  it("should_notCloseTheke_when_typTheke", async () => {
    getVeranstaltungMock.mockResolvedValue({ ...offeneVeranstaltung, typ: "theke", datum: null });
    const result = await setStatusAction(undefined, form({ id: "v1", status: "abgeschlossen" }));
    expect(result.error).toBeDefined();
    expect(abschliessenMock).not.toHaveBeenCalled();
  });

  it("should_rejectInvalidStatus_when_notInEnum", async () => {
    const result = await setStatusAction(undefined, form({ id: "v1", status: "erledigt" }));
    expect(result.error).toBe("Ungültiger Status.");
    expect(abschliessenMock).not.toHaveBeenCalled();
  });

  it("should_rejectInvalidStatus_when_statusFieldMissing", async () => {
    // formData.get("status") liefert null, wenn das Feld komplett fehlt (nicht nur ein
    // ungültiger Wert) – eigener Branch (`?? ""`-Fallback) neben dem Enum-Test oben.
    const result = await setStatusAction(undefined, form({ id: "v1" }));
    expect(result.error).toBe("Ungültiger Status.");
    expect(abschliessenMock).not.toHaveBeenCalled();
  });

  it("should_rejectClose_when_alreadyClosed", async () => {
    getVeranstaltungMock.mockResolvedValue({ ...offeneVeranstaltung, status: "abgeschlossen" });
    const result = await setStatusAction(undefined, form({ id: "v1", status: "abgeschlossen" }));
    expect(result.error).toBeDefined();
    expect(abschliessenMock).not.toHaveBeenCalled();
  });

  it("should_rejectReopen_when_alreadyOpen", async () => {
    const result = await setStatusAction(undefined, form({ id: "v1", status: "offen" }));
    expect(result.error).toBeDefined();
    expect(wiedereroeffnenMock).not.toHaveBeenCalled();
  });

  it("should_rejectAndNotPersist_when_userLacksVeranstalterRole", async () => {
    authMock.mockResolvedValue(sessionWithRoles(["verwalter"]));
    await expect(
      setStatusAction(undefined, form({ id: "v1", status: "abgeschlossen" })),
    ).rejects.toThrow(ForbiddenError);
    expect(abschliessenMock).not.toHaveBeenCalled();
  });

  it("should_returnError_when_idMissing", async () => {
    const result = await setStatusAction(undefined, form({ status: "abgeschlossen" }));
    expect(result.error).toBeDefined();
    expect(abschliessenMock).not.toHaveBeenCalled();
  });

  it("should_returnError_when_veranstaltungNotFound", async () => {
    getVeranstaltungMock.mockResolvedValue(undefined);
    const result = await setStatusAction(undefined, form({ id: "v1", status: "abgeschlossen" }));
    expect(result.error).toBe("Veranstaltung nicht gefunden.");
    expect(abschliessenMock).not.toHaveBeenCalled();
  });

  // Review-Finding W1 (#55): passiert der Vor-Check, hat aber eine nebenläufige Anfrage den
  // Wechsel schon vollzogen, liefert der guarded UPDATE der Data-Layer `undefined` (ADR-033 D3).
  // Die Action muss diesen No-op als „bereits …"-Fehler ausweisen, statt fälschlich `{ ok: true }`.
  it("should_returnError_when_abschliessenReturnsUndefined", async () => {
    abschliessenMock.mockResolvedValue(undefined);
    const result = await setStatusAction(undefined, form({ id: "v1", status: "abgeschlossen" }));
    expect(result.error).toBe("Die Veranstaltung ist bereits abgeschlossen.");
    expect(result.ok).toBeUndefined();
  });

  it("should_returnError_when_wiedereroeffnenReturnsUndefined", async () => {
    getVeranstaltungMock.mockResolvedValue({ ...offeneVeranstaltung, status: "abgeschlossen" });
    wiedereroeffnenMock.mockResolvedValue(undefined);
    const result = await setStatusAction(undefined, form({ id: "v1", status: "offen" }));
    expect(result.error).toBe("Die Veranstaltung ist bereits offen.");
    expect(result.ok).toBeUndefined();
  });
});

describe("kassiereZeileAction", () => {
  const bound = (fields: Record<string, string>) =>
    kassiereZeileAction("v1", undefined, form(fields));

  it("should_persistErhalten_when_validAmount", async () => {
    const result = await bound({ zeileId: "z1", erhalten: "12,50" });
    expect(result).toEqual({ ok: true });
    expect(setErhaltenMock).toHaveBeenCalledWith("z1", "v1", 1250);
  });

  it("should_resetErhaltenToNull_when_amountEmpty", async () => {
    const result = await bound({ zeileId: "z1", erhalten: "" });
    expect(result).toEqual({ ok: true });
    expect(setErhaltenMock).toHaveBeenCalledWith("z1", "v1", null);
  });

  it("should_resetErhaltenToNull_when_amountFieldMissing", async () => {
    // formData.get("erhalten") liefert null, wenn das Feld komplett fehlt (nicht nur leer) –
    // eigener Branch (`?? ""`-Fallback) neben dem Leerstring-Fall oben.
    const result = await bound({ zeileId: "z1" });
    expect(result).toEqual({ ok: true });
    expect(setErhaltenMock).toHaveBeenCalledWith("z1", "v1", null);
  });

  it("should_rejectAndNotPersist_when_userLacksVeranstalterRole", async () => {
    authMock.mockResolvedValue(sessionWithRoles(["verwalter"]));
    await expect(bound({ zeileId: "z1", erhalten: "5" })).rejects.toThrow(ForbiddenError);
    expect(setErhaltenMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("should_returnError_when_zeileIdMissing", async () => {
    const result = await bound({ erhalten: "5" });
    expect(result.error).toBeDefined();
    expect(setErhaltenMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("should_returnError_when_amountInvalid", async () => {
    const result = await bound({ zeileId: "z1", erhalten: "-5" });
    expect(result.error).toBeDefined();
    expect(setErhaltenMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("should_returnError_when_veranstaltungNotFound", async () => {
    // Guard-Branch NOT_FOUND (Codify #51): ohne diesen Test schlüge das Entfernen des
    // `!ziel`-Guards keinen Test fehl (Smell-Test) – analog den übrigen mutierenden Actions.
    getVeranstaltungMock.mockResolvedValue(undefined);
    const result = await bound({ zeileId: "z1", erhalten: "5" });
    expect(result.error).toBe("Veranstaltung nicht gefunden.");
    expect(setErhaltenMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("should_returnError_when_veranstaltungNotOffen", async () => {
    getVeranstaltungMock.mockResolvedValue({ ...offeneVeranstaltung, status: "abgeschlossen" });
    const result = await bound({ zeileId: "z1", erhalten: "5" });
    expect(result.error).toBe("Die Veranstaltung ist abgeschlossen und schreibgeschützt.");
    expect(setErhaltenMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("should_returnError_when_zeileNotInVeranstaltung", async () => {
    // IDOR-Bindung: fremde/unbekannte Zeile → getZeile liefert undefined (Codify #51).
    getZeileMock.mockResolvedValue(undefined);
    const result = await bound({ zeileId: "z1", erhalten: "5" });
    expect(result.error).toBe("Teilnehmerzeile nicht gefunden.");
    expect(setErhaltenMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});

describe("ensureThekeAction", () => {
  it("should_provisionTheke_when_kasseValid", async () => {
    const result = await ensureThekeAction(undefined, form({ kasse: "vereinskasse" }));
    expect(result).toEqual({ ok: true });
    expect(ensureThekeMock).toHaveBeenCalledWith("vereinskasse");
  });

  it("should_allowVerwalter_when_provisioningTheke", async () => {
    authMock.mockResolvedValue(sessionWithRoles(["verwalter"]));
    const result = await ensureThekeAction(undefined, form({ kasse: "montagsrunde" }));
    expect(result).toEqual({ ok: true });
    expect(ensureThekeMock).toHaveBeenCalledWith("montagsrunde");
  });

  it("should_returnError_when_kasseInvalid", async () => {
    const result = await ensureThekeAction(undefined, form({ kasse: "sparkasse" }));
    expect(result.error).toBeDefined();
    expect(ensureThekeMock).not.toHaveBeenCalled();
  });

  it("should_reject_when_userHasNeitherRole", async () => {
    authMock.mockResolvedValue(sessionWithRoles([]));
    await expect(ensureThekeAction(undefined, form({ kasse: "montagsrunde" }))).rejects.toThrow(
      ForbiddenError,
    );
    expect(ensureThekeMock).not.toHaveBeenCalled();
  });

  it("should_reportOk_when_thekeAlreadyExistsRace", async () => {
    ensureThekeMock.mockRejectedValue({ code: "23505" });
    const result = await ensureThekeAction(undefined, form({ kasse: "montagsrunde" }));
    expect(result).toEqual({ ok: true });
  });

  it("should_rethrow_when_nonUniqueErrorOccurs", async () => {
    ensureThekeMock.mockRejectedValue(new Error("Connection lost"));
    await expect(ensureThekeAction(undefined, form({ kasse: "montagsrunde" }))).rejects.toThrow(
      "Connection lost",
    );
  });
});

describe("adjustVerzehrAction", () => {
  const boundAction = (fields: Record<string, string>) =>
    adjustVerzehrAction("v1", undefined, form(fields));
  const validAdjust = { zeileId: "z1", catalogItemId: "c1", delta: "1" };

  it("should_adjustAndReturnAuthoritativeMenge_when_inputValid", async () => {
    const result = await boundAction(validAdjust);

    expect(result).toEqual({ ok: true, menge: 1 });
    expect(adjustMengeMock).toHaveBeenCalledWith("z1", "c1", 1);
  });

  it("should_passNegativeDelta_when_deltaMinusOne", async () => {
    await boundAction({ ...validAdjust, delta: "-1" });
    expect(adjustMengeMock).toHaveBeenCalledWith("z1", "c1", -1);
  });

  it("should_rejectAndNotPersist_when_userLacksVeranstalterRole", async () => {
    authMock.mockResolvedValue(sessionWithRoles(["verwalter"]));
    await expect(boundAction(validAdjust)).rejects.toThrow(ForbiddenError);
    expect(adjustMengeMock).not.toHaveBeenCalled();
  });

  it("should_returnErrorAndNotPersist_when_deltaOutOfRange", async () => {
    const result = await boundAction({ ...validAdjust, delta: "2" });
    expect(result.error).toBeDefined();
    expect(adjustMengeMock).not.toHaveBeenCalled();
  });

  it("should_returnErrorAndNotPersist_when_catalogItemIdMissing", async () => {
    const result = await boundAction({ zeileId: "z1", delta: "1" });
    expect(result.error).toBeDefined();
    expect(adjustMengeMock).not.toHaveBeenCalled();
  });

  it("should_returnErrorAndNotPersist_when_zeileIdMissing", async () => {
    const result = await boundAction({ catalogItemId: "c1", delta: "1" });
    expect(result.error).toBeDefined();
    expect(adjustMengeMock).not.toHaveBeenCalled();
  });

  it("should_returnErrorAndNotPersist_when_veranstaltungClosed", async () => {
    getVeranstaltungMock.mockResolvedValue({ ...offeneVeranstaltung, status: "abgeschlossen" });
    const result = await boundAction(validAdjust);
    expect(result.error).toBeDefined();
    expect(adjustMengeMock).not.toHaveBeenCalled();
  });

  it("should_returnErrorAndNotPersist_when_veranstaltungNotFound", async () => {
    getVeranstaltungMock.mockResolvedValue(undefined);
    const result = await boundAction(validAdjust);
    expect(result.error).toBeDefined();
    expect(adjustMengeMock).not.toHaveBeenCalled();
  });

  it("should_returnErrorAndNotPersist_when_zeileNotInVeranstaltung", async () => {
    getZeileMock.mockResolvedValue(undefined);
    const result = await boundAction(validAdjust);
    expect(result.error).toBeDefined();
    expect(adjustMengeMock).not.toHaveBeenCalled();
  });

  it("should_resolveItemInCatalogOfVeranstaltung_when_verzehrAdjusted", async () => {
    // #346 AK2/FS3 (ADR-050-Nachtrag zu D3): die Verzehr-Grenze löst den Artikel im Katalog
    // DIESER Veranstaltung auf, nicht mehr über die Konstante. Der Fixture-Katalog ist bewusst
    // nicht 'standard' – sonst wäre die Assertion vor wie nach der Umstellung grün.
    await boundAction(validAdjust);

    expect(getCatalogItemMock).toHaveBeenCalledWith("c1", KATALOG_B_ID);
    expect(getCatalogItemMock).not.toHaveBeenCalledWith("c1", STANDARD_CATALOG_ID);
  });

  it("should_returnErrorAndNotPersist_when_catalogItemMissing", async () => {
    // Deckt beide FS2-Hälften ab: ein gar nicht existierender UND ein im angefragten Katalog
    // fremder Artikel kommen an dieser Grenze identisch als `undefined` an (db/catalog.test.ts
    // belegt das katalog-gebundene `undefined`). Die Meldung wird als Literal geprüft, nicht nur
    // auf „irgendein Fehler" – FS2 verlangt die bestehende Meldung, keinen Crash.
    getCatalogItemMock.mockResolvedValue(undefined);
    const result = await boundAction(validAdjust);
    expect(result.error).toBe("Artikel nicht gefunden.");
    expect(adjustMengeMock).not.toHaveBeenCalled();
  });

  it("should_returnErrorAndNotPersist_when_catalogItemInactiveAndNoExistingPosition", async () => {
    // FS1/AC5: soft-gelöschter Artikel ohne bereits erfasste Position → keine Neu-Erfassung.
    getCatalogItemMock.mockResolvedValue({ ...cola, active: false });
    getPositionMock.mockResolvedValue(undefined);
    const result = await boundAction(validAdjust);
    expect(result.error).toBeDefined();
    expect(adjustMengeMock).not.toHaveBeenCalled();
  });

  it("should_allowIncrement_when_catalogItemInactiveButPositionExists", async () => {
    // AC4/ADR-026 D2: bestehende Position auf inaktivem Artikel bleibt korrigierbar (+1).
    getCatalogItemMock.mockResolvedValue({ ...cola, active: false });
    getPositionMock.mockResolvedValue({
      id: "p1",
      zeileId: "z1",
      catalogItemId: "c1",
      menge: 2,
      einzelpreisCents: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await boundAction(validAdjust);

    expect(result).toEqual({ ok: true, menge: 1 });
    expect(adjustMengeMock).toHaveBeenCalledWith("z1", "c1", 1);
  });

  it("should_allowDecrement_when_catalogItemInactiveButPositionExists", async () => {
    // AC3/ADR-026 D2: bestehende Position auf inaktivem Artikel bleibt korrigierbar (−1).
    getCatalogItemMock.mockResolvedValue({ ...cola, active: false });
    getPositionMock.mockResolvedValue({
      id: "p1",
      zeileId: "z1",
      catalogItemId: "c1",
      menge: 2,
      einzelpreisCents: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await boundAction({ ...validAdjust, delta: "-1" });

    expect(adjustMengeMock).toHaveBeenCalledWith("z1", "c1", -1);
  });

  it("should_processNormally_when_selfServiceRateLimitExhausted", async () => {
    // AK-6 (#182): das Rate-Limit gilt ausschließlich für den token-scoped Pfad. Der
    // authentifizierte F5-Pfad konsultiert den Limiter nicht und läuft auch dann durch,
    // wenn dieser jede Anfrage ablehnen würde.
    tryAcquireMock.mockReturnValue(false);

    const result = await boundAction(validAdjust);

    expect(result).toEqual({ ok: true, menge: 1 });
    expect(adjustMengeMock).toHaveBeenCalledWith("z1", "c1", 1);
    expect(tryAcquireMock).not.toHaveBeenCalled();
  });
});

describe("adjustVerzehrByTokenAction", () => {
  const boundAction = (fields: Record<string, string>) =>
    adjustVerzehrByTokenAction("tok", undefined, form(fields));
  const validAdjust = { zeileId: "z1", catalogItemId: "c1", delta: "1" };

  it("should_adjustAndReturnAuthoritativeMenge_when_tokenValidAndOpen", async () => {
    const result = await boundAction(validAdjust);

    expect(result).toEqual({ ok: true, menge: 1 });
    expect(getVeranstaltungByTokenMock).toHaveBeenCalledWith("tok");
    expect(adjustMengeMock).toHaveBeenCalledWith("z1", "c1", 1);
    // AK-1 (#182): unterhalb des Rate-Limit-Schwellwerts (beforeEach: tryAcquire → true) bleibt
    // der Pfad inklusive Revalidierung unverändert.
    expect(revalidatePathMock).toHaveBeenCalledWith("/theke/tok");
  });

  it("should_authorizeWithoutRole_when_tokenValid", async () => {
    // Kein requireRole (capability-based, ADR-034 D3): auch ohne jede Rolle erfolgreich.
    authMock.mockResolvedValue(null as never);
    const result = await boundAction(validAdjust);

    expect(result).toEqual({ ok: true, menge: 1 });
    expect(adjustMengeMock).toHaveBeenCalledWith("z1", "c1", 1);
  });

  it("should_returnNeutralErrorAndNotPersist_when_tokenUnknown", async () => {
    getVeranstaltungByTokenMock.mockResolvedValue(undefined);
    const result = await boundAction(validAdjust);

    expect(result.error).toBeDefined();
    expect(adjustMengeMock).not.toHaveBeenCalled();
  });

  it("should_resolveItemInStandardCatalog_when_thekeAdjusted", async () => {
    // #346 AK7: die Theke bekommt keine eigene Auswahl und trägt den Spalten-Default – die
    // gemeinsame Verzehr-Grenze löst für sie deshalb weiter im Standard-Katalog auf. Die
    // Umstellung auf `veranstaltung.catalogId` ändert das Theken-Verhalten nicht.
    getVeranstaltungByTokenMock.mockResolvedValue({
      ...offeneVeranstaltung,
      typ: "theke",
      datum: null,
      catalogId: STANDARD_CATALOG_ID,
    });

    await boundAction(validAdjust);

    expect(getCatalogItemMock).toHaveBeenCalledWith("c1", STANDARD_CATALOG_ID);
  });

  it("should_rejectAndNotPersist_when_veranstaltungClosed", async () => {
    getVeranstaltungByTokenMock.mockResolvedValue({
      ...offeneVeranstaltung,
      status: "abgeschlossen",
    });
    const result = await boundAction(validAdjust);

    expect(result.error).toBeDefined();
    expect(adjustMengeMock).not.toHaveBeenCalled();
  });

  it("should_rejectAndNotPersist_when_zeileBelongsToAnotherVeranstaltung", async () => {
    // IDOR (Codify #51): eine fremde zeileId wird über die veranstaltungId-Bindung (aus dem
    // Token abgeleitet) nicht gefunden → ZEILE_NOT_FOUND, kein Schreibzugriff auf die fremde Zeile.
    getZeileMock.mockResolvedValue(undefined);
    const result = await boundAction(validAdjust);

    expect(result.error).toBeDefined();
    expect(getZeileMock).toHaveBeenCalledWith("z1", "v1");
    expect(adjustMengeMock).not.toHaveBeenCalled();
  });

  it("should_returnErrorAndNotPersist_when_deltaOutOfRange", async () => {
    const result = await boundAction({ ...validAdjust, delta: "2" });

    expect(result.error).toBeDefined();
    expect(adjustMengeMock).not.toHaveBeenCalled();
  });

  // Rate-Limit der öffentlichen Schreib-Grenze (#182, ADR-044 D3).
  it("should_returnTooManyRequestsAndSkipEveryDbCall_when_rateLimited", async () => {
    // AK-2/AK-5/FS-3: gedrosselt wird rein in-memory – kein Token-Lookup, kein Zeilen-/
    // Artikel-Read, kein Write, kein revalidatePath, kein `ok`/`menge` im State.
    tryAcquireMock.mockReturnValue(false);

    const result = await boundAction(validAdjust);

    expect(result).toEqual({ error: "Zu viele Anfragen – bitte kurz warten." });
    expect(getVeranstaltungByTokenMock).not.toHaveBeenCalled();
    expect(getZeileMock).not.toHaveBeenCalled();
    expect(getCatalogItemMock).not.toHaveBeenCalled();
    expect(adjustMengeMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("should_passRawTokenAsRateLimitKey_when_differentTokensUsed", async () => {
    // AK-3/FS-2: Zähl-Dimension ist der rohe Token – die Isolation zwischen Veranstaltungen
    // entsteht genau dadurch (Fenster-Trennung selbst: lib/rate-limit.test.ts).
    await adjustVerzehrByTokenAction("tok-a", undefined, form(validAdjust));
    await adjustVerzehrByTokenAction("tok-b", undefined, form(validAdjust));

    expect(tryAcquireMock).toHaveBeenNthCalledWith(1, "tok-a");
    expect(tryAcquireMock).toHaveBeenNthCalledWith(2, "tok-b");
  });
});

describe("createAuslageAction", () => {
  const boundAction = (fields: Record<string, string>) =>
    createAuslageAction("v1", undefined, form(fields));

  it("should_createAuslage_when_inputValid", async () => {
    const result = await boundAction(validAuslage);

    expect(result).toEqual({ ok: true });
    expect(createAuslageMock).toHaveBeenCalledWith({
      veranstaltungId: "v1",
      teilnehmerId: "t1",
      kategorie: "sonstiges",
      betragCents: 550,
      zweck: "Grillfleisch",
    });
  });

  it("should_rejectAndNotPersist_when_userLacksVeranstalterRole", async () => {
    authMock.mockResolvedValue(sessionWithRoles(["verwalter"]));

    await expect(boundAction(validAuslage)).rejects.toThrow(ForbiddenError);
    expect(createAuslageMock).not.toHaveBeenCalled();
  });

  it("should_returnError_when_zodInvalid", async () => {
    const result = await boundAction({ ...validAuslage, betrag: "0" });

    expect(result.error).toBeDefined();
    expect(createAuslageMock).not.toHaveBeenCalled();
  });

  it("should_returnError_when_veranstaltungNotFound", async () => {
    getVeranstaltungMock.mockResolvedValue(undefined);

    const result = await boundAction(validAuslage);

    expect(result.error).toBeDefined();
    expect(createAuslageMock).not.toHaveBeenCalled();
  });

  it("should_returnError_when_veranstaltungClosed", async () => {
    getVeranstaltungMock.mockResolvedValue({ ...offeneVeranstaltung, status: "abgeschlossen" });

    const result = await boundAction(validAuslage);

    expect(result.error).toBeDefined();
    expect(createAuslageMock).not.toHaveBeenCalled();
  });

  it("should_returnError_when_teilnehmerNotInVeranstaltung", async () => {
    getZeileByTeilnehmerMock.mockResolvedValue(undefined);

    const result = await boundAction(validAuslage);

    expect(result.error).toBeDefined();
    expect(createAuslageMock).not.toHaveBeenCalled();
  });

  it("should_returnError_when_teilnehmerInactive", async () => {
    getTeilnehmerMock.mockResolvedValue({ ...person, active: false });

    const result = await boundAction(validAuslage);

    expect(result.error).toBeDefined();
    expect(createAuslageMock).not.toHaveBeenCalled();
  });
});

describe("updateAuslageAction", () => {
  const boundAction = (fields: Record<string, string>) =>
    updateAuslageAction("v1", "a1", undefined, form(fields));

  it("should_updateAuslage_when_inputValid", async () => {
    const result = await boundAction(validAuslage);

    expect(result).toEqual({ ok: true });
    expect(updateAuslageMock).toHaveBeenCalledWith("a1", "v1", {
      teilnehmerId: "t1",
      kategorie: "sonstiges",
      betragCents: 550,
      zweck: "Grillfleisch",
    });
  });

  it("should_rejectAndNotPersist_when_userLacksVeranstalterRole", async () => {
    authMock.mockResolvedValue(sessionWithRoles(["verwalter"]));

    await expect(boundAction(validAuslage)).rejects.toThrow(ForbiddenError);
    expect(updateAuslageMock).not.toHaveBeenCalled();
  });

  it("should_returnError_when_zodInvalid", async () => {
    const result = await boundAction({ ...validAuslage, kategorie: "unbekannt" });

    expect(result.error).toBeDefined();
    expect(updateAuslageMock).not.toHaveBeenCalled();
  });

  it("should_returnError_when_veranstaltungNotFound", async () => {
    getVeranstaltungMock.mockResolvedValue(undefined);

    const result = await boundAction(validAuslage);

    expect(result.error).toBeDefined();
    expect(updateAuslageMock).not.toHaveBeenCalled();
  });

  it("should_returnError_when_veranstaltungClosed", async () => {
    getVeranstaltungMock.mockResolvedValue({ ...offeneVeranstaltung, status: "abgeschlossen" });

    const result = await boundAction(validAuslage);

    expect(result.error).toBeDefined();
    expect(updateAuslageMock).not.toHaveBeenCalled();
  });

  it("should_returnError_when_teilnehmerNotInVeranstaltung", async () => {
    getZeileByTeilnehmerMock.mockResolvedValue(undefined);

    const result = await boundAction(validAuslage);

    expect(result.error).toBeDefined();
    expect(updateAuslageMock).not.toHaveBeenCalled();
  });

  it("should_returnError_when_teilnehmerInactive", async () => {
    getTeilnehmerMock.mockResolvedValue({ ...person, active: false });

    const result = await boundAction(validAuslage);

    expect(result.error).toBeDefined();
    expect(updateAuslageMock).not.toHaveBeenCalled();
  });

  it("should_returnError_when_updateReturnsUndefined", async () => {
    updateAuslageMock.mockResolvedValue(undefined);

    const result = await boundAction(validAuslage);

    expect(result.error).toBeDefined();
  });
});

describe("setAuslageStatusAction", () => {
  it("should_setStatusErstattet_when_inputValid", async () => {
    await setAuslageStatusAction(form({ veranstaltungId: "v1", id: "a1", status: "erstattet" }));
    expect(setAuslageStatusMock).toHaveBeenCalledWith("a1", "v1", "erstattet");
  });

  it("should_setStatusOffen_when_reopening", async () => {
    await setAuslageStatusAction(form({ veranstaltungId: "v1", id: "a1", status: "offen" }));
    expect(setAuslageStatusMock).toHaveBeenCalledWith("a1", "v1", "offen");
  });

  it("should_rejectAndNotPersist_when_userLacksVeranstalterRole", async () => {
    authMock.mockResolvedValue(sessionWithRoles(["verwalter"]));
    await expect(
      setAuslageStatusAction(form({ veranstaltungId: "v1", id: "a1", status: "erstattet" })),
    ).rejects.toThrow(ForbiddenError);
    expect(setAuslageStatusMock).not.toHaveBeenCalled();
  });

  it("should_silentlySkip_when_veranstaltungClosed", async () => {
    getVeranstaltungMock.mockResolvedValue({ ...offeneVeranstaltung, status: "abgeschlossen" });
    await setAuslageStatusAction(form({ veranstaltungId: "v1", id: "a1", status: "erstattet" }));
    expect(setAuslageStatusMock).not.toHaveBeenCalled();
  });

  it("should_silentlySkip_when_veranstaltungNotFound", async () => {
    getVeranstaltungMock.mockResolvedValue(undefined);
    await setAuslageStatusAction(form({ veranstaltungId: "v1", id: "a1", status: "erstattet" }));
    expect(setAuslageStatusMock).not.toHaveBeenCalled();
  });

  it("should_silentlySkip_when_idsMissing", async () => {
    await setAuslageStatusAction(form({ status: "erstattet" }));
    expect(setAuslageStatusMock).not.toHaveBeenCalled();
  });

  it("should_silentlySkip_when_statusInvalid", async () => {
    await setAuslageStatusAction(form({ veranstaltungId: "v1", id: "a1", status: "storniert" }));
    expect(setAuslageStatusMock).not.toHaveBeenCalled();
  });
});

describe("removeAuslageAction", () => {
  it("should_removeAuslage_when_veranstaltungOpen", async () => {
    await removeAuslageAction(form({ veranstaltungId: "v1", id: "a1" }));
    expect(removeAuslageMock).toHaveBeenCalledWith("a1", "v1");
  });

  it("should_rejectAndNotPersist_when_userLacksVeranstalterRole", async () => {
    authMock.mockResolvedValue(sessionWithRoles(["verwalter"]));
    await expect(removeAuslageAction(form({ veranstaltungId: "v1", id: "a1" }))).rejects.toThrow(
      ForbiddenError,
    );
    expect(removeAuslageMock).not.toHaveBeenCalled();
  });

  it("should_notRemove_when_veranstaltungClosed", async () => {
    getVeranstaltungMock.mockResolvedValue({ ...offeneVeranstaltung, status: "abgeschlossen" });
    await removeAuslageAction(form({ veranstaltungId: "v1", id: "a1" }));
    expect(removeAuslageMock).not.toHaveBeenCalled();
  });

  it("should_silentlySkip_when_veranstaltungNotFound", async () => {
    getVeranstaltungMock.mockResolvedValue(undefined);
    await removeAuslageAction(form({ veranstaltungId: "v1", id: "a1" }));
    expect(removeAuslageMock).not.toHaveBeenCalled();
  });

  it("should_silentlySkip_when_idsMissing", async () => {
    await removeAuslageAction(form({}));
    expect(removeAuslageMock).not.toHaveBeenCalled();
  });
});
