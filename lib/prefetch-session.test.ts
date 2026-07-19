// @vitest-environment node
import { describe, it, expect } from "vitest";
import { isRscRequest, stripSessionRotation } from "./prefetch-session";

// #164: Auf RSC-/Prefetch-Requests darf die Middleware-Antwort das rotierende Auth.js-Session-
// Cookie nicht mit-erneuern – sonst belebt eine nach dem signOut eintreffende Prefetch-Antwort
// die Session wieder (Race, flaky Logout). Diese Helfer kapseln die Erkennung + das Strippen.

describe("isRscRequest", () => {
  it("should_returnTrue_when_nextUrlHeaderPresent", () => {
    // Next hängt bei RSC-/Prefetch-Navigationen den internen next-url-Header an.
    expect(isRscRequest({ method: "GET", headers: new Headers({ "next-url": "/" }) })).toBe(true);
  });

  it("should_returnTrue_when_secFetchDestNotDocument", () => {
    expect(
      isRscRequest({ method: "GET", headers: new Headers({ "sec-fetch-dest": "empty" }) }),
    ).toBe(true);
  });

  it("should_returnFalse_when_documentNavigation", () => {
    // Echter Dokumentaufruf → Session darf rotieren (Rolling Session bleibt erhalten).
    expect(
      isRscRequest({ method: "GET", headers: new Headers({ "sec-fetch-dest": "document" }) }),
    ).toBe(false);
  });

  it("should_returnFalse_when_getWithoutSignals", () => {
    // Fail-safe: fehlen die Signale (z. B. alter Client), NICHT strippen.
    expect(isRscRequest({ method: "GET", headers: new Headers() })).toBe(false);
  });

  it("should_returnFalse_when_postRequest", () => {
    // Login/Logout laufen als POST – ihr Set-Cookie (setzen/löschen) darf NIE gestrippt werden.
    expect(isRscRequest({ method: "POST", headers: new Headers({ "next-url": "/" }) })).toBe(false);
  });
});

describe("stripSessionRotation", () => {
  it("should_removeSecureSessionTokenSetCookie_when_present", () => {
    const res = new Response(null);
    res.headers.append("set-cookie", "__Secure-authjs.session-token=abc; Path=/; HttpOnly");
    res.headers.append("set-cookie", "__Secure-authjs.callback-url=https%3A%2F%2Fx; Path=/");

    stripSessionRotation(res);

    const cookies = res.headers.getSetCookie();
    expect(cookies.some((c) => c.startsWith("__Secure-authjs.session-token="))).toBe(false);
    // Andere Cookies (callback-url, csrf) bleiben unangetastet.
    expect(cookies.some((c) => c.startsWith("__Secure-authjs.callback-url="))).toBe(true);
  });

  it("should_removeUnsecuredSessionToken_when_httpCookieName", () => {
    const res = new Response(null);
    res.headers.append("set-cookie", "authjs.session-token=abc; Path=/");

    stripSessionRotation(res);

    expect(res.headers.getSetCookie()).toHaveLength(0);
  });

  it("should_removeChunkedSessionToken_when_cookieSplit", () => {
    // Auth.js chunked große Cookies zu ...session-token.0/.1 – auch diese dürfen nicht rotieren.
    const res = new Response(null);
    res.headers.append("set-cookie", "__Secure-authjs.session-token.0=part0; Path=/");
    res.headers.append("set-cookie", "__Secure-authjs.session-token.1=part1; Path=/");

    stripSessionRotation(res);

    expect(res.headers.getSetCookie()).toHaveLength(0);
  });

  it("should_leaveResponseUnchanged_when_noSessionCookie", () => {
    const res = new Response(null);
    res.headers.append("set-cookie", "vercel-experiment-uuid=x");

    stripSessionRotation(res);

    expect(res.headers.getSetCookie()).toEqual(["vercel-experiment-uuid=x"]);
  });

  it("should_keepCsrfToken_when_sessionAndCsrfPresent", () => {
    // Der Guard darf NUR das Session-Token treffen – der CSRF-Token muss erhalten bleiben
    // (sonst brechen Folge-POSTs). Strip-Test ≠ Keep-Test (#116).
    const res = new Response(null);
    res.headers.append("set-cookie", "__Secure-authjs.session-token=abc; Path=/");
    res.headers.append("set-cookie", "__Host-authjs.csrf-token=tok%7Csig; Path=/; HttpOnly");

    stripSessionRotation(res);

    const cookies = res.headers.getSetCookie();
    expect(cookies.some((c) => c.startsWith("__Secure-authjs.session-token="))).toBe(false);
    expect(cookies).toContain("__Host-authjs.csrf-token=tok%7Csig; Path=/; HttpOnly");
  });

  it("should_beNoop_when_responseHasNoSetCookie", () => {
    const res = new Response(null);

    stripSessionRotation(res);

    expect(res.headers.getSetCookie()).toEqual([]);
  });
});
