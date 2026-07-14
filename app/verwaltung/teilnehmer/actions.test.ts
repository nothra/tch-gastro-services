import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Session } from "next-auth";
import type { Teilnehmer } from "@/db/schema";
import { ForbiddenError } from "@/lib/authz";

// Gemockt wird die externe Grenze (auth()) sowie Data-Layer und Cache. Der Rollen-Guard
// selbst (lib/authz) läuft echt – er gehört zur selben Server-Schicht und wird über die
// auth()-Session gesteuert (Testing-Standards: keine Mocks interner Klassen der Schicht).
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/db/teilnehmer", () => ({
  createTeilnehmer: vi.fn(),
  updateTeilnehmer: vi.fn(),
  setTeilnehmerActive: vi.fn(),
  findActiveByName: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/auth";
import {
  createTeilnehmer,
  findActiveByName,
  setTeilnehmerActive,
  updateTeilnehmer,
} from "@/db/teilnehmer";
import {
  createTeilnehmerAction,
  setTeilnehmerActiveAction,
  updateTeilnehmerAction,
} from "./actions";

const authMock = vi.mocked(auth as unknown as () => Promise<Session | null>);
const createTeilnehmerMock = vi.mocked(createTeilnehmer);
const updateTeilnehmerMock = vi.mocked(updateTeilnehmer);
const setTeilnehmerActiveMock = vi.mocked(setTeilnehmerActive);
const findActiveByNameMock = vi.mocked(findActiveByName);

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
}

function sessionWithRoles(roles: string[]): Session {
  return { user: { roles }, expires: "2099-01-01T00:00:00.000Z" } as Session;
}

const existing: Teilnehmer = {
  id: "dup-1",
  name: "Familie Müller",
  typ: "familie",
  mitglied: true,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const validFields = {
  name: "Familie Müller",
  typ: "familie",
  mitglied: "on",
};

beforeEach(() => {
  vi.clearAllMocks();
  // Standard: angemeldeter Verwalter (Guard lässt durch). Einzelne Tests überschreiben das.
  authMock.mockResolvedValue(sessionWithRoles(["verwalter"]));
  // Standard: kein Namensduplikat. Duplikat-Tests überschreiben das gezielt.
  findActiveByNameMock.mockResolvedValue(undefined);
  // Guard protokolliert Ablehnungen via console.warn (spec-48) – im Test stummschalten.
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("createTeilnehmerAction", () => {
  it("should_createTeilnehmer_when_inputValid", async () => {
    const result = await createTeilnehmerAction(undefined, form(validFields));

    expect(result).toEqual({ ok: true });
    expect(createTeilnehmerMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Familie Müller", typ: "familie", mitglied: true }),
    );
  });

  it("should_defaultMitgliedToFalse_when_checkboxOmitted", async () => {
    const { mitglied, ...withoutMitglied } = validFields;
    void mitglied;

    await createTeilnehmerAction(undefined, form({ ...withoutMitglied, typ: "person" }));

    expect(createTeilnehmerMock).toHaveBeenCalledWith(
      expect.objectContaining({ mitglied: false, typ: "person" }),
    );
  });

  it("should_rejectAndNotPersist_when_userLacksVerwalterRole", async () => {
    authMock.mockResolvedValue(sessionWithRoles(["abrechner"]));

    await expect(createTeilnehmerAction(undefined, form(validFields))).rejects.toThrow(
      ForbiddenError,
    );
    expect(createTeilnehmerMock).not.toHaveBeenCalled();
  });

  it("should_returnError_when_nameEmpty", async () => {
    const result = await createTeilnehmerAction(undefined, form({ ...validFields, name: "   " }));

    expect(result.error).toBeDefined();
    expect(createTeilnehmerMock).not.toHaveBeenCalled();
  });

  it("should_warnWithoutPersisting_when_activeNameDuplicateAndNotConfirmed", async () => {
    findActiveByNameMock.mockResolvedValue(existing);

    const result = await createTeilnehmerAction(undefined, form(validFields));

    expect(result.needsConfirm).toBe(true);
    expect(result.warning).toMatch(/existiert bereits/);
    expect(createTeilnehmerMock).not.toHaveBeenCalled();
  });

  it("should_createDespiteDuplicate_when_confirmDuplicateTrue", async () => {
    findActiveByNameMock.mockResolvedValue(existing);

    const result = await createTeilnehmerAction(
      undefined,
      form({ ...validFields, confirmDuplicate: "true" }),
    );

    expect(result).toEqual({ ok: true });
    expect(findActiveByNameMock).not.toHaveBeenCalled();
    expect(createTeilnehmerMock).toHaveBeenCalled();
  });
});

describe("updateTeilnehmerAction", () => {
  it("should_updateTeilnehmer_when_idAndInputValid", async () => {
    const result = await updateTeilnehmerAction(undefined, form({ ...validFields, id: "abc" }));

    expect(result).toEqual({ ok: true });
    expect(updateTeilnehmerMock).toHaveBeenCalledWith(
      "abc",
      expect.objectContaining({ name: "Familie Müller", typ: "familie" }),
    );
  });

  it("should_returnError_when_idMissing", async () => {
    const result = await updateTeilnehmerAction(undefined, form(validFields));

    expect(result.error).toBeDefined();
    expect(updateTeilnehmerMock).not.toHaveBeenCalled();
  });

  it("should_rejectAndNotPersist_when_userLacksVerwalterRole", async () => {
    authMock.mockResolvedValue(sessionWithRoles(["abrechner"]));

    await expect(
      updateTeilnehmerAction(undefined, form({ ...validFields, id: "abc" })),
    ).rejects.toThrow(ForbiddenError);
    expect(updateTeilnehmerMock).not.toHaveBeenCalled();
  });

  it("should_returnError_when_nameEmpty", async () => {
    const result = await updateTeilnehmerAction(
      undefined,
      form({ ...validFields, id: "abc", name: "   " }),
    );

    expect(result.error).toBeDefined();
    expect(updateTeilnehmerMock).not.toHaveBeenCalled();
  });
});

describe("setTeilnehmerActiveAction", () => {
  it("should_deactivate_when_activeFalse", async () => {
    await setTeilnehmerActiveAction(form({ id: "abc", active: "false" }));
    expect(setTeilnehmerActiveMock).toHaveBeenCalledWith("abc", false);
  });

  it("should_reactivate_when_activeTrue", async () => {
    await setTeilnehmerActiveAction(form({ id: "abc", active: "true" }));
    expect(setTeilnehmerActiveMock).toHaveBeenCalledWith("abc", true);
  });

  it("should_rejectAndNotPersist_when_userLacksVerwalterRole", async () => {
    authMock.mockResolvedValue(sessionWithRoles(["abrechner"]));

    await expect(
      setTeilnehmerActiveAction(form({ id: "abc", active: "false" })),
    ).rejects.toThrow(ForbiddenError);
    expect(setTeilnehmerActiveMock).not.toHaveBeenCalled();
  });
});
