CREATE TYPE "public"."veranstaltung_status" AS ENUM('offen', 'abgeschlossen');--> statement-breakpoint
CREATE TYPE "public"."veranstaltung_typ" AS ENUM('veranstaltung', 'theke');--> statement-breakpoint
CREATE TABLE "veranstaltung" (
	"id" text PRIMARY KEY NOT NULL,
	"typ" "veranstaltung_typ" DEFAULT 'veranstaltung' NOT NULL,
	"bezeichnung" text NOT NULL,
	"datum" date,
	"kasse" text NOT NULL,
	"status" "veranstaltung_status" DEFAULT 'offen' NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "veranstaltung_token_unique" UNIQUE("token"),
	CONSTRAINT "veranstaltung_datum_pflicht" CHECK ("veranstaltung"."typ" <> 'veranstaltung' OR "veranstaltung"."datum" IS NOT NULL),
	CONSTRAINT "veranstaltung_kasse_gueltig" CHECK ("veranstaltung"."kasse" IN ('montagsrunde', 'vereinskasse'))
);
--> statement-breakpoint
CREATE TABLE "veranstaltung_zeile" (
	"id" text PRIMARY KEY NOT NULL,
	"veranstaltung_id" text NOT NULL,
	"teilnehmer_id" text NOT NULL,
	"anzeigename" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "veranstaltung_zeile_unique" UNIQUE("veranstaltung_id","teilnehmer_id")
);
--> statement-breakpoint
ALTER TABLE "veranstaltung_zeile" ADD CONSTRAINT "veranstaltung_zeile_veranstaltung_id_veranstaltung_id_fk" FOREIGN KEY ("veranstaltung_id") REFERENCES "public"."veranstaltung"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "veranstaltung_zeile" ADD CONSTRAINT "veranstaltung_zeile_teilnehmer_id_teilnehmer_id_fk" FOREIGN KEY ("teilnehmer_id") REFERENCES "public"."teilnehmer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "veranstaltung_eine_theke_je_kasse" ON "veranstaltung" USING btree ("kasse") WHERE "veranstaltung"."typ" = 'theke';