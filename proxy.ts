import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Edge-"Proxy" (Next 16, vormals middleware) auf Basis der edge-sicheren Config:
// liest die JWT-Session; der `authorized`-Callback entscheidet Zugriff/Redirect.
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  // Alles schützen außer: Auth-Endpunkte, Next-Assets, Favicon, Manifest, Icon.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest).*)"],
};
