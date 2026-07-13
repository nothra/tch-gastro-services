-- Referenz-Preisliste (spec-49, Quelle: docs/specs/README-montagsrunde.md, Stand 2026-04-28)
-- als idempotente Daten-Migration (Task-49 /architecture): läuft automatisch im Deploy-Gate
-- (ADR-017) und ist damit in jeder Umgebung (DEV/INT/PRD) präsent. ON CONFLICT (name, size)
-- DO NOTHING seedet nur einmalig – spätere Verwalter-Änderungen werden nie überschrieben.
-- Multi-Größen-/Sammelzeilen der Vorlage sind zu je einem Artikel expandiert. Preise als
-- ganzzahlige Cent (ADR-021). `id` per gen_random_uuid() (Postgres-eingebaut), da die
-- App-seitige $defaultFn in reinem SQL nicht greift; created_at/updated_at/active nutzen
-- ihre Spalten-Defaults.
INSERT INTO "catalog_item" ("id", "name", "size", "price_cents", "category", "sort_order") VALUES
	(gen_random_uuid()::text, 'ISO-Sportdrink', '0,5 l', 200, 'getraenk', 10),
	(gen_random_uuid()::text, 'Cola', '0,2 l', 120, 'getraenk', 20),
	(gen_random_uuid()::text, 'Cola', '0,33 l', 160, 'getraenk', 30),
	(gen_random_uuid()::text, 'Cola', '0,5 l', 210, 'getraenk', 40),
	(gen_random_uuid()::text, 'Cola', '0,7 l', 250, 'getraenk', 50),
	(gen_random_uuid()::text, 'Fanta', '0,2 l', 120, 'getraenk', 60),
	(gen_random_uuid()::text, 'Fanta', '0,33 l', 160, 'getraenk', 70),
	(gen_random_uuid()::text, 'Fanta', '0,5 l', 210, 'getraenk', 80),
	(gen_random_uuid()::text, 'Fanta', '0,7 l', 250, 'getraenk', 90),
	(gen_random_uuid()::text, 'Spezi', '0,2 l', 120, 'getraenk', 100),
	(gen_random_uuid()::text, 'Spezi', '0,33 l', 160, 'getraenk', 110),
	(gen_random_uuid()::text, 'Spezi', '0,5 l', 210, 'getraenk', 120),
	(gen_random_uuid()::text, 'Spezi', '0,7 l', 250, 'getraenk', 130),
	(gen_random_uuid()::text, 'Limo', '0,2 l', 120, 'getraenk', 140),
	(gen_random_uuid()::text, 'Limo', '0,33 l', 160, 'getraenk', 150),
	(gen_random_uuid()::text, 'Limo', '0,5 l', 210, 'getraenk', 160),
	(gen_random_uuid()::text, 'Limo', '0,7 l', 250, 'getraenk', 170),
	(gen_random_uuid()::text, 'Mineralwasser', '0,2 l', 50, 'getraenk', 180),
	(gen_random_uuid()::text, 'Mineralwasser', '0,5 l', 100, 'getraenk', 190),
	(gen_random_uuid()::text, 'Sprudel', '1,0 l', 120, 'getraenk', 200),
	(gen_random_uuid()::text, 'Weinschorle', '0,25 l', 200, 'getraenk', 210),
	(gen_random_uuid()::text, 'Weinschorle', '0,5 l', 350, 'getraenk', 220),
	(gen_random_uuid()::text, 'Bier', '0,33 l', 200, 'getraenk', 230),
	(gen_random_uuid()::text, 'Bier', '0,5 l', 250, 'getraenk', 240),
	(gen_random_uuid()::text, 'Weizenbier', '0,5 l', 300, 'getraenk', 250),
	(gen_random_uuid()::text, 'Sekt', '0,1 l', 150, 'getraenk', 260),
	(gen_random_uuid()::text, 'Sekt', '0,7 l', 800, 'getraenk', 270),
	(gen_random_uuid()::text, 'Kaffee', '', 100, 'kaffee', 280)
ON CONFLICT ("name", "size") DO NOTHING;
