import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

// Neon serverless HTTP-Treiber (ADR-014): keine klassische TCP-Pool-Verbindung →
// keine Verbindungs-Erschöpfung aus Vercel-Functions.
type DB = NeonHttpDatabase<typeof schema>;

function createDb(): DB {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL ist nicht gesetzt – siehe .env.example (Neon Pooled Connection String).",
    );
  }
  return drizzle(neon(connectionString), { schema });
}

// Lazy: die Verbindung wird erst beim ersten tatsächlichen Zugriff aufgebaut, nicht
// beim Import. So bleibt `next build` ohne DATABASE_URL grün (Routen werden importiert,
// aber nicht ausgeführt); fehlt die Variable zur Laufzeit, greift der Fehler oben.
let instance: DB | undefined;
export const db = new Proxy({} as DB, {
  get(_target, prop, receiver) {
    instance ??= createDb();
    return Reflect.get(instance, prop, receiver);
  },
});
