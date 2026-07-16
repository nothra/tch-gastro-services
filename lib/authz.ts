import type { Session } from "next-auth";
import { auth } from "@/auth";
import type { UserRole } from "@/db/schema";

// 403-artiger Fehler für serverseitig abgelehnte Zugriffe (ADR-016, Frage 2).
export class ForbiddenError extends Error {
  constructor(message = "Zugriff verweigert.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

// Reine Prädikate ohne Framework-/DB-Abhängigkeit → trivial und mockfrei testbar.
export function hasRole(
  roles: readonly UserRole[] | undefined | null,
  required: UserRole,
): boolean {
  return roles?.includes(required) ?? false;
}

export function hasAnyRole(
  roles: readonly UserRole[] | undefined | null,
  required: readonly UserRole[],
): boolean {
  return required.some((role) => hasRole(roles, role));
}

// Guard für geschützte Server Actions: als erste Zeile aufrufen (fail-closed).
// Verlangt, dass der Nutzer die angegebene Rolle besitzt (ggf. neben weiteren).
export async function requireRole(required: UserRole): Promise<Session> {
  return requireAnyRole([required]);
}

// Guard für Aktionen, die eine von mehreren Rollen erlauben (z. B. verwalter ODER veranstalter).
export async function requireAnyRole(required: readonly UserRole[]): Promise<Session> {
  const session = await auth();
  if (!session?.user || !hasAnyRole(session.user.roles, required)) {
    // 403-artige Ablehnung protokollieren (spec-48: "protokolliert"), ohne Preisgabe von Details.
    console.warn(
      `Zugriff verweigert: erfordert eine der Rollen [${required.join(", ")}], vorhanden [${
        session?.user?.roles?.join(", ") ?? ""
      }].`,
    );
    throw new ForbiddenError();
  }
  return session;
}
