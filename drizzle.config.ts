import { defineConfig } from "drizzle-kit";

// `pnpm db:generate` läuft offline (nur Schema → SQL). `pnpm db:migrate`/`db:studio`
// brauchen DATABASE_URL (via dotenv aus .env.local, siehe package.json-Scripts).
export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
