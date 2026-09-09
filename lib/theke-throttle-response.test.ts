// @vitest-environment node
import { describe, it, expect } from "vitest";
import { tooManyRequestsResponse } from "./theke-throttle-response";

// Deckt AK-4 (sichtbare, ehrliche Antwort) und den Selbstgenügsamkeits-Teil von AK-3 ab: Die
// Drossel-Antwort muss ohne Render, ohne Layout und ohne Asset-Roundtrip auskommen (ADR-048 D4).

describe("tooManyRequestsResponse", () => {
  it("should_return429WithHtmlHeaders_when_called", async () => {
    const res = tooManyRequestsResponse();

    // AK-4: 429, nicht 404 – ein echter Besucher soll nicht fälschlich „nicht gefunden" lesen.
    expect(res.status).toBe(429);
    expect(res.headers.get("content-type")).toBe("text/html; charset=utf-8");
    // Retry-After deckt sich mit der Fensterlänge aus ADR-048 D2 (60 s).
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
