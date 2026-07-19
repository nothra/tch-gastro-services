// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// Testet die sicherheitskritische Kompositions-Naht in proxy.ts (#164, #170 / ADR-032): Die
// NextAuth-Middleware wird gewrappt und ihre Antwort auf allen nicht-mutierenden Methoden vom
// rotierenden Session-Cookie befreit. next-auth wird gemockt (die echten Helfer
// shouldSuppressSessionRotation/stripSessionRotation laufen real), damit das Verhalten der
// Verdrahtung – nicht NextAuth selbst – geprüft wird. Deckt AC1–AC4 auf Proxy-Ebene ab.
const fakeAuth = vi.fn();
vi.mock("next-auth", () => ({ default: () => ({ auth: fakeAuth }) }));

// proxy.ts ruft NextAuth(authConfig) beim Import → nach dem Mock importieren.
const { default: proxy } = await import("./proxy");

function request(method: string) {
  // Erkennung ist rein methodenbasiert (AC5) – Header spielen keine Rolle mehr.
  return { method, headers: new Headers() } as unknown as Parameters<typeof proxy>[0];
}

function responseWithSession() {
  const res = new Response(null);
  res.headers.append("set-cookie", "__Secure-authjs.session-token=rotated; Path=/; HttpOnly");
  res.headers.append("set-cookie", "__Host-authjs.csrf-token=keep; Path=/; HttpOnly");
  return res;
}

const hasSessionCookie = (res: Response) =>
  res.headers.getSetCookie().some((c) => c.startsWith("__Secure-authjs.session-token="));

const hasCsrfCookie = (res: Response) =>
  res.headers.getSetCookie().some((c) => c.startsWith("__Host-authjs.csrf-token="));

describe("proxy – Session-Rotation-Guard (Kompositions-Naht)", () => {
  beforeEach(() => vi.resetAllMocks());

  it("should_stripSessionCookie_when_getRequest", async () => {
    // AC1 + AC5: GET strippt – auch ohne next-url/sec-fetch-dest-Signale.
    fakeAuth.mockResolvedValue(responseWithSession());

    const res = (await proxy(request("GET"), {} as never)) as Response;

    expect(hasSessionCookie(res)).toBe(false);
    // CSRF bleibt – nur das Session-Token wird entfernt.
    expect(hasCsrfCookie(res)).toBe(true);
  });

  it("should_stripSessionCookie_when_headRequest", async () => {
    // AC2: HEAD ist nicht-mutierend → Rotation unterdrücken.
    fakeAuth.mockResolvedValue(responseWithSession());

    const res = (await proxy(request("HEAD"), {} as never)) as Response;

    expect(hasSessionCookie(res)).toBe(false);
  });

  it("should_stripSessionCookie_when_optionsRequest", async () => {
    // AC3: OPTIONS (Preflight/Probe) war die #170-Resurrection-Quelle.
    fakeAuth.mockResolvedValue(responseWithSession());

    const res = (await proxy(request("OPTIONS"), {} as never)) as Response;

    expect(hasSessionCookie(res)).toBe(false);
  });

  it("should_keepSessionCookie_when_postRequest", async () => {
    // AC4: Login/Logout laufen als POST – ihr Set-Cookie darf nie gestrippt werden.
    fakeAuth.mockResolvedValue(responseWithSession());

    const res = (await proxy(request("POST"), {} as never)) as Response;

    expect(hasSessionCookie(res)).toBe(true);
  });

  it("should_keepSessionCookie_when_deleteRequest", async () => {
    // AC4: DELETE ist ebenfalls mutierend → Set-Cookie bleibt erhalten.
    fakeAuth.mockResolvedValue(responseWithSession());

    const res = (await proxy(request("DELETE"), {} as never)) as Response;

    expect(hasSessionCookie(res)).toBe(true);
  });

  it("should_passThrough_when_authReturnsNoResponse", async () => {
    fakeAuth.mockResolvedValue(undefined);

    const res = await proxy(request("GET"), {} as never);

    expect(res).toBeUndefined();
  });
});
