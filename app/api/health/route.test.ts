import { describe, it, expect, vi, beforeEach } from "vitest";

// db.select(...).from(...).limit(1) → nur die letzte Stufe muss steuerbar sein.
// vi.hoisted, weil vi.mock über den Import gehoben wird und die Factory sonst nicht
// auf limitMock zugreifen dürfte.
const { limitMock, selectSpy, tryAcquireMock } = vi.hoisted(() => {
  const limitMock = vi.fn();
  return {
    limitMock,
    // Spy auf select, um zu belegen, dass der gedrosselte Pfad keinen DB-Read auslöst (AK-4).
    selectSpy: vi.fn(() => ({ from: () => ({ limit: limitMock }) })),
    tryAcquireMock: vi.fn(() => true),
  };
});
vi.mock("@/db", () => ({
  db: { select: selectSpy },
}));
vi.mock("@/lib/rate-limit", () => ({
  healthRateLimiter: { tryAcquire: tryAcquireMock },
}));

import { GET } from "./route";

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: Rate-Limit lässt durch → 200/503-Pfade prüfen den DB-Read.
    tryAcquireMock.mockReturnValue(true);
  });

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

  it("should_return429ThrottledWithoutDbRead_when_rateLimitExceeded", async () => {
    tryAcquireMock.mockReturnValue(false);
    const res = await GET();
    expect(res.status).toBe(429);
    await expect(res.json()).resolves.toEqual({ status: "throttled" });
    // Kernbeleg für AK-4/FS-3: der Throttle-Pfad berührt die DB nicht.
    expect(selectSpy).not.toHaveBeenCalled();
  });
});
