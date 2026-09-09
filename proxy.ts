import NextAuth from "next-auth";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { authConfig } from "@/auth.config";
import { shouldSuppressSessionRotation, stripSessionRotation } from "@/lib/prefetch-session";
import { thekeReadRateLimiter } from "@/lib/rate-limit";
import { tooManyRequestsResponse } from "@/lib/theke-throttle-response";

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

// Nur Dokument-Navigation und Prefetch/Probe zählen (ADR-048 D5). Der Server-Action-POST
// adressiert dieselbe URL, unterliegt aber weiterhin allein der Schreib-Grenze aus ADR-044.
const READ_METHODS = new Set(["GET", "HEAD"]);

function isThekePath(request: NextRequest): boolean {
  return request.nextUrl.pathname.startsWith(THEKE_PATH_PREFIX);
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
  // Der Zweig endet IMMER hier – auch ungedrosselt und auch für nicht gezählte Methoden. Die
  // Theke ist öffentlich (ADR-034 D1) und lief vor dem neuen Matcher-Eintrag gar nicht durch den
  // Proxy; ein Durchfallen in `authMiddleware` machte aus dem Server-Action-POST einen 307 auf
  // /login und bräche AK-7. Der Matcher-Eintrag holt die Route ausschließlich für die Bremse
  // hierher, nicht ins Auth-Gate.
  //
  // Kein try/catch: `tryAcquire` ist reine synchrone Zähler-Arithmetik ohne I/O, ein Fallback
  // wäre ein toter Zweig – Cold-Start = frischer Zähler = durchlassen (fail-open, ADR-048 D6).
  if (isThekePath(request)) {
    const isThrottled = READ_METHODS.has(request.method) && !thekeReadRateLimiter.tryAcquire();
    return isThrottled ? tooManyRequestsResponse() : NextResponse.next();
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
