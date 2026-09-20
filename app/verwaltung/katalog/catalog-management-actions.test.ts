import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Session } from "next-auth";
import { ForbiddenError } from "@/lib/authz";

// Gemockt wird die externe Grenze (auth()) sowie Data-Layer und Cache – wie in actions.test.ts.
// Diese Datei deckt die Katalog-Management-Actions ab (#345), die dort bislang ungetestet waren:
// nur die Data-Layer-Funktionen (`createCatalog` etc.) hatten Integrationstests in
// db/catalog.test.ts, die Action-Ebene (Rollen-Guard, Fehlermapping, Validierung) nicht.
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/db/catalog", () => ({
  createCatalog: vi.fn(),
  renameCatalog: vi.fn(),
  setCatalogActive: vi.fn(),
  duplicateCatalog: vi.fn(),
  getCatalogById: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import {
  createCatalog,
  renameCatalog,
  setCatalogActive,
  duplicateCatalog,
  getCatalogById,
} from "@/db/catalog";
import type { Catalog } from "@/db/schema";
import {
  createCatalogAction,
  renameCatalogAction,
  setCatalogActiveAction,
  duplicateCatalogAction,
} from "./actions";

const authMock = vi.mocked(auth as unknown as () => Promise<Session | null>);
const createCatalogMock = vi.mocked(createCatalog);
const renameCatalogMock = vi.mocked(renameCatalog);
const setCatalogActiveMock = vi.mocked(setCatalogActive);
const duplicateCatalogMock = vi.mocked(duplicateCatalog);
const getCatalogByIdMock = vi.mocked(getCatalogById);
const revalidatePathMock = vi.mocked(revalidatePath);

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
}

function sessionWithRoles(roles: string[]): Session {
  return { user: { roles }, expires: "2099-01-01T00:00:00.000Z" } as Session;
}

const uniqueViolation = Object.assign(new Error("dup"), { code: "23505" });

const activeCatalog: Catalog = {
  id: "cat-1",
  name: "Montagsrunde",
  active: true,
  sortOrder: 0,
  createdAt: new Date("2026-09-17T00:00:00.000Z"),
  updatedAt: new Date("2026-09-17T00:00:00.000Z"),
};

const inactiveCatalog: Catalog = { ...activeCatalog, id: "cat-2", active: false };

