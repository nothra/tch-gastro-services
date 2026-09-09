// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  tooManyRequestsResponse,
  tooManyRequestsPlainTextResponse,
} from "./theke-throttle-response";

// Deckt AK-4 (sichtbare, ehrliche Antwort) und den Selbstgenügsamkeits-Teil von AK-3 ab: Die
// Drossel-Antwort muss ohne Render, ohne Layout und ohne Asset-Roundtrip auskommen (ADR-048 D4).

describe("tooManyRequestsResponse", () => {
  it("should_return429WithHtmlHeaders_when_called", () => {
    const res = tooManyRequestsResponse();

    // AK-4: 429, nicht 404 – ein echter Besucher soll nicht fälschlich „nicht gefunden" lesen.
    expect(res.status).toBe(429);
    expect(res.headers.get("content-type")).toBe("text/html; charset=utf-8");
    // Der produktive Wert, abgeleitet aus `THEKE_RATE_LIMIT_WINDOW_MS` (ADR-048 D2). Absichtlich
    // ein Literal statt einer Rechnung über dieselbe Konstante: So bleibt die Assertion unabhängig
    // und ein geändertes Fenster muss hier bewusst nachgezogen werden.
    expect(res.headers.get("retry-after")).toBe("60");
    // Kein CDN darf eine 429 für diese URL zwischenspeichern.
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("should_showRetryHintInGermanDocument_when_called", async () => {
    const html = await tooManyRequestsResponse().text();

    expect(html).toContain('<html lang="de">');
    expect(html).toContain("Zu viele Anfragen");
    // AK-4 verlangt den Hinweis, es gleich noch einmal zu versuchen – nicht nur den Status.
    expect(html).toContain("gleich noch einmal");
    // Die sichtbare Wartezeit nennt dieselbe Dauer wie der `Retry-After`-Header und wird aus
    // derselben Konstante erzeugt. Ohne diese Assertion zöge ein geändertes Fenster nur den
    // Header mit und die Prosa nicht (#264 – Fix für gekoppelte Literale auf die
    // Geschwister-Stelle im selben Modul ausweiten).
    expect(html).toContain("60 Sekunden");
  });

  it("should_embedEverythingInline_when_called", async () => {
    // AK-3/FS-2: Im Drosselfall darf kein weiterer Roundtrip entstehen – kein Stylesheet, kein
    // Bild, kein `_next/`-Bundle und kein Skript. Das CSS trägt die Seite deshalb inline.
    const html = await tooManyRequestsResponse().text();

    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/\ssrc=/i);
    expect(html).not.toMatch(/\shref=/i);
    expect(html).not.toContain("_next/");
  });
});

// #331/AK-4: Der Server-Action-Zweig braucht Klartext statt HTML – `server-action-reducer.js:117`
// übernimmt den Body nur bei EXAKT `content-type: text/plain` (strikter Vergleich, kein
// `; charset=utf-8`) als Meldung; sonst bleibt es bei der generischen React-Meldung und der
// Absturz ist zwar gefangen (Boundary), aber nicht diagnostizierbar.
describe("tooManyRequestsPlainTextResponse", () => {
  it("should_return429WithExactPlainTextContentType_when_called", () => {
    const res = tooManyRequestsPlainTextResponse();

    expect(res.status).toBe(429);
    // Exakt – kein Parameter. `server-action-reducer.js:117` vergleicht strikt.
    expect(res.headers.get("content-type")).toBe("text/plain");
  });

  it("should_shareRetryAfterAndCacheControlWithHtmlVariant_when_called", () => {
    // AK-6: beide Varianten tragen dieselben Header-Werte – echter Vergleich gegen die
    // HTML-Variante statt hartkodierter Literale, damit der Testname hält, was er verspricht
    // (Review-Nitpick, task-#331).
    const plainText = tooManyRequestsPlainTextResponse();
    const html = tooManyRequestsResponse();

    expect(plainText.headers.get("retry-after")).toBe(html.headers.get("retry-after"));
    expect(plainText.headers.get("cache-control")).toBe(html.headers.get("cache-control"));
  });

  it("should_notLeakTokenOrVeranstaltung_when_bodyRead", async () => {
    // FS-2: der Body bleibt unabhängig vom aufgerufenen Segment – kein Token-/Veranstaltungs-Leak.
    const body = await tooManyRequestsPlainTextResponse().text();

    expect(body.length).toBeGreaterThan(0);
    expect(body).not.toMatch(/theke|token|veranstaltung/i);
  });
});
