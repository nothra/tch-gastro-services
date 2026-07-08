import type { NextAuthConfig } from "next-auth";

// Edge-sichere Basis-Config (von middleware.ts genutzt): KEINE Node-Only-Imports
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
      if (user) token.role = user.role ?? "member";
      return token;
    },
    session({ session, token }) {
      if (session.user) session.user.role = token.role as string | undefined;
      return session;
    },
  },
} satisfies NextAuthConfig;
