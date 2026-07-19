// @vitest-environment node
import { describe, it, expect } from "vitest";
import { shouldSuppressSessionRotation, stripSessionRotation } from "./prefetch-session";

// #170 (ADR-032): Auf allen nicht-mutierenden Methoden (alles außer POST/PUT/PATCH/DELETE) darf
// die Middleware-Antwort das rotierende Auth.js-Session-Cookie nicht mit-erneuern – sonst belebt
// eine nach dem signOut eintreffende Antwort (GET/HEAD/OPTIONS-Prefetch/Preflight) die Session
// wieder (Race, flaky Logout). Die Erkennung hängt allein an der Methode – keine next-url/
// sec-fetch-dest-Signale mehr (#164 war GET-only + fragile Header-Heuristik).

describe("shouldSuppressSessionRotation", () => {
  it("should_returnTrue_when_getRequest", () => {
    // AC5: Das Prädikat akzeptiert nur `{ method }` – rein methodenbasiert, ohne
    // next-url/sec-fetch-dest-Signale, wird dennoch unterdrückt.
    expect(shouldSuppressSessionRotation({ method: "GET" })).toBe(true);
  });

  it("should_returnTrue_when_headRequest", () => {
    // HEAD durchläuft den Proxy und rotiert sonst das Cookie → muss unterdrückt werden.
    expect(shouldSuppressSessionRotation({ method: "HEAD" })).toBe(true);
  });

  it("should_returnTrue_when_optionsRequest", () => {
    // OPTIONS (Preflight/Probe) war die in #170 beobachtete Resurrection-Quelle.
    expect(shouldSuppressSessionRotation({ method: "OPTIONS" })).toBe(true);
  });

  it("should_returnFalse_when_postRequest", () => {
    // Login/Logout laufen als POST – ihr Set-Cookie (setzen/löschen) darf NIE gestrippt werden.
    expect(shouldSuppressSessionRotation({ method: "POST" })).toBe(false);
  });

  it("should_returnFalse_when_putRequest", () => {
    expect(shouldSuppressSessionRotation({ method: "PUT" })).toBe(false);
  });

  it("should_returnFalse_when_patchRequest", () => {
    expect(shouldSuppressSessionRotation({ method: "PATCH" })).toBe(false);
  });

  it("should_returnFalse_when_deleteRequest", () => {
    expect(shouldSuppressSessionRotation({ method: "DELETE" })).toBe(false);
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
