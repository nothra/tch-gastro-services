import { sql } from "drizzle-orm";
import { db } from "./index";
import { users } from "./schema";

// Anonymisiert die INT-Daten nach einem Refresh aus PRD (Neon-Branch = CoW-Klon der
// Produktion → enthält echte personenbezogene Daten). Überschreibt Namen/E-Mails und
// macht Prod-Passwörter unbrauchbar (passwordHash = NULL). Danach `pnpm db:seed:int`
// für einen bekannten INT-Admin.
//
// SICHERHEITS-GUARD: läuft NUR, wenn NEXT_PUBLIC_STAGE=int (aus .env.int). So kann das
// Skript nicht versehentlich gegen DEV/PRD laufen.
//
// Aufruf: pnpm db:anonymize:int
async function main() {
  const stage = process.env.NEXT_PUBLIC_STAGE;
  if (stage !== "int") {
    throw new Error(
      `Anonymisierung nur für INT erlaubt (NEXT_PUBLIC_STAGE=int), aktuell: ${stage ?? "<leer>"}. Abbruch.`,
    );
  }

  // Ein UPDATE über alle Nutzer; die (eindeutige) id garantiert eindeutige E-Mails.
  const result = await db.update(users).set({
    name: sql`'Mitglied ' || substr(${users.id}, 1, 8)`,
    email: sql`'member-' || ${users.id} || '@int.invalid'`,
    passwordHash: sql`NULL`,
    image: sql`NULL`,
    emailVerified: sql`NULL`,
  });

  const count = (result as unknown as { rowCount?: number }).rowCount ?? "?";
  process.stdout.write(`INT anonymisiert: ${count} Nutzer überschrieben.\n`);
  process.stdout.write("Hinweis: künftige Tabellen mit personenbezogenen Daten hier ergänzen.\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
