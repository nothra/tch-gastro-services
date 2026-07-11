import type { NextAuthConfig } from "next-auth";
import type { UserRole } from "@/db/schema";

// Edge-sichere Basis-Config (von proxy.ts genutzt): KEINE Node-Only-Imports
// (kein db, kein bcrypt). Der Credentials-Provider wird in auth.ts ergänzt.
export const authConfig = {
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    // Route-Schutz: alles außer /login erfordert eine Session.
    authorized({ auth, request: { nextUrl } }) {
      const loggedIn = !!auth?.user;
      const onLogin = nextUrl.pathname === "/login";
      if (onLogin) {
        return loggedIn ? Response.redirect(new URL("/", nextUrl)) : true;
      }
      return loggedIn;
    },
    jwt({ token, user }) {
      // Leeres Array = keine Rollen-Rechte (kein "member"-Default mehr, ADR-016).
      if (user) token.roles = user.roles ?? [];
      return token;
    },
    session({ session, token }) {
      // Cast wie beim Vorgänger (#16): next-auth v5 beta führt den JWT-Custom-Claim
      // im Callback nicht sauber typisiert.
      if (session.user) session.user.roles = (token.roles as UserRole[] | undefined) ?? [];
      return session;
    },
  },
} satisfies NextAuthConfig;
