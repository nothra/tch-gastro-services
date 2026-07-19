import { describe, it, expect } from "vitest";
import { authConfig } from "./auth.config";

// Testet die Callback-Naht direkt (reine Funktionen, kein next-auth-Mock nötig).
// Deckt D7 (ADR-033: session.user.id aus token.sub) und den bestehenden
// authorized-/jwt-Callback ab, der zuvor ungetestet war.

type AuthorizedArgs = Parameters<NonNullable<(typeof authConfig)["callbacks"]>["authorized"]>[0];
type JwtArgs = Parameters<NonNullable<(typeof authConfig)["callbacks"]>["jwt"]>[0];
type SessionArgs = Parameters<NonNullable<(typeof authConfig)["callbacks"]>["session"]>[0];

function authorizedArgs(pathname: string, loggedIn: boolean): AuthorizedArgs {
  return {
    auth: loggedIn ? { user: { id: "u1" } } : null,
    request: { nextUrl: new URL(`https://example.test${pathname}`) },
  } as unknown as AuthorizedArgs;
}

describe("authConfig.callbacks.authorized", () => {
  it("should_denyAccess_when_notLoggedInAndNotOnLoginPage", () => {
    const result = authConfig.callbacks.authorized(authorizedArgs("/veranstaltung", false));

    expect(result).toBe(false);
  });

  it("should_allowAccess_when_loggedInAndNotOnLoginPage", () => {
    const result = authConfig.callbacks.authorized(authorizedArgs("/veranstaltung", true));

    expect(result).toBe(true);
  });

  it("should_allowLoginPage_when_notLoggedIn", () => {
    const result = authConfig.callbacks.authorized(authorizedArgs("/login", false));

    expect(result).toBe(true);
  });

  it("should_redirectAwayFromLogin_when_alreadyLoggedIn", () => {
    const result = authConfig.callbacks.authorized(authorizedArgs("/login", true));

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).headers.get("location")).toBe("https://example.test/");
  });
});

describe("authConfig.callbacks.jwt", () => {
  it("should_setRolesFromUser_when_userPresent", () => {
    const token = authConfig.callbacks.jwt({
      token: {},
      user: { roles: ["veranstalter"] },
    } as unknown as JwtArgs);

    expect(token.roles).toEqual(["veranstalter"]);
  });

  it("should_setEmptyRoles_when_userHasNoRoles", () => {
    const token = authConfig.callbacks.jwt({
      token: {},
      user: {},
    } as unknown as JwtArgs);

    expect(token.roles).toEqual([]);
  });

  it("should_keepToken_when_userMissing", () => {
    const existing = { roles: ["verwalter"] };
    const token = authConfig.callbacks.jwt({
      token: existing,
      user: undefined,
    } as unknown as JwtArgs);

    expect(token).toBe(existing);
  });
});

describe("authConfig.callbacks.session", () => {
  it("should_setRolesAndIdFromToken_when_sessionUserPresent", () => {
    const session = authConfig.callbacks.session({
      session: { user: {} },
      token: { sub: "user-42", roles: ["veranstalter"] },
    } as unknown as SessionArgs);

    expect(session.user?.roles).toEqual(["veranstalter"]);
    expect(session.user?.id).toBe("user-42");
  });

  it("should_setEmptyStringId_when_tokenSubMissing", () => {
    const session = authConfig.callbacks.session({
      session: { user: {} },
      token: {},
    } as unknown as SessionArgs);

    expect(session.user?.id).toBe("");
    expect(session.user?.roles).toEqual([]);
  });

  it("should_returnSessionUnchanged_when_sessionUserMissing", () => {
    const bareSession = {};
    const session = authConfig.callbacks.session({
      session: bareSession,
      token: { sub: "user-42" },
    } as unknown as SessionArgs);

    expect(session).toBe(bareSession);
  });
});
