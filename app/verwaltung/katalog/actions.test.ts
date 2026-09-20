import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Session } from "next-auth";
import { ForbiddenError } from "@/lib/authz";

// Gemockt wird die externe Grenze (auth()) sowie Data-Layer und Cache. Der Rollen-Guard
// selbst (lib/authz) läuft echt – er gehört zur selben Server-Schicht und wird über die
// auth()-Session gesteuert (Testing-Standards: keine Mocks interner Klassen der Schicht).
vi.mock("@/auth", () => ({ auth: vi.fn() }));
// Der Mock ersetzt das ganze Modul – die Konstante muss mitgeliefert werden, sonst reichten die
// Actions `undefined` als Katalogbezug durch und die Wiring-Assertionen unten wären wertlos.
vi.mock("@/db/catalog", () => ({
  createItem: vi.fn(),
  updateItem: vi.fn(),
  setItemActive: vi.fn(),
  STANDARD_CATALOG_ID: "standard",
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { createItem, setItemActive, updateItem } from "@/db/catalog";
import type { CatalogItem } from "@/db/schema";
import {
  createCatalogItemAction,
  setCatalogItemActiveAction,
  updateCatalogItemAction,
} from "./actions";

const authMock = vi.mocked(auth as unknown as () => Promise<Session | null>);
const createItemMock = vi.mocked(createItem);
const updateItemMock = vi.mocked(updateItem);
const setItemActiveMock = vi.mocked(setItemActive);
const revalidatePathMock = vi.mocked(revalidatePath);

// Treffer-Rückgabe der guarded UPDATEs. Ohne sie bliebe der Mock-Default `undefined` und
// verdeckte den No-Match-Zweig, den die Action seit #59 auswertet (Lesson „Mock-Default").
const persistedItem: CatalogItem = {
  id: "abc",
  catalogId: "standard",
  name: "Cola",
  size: "0,5 l",
  priceCents: 210,
  category: "getraenk",
  sortOrder: 10,
  active: true,
  createdAt: new Date("2026-09-17T00:00:00.000Z"),
  updatedAt: new Date("2026-09-17T00:00:00.000Z"),
};

// Soll-Wert als Literal, nicht aus dem Mock gelesen (Testing-Standards). Der Drift-Guard in
// db/catalog.test.ts hält Produktions-Konstante und Migrations-Literal gegeneinander – er liest
// dieses Literal hier nicht mit; es ist unabhängig auf denselben Wert gesetzt.
const STANDARD_CATALOG_ID = "standard";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
}

function sessionWithRoles(roles: string[]): Session {
  return { user: { roles }, expires: "2099-01-01T00:00:00.000Z" } as Session;
}

const validFields = {
  catalogId: "standard", // (#345) catalogId ist jetzt erforderlich
  name: "Cola",
  size: "0,5 l",
  priceCents: "2,10",
  category: "getraenk",
  sortOrder: "10",
};

beforeEach(() => {
  vi.resetAllMocks();
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
      STANDARD_CATALOG_ID,
      expect.objectContaining({
        name: "Cola",
        size: "0,5 l",
        priceCents: 210,
        category: "getraenk",
      }),
    );
  });

  it("should_notPassCatalogIdToDataLayer_when_catalogIdInFormData", async () => {
    // (#345) catalogId kommt jetzt aus FormData (von der Seite `/verwaltung/katalog/[id]`),
    // wird aber nicht an die Data-Layer weitergegeben – nur zur Parametrisierung der Action.
    const result = await createCatalogItemAction(undefined, form(validFields));

    expect(result).toEqual({ ok: true });
    const [, data] = createItemMock.mock.calls[0];
    expect(data).not.toHaveProperty("catalogId");
  });

  it("should_rejectAndNotPersist_when_userLacksVerwalterRole", async () => {
    authMock.mockResolvedValue(sessionWithRoles(["veranstalter"]));

    await expect(createCatalogItemAction(undefined, form(validFields))).rejects.toThrow(
      ForbiddenError,
    );
    expect(createItemMock).not.toHaveBeenCalled();
  });

  it("should_returnError_when_priceInvalid", async () => {
    const result = await createCatalogItemAction(
      undefined,
      form({ ...validFields, priceCents: "2,105" }),
    );

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
    updateItemMock.mockResolvedValue(persistedItem);

    const result = await updateCatalogItemAction(undefined, form({ ...validFields, id: "abc" }));

    expect(result).toEqual({ ok: true });
    expect(updateItemMock).toHaveBeenCalledWith(
      "abc",
      STANDARD_CATALOG_ID,
      expect.objectContaining({ priceCents: 210 }),
    );
  });

  it("should_returnNotFoundAndNotRevalidate_when_updateMatchesNoRow", async () => {
    // Guarded UPDATE (Kern-Kurzregel 1, Lesson #55): `updateItem` liefert `undefined`, wenn der
    // Parent-Key im WHERE keine Zeile trifft – unbekannte `id` aus `FormData` oder ein Artikel
    // aus einem fremden Katalog. Ohne Auswertung meldete die Action Erfolg für einen
    // Schreibvorgang, der nicht stattgefunden hat.
    updateItemMock.mockResolvedValue(undefined);

    const result = await updateCatalogItemAction(undefined, form({ ...validFields, id: "weg" }));

    expect(result).toEqual({ error: "Artikel nicht gefunden." });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("should_returnError_when_idMissing", async () => {
    const result = await updateCatalogItemAction(
      undefined,
      form({ name: "Cola", size: "0,5 l", priceCents: "2,10", category: "getraenk", catalogId: "standard" }),
    );

    expect(result.error).toBeDefined();
    expect(updateItemMock).not.toHaveBeenCalled();
  });

  it("should_rejectAndNotPersist_when_userLacksVerwalterRole", async () => {
    authMock.mockResolvedValue(sessionWithRoles(["veranstalter"]));

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
    await setCatalogItemActiveAction(form({ id: "abc", catalogId: "standard", active: "false" }));
    expect(setItemActiveMock).toHaveBeenCalledWith("abc", STANDARD_CATALOG_ID, false);
  });

  it("should_reactivate_when_activeTrue", async () => {
    await setCatalogItemActiveAction(form({ id: "abc", catalogId: "standard", active: "true" }));
    expect(setItemActiveMock).toHaveBeenCalledWith("abc", STANDARD_CATALOG_ID, true);
  });

  it("should_rejectAndNotPersist_when_userLacksVerwalterRole", async () => {
    authMock.mockResolvedValue(sessionWithRoles(["veranstalter"]));

    await expect(setCatalogItemActiveAction(form({ id: "abc", active: "false" }))).rejects.toThrow(
      ForbiddenError,
    );
    expect(setItemActiveMock).not.toHaveBeenCalled();
  });
});
