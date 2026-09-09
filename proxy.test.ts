// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// Testet die sicherheitskritische Kompositions-Naht in proxy.ts: die Lese-Bremse der öffentlichen
// Theken-Route (#297 / ADR-048) und den Wrapper um die NextAuth-Middleware, der ihre Antwort auf
// allen nicht-mutierenden Methoden vom rotierenden Session-Cookie befreit (#164, #170 / ADR-032).
// next-auth und die beiden Theken-Limiter sind gemockt (die echten Helfer
// shouldSuppressSessionRotation/stripSessionRotation und die echte Drossel-Antwort laufen real),
// damit das Verhalten der Verdrahtung geprüft wird – nicht NextAuth und nicht die
// Fixed-Window-Arithmetik. Die Limiter MÜSSEN gemockt sein: Es sind globale Singletons ohne
// Schlüssel zur Isolation, ein echter Aufruf verbrauchte hier Budget für die restliche Datei.
const fakeAuth = vi.fn();
vi.mock("next-auth", () => ({ default: () => ({ auth: fakeAuth }) }));

const { tryAcquireMock, tryAcquireActionMock } = vi.hoisted(() => ({
  tryAcquireMock: vi.fn(() => true),
  tryAcquireActionMock: vi.fn(() => true),
}));
vi.mock("@/lib/rate-limit", () => ({
  thekeReadRateLimiter: { tryAcquire: tryAcquireMock },
  thekeActionRateLimiter: { tryAcquire: tryAcquireActionMock },
  // Die Factory ersetzt das ganze Modul, also muss sie auch die Konstante liefern, aus der
  // `lib/theke-throttle-response` seinen `Retry-After`-Header ableitet – sonst schlägt schon der
  // Import fehl (empirisch geprüft: Konstante entfernt → `Error: [vitest] No
  // "THEKE_RATE_LIMIT_WINDOW_MS" export is defined on the "@/lib/rate-limit" mock`, Datei rot).
  // Kein Test hier assertiert den Wert; er ist reine Import-Voraussetzung.
  THEKE_RATE_LIMIT_WINDOW_MS: 60_000,
}));

// proxy.ts ruft NextAuth(authConfig) beim Import → nach dem Mock importieren.
const { default: proxy, config } = await import("./proxy");

// Pfad ist bewusst ein Pflichtargument: Ein Default ließe die Session-Guard-Tests unbemerkt in
// den Theken-Zweig fallen und würde sie damit still entwerten.
function request(method: string, pathname: string, headers: Record<string, string> = {}) {
  // Die Session-Rotations-Erkennung ist rein methodenbasiert (AC5); für die Lese-Bremse zählt
  // zusätzlich der Server-Action-Marker im Header (ADR-048 D5).
  return {
    method,
    headers: new Headers(headers),
    nextUrl: { pathname },
  } as unknown as Parameters<typeof proxy>[0];
}

// So kennzeichnet Next.js einen Server-Action-Aufruf: Header `Next-Action` mit der Action-ID
// (40 Hex-Zeichen). Der Wert ist für die Erkennung unerheblich – nur die Anwesenheit zählt.
const serverActionHeaders = { "next-action": "b19f0c2a7d4e51836af09c2d4e7b1a35c8069df2" };

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

const THEKE_PATH = "/theke/abc123";

