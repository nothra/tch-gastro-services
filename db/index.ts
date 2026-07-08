import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

// Neon serverless HTTP-Treiber (ADR-014): keine klassische TCP-Pool-Verbindung →
// keine Verbindungs-Erschöpfung aus Vercel-Functions.
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL ist nicht gesetzt – siehe .env.example (Neon Pooled Connection String).",
  );
}

const sql = neon(connectionString);
export const db = drizzle(sql, { schema });
