import NextAuth from "next-auth";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { authConfig } from "@/auth.config";
import { shouldSuppressSessionRotation, stripSessionRotation } from "@/lib/prefetch-session";
import { thekeActionRateLimiter, thekeReadRateLimiter } from "@/lib/rate-limit";
import {
  tooManyRequestsResponse,
  tooManyRequestsPlainTextResponse,
} from "@/lib/theke-throttle-response";

// Edge-"Proxy" (Next 16, vormals middleware) auf Basis der edge-sicheren Config:
// liest die JWT-Session; der `authorized`-Callback entscheidet Zugriff/Redirect.
const { auth } = NextAuth(authConfig);

// `auth` ist mehrfach überladen (Route-Handler, RSC, Pages-API, Middleware). Im Edge-Proxy
// wird es als Middleware `(request, event) => Response` aufgerufen – genau die Form, die
// Next.js bei `export default auth` selbst nutzt. Wir rufen es hier direkt so auf, um die
// Antwort nachzubearbeiten; der Doppel-Cast wählt bewusst diese Signatur (Overload-Auswahl).
type EdgeMiddleware = (
  request: NextRequest,
  event: NextFetchEvent,
) => Promise<Response | undefined>;
const authMiddleware = auth as unknown as EdgeMiddleware;

const THEKE_PATH_PREFIX = "/theke/";

// Header, mit dem Next.js einen Server-Action-Aufruf kennzeichnet (Wert = Action-ID).
const SERVER_ACTION_HEADER = "next-action";

function isThekePath(pathname: string): boolean {
  return pathname.startsWith(THEKE_PATH_PREFIX);
}

// Weist sich die Anfrage als Server-Action-Aufruf der Erfassung aus (ADR-048 D5)? Dann zählt sie
// auf das getrennte Schreib-Budget, damit ein Lese-Flood die Theke nicht am Buchen hindert (AK-7).
//
// Nicht an der HTTP-Methode festgemacht: Der App Router rendert eine Seite auch für POST/PUT/
// PATCH/DELETE, sobald kein Action-Marker vorliegt – eine reine GET/HEAD-Zählung wäre mit
// `curl -X POST` umgehbar (Review-Runde 1). Der Header ist zugleich nur ein *Ausweis*, keine
// Prüfung: Die Action-ID lässt sich im Proxy nicht gegen das Manifest verifizieren, und eine
// erfundene ID rendert die Seite trotzdem (am Dev-Server gemessen). Genau deshalb hat auch dieser
// Zweig ein Budget – ungezählt durchlassen hieße, die Bremse mit einem Header abschaltbar zu
// machen. Die Multipart-Kodierung des No-JS-Pfads (`$ACTION_ID_…` im Body) gilt bewusst nicht als
// Ausweis: Das Erfassungs-Formular liegt hinter dem rein clientseitigen `IdentityGate` und
// existiert ohne JS gar nicht; ein Body-Parse im Proxy wäre zudem teurer als der eingesparte Read.
function isServerActionRequest(request: NextRequest): boolean {
  return request.method === "POST" && request.headers.has(SERVER_ACTION_HEADER);
}

// Wrapper um die NextAuth-Middleware: auf allen nicht-mutierenden Methoden das rotierende
// Session-Cookie aus der Antwort entfernen (#164, #170 / ADR-032). Sonst kann eine noch fliegende
// authentifizierte GET/HEAD/OPTIONS-Antwort das Cookie nach einem signOut wiederbeleben (Race →
// flaky Logout). Zentral hier, damit ALLE geschützten Routen abgedeckt sind (nicht per-Link).
// Kein try/catch: eine Exception im Guard propagiert fail-closed. Details: lib/prefetch-session.
export default async function proxy(request: NextRequest, event: NextFetchEvent) {
  // Amplifikations-Bremse der öffentlichen Theken-Leseroute (#297 / ADR-048 D3): bewusst VOR
  // `authMiddleware`, damit eine gedrosselte Anfrage weder DB-Read noch Seiten-Invocation kostet.
  //
  // Der Zweig endet IMMER hier – auch ungedrosselt und auch für den Server-Action-POST. Die Theke
  // ist öffentlich (ADR-034 D1) und lief vor dem neuen Matcher-Eintrag gar nicht durch den Proxy;
  // ein Durchfallen in `authMiddleware` machte aus dem Server-Action-POST einen 307 auf /login und
  // bräche AK-7. Der Matcher-Eintrag holt die Route ausschließlich für die Bremse hierher, nicht
  // ins Auth-Gate.
  //
  // Jede Anfrage zählt – auf eines von zwei getrennten Budgets. Ungezählt durchlassen ist keine
  // Option: Der App Router rendert die Seite für jede Methode, ein Freibrief wäre also selbst der
  // Amplifikationspfad (Review-Runde 1).
  //
  // Kein try/catch: `tryAcquire` ist reine synchrone Zähler-Arithmetik ohne I/O, ein Fallback
  // wäre ein toter Zweig – Cold-Start = frischer Zähler = durchlassen (fail-open, ADR-048 D6).
  if (isThekePath(request.nextUrl.pathname)) {
    const isAction = isServerActionRequest(request);
    const limiter = isAction ? thekeActionRateLimiter : thekeReadRateLimiter;
    if (limiter.tryAcquire()) return NextResponse.next();
    // Klartext für den Action-Zweig (#331): eine HTML-429 liegt außerhalb des Server-Action-
    // Protokolls und lässt react-dom-client mit „Application error…" abstürzen, statt den Text
    // aus dem State zu zeigen. Der Lesepfad bleibt bei HTML (ADR-048 D4) – ein menschlicher
    // Browser-Aufruf, kein fetch.
    return isAction ? tooManyRequestsPlainTextResponse() : tooManyRequestsResponse();
  }

  const response = await authMiddleware(request, event);
  if (response && shouldSuppressSessionRotation(request)) {
    stripSessionRotation(response);
  }
  return response;
}

export const config = {
  // Alles schützen außer: Auth-/Versions-/Health-Endpunkt, der öffentliche Theken-Zugang
  // (theke/<token> – Selbstbedienung ohne Login, F7/#54; Seam schon in #51/ADR-023 D6),
  // Next-Assets, Favicon, Manifest und die PWA-Icons im Root (icon.svg + Stage-Icons
  // icon-dev/int/prd.svg → nicht auf /login umleiten). api/health muss (wie api/version)
  // unauthentifiziert erreichbar sein, sonst bekommt der Deploy-Gate-Healthcheck nur einen
  // 307-Redirect auf /login statt 200. Bewusst eng gefasst (nur diese Pfade), damit das
  // Auth-Gate nicht pauschal durchlässt (fail-closed).
  //
  // Der zweite Eintrag holt die Theke ausschließlich für die Lese-Bremse in den Proxy zurück
  // (#297 / ADR-048 D3). Der Negativ-Lookahead oben behält `theke/` unverändert – die Theke
  // erreicht den `authorized`-Callback also weiterhin nie und bleibt ohne Login erreichbar.
  matcher: [
    "/((?!api/auth|api/version|api/health|theke/|_next/static|_next/image|favicon.ico|manifest.webmanifest|icon.svg|icon-dev.svg|icon-int.svg|icon-prd.svg).*)",
    "/theke/:path*",
  ],
};
