-- ADR-016: Rollen-Modell auf Mehrfach-Rollen umstellen (admin/staff/member → verwalter/abrechner,
-- Einzelspalte role → Array-Spalte roles). Postgres kann Enum-Werte nicht entfernen und eine
-- Enum-Spalte nicht nach Enum[] casten. Die DB ist praktisch leer (nur ein Seed-Konto, kein
-- Prod-Datenbestand) → drop-and-recreate ist zulässig. Das von drizzle-kit generierte SQL war
-- hier inkohärent (Alter auf noch nicht existierende Spalte) und wurde durch diese klare
-- Reihenfolge ersetzt; der Snapshot bleibt der von drizzle generierte, korrekte Stand.
ALTER TABLE "user" DROP COLUMN "role";--> statement-breakpoint
DROP TYPE "public"."user_role";--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('verwalter', 'abrechner');--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "roles" "public"."user_role"[] DEFAULT '{}' NOT NULL;
