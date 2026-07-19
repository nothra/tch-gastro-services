import NextAuth from "next-auth";
import type { NextFetchEvent, NextRequest } from "next/server";
import { authConfig } from "@/auth.config";
import { isRscRequest, stripSessionRotation } from "@/lib/prefetch-session";

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

// Wrapper um die NextAuth-Middleware: auf RSC-/Prefetch-Requests das rotierende Session-Cookie
// aus der Antwort entfernen (#164). Sonst kann eine noch fliegende authentifizierte
// Prefetch-Antwort das Cookie nach einem signOut wiederbeleben (Race → flaky Logout). Zentral
// hier, damit ALLE geschützten Links abgedeckt sind (nicht per-Link). Details: lib/prefetch-session.
export default async function proxy(request: NextRequest, event: NextFetchEvent) {
  const response = await authMiddleware(request, event);
  if (response && isRscRequest(request)) {
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
  matcher: [
    "/((?!api/auth|api/version|api/health|theke/|_next/static|_next/image|favicon.ico|manifest.webmanifest|icon.svg|icon-dev.svg|icon-int.svg|icon-prd.svg).*)",
  ],
};
