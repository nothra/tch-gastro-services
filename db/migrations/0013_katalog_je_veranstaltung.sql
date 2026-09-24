-- Katalog je Veranstaltung (spec-346, ADR-050-Nachtrag zu D3). Von `drizzle-kit generate`
-- erzeugt und NICHT hand-editiert – anders als 0012 genügt hier ein einziger, rein erweiternder
-- Schritt: weil das Drizzle-Schema einen echten SQL-`DEFAULT 'standard'` deklariert (nicht nur
-- eine App-seitige `$defaultFn`), füllt Postgres bestehende Zeilen konstant auf und akzeptiert
-- `NOT NULL` sofort. Die nullable→backfill→NOT-NULL-Sequenz aus ADR-050 D6 ist deshalb
-- entbehrlich; sie war dort nur nötig, weil `catalog_item.catalog_id` keinen DB-Default trug.
--
-- Der Default deckt zugleich die stehende Theke ab, die bewusst keine eigene Katalogauswahl
-- bekommt (spec-346 AK7) – `ensureThekeForKasse` setzt die Spalte nie.
--
-- Die Standard-Katalog-ID 'standard' ist ein stabiler Text-Key (ADR-050 D3) und liegt zusätzlich
-- als Konstante STANDARD_CATALOG_ID in db/schema.ts; ein Drift-Guard in db/catalog.test.ts hält
-- beide gegeneinander.
ALTER TABLE "veranstaltung" ADD COLUMN "catalog_id" text DEFAULT 'standard' NOT NULL;--> statement-breakpoint
-- Kein ON DELETE (Postgres-Default "no action", faktisch restriktiv) wie bei catalog_item:
-- ein Katalog, den eine Veranstaltung nutzt, kann nicht gelöscht werden.
ALTER TABLE "veranstaltung" ADD CONSTRAINT "veranstaltung_catalog_id_catalog_id_fk" FOREIGN KEY ("catalog_id") REFERENCES "public"."catalog"("id") ON DELETE no action ON UPDATE no action;
