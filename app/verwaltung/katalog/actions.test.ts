import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Session } from "next-auth";
import { ForbiddenError } from "@/lib/authz";

// Gemockt wird die externe Grenze (auth()) sowie Data-Layer und Cache. Der Rollen-Guard
// selbst (lib/authz) läuft echt – er gehört zur selben Server-Schicht und wird über die
// auth()-Session gesteuert (Testing-Standards: keine Mocks interner Klassen der Schicht).
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/db/catalog", () => ({
  createItem: vi.fn(),
  updateItem: vi.fn(),
  setItemActive: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/auth";
import { createItem, setItemActive, updateItem } from "@/db/catalog";
import {
  createCatalogItemAction,
  setCatalogItemActiveAction,
  updateCatalogItemAction,
} from "./actions";

const authMock = vi.mocked(auth as unknown as () => Promise<Session | null>);
const createItemMock = vi.mocked(createItem);
const updateItemMock = vi.mocked(updateItem);
const setItemActiveMock = vi.mocked(setItemActive);

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
}

function sessionWithRoles(roles: string[]): Session {
  return { user: { roles }, expires: "2099-01-01T00:00:00.000Z" } as Session;
}

const validFields = {
  name: "Cola",
  size: "0,5 l",
  priceCents: "2,10",
  category: "getraenk",
  sortOrder: "10",
};

beforeEach(() => {
  vi.clearAllMocks();
  // Standard: angemeldeter Verwalter (Guard lässt durch). Einzelne Tests überschreiben das.
  authMock.mockResolvedValue(sessionWithRoles(["verwalter"]));
  // Guard protokolliert Ablehnungen via console.warn (spec-48) – im Test stummschalten.
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("createCatalogItemAction", () => {
  it("should_createItemWithCents_when_inputValid", async () => {
    const result = await createCatalogItemAction(undefined, form(validFields));

    expect(result).toEqual({ ok: true });
    expect(createItemMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Cola", size: "0,5 l", priceCents: 210, category: "getraenk" }),
    );
  });

  it("should_rejectAndNotPersist_when_userLacksVerwalterRole", async () => {
    authMock.mockResolvedValue(sessionWithRoles(["abrechner"]));

    await expect(createCatalogItemAction(undefined, form(validFields))).rejects.toThrow(
      ForbiddenError,
    );
    expect(createItemMock).not.toHaveBeenCalled();
  });

  it("should_returnError_when_priceInvalid", async () => {
    const result = await createCatalogItemAction(undefined, form({ ...validFields, priceCents: "2,105" }));

    expect(result.error).toBeDefined();
    expect(createItemMock).not.toHaveBeenCalled();
  });

  it("should_returnDuplicateMessage_when_uniqueViolation", async () => {
    createItemMock.mockRejectedValue(Object.assign(new Error("dup"), { code: "23505" }));

    const result = await createCatalogItemAction(undefined, form(validFields));

    expect(result.error).toMatch(/existiert bereits/);
  });

  it("should_rethrow_when_unexpectedDbError", async () => {
    createItemMock.mockRejectedValue(new Error("boom"));

    await expect(createCatalogItemAction(undefined, form(validFields))).rejects.toThrow("boom");
  });
});

describe("updateCatalogItemAction", () => {
  it("should_updateItem_when_idAndInputValid", async () => {
    const result = await updateCatalogItemAction(undefined, form({ ...validFields, id: "abc" }));

    expect(result).toEqual({ ok: true });
    expect(updateItemMock).toHaveBeenCalledWith(
      "abc",
      expect.objectContaining({ priceCents: 210 }),
    );
  });

  it("should_returnError_when_idMissing", async () => {
    const result = await updateCatalogItemAction(undefined, form(validFields));

    expect(result.error).toBeDefined();
    expect(updateItemMock).not.toHaveBeenCalled();
  });

  it("should_rejectAndNotPersist_when_userLacksVerwalterRole", async () => {
    authMock.mockResolvedValue(sessionWithRoles(["abrechner"]));

    await expect(
      updateCatalogItemAction(undefined, form({ ...validFields, id: "abc" })),
    ).rejects.toThrow(ForbiddenError);
    expect(updateItemMock).not.toHaveBeenCalled();
  });

  it("should_returnError_when_priceInvalid", async () => {
    const result = await updateCatalogItemAction(
      undefined,
      form({ ...validFields, id: "abc", priceCents: "2,105" }),
    );

    expect(result.error).toBeDefined();
    expect(updateItemMock).not.toHaveBeenCalled();
  });

  it("should_returnDuplicateMessage_when_uniqueViolation", async () => {
    updateItemMock.mockRejectedValue(Object.assign(new Error("dup"), { code: "23505" }));

    const result = await updateCatalogItemAction(undefined, form({ ...validFields, id: "abc" }));

    expect(result.error).toMatch(/existiert bereits/);
  });

  it("should_rethrow_when_unexpectedDbError", async () => {
    updateItemMock.mockRejectedValue(new Error("boom"));

    await expect(
      updateCatalogItemAction(undefined, form({ ...validFields, id: "abc" })),
    ).rejects.toThrow("boom");
  });
});

describe("setCatalogItemActiveAction", () => {
  it("should_deactivate_when_activeFalse", async () => {
    await setCatalogItemActiveAction(form({ id: "abc", active: "false" }));
    expect(setItemActiveMock).toHaveBeenCalledWith("abc", false);
  });

  it("should_reactivate_when_activeTrue", async () => {
    await setCatalogItemActiveAction(form({ id: "abc", active: "true" }));
    expect(setItemActiveMock).toHaveBeenCalledWith("abc", true);
  });

  it("should_rejectAndNotPersist_when_userLacksVerwalterRole", async () => {
    authMock.mockResolvedValue(sessionWithRoles(["abrechner"]));

    await expect(setCatalogItemActiveAction(form({ id: "abc", active: "false" }))).rejects.toThrow(
      ForbiddenError,
    );
    expect(setItemActiveMock).not.toHaveBeenCalled();
  });
});
