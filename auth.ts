import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { authConfig } from "@/auth.config";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyCredentials } from "@/lib/credentials";

// Node-Runtime: Credentials-Login mit bcrypt gegen die eigene DB. JWT-Sessions
// (Credentials-Provider ist nicht mit DB-Sessions kombinierbar).
const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (raw) => {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        // Konstante-Zeit-Prüfung (gegen User-Enumeration via Timing, spec-48) in verifyCredentials.
        return verifyCredentials(user, password);
      },
    }),
  ],
});
