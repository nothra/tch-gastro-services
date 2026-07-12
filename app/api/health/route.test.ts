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
    await expect(res.json()).resolves.toMatchObject({ status: "ok" });
  });

  it("should_return503Error_when_dbQueryFails", async () => {
    limitMock.mockRejectedValue(new Error('column "roles" does not exist'));
    const res = await GET();
    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toMatchObject({ status: "error" });
  });
});
