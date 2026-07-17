CREATE TYPE "public"."auslage_kategorie" AS ENUM('getraenke', 'essen', 'sonstiges');--> statement-breakpoint
CREATE TYPE "public"."auslage_status" AS ENUM('offen', 'erstattet');--> statement-breakpoint
CREATE TABLE "auslage" (
	"id" text PRIMARY KEY NOT NULL,
	"veranstaltung_id" text NOT NULL,
	"teilnehmer_id" text NOT NULL,
	"kategorie" "auslage_kategorie" NOT NULL,
	"betrag_cents" integer NOT NULL,
	"zweck" text,
	"status" "auslage_status" DEFAULT 'offen' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auslage_betrag_positiv" CHECK ("auslage"."betrag_cents" > 0)
);
--> statement-breakpoint
ALTER TABLE "auslage" ADD CONSTRAINT "auslage_veranstaltung_id_veranstaltung_id_fk" FOREIGN KEY ("veranstaltung_id") REFERENCES "public"."veranstaltung"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auslage" ADD CONSTRAINT "auslage_teilnehmer_id_teilnehmer_id_fk" FOREIGN KEY ("teilnehmer_id") REFERENCES "public"."teilnehmer"("id") ON DELETE no action ON UPDATE no action;