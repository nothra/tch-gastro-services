// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// Testet die sicherheitskritische Kompositions-Naht in proxy.ts (#164): Die NextAuth-Middleware
// wird gewrappt und ihre Antwort nur auf RSC-/Prefetch-GETs vom rotierenden Session-Cookie befreit.
// next-auth wird gemockt (die echten Helfer isRscRequest/stripSessionRotation laufen real), damit
// das Verhalten der Verdrahtung – nicht NextAuth selbst – geprüft wird.
const fakeAuth = vi.fn();
vi.mock("next-auth", () => ({ default: () => ({ auth: fakeAuth }) }));

// proxy.ts ruft NextAuth(authConfig) beim Import → nach dem Mock importieren.
const { default: proxy } = await import("./proxy");

function request(method: string, headers: Record<string, string>) {
  return { method, headers: new Headers(headers) } as unknown as Parameters<typeof proxy>[0];
}

function responseWithSession() {
  const res = new Response(null);
  res.headers.append("set-cookie", "__Secure-authjs.session-token=rotated; Path=/; HttpOnly");
  res.headers.append("set-cookie", "__Host-authjs.csrf-token=keep; Path=/; HttpOnly");
  return res;
}

const hasSessionCookie = (res: Response) =>
  res.headers.getSetCookie().some((c) => c.startsWith("__Secure-authjs.session-token="));

describe("proxy – Prefetch-Session-Guard (Kompositions-Naht)", () => {
  beforeEach(() => vi.resetAllMocks());

  it("should_stripSessionCookie_when_rscGetRequest", async () => {
    fakeAuth.mockResolvedValue(responseWithSession());

    const res = (await proxy(request("GET", { "next-url": "/" }), {} as never)) as Response;

    expect(hasSessionCookie(res)).toBe(false);
    // CSRF bleibt – nur das Session-Token wird entfernt.
    expect(res.headers.getSetCookie().some((c) => c.startsWith("__Host-authjs.csrf-token="))).toBe(
      true,
    );
  });

  it("should_keepSessionCookie_when_documentGetRequest", async () => {
    fakeAuth.mockResolvedValue(responseWithSession());

    const res = (await proxy(
      request("GET", { "sec-fetch-dest": "document" }),
      {} as never,
    )) as Response;

    expect(hasSessionCookie(res)).toBe(true);
  });

  it("should_keepSessionCookie_when_postRequest", async () => {
    // Login/Logout laufen als POST – ihr Set-Cookie darf nie gestrippt werden.
    fakeAuth.mockResolvedValue(responseWithSession());

    const res = (await proxy(request("POST", { "next-url": "/" }), {} as never)) as Response;

    expect(hasSessionCookie(res)).toBe(true);
  });

  it("should_passThrough_when_authReturnsNoResponse", async () => {
    fakeAuth.mockResolvedValue(undefined);

    const res = await proxy(request("GET", { "next-url": "/" }), {} as never);

    expect(res).toBeUndefined();
  });
});
