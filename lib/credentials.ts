import bcrypt from "bcryptjs";
import type { UserRole } from "@/db/schema";

// Konstanter, gültiger bcrypt-Hash eines Wegwerf-Werts. Zweck: bei unbekannter E-Mail
// dieselbe bcrypt-Arbeit erzwingen wie bei existierender → kein Timing-Seitenkanal zur
// User-Enumeration (spec-48: "keine Preisgabe, ob der Benutzername existiert"). Kein
// Credential – der passwordHash-Check unten verhindert selbst bei zufälligem Treffer den Zugang.
const DUMMY_BCRYPT_HASH = "$2b$10$QoJpbFqJJ3VqxvSOw8tixekuuqydvnYLNUdh/V278J9lPKQJsKoEK";

export type CredentialUser = {
  id: string;
  email: string | null;
  name: string | null;
  roles: UserRole[];
  passwordHash: string | null;
};

export type AuthenticatedUser = Pick<CredentialUser, "id" | "email" | "name" | "roles">;

// Verifiziert Zugangsdaten in konstanter Zeit: bcrypt.compare läuft immer – auch ohne
// Nutzer (dann gegen den Dummy-Hash). Gibt bei Erfolg den Nutzer zurück, sonst null.
export async function verifyCredentials(
  user: CredentialUser | undefined,
  password: string,
): Promise<AuthenticatedUser | null> {
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_BCRYPT_HASH);
  if (!user?.passwordHash || !valid) return null;
  return { id: user.id, email: user.email, name: user.name, roles: user.roles };
}
