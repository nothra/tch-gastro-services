import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { users } from "./schema";

// Legt einen Initial-Admin an (admin-provisioniertes Modell, keine offene Registrierung).
// Aufruf: pnpm db:seed  (liest SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD aus .env.local)
async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("SEED_ADMIN_EMAIL und SEED_ADMIN_PASSWORD müssen gesetzt sein (.env.local).");
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    await db.update(users).set({ passwordHash, role: "admin" }).where(eq(users.email, email));
    process.stdout.write(`Admin aktualisiert: ${email}\n`);
  } else {
    await db.insert(users).values({ email, passwordHash, role: "admin", name: "Admin" });
    process.stdout.write(`Admin angelegt: ${email}\n`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