describe("proxy – Session-Rotation-Guard (Kompositions-Naht)", () => {
  beforeEach(() => vi.resetAllMocks());

  it("should_stripSessionCookie_when_getRequest", async () => {
    // AC1 + AC5: GET strippt – auch ohne next-url/sec-fetch-dest-Signale.
    fakeAuth.mockResolvedValue(responseWithSession());

    const res = (await proxy(request("GET", "/veranstaltung"), {} as never)) as Response;

    expect(hasSessionCookie(res)).toBe(false);
    // CSRF bleibt – nur das Session-Token wird entfernt.
    expect(hasCsrfCookie(res)).toBe(true);
  });

  it("should_stripSessionCookie_when_headRequest", async () => {
    // AC2: HEAD ist nicht-mutierend → Rotation unterdrücken.
    fakeAuth.mockResolvedValue(responseWithSession());

    const res = (await proxy(request("HEAD", "/veranstaltung"), {} as never)) as Response;

    expect(hasSessionCookie(res)).toBe(false);
  });

  it("should_stripSessionCookie_when_optionsRequest", async () => {
    // AC3: OPTIONS (Preflight/Probe) war die #170-Resurrection-Quelle.
    fakeAuth.mockResolvedValue(responseWithSession());

    const res = (await proxy(request("OPTIONS", "/veranstaltung"), {} as never)) as Response;

    expect(hasSessionCookie(res)).toBe(false);
  });

  it("should_keepSessionCookie_when_postRequest", async () => {
    // AC4: Login/Logout laufen als POST – ihr Set-Cookie darf nie gestrippt werden.
    fakeAuth.mockResolvedValue(responseWithSession());

    const res = (await proxy(request("POST", "/veranstaltung"), {} as never)) as Response;

    expect(hasSessionCookie(res)).toBe(true);
  });

  it("should_keepSessionCookie_when_deleteRequest", async () => {
    // AC4: DELETE ist ebenfalls mutierend → Set-Cookie bleibt erhalten.
    fakeAuth.mockResolvedValue(responseWithSession());

    const res = (await proxy(request("DELETE", "/veranstaltung"), {} as never)) as Response;

    expect(hasSessionCookie(res)).toBe(true);
  });

  it("should_passThrough_when_authReturnsNoResponse", async () => {
    fakeAuth.mockResolvedValue(undefined);

    const res = await proxy(request("GET", "/veranstaltung"), {} as never);

    expect(res).toBeUndefined();
  });
});