beforeEach(() => {
  vi.resetAllMocks();
  authMock.mockResolvedValue(sessionWithRoles(["verwalter"]));
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("createCatalogAction", () => {
  it("should_createCatalog_when_nameValid", async () => {
    createCatalogMock.mockResolvedValue(activeCatalog);

    const result = await createCatalogAction(undefined, form({ name: "Dorfmeisterschaften" }));

    expect(result).toEqual({ ok: true });
    expect(createCatalogMock).toHaveBeenCalledWith("Dorfmeisterschaften");
    expect(revalidatePathMock).toHaveBeenCalledWith("/verwaltung/katalog");
  });

  it("should_returnError_when_nameEmpty", async () => {
    const result = await createCatalogAction(undefined, form({ name: "  " }));

    expect(result.error).toBeDefined();
    expect(createCatalogMock).not.toHaveBeenCalled();
  });

  it("should_returnDuplicateMessage_when_uniqueViolation", async () => {
    createCatalogMock.mockRejectedValue(uniqueViolation);

    const result = await createCatalogAction(undefined, form({ name: "Montagsrunde" }));

    expect(result).toEqual({ error: "Ein Katalog mit diesem Namen existiert bereits." });
  });

  it("should_rejectAndNotPersist_when_userLacksVerwalterRole", async () => {
    authMock.mockResolvedValue(sessionWithRoles(["veranstalter"]));

    await expect(
      createCatalogAction(undefined, form({ name: "Dorfmeisterschaften" })),
    ).rejects.toThrow(ForbiddenError);
    expect(createCatalogMock).not.toHaveBeenCalled();
  });
});

describe("renameCatalogAction", () => {
  it("should_renameCatalog_when_idAndNameValid", async () => {
    renameCatalogMock.mockResolvedValue(activeCatalog);

    const result = await renameCatalogAction(undefined, form({ id: "cat-1", name: "Neuer Name" }));

    expect(result).toEqual({ ok: true });
    expect(renameCatalogMock).toHaveBeenCalledWith("cat-1", "Neuer Name");
  });

  it("should_returnError_when_idMissing", async () => {
    const result = await renameCatalogAction(undefined, form({ name: "Neuer Name" }));

    expect(result.error).toBeDefined();
    expect(renameCatalogMock).not.toHaveBeenCalled();
  });

  it("should_returnNotFound_when_renameMatchesNoRow", async () => {
    renameCatalogMock.mockResolvedValue(undefined);

    const result = await renameCatalogAction(undefined, form({ id: "weg", name: "Neuer Name" }));

    expect(result).toEqual({ error: "Katalog nicht gefunden." });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("should_returnDuplicateMessage_when_uniqueViolation", async () => {
    renameCatalogMock.mockRejectedValue(uniqueViolation);

    const result = await renameCatalogAction(
      undefined,
      form({ id: "cat-1", name: "Montagsrunde" }),
    );

    expect(result).toEqual({ error: "Ein Katalog mit diesem Namen existiert bereits." });
  });

  it("should_rejectAndNotPersist_when_userLacksVerwalterRole", async () => {
    authMock.mockResolvedValue(sessionWithRoles(["veranstalter"]));

    await expect(
      renameCatalogAction(undefined, form({ id: "cat-1", name: "Neuer Name" })),
    ).rejects.toThrow(ForbiddenError);
    expect(renameCatalogMock).not.toHaveBeenCalled();
  });
});

describe("setCatalogActiveAction", () => {
  it("should_deactivateCatalog_when_activeFalse", async () => {
    setCatalogActiveMock.mockResolvedValue({ ...activeCatalog, active: false });

    const result = await setCatalogActiveAction(undefined, form({ id: "cat-1", active: "false" }));

    expect(result).toEqual({ ok: true });
    expect(setCatalogActiveMock).toHaveBeenCalledWith("cat-1", false);
  });

  it("should_returnError_when_idMissing", async () => {
    const result = await setCatalogActiveAction(undefined, form({ active: "false" }));

    expect(result.error).toBeDefined();
    expect(setCatalogActiveMock).not.toHaveBeenCalled();
  });

  it("should_returnNotFound_when_setActiveMatchesNoRow", async () => {
    setCatalogActiveMock.mockResolvedValue(undefined);

    const result = await setCatalogActiveAction(undefined, form({ id: "weg", active: "false" }));

    expect(result).toEqual({ error: "Katalog nicht gefunden." });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("should_rejectAndNotPersist_when_userLacksVerwalterRole", async () => {
    authMock.mockResolvedValue(sessionWithRoles(["veranstalter"]));

    await expect(
      setCatalogActiveAction(undefined, form({ id: "cat-1", active: "false" })),
    ).rejects.toThrow(ForbiddenError);
    expect(setCatalogActiveMock).not.toHaveBeenCalled();
  });
});

// Review-Finding #345 Runde 1 (Kritisch 1/2/3): `duplicateCatalogAction` warf bei
// CATALOG_NOT_FOUND/SOURCE_CATALOG_INACTIVE einen unkontrollierten Server-Error (statt einer
// Nutzermeldung), weil beide Fälle innerhalb von `runWithUniqueCheck` geworfen wurden, das nur
// Unique-Violations abfängt. Diese Tests reproduzieren genau das (RED vor dem Fix).
describe("duplicateCatalogAction", () => {
  it("should_duplicateCatalog_when_sourceActiveAndNameValid", async () => {
    getCatalogByIdMock.mockResolvedValue(activeCatalog);
    duplicateCatalogMock.mockResolvedValue({
      catalog: { ...activeCatalog, id: "cat-3" },
      itemCount: 2,
    });

    const result = await duplicateCatalogAction(
      undefined,
      form({ sourceId: "cat-1", name: "Kopie" }),
    );

    expect(result).toEqual({ ok: true });
    expect(duplicateCatalogMock).toHaveBeenCalledWith("cat-1", "Kopie");
    expect(revalidatePathMock).toHaveBeenCalledWith("/verwaltung/katalog");
  });

  it("should_returnError_when_sourceIdMissing", async () => {
    const result = await duplicateCatalogAction(undefined, form({ name: "Kopie" }));

    expect(result.error).toBeDefined();
    expect(getCatalogByIdMock).not.toHaveBeenCalled();
  });

  it("should_returnError_when_nameEmpty", async () => {
    const result = await duplicateCatalogAction(undefined, form({ sourceId: "cat-1", name: " " }));

    expect(result.error).toBeDefined();
    expect(getCatalogByIdMock).not.toHaveBeenCalled();
  });

  it("should_returnNotFoundMessage_notCrash_when_sourceCatalogDoesNotExist", async () => {
    getCatalogByIdMock.mockResolvedValue(undefined);

    const result = await duplicateCatalogAction(
      undefined,
      form({ sourceId: "does-not-exist", name: "Kopie" }),
    );

    expect(result).toEqual({ error: "Katalog nicht gefunden." });
    expect(duplicateCatalogMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("should_returnInactiveSourceMessage_notCrash_when_sourceCatalogIsInactive", async () => {
    getCatalogByIdMock.mockResolvedValue(inactiveCatalog);

    const result = await duplicateCatalogAction(
      undefined,
      form({ sourceId: inactiveCatalog.id, name: "Kopie" }),
    );

    // Vor dem Fix: dieser Fall wurde als Error geworfen und von runWithUniqueCheck nicht
    // gefangen (isUniqueViolation === false) – die Action crashte statt eine Nutzermeldung
    // zurückzugeben. Die Meldung muss außerdem spezifisch sein, nicht die generische
    // Duplikat-Message (Kritisch 2).
    expect(result).toEqual({ error: "Der Quell-Katalog ist nicht aktiv." });
    expect(duplicateCatalogMock).not.toHaveBeenCalled();
  });

  it("should_returnCatalogDuplicateMessage_when_targetNameAlreadyExists", async () => {
    getCatalogByIdMock.mockResolvedValue(activeCatalog);
    duplicateCatalogMock.mockRejectedValue(uniqueViolation);

    const result = await duplicateCatalogAction(
      undefined,
      form({ sourceId: "cat-1", name: "Montagsrunde" }),
    );

    // Muss die katalogspezifische Meldung sein, nicht die generische Artikel-Duplikat-Message
    // aus `runWithUniqueCheck`'s Default (Kritisch 2).
    expect(result).toEqual({ error: "Ein Katalog mit diesem Namen existiert bereits." });
  });

  it("should_rejectAndNotPersist_when_userLacksVerwalterRole", async () => {
    authMock.mockResolvedValue(sessionWithRoles(["veranstalter"]));

    await expect(
      duplicateCatalogAction(undefined, form({ sourceId: "cat-1", name: "Kopie" })),
    ).rejects.toThrow(ForbiddenError);
    expect(getCatalogByIdMock).not.toHaveBeenCalled();
  });
});
