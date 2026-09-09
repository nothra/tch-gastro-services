// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// Testet die sicherheitskritische Kompositions-Naht in proxy.ts: die Lese-Bremse der öffentlichen
// Theken-Route (#297 / ADR-048) und den Wrapper um die NextAuth-Middleware, der ihre Antwort auf
// allen nicht-mutierenden Methoden vom rotierenden Session-Cookie befreit (#164, #170 / ADR-032).
// next-auth und der Limiter sind gemockt (die echten Helfer shouldSuppressSessionRotation/
// stripSessionRotation und die echte Drossel-Antwort laufen real), damit das Verhalten der
// Verdrahtung geprüft wird – nicht NextAuth und nicht die Fixed-Window-Arithmetik.
// Der Limiter MUSS gemockt sein: `thekeReadRateLimiter` ist ein globaler Singleton ohne Schlüssel
// zur Isolation, ein echter Aufruf verbrauchte hier Budget für die restliche Datei.
const fakeAuth = vi.fn();
vi.mock("next-auth", () => ({ default: () => ({ auth: fakeAuth }) }));

const { tryAcquireMock } = vi.hoisted(() => ({ tryAcquireMock: vi.fn(() => true) }));
vi.mock("@/lib/rate-limit", () => ({
  thekeReadRateLimiter: { tryAcquire: tryAcquireMock },
}));

// proxy.ts ruft NextAuth(authConfig) beim Import → nach dem Mock importieren.
const { default: proxy, config } = await import("./proxy");

// Pfad ist bewusst ein Pflichtargument: Ein Default ließe die Session-Guard-Tests unbemerkt in
// den Theken-Zweig fallen und würde sie damit still entwerten.
function request(method: string, pathname: string) {
  // Die Session-Rotations-Erkennung ist rein methodenbasiert (AC5) – Header spielen keine Rolle.
  return {
    method,
    headers: new Headers(),
    nextUrl: { pathname },
  } as unknown as Parameters<typeof proxy>[0];
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
    // Default: unter dem Schwellwert. Die Drossel-Tests setzen das explizit um.
    tryAcquireMock.mockReturnValue(true);
    fakeAuth.mockResolvedValue(responseWithSession());
  });

  it("should_passRequestToRoute_when_thekeGetBelowLimit", async () => {
    // AK-1/AK-5: Unter dem Schwellwert bleibt die Theke öffentlich erreichbar – die Anfrage wird
    // an die Route durchgereicht, das Auth-Gate sieht sie nicht (kein 307 auf /login). Nachweis
    // auf Proxy-Ebene, nicht durch Direktaufruf der Page (Lesson aus #63).
    const res = (await proxy(request("GET", THEKE_PATH), {} as never)) as Response;

    expect(tryAcquireMock).toHaveBeenCalledOnce();
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
    // AK-8/D5: HEAD zählt als Lese-Anfrage (RSC-Prefetch/Probe) – zusammen mit dem POST-Fall
    // unten der Nachweis, dass genau die Lese-Last auf dem Budget liegt.
    await proxy(request("HEAD", THEKE_PATH), {} as never);

    expect(tryAcquireMock).toHaveBeenCalledOnce();
    expect(fakeAuth).not.toHaveBeenCalled();
  });

  it("should_passRequestToRouteUncounted_when_thekePostRequest", async () => {
    // AK-7/D5: Der Server-Action-POST adressiert dieselbe URL, unterliegt aber weiterhin allein
    // ADR-044. Er belastet das Lese-Budget nicht und bekommt nie die HTML-Hinweisseite.
    // Er darf außerdem NICHT im Auth-Gate landen: Die Theke ist öffentlich (ADR-034 D1), und vor
    // dem neuen Matcher-Eintrag lief der Proxy für /theke/* überhaupt nicht. Ein Durchfallen in
    // `authMiddleware` machte aus dem POST einen 307 auf /login (`authorized` in auth.config.ts
    // verlangt für jeden Pfad außer /login eine Session). Am laufenden Dev-Server gegengeprüft:
    // mit der verworfenen Variante antwortet POST /theke/<token> mit 307 auf /login, mit der
    // implementierten mit 404 – siehe ADR-048 D3.
    const res = (await proxy(request("POST", THEKE_PATH), {} as never)) as Response;

    expect(tryAcquireMock).not.toHaveBeenCalled();
    expect(fakeAuth).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("should_leaveAuthGateUntouched_when_protectedRoute", async () => {
    // AK-6/FS-6: Eine geschützte Route läuft am Zweig vorbei ins unveränderte, fail-closed
    // Auth-Gate – inklusive der Session-Rotations-Unterdrückung.
    const res = (await proxy(request("GET", "/veranstaltung"), {} as never)) as Response;

    expect(tryAcquireMock).not.toHaveBeenCalled();
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
    expect(config.matcher).toContain("/theke/:path*");
  });
});
