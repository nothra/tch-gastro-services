import { drizzle as drizzleNeon, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { neon } from "@neondatabase/serverless";
import { Pool } from "pg";
import * as schema from "./schema";

// Dualer Treiber (3-Stage-Setup):
//   - Neon/Vercel-Postgres  → neon-http (ADR-014: serverless, keine Pool-Erschöpfung) → INT/PRD
//   - lokale/klassische DB  → node-postgres (Pool)                                    → DEV (Docker)
// Der Treiber wird an der DATABASE_URL erkannt, nicht an der Stage (robuster).
type DB = NeonHttpDatabase<typeof schema>;

function createDb(): DB {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL ist nicht gesetzt – siehe .env.example (DEV: lokale DB, INT/PRD: Neon).",
    );
  }
  const isNeon = /neon\.tech|vercel-storage\.com|pooler\.[a-z0-9-]+\.aws\.neon/.test(url);
  if (isNeon) {
    return drizzleNeon(neon(url), { schema });
  }
  // Lokale Postgres-DB (DEV): node-postgres. Query-API ist identisch → sicherer Cast.
  return drizzlePg(new Pool({ connectionString: url }), {
    schema,
  }) as unknown as DB;
}

// Lazy: Verbindung erst beim ersten Zugriff, nicht beim Import → `next build` ohne
// DATABASE_URL bleibt grün; fehlt die Variable zur Laufzeit, greift der Fehler oben.
let instance: DB | undefined;
export const db = new Proxy({} as DB, {
  get(_target, prop, receiver) {
    instance ??= createDb();
    return Reflect.get(instance, prop, receiver);
  },
});
