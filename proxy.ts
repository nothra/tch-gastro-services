import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Edge-"Proxy" (Next 16, vormals middleware) auf Basis der edge-sicheren Config:
// liest die JWT-Session; der `authorized`-Callback entscheidet Zugriff/Redirect.
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  // Alles schützen außer: Auth-Endpunkte, Versions-Endpunkt, Next-Assets, Favicon, Manifest
  // und statische SVG-Icons (auch die Stage-Icons icon-dev/int/prd.svg → nicht auf /login umleiten).
  matcher: [
    "/((?!api/auth|api/version|_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.svg$).*)",
  ],
};
