import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { users, type UserRole } from "./schema";

// Legt das Login-Konto an (vom Verwalter provisioniert, keine offene Registrierung – ADR-016).
// Bis zu einem späteren User-Admin-Feature ist Seed/DB der einzige Weg (spec-48 Scope).
// Aufruf: pnpm db:seed  (liest SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD aus .env.local)
const SEED_ROLES: UserRole[] = ["verwalter", "abrechner"];

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("SEED_ADMIN_EMAIL und SEED_ADMIN_PASSWORD müssen gesetzt sein (.env.local).");
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    await db.update(users).set({ passwordHash, roles: SEED_ROLES }).where(eq(users.email, email));
    process.stdout.write(`Konto aktualisiert: ${email}\n`);
  } else {
    await db
      .insert(users)
      .values({ email, passwordHash, roles: SEED_ROLES, name: "Verwalter/Abrechner" });
    process.stdout.write(`Konto angelegt: ${email}\n`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
