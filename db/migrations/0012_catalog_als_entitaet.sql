-- Katalog als Template-Entität (spec-59, ADR-050). HAND-EDITIERTE Expand-Migration (nicht rein
-- erweiternd: `SET NOT NULL` unten ist ein constraining Schritt, s. ADR-050 D6 zum Deploy-Fenster):
-- `drizzle-kit generate` emittiert `ADD COLUMN "catalog_id" text NOT NULL` in einem Schritt,
-- was auf jeder DB mit bestehenden Artikeln fehlschlägt. Deshalb die Reihenfolge aus ADR-050 D6:
-- nullable → seed → backfill → NOT NULL → FK/Unique-Tausch. Vorbild für die Daten-Schritte ist
-- die manuelle Migration 0004_seed_catalog_reference.sql.
--
-- Die Standard-Katalog-ID 'standard' ist ein stabiler Text-Key (ADR-050 D3) und liegt zusätzlich
-- als Konstante STANDARD_CATALOG_ID in db/catalog.ts; ein Drift-Guard in db/catalog.test.ts hält
-- beide gegeneinander. Der Key kodiert den Namen nicht – ein Umbenennen ist folgenlos (AK5).
CREATE TABLE "catalog" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_name_unique" UNIQUE("name")
);
--> statement-breakpoint
-- Standard-Katalog seeden. ON CONFLICT DO NOTHING macht den Schritt wiederholbar (AK9) und
-- überschreibt einen vorab von Hand angelegten oder umbenannten Katalog nie.
INSERT INTO "catalog" ("id", "name", "sort_order") VALUES ('standard', 'Montagsrunde', 0) ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
-- Zunächst nullable, damit bestehende Artikel die Spalte überleben.
ALTER TABLE "catalog_item" ADD COLUMN "catalog_id" text;--> statement-breakpoint
-- Backfill: alle bestehenden Artikel in den Standard-Katalog (AK2). `WHERE ... IS NULL` macht den
-- Schritt wiederholbar und lässt eine bereits gesetzte Zuordnung unangetastet (AK9).
UPDATE "catalog_item" SET "catalog_id" = 'standard' WHERE "catalog_id" IS NULL;--> statement-breakpoint
-- Erst jetzt fail-closed: ab hier lehnt die DB jeden Artikel ohne Katalog ab (AK3/FS1).
ALTER TABLE "catalog_item" ALTER COLUMN "catalog_id" SET NOT NULL;--> statement-breakpoint
-- Kein ON DELETE (Postgres-Default "no action", faktisch restriktiv): ein Katalog mit Artikeln
-- kann nicht gelöscht werden (FS5).
ALTER TABLE "catalog_item" ADD CONSTRAINT "catalog_item_catalog_id_catalog_id_fk" FOREIGN KEY ("catalog_id") REFERENCES "public"."catalog"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Duplikat-Regel wandert von „Name + Größe global" auf „Name + Größe je Katalog" (AK4).
-- `catalog_id` steht vorn, damit der Btree-Index der Constraint die katalog-gefilterten
-- Lesezugriffe bedient (ADR-050 D2) – ein separater FK-Index wäre redundant.
ALTER TABLE "catalog_item" DROP CONSTRAINT "catalog_item_name_size_unique";--> statement-breakpoint
ALTER TABLE "catalog_item" ADD CONSTRAINT "catalog_item_catalog_name_size_unique" UNIQUE("catalog_id","name","size");
