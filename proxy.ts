import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Edge-"Proxy" (Next 16, vormals middleware) auf Basis der edge-sicheren Config:
// liest die JWT-Session; der `authorized`-Callback entscheidet Zugriff/Redirect.
const { auth } = NextAuth(authConfig);

export default auth;

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
