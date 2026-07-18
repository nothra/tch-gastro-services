import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Session } from "next-auth";
import type { Auslage, CatalogItem, Teilnehmer, Veranstaltung, VeranstaltungZeile } from "@/db/schema";
import { ForbiddenError } from "@/lib/authz";

// Gemockt wird die externe Grenze (auth()) sowie Data-Layer und Cache. Der Rollen-Guard
// (lib/authz) läuft echt – er gehört zur selben Server-Schicht (Testing-Standards).
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/db/veranstaltung", () => ({
  createVeranstaltung: vi.fn(),
  addZeile: vi.fn(),
  removeZeile: vi.fn(),
  setStatus: vi.fn(),
  getVeranstaltung: vi.fn(),
  getZeile: vi.fn(),
  getZeileByTeilnehmer: vi.fn(),
  ensureThekeForKasse: vi.fn(),
}));
vi.mock("@/db/teilnehmer", () => ({ getTeilnehmer: vi.fn(), createTeilnehmer: vi.fn() }));
vi.mock("@/db/catalog", () => ({ getCatalogItem: vi.fn() }));
vi.mock("@/db/verzehr", () => ({ adjustMenge: vi.fn(), getPosition: vi.fn() }));
vi.mock("@/db/auslage", () => ({
  createAuslage: vi.fn(),
  updateAuslage: vi.fn(),
  setAuslageStatus: vi.fn(),
  removeAuslage: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/auth";
import { createTeilnehmer, getTeilnehmer } from "@/db/teilnehmer";
import { getCatalogItem } from "@/db/catalog";
import { adjustMenge, getPosition } from "@/db/verzehr";
import {
  addZeile,
  createVeranstaltung,
  ensureThekeForKasse,
  getVeranstaltung,
  getZeile,
  getZeileByTeilnehmer,
  removeZeile,
  setStatus,
} from "@/db/veranstaltung";
import { createAuslage, removeAuslage, setAuslageStatus, updateAuslage } from "@/db/auslage";
import {
  addZeileAction,
  adjustVerzehrAction,
  createAuslageAction,
  createVeranstaltungAction,
  createWalkInAction,
  ensureThekeAction,
  removeAuslageAction,
  removeZeileAction,
  setAuslageStatusAction,
  setStatusAction,
  updateAuslageAction,
} from "./actions";

const authMock = vi.mocked(auth as unknown as () => Promise<Session | null>);
const createMock = vi.mocked(createVeranstaltung);
const addZeileMock = vi.mocked(addZeile);
const removeZeileMock = vi.mocked(removeZeile);
const setStatusMock = vi.mocked(setStatus);
const getVeranstaltungMock = vi.mocked(getVeranstaltung);
const getZeileMock = vi.mocked(getZeile);
const getZeileByTeilnehmerMock = vi.mocked(getZeileByTeilnehmer);
const ensureThekeMock = vi.mocked(ensureThekeForKasse);
const getTeilnehmerMock = vi.mocked(getTeilnehmer);
const createTeilnehmerMock = vi.mocked(createTeilnehmer);
const getCatalogItemMock = vi.mocked(getCatalogItem);
const adjustMengeMock = vi.mocked(adjustMenge);
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
  return { user: { roles }, expires: "2099-01-01T00:00:00.000Z" } as Session;
}

const offeneVeranstaltung: Veranstaltung = {
  id: "v1",
  typ: "veranstaltung",
  bezeichnung: "Montagsrunde",
  datum: new Date("2026-07-13"),
  kasse: "montagsrunde",
  status: "offen",
  token: "tok",
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

const validVeranstaltung = { bezeichnung: "Montagsrunde", datum: "2026-07-13", kasse: "montagsrunde" };

const zeile: VeranstaltungZeile = {
  id: "z1",
  veranstaltungId: "v1",
  teilnehmerId: "t1",
  anzeigename: "Anna Beispiel",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const cola: CatalogItem = {
  id: "c1",
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

const validAuslage = { teilnehmerId: "t1", kategorie: "sonstiges", betrag: "5,50", zweck: "Grillfleisch" };

beforeEach(() => {
  vi.resetAllMocks();
  authMock.mockResolvedValue(sessionWithRoles(["veranstalter"]));
  getVeranstaltungMock.mockResolvedValue(offeneVeranstaltung);
  getZeileMock.mockResolvedValue(zeile);
  getZeileByTeilnehmerMock.mockResolvedValue(zeile);
  getTeilnehmerMock.mockResolvedValue(person);
  createTeilnehmerMock.mockResolvedValue(person);
  getCatalogItemMock.mockResolvedValue(cola);
  createAuslageMock.mockResolvedValue(auslage);
  updateAuslageMock.mockResolvedValue(auslage);
  setAuslageStatusMock.mockResolvedValue(auslage);
  removeAuslageMock.mockResolvedValue(auslage);
  adjustMengeMock.mockResolvedValue({
    id: "p1",
    zeileId: "z1",
    catalogItemId: "c1",
    menge: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
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
});

describe("addZeileAction", () => {
  it("should_addZeileWithSnapshotName_when_inputValid", async () => {
    const result = await addZeileAction(undefined, form({ veranstaltungId: "v1", teilnehmerId: "t1" }));

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

    const result = await addZeileAction(undefined, form({ veranstaltungId: "v1", teilnehmerId: "t1" }));

    expect(result.error).toBeDefined();
    expect(addZeileMock).not.toHaveBeenCalled();
  });

  it("should_returnError_when_veranstaltungNotFound", async () => {
    getVeranstaltungMock.mockResolvedValue(undefined);

    const result = await addZeileAction(undefined, form({ veranstaltungId: "x", teilnehmerId: "t1" }));

    expect(result.error).toBeDefined();
    expect(addZeileMock).not.toHaveBeenCalled();
  });

  it("should_returnFriendlyError_when_teilnehmerAlreadyAdded", async () => {
    addZeileMock.mockRejectedValue({ code: "23505" });

    const result = await addZeileAction(undefined, form({ veranstaltungId: "v1", teilnehmerId: "t1" }));

    expect(result.error).toMatch(/bereits erfasst/);
  });

  it("should_returnErrorAndNotPersist_when_teilnehmerInactive", async () => {
    getTeilnehmerMock.mockResolvedValue({ ...person, active: false });

    const result = await addZeileAction(undefined, form({ veranstaltungId: "v1", teilnehmerId: "t1" }));

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
  it("should_closeVeranstaltung_when_statusAbgeschlossen", async () => {
    await setStatusAction(form({ id: "v1", status: "abgeschlossen" }));
    expect(setStatusMock).toHaveBeenCalledWith("v1", "abgeschlossen");
  });

  it("should_reopenVeranstaltung_when_statusOffen", async () => {
    getVeranstaltungMock.mockResolvedValue({ ...offeneVeranstaltung, status: "abgeschlossen" });
    await setStatusAction(form({ id: "v1", status: "offen" }));
    expect(setStatusMock).toHaveBeenCalledWith("v1", "offen");
  });

  it("should_notCloseTheke_when_typTheke", async () => {
    getVeranstaltungMock.mockResolvedValue({
      ...offeneVeranstaltung,
      typ: "theke",
      datum: null,
    });
    await setStatusAction(form({ id: "v1", status: "abgeschlossen" }));
    expect(setStatusMock).not.toHaveBeenCalled();
  });

  it("should_ignoreInvalidStatus_when_notInEnum", async () => {
    await setStatusAction(form({ id: "v1", status: "erledigt" }));
    expect(setStatusMock).not.toHaveBeenCalled();
  });

  it("should_rejectAndNotPersist_when_userLacksVeranstalterRole", async () => {
    authMock.mockResolvedValue(sessionWithRoles(["verwalter"]));
    await expect(setStatusAction(form({ id: "v1", status: "abgeschlossen" }))).rejects.toThrow(
      ForbiddenError,
    );
    expect(setStatusMock).not.toHaveBeenCalled();
  });

  it("should_silentlySkip_when_idMissing", async () => {
    await setStatusAction(form({ status: "abgeschlossen" }));
    expect(setStatusMock).not.toHaveBeenCalled();
  });

  it("should_silentlySkip_when_veranstaltungNotFound", async () => {
    getVeranstaltungMock.mockResolvedValue(undefined);
    await setStatusAction(form({ id: "v1", status: "abgeschlossen" }));
    expect(setStatusMock).not.toHaveBeenCalled();
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
    await expect(
      ensureThekeAction(undefined, form({ kasse: "montagsrunde" })),
    ).rejects.toThrow("Connection lost");
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

  it("should_returnErrorAndNotPersist_when_catalogItemMissing", async () => {
    getCatalogItemMock.mockResolvedValue(undefined);
    const result = await boundAction(validAdjust);
    expect(result.error).toBeDefined();
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
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await boundAction({ ...validAdjust, delta: "-1" });

    expect(adjustMengeMock).toHaveBeenCalledWith("z1", "c1", -1);
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
