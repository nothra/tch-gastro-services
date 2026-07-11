import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import { verifyCredentials, type CredentialUser } from "./credentials";

// bcrypt ist die einzige externe Abhängigkeit → gemockt (deterministisch, kein echtes Hashing).
vi.mock("bcryptjs", () => ({ default: { compare: vi.fn() } }));
const compareMock = vi.mocked(bcrypt.compare as (s: string, h: string) => Promise<boolean>);

const user: CredentialUser = {
  id: "u1",
  email: "verwalter@tch.de",
  name: "Verwalter",
  roles: ["verwalter"],
  passwordHash: "$2b$10$existing-user-hash",
};

describe("verifyCredentials", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should_returnUser_when_credentialsValid", async () => {
    compareMock.mockResolvedValue(true);
    await expect(verifyCredentials(user, "correct")).resolves.toEqual({
      id: "u1",
      email: "verwalter@tch.de",
      name: "Verwalter",
      roles: ["verwalter"],
    });
  });

  it("should_returnNull_when_passwordWrong", async () => {
    compareMock.mockResolvedValue(false);
    await expect(verifyCredentials(user, "wrong")).resolves.toBeNull();
  });

  it("should_returnNull_when_userUndefined", async () => {
    compareMock.mockResolvedValue(false);
    await expect(verifyCredentials(undefined, "any")).resolves.toBeNull();
  });

  // Kern des Timing-Fixes (spec-48, User-Enumeration): bcrypt.compare läuft auch ohne
  // Nutzer (gegen den Dummy-Hash) → keine messbare Laufzeitdifferenz.
  it("should_runBcryptCompare_even_when_userUndefined", async () => {
    compareMock.mockResolvedValue(false);
    await verifyCredentials(undefined, "any");
    expect(compareMock).toHaveBeenCalledOnce();
  });

  it("should_returnNull_and_runCompare_when_userHasNoPasswordHash", async () => {
    compareMock.mockResolvedValue(true); // selbst bei "true" kein Zugang ohne echten Hash
    await expect(verifyCredentials({ ...user, passwordHash: null }, "any")).resolves.toBeNull();
    expect(compareMock).toHaveBeenCalledOnce();
  });
});
