import { describe, it, expect, vi, beforeEach } from "vitest";

// db.select(...).from(...).limit(1) → nur die letzte Stufe muss steuerbar sein.
// vi.hoisted, weil vi.mock über den Import gehoben wird und die Factory sonst nicht
// auf limitMock zugreifen dürfte.
const { limitMock } = vi.hoisted(() => ({ limitMock: vi.fn() }));
vi.mock("@/db", () => ({
  db: { select: () => ({ from: () => ({ limit: limitMock }) }) },
}));

import { GET } from "./route";

describe("GET /api/health", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should_return200Ok_when_dbReachableAndSchemaValid", async () => {
    limitMock.mockResolvedValue([{ roles: ["verwalter"] }]);
    const res = await GET();
    expect(res.status).toBe(200);
    // Strikt (toEqual, nicht toMatchObject): stellt sicher, dass KEINE DB-Daten (roles) leaken.
    await expect(res.json()).resolves.toEqual({ status: "ok", stage: "dev" });
  });

  it("should_return503Error_when_dbQueryFails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    limitMock.mockRejectedValue(new Error('column "roles" does not exist'));
    const res = await GET();
    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({ status: "error" });
    expect(errorSpy).toHaveBeenCalledOnce();
    errorSpy.mockRestore();
  });
});
