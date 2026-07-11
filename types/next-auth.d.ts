import type { DefaultSession } from "next-auth";
import type { UserRole } from "@/db/schema";

// Rollen (RBAC, ADR-016) auf User/Session/JWT verfügbar machen. Eine Person kann
// mehrere Rollen tragen → durchgängig als Array geführt.
declare module "next-auth" {
  interface User {
    roles?: UserRole[];
  }
  interface Session {
    user: { roles: UserRole[] } & DefaultSession["user"];
  }
}

// Kanonischer Ort der JWT-Schnittstelle: next-auth/jwt re-exportiert nur (`export *`),
// eine Augmentierung dort würde nicht mergen. Daher direkt @auth/core/jwt augmentieren.
declare module "@auth/core/jwt" {
  interface JWT {
    roles?: UserRole[];
  }
}
