import { describe, it, expect, vi, beforeEach } from "vitest";
import { hasRole, hasAnyRole, requireRole, requireAnyRole, ForbiddenError } from "./authz";
import { auth } from "@/auth";
import type { Session } from "next-auth";
import type { UserRole } from "@/db/schema";

// auth() ist die einzige externe Abhängigkeit der Guards → gemockt. auth ist überladen
// (u. a. als Middleware); für unseren Aufruf auf die reine Session-Resolver-Signatur casten.
vi.mock("@/auth", () => ({ auth: vi.fn() }));
const authMock = vi.mocked(auth as unknown as () => Promise<Session | null>);

function sessionWithRoles(roles: UserRole[]): Session {
  return { user: { roles }, expires: "2099-01-01T00:00:00.000Z" } as Session;
}

describe("hasRole", () => {
  it("should_returnTrue_when_rolesContainRequired", () => {
    expect(hasRole(["verwalter", "abrechner"], "verwalter")).toBe(true);
  });

  it("should_returnFalse_when_rolesUndefinedOrEmpty", () => {
    expect(hasRole(undefined, "verwalter")).toBe(false);
    expect(hasRole(null, "verwalter")).toBe(false);
    expect(hasRole([], "verwalter")).toBe(false);
  });

  it("should_returnFalse_when_rolesDoNotContainRequired", () => {
    expect(hasRole(["abrechner"], "verwalter")).toBe(false);
  });
});

describe("hasAnyRole", () => {
  it("should_returnTrue_when_rolesContainOneOfRequired", () => {
    expect(hasAnyRole(["abrechner"], ["verwalter", "abrechner"])).toBe(true);
  });

  it("should_returnFalse_when_rolesContainNoneOfRequired", () => {
    expect(hasAnyRole(["abrechner"], ["verwalter"])).toBe(false);
    expect(hasAnyRole(undefined, ["verwalter"])).toBe(false);
  });

  it("should_returnFalse_when_requiredIsEmpty", () => {
    // Kein erlaubter Rollen-Satz → niemand darf (fail-closed).
    expect(hasAnyRole(["verwalter", "abrechner"], [])).toBe(false);
  });
});

describe("ForbiddenError", () => {
  it("should_haveDefaultMessageAndName_when_constructedWithoutArgs", () => {
    const error = new ForbiddenError();
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("ForbiddenError");
    expect(error.message).toBe("Zugriff verweigert.");
  });
});

describe("requireRole", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should_returnSession_when_userHasRole", async () => {
    const session = sessionWithRoles(["verwalter"]);
    authMock.mockResolvedValue(session);
    await expect(requireRole("verwalter")).resolves.toBe(session);
  });

  it("should_throwForbidden_when_userLacksRole", async () => {
    authMock.mockResolvedValue(sessionWithRoles(["abrechner"]));
    await expect(requireRole("verwalter")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("should_throwForbidden_when_noSession", async () => {
    authMock.mockResolvedValue(null);
    await expect(requireRole("verwalter")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("should_logRejection_when_accessDenied", async () => {
    // AC (spec-48): Zugriff auf fremde Rolle wird protokolliert.
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    authMock.mockResolvedValue(sessionWithRoles(["abrechner"]));
    await expect(requireRole("verwalter")).rejects.toBeInstanceOf(ForbiddenError);
    expect(warnSpy).toHaveBeenCalledOnce();
    warnSpy.mockRestore();
  });
});

describe("requireAnyRole", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should_returnSession_when_userHasAnyRequiredRole", async () => {
    const session = sessionWithRoles(["abrechner"]);
    authMock.mockResolvedValue(session);
    await expect(requireAnyRole(["verwalter", "abrechner"])).resolves.toBe(session);
  });

  it("should_throwForbidden_when_userHasNoneOfRequired", async () => {
    authMock.mockResolvedValue(sessionWithRoles(["abrechner"]));
    await expect(requireAnyRole(["verwalter"])).rejects.toBeInstanceOf(ForbiddenError);
  });
});