describe("proxy – Lese-Bremse der öffentlichen Theken-Route (#297 / ADR-048)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Default: beide Budgets unter dem Schwellwert. Die Drossel-Tests setzen das explizit um.
    tryAcquireMock.mockReturnValue(true);
    tryAcquireActionMock.mockReturnValue(true);
    fakeAuth.mockResolvedValue(responseWithSession());
  });

  it("should_passRequestToRoute_when_thekeGetBelowLimit", async () => {
    // AK-1/AK-5: Unter dem Schwellwert bleibt die Theke öffentlich erreichbar – die Anfrage wird
    // an die Route durchgereicht, das Auth-Gate sieht sie nicht (kein 307 auf /login). Nachweis
    // auf Proxy-Ebene, nicht durch Direktaufruf der Page (Lesson aus #63).
    const res = (await proxy(request("GET", THEKE_PATH), {} as never)) as Response;

    expect(tryAcquireMock).toHaveBeenCalledOnce();
    // Die Lese-Last liegt allein auf dem Lesebudget – das Schreib-Budget bleibt unberührt (AK-7).
    expect(tryAcquireActionMock).not.toHaveBeenCalled();
    expect(fakeAuth).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
    // Das Weiterreichen-Signal von NextResponse.next() – unterscheidet „durchlassen" von einer
    // selbst erzeugten leeren 200er-Antwort.
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("should_return429WithoutInvokingRoute_when_thekeGetOverLimit", async () => {
    // AK-2/AK-3/AK-4: Über dem Limit endet die Anfrage im Proxy – weder Auth-Gate noch Route (und
    // damit keiner der vier Neon-Reads) laufen; die Antwort ist die 429-Hinweisseite, keine 404.
    tryAcquireMock.mockReturnValue(false);

    const res = (await proxy(request("GET", THEKE_PATH), {} as never)) as Response;

    expect(res.status).toBe(429);
    expect(res.headers.get("content-type")).toBe("text/html; charset=utf-8");
    await expect(res.text()).resolves.toContain("Zu viele Anfragen");
    expect(fakeAuth).not.toHaveBeenCalled();
  });

  it("should_countRequest_when_thekeHeadRequest", async () => {
    // AK-8/D5: HEAD zählt als Lese-Anfrage (RSC-Prefetch/Probe) – zusammen mit dem
    // Server-Action-Fall unten der Nachweis, dass genau die Lese-Last auf dem Budget liegt.
    await proxy(request("HEAD", THEKE_PATH), {} as never);

    expect(tryAcquireMock).toHaveBeenCalledOnce();
    expect(fakeAuth).not.toHaveBeenCalled();
  });

  it("should_countRequest_when_thekePostWithoutServerActionMarker", async () => {
    // AK-2/D5 (Review-Runde 1, kritisch): Ein POST **ohne** Server-Action-Marker ist kein
    // Schreibaufruf, sondern ein getarnter Seiten-Read – der App Router rendert `ThekePage` auch
    // für POST. Zählte die Bremse nur GET/HEAD, wäre sie mit `curl -X POST` umgehbar und das
    // Schutzziel verfehlt. Am laufenden Dev-Server belegt (siehe Task-Notiz Runde 2).
    await proxy(request("POST", THEKE_PATH), {} as never);

    expect(tryAcquireMock).toHaveBeenCalledOnce();
    expect(fakeAuth).not.toHaveBeenCalled();
  });

  it("should_return429_when_thekePostWithoutServerActionMarkerOverLimit", async () => {
    // AK-2/AK-3: Der getarnte Seiten-Read wird im ausgeschöpften Fenster genauso abgewiesen wie
    // ein GET – ohne Route-Invocation und damit ohne die vier Neon-Reads.
    tryAcquireMock.mockReturnValue(false);

    const res = (await proxy(request("POST", THEKE_PATH), {} as never)) as Response;

    expect(res.status).toBe(429);
    expect(fakeAuth).not.toHaveBeenCalled();
  });

  it("should_countRequest_when_thekeDeleteRequest", async () => {
    // AK-2/D5: Auch PUT/PATCH/DELETE lösen ohne Action-Marker eine Page-Invocation aus (am
    // laufenden Dev-Server je mit `application-code`-Zeit belegt) – sie zählen deshalb mit.
    await proxy(request("DELETE", THEKE_PATH), {} as never);

    expect(tryAcquireMock).toHaveBeenCalledOnce();
    expect(fakeAuth).not.toHaveBeenCalled();
  });

  it("should_countRequest_when_thekeMultipartPostWithoutMarker", async () => {
    // Bewusste Grenze des Discriminators (ADR-048 D5): Die progressive-enhancement-Variante einer
    // Server Action (ohne JS) trüge die Action-ID nur im Multipart-Body (`$ACTION_ID_…`), nicht im
    // Header. Sie ist hier strukturell unerreichbar – das Erfassungs-Formular liegt hinter dem rein
    // clientseitigen `IdentityGate` (localStorage + useSyncExternalStore, Server-Snapshot `null`),
    // ohne JS erscheint es nie. Ein Multipart-POST auf diesen Pfad ist damit kein Schreibaufruf und
    // wird gezählt; ein Body-Parse im Proxy (der einzige Weg zum Gegenteil) wäre teurer als der
    // Read, den die Bremse spart.
    await proxy(
      request("POST", THEKE_PATH, { "content-type": "multipart/form-data; boundary=x" }),
      {} as never,
    );

    expect(tryAcquireMock).toHaveBeenCalledOnce();
  });

  it("should_countOnActionBudgetOnly_when_thekeServerActionPost", async () => {
    // AK-7/D5: Der Server-Action-POST adressiert dieselbe URL, zählt aber auf sein eigenes
    // Budget – das Lesebudget bleibt unberührt, sonst belastete die Erfassung die Lese-Grenze.
    // Er darf außerdem NICHT im Auth-Gate landen: Die Theke ist öffentlich (ADR-034 D1), und vor
    // dem neuen Matcher-Eintrag lief der Proxy für /theke/* überhaupt nicht. Ein Durchfallen in
    // `authMiddleware` machte aus dem POST einen 307 auf /login (`authorized` in auth.config.ts
    // verlangt für jeden Pfad außer /login eine Session). Am laufenden Dev-Server gegengeprüft:
    // mit der verworfenen Variante antwortet POST /theke/<token> mit 307 auf /login, mit der
    // implementierten mit 404 – siehe ADR-048 D3.
    const res = (await proxy(
      request("POST", THEKE_PATH, serverActionHeaders),
      {} as never,
    )) as Response;

    expect(tryAcquireActionMock).toHaveBeenCalledOnce();
    expect(tryAcquireMock).not.toHaveBeenCalled();
    expect(fakeAuth).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("should_passRequestToRoute_when_thekeServerActionPostWithExhaustedReadBudget", async () => {
    // AK-7 im Härtefall: Auch wenn das Lesebudget erschöpft ist (Flood im selben Fenster), läuft
    // die Erfassung an der Theke weiter – genau dafür sind die beiden Budgets getrennt.
    tryAcquireMock.mockReturnValue(false);

    const res = (await proxy(
      request("POST", THEKE_PATH, serverActionHeaders),
      {} as never,
    )) as Response;

    expect(res.status).toBe(200);
    expect(res.headers.get("x-middleware-next")).toBe("1");
    expect(tryAcquireMock).not.toHaveBeenCalled();
  });

  it("should_return429_when_thekeServerActionPostOverActionLimit", async () => {
    // Die Kehrseite von AK-7: Der Action-Marker ist ein Header, den jeder setzen kann, und eine
    // erfundene Action-ID lässt Next die Seite trotzdem rendern (am Dev-Server gemessen:
    // `POST /theke/<segment>` mit Fake-`next-action` → 404 mit `application-code: 170ms`). Ohne
    // eigenes Budget wäre die Bremse also mit einem Header abschaltbar. Reale Erfassung erreicht
    // die Grenze nicht – ADR-044 riegelt pro Token schon bei 60/Fenster ab.
    tryAcquireActionMock.mockReturnValue(false);

    const res = (await proxy(
      request("POST", THEKE_PATH, serverActionHeaders),
      {} as never,
    )) as Response;

    expect(res.status).toBe(429);
    expect(fakeAuth).not.toHaveBeenCalled();
  });

  it("should_leaveAuthGateUntouched_when_protectedRoute", async () => {
    // AK-6/FS-6: Eine geschützte Route läuft am Zweig vorbei ins unveränderte, fail-closed
    // Auth-Gate – inklusive der Session-Rotations-Unterdrückung.
    const res = (await proxy(request("GET", "/veranstaltung"), {} as never)) as Response;

    expect(tryAcquireMock).not.toHaveBeenCalled();
    expect(fakeAuth).toHaveBeenCalledOnce();
    expect(hasSessionCookie(res)).toBe(false);
  });

  it("should_leaveAuthGateUntouched_when_pathOnlyLooksLikeTheke", async () => {
    // Diskriminierungs-Kontrolle in der Gegenrichtung zum Test darüber (Review-Runde 2): Der Zweig
    // entscheidet nicht nur über die Bremse, sondern darüber, ob eine Anfrage **ganz am Auth-Gate
    // vorbei** läuft. `/veranstaltung` als einziger Negativfall ist zu weit entfernt – ein zu
    // breites Präfix (`/theke` statt `/theke/`) führte jeden künftigen Pfad, der mit „theke"
    // beginnt, unauthentifiziert an die Route durch: ein Auth-Bypass, kein Rate-Limit-Detail.
    // Belegt per Mutation von THEKE_PATH_PREFIX auf "/theke" – dann wird genau dieser Test rot.
    const res = (await proxy(request("GET", "/thekenwart"), {} as never)) as Response;

    expect(tryAcquireMock).not.toHaveBeenCalled();
    expect(tryAcquireActionMock).not.toHaveBeenCalled();
    expect(fakeAuth).toHaveBeenCalledOnce();
    expect(hasSessionCookie(res)).toBe(false);
  });

  it("should_answerIdentically_when_throttledTokenValidOrInvented", async () => {
    // FS-4: Die Drosselung verrät nicht, ob ein Token existiert – gedrosselte Antworten sind für
    // jedes Segment byte- und headergleich.
    tryAcquireMock.mockReturnValue(false);

    const valid = (await proxy(request("GET", THEKE_PATH), {} as never)) as Response;
    const invented = (await proxy(request("GET", "/theke/frei-erfunden"), {} as never)) as Response;

    expect(invented.status).toBe(valid.status);
    expect([...invented.headers]).toEqual([...valid.headers]);
    await expect(invented.text()).resolves.toBe(await valid.text());
  });
});

describe("proxy – Matcher", () => {
  it("should_routeThekeToProxyAndKeepItOutOfAuthGate_when_matcherEvaluated", () => {
    // Das Auth-Gate darf die Theke weiterhin nie sehen (Negativ-Lookahead unverändert), der neue
    // Eintrag holt sie trotzdem in den Proxy – sonst liefe die Bremse nie.
    const authGateMatcher = new RegExp(`^${config.matcher[0]}$`);

    expect(authGateMatcher.test("/veranstaltung")).toBe(true);
    expect(authGateMatcher.test(THEKE_PATH)).toBe(false);
    // Bewusst asymmetrisch: Der erste Eintrag ist ein echter Regex und wird deshalb gegen Pfade
    // verhaltensgeprüft; der zweite ist Next-Pfad-Syntax, deren Übersetzung (`path-to-regexp`)
    // hier nicht als Modul verfügbar ist – für ihn bleibt nur die Präsenz-Assertion auf das
    // Literal. Sie fängt ein Vertippen, aber keinen semantischen Fehler wie `/theke/:path` (nur
    // eine Segment-Tiefe); dieser Fall ist am laufenden Server verifiziert, nicht hier.
    expect(config.matcher).toContain("/theke/:path*");
  });
});
