CREATE TYPE "public"."veranstaltung_ereignis_art" AS ENUM('abgeschlossen', 'wiedereroeffnet');--> statement-breakpoint
CREATE TABLE "veranstaltung_ereignis" (
	"id" text PRIMARY KEY NOT NULL,
	"veranstaltung_id" text NOT NULL,
	"art" "veranstaltung_ereignis_art" NOT NULL,
	"akteur_user_id" text,
	"akteur_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "veranstaltung_zeile" ADD COLUMN "erhalten_cents" integer;--> statement-breakpoint
ALTER TABLE "verzehr_position" ADD COLUMN "einzelpreis_cents" integer;--> statement-breakpoint
ALTER TABLE "veranstaltung_ereignis" ADD CONSTRAINT "veranstaltung_ereignis_veranstaltung_id_veranstaltung_id_fk" FOREIGN KEY ("veranstaltung_id") REFERENCES "public"."veranstaltung"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "veranstaltung_ereignis" ADD CONSTRAINT "veranstaltung_ereignis_akteur_user_id_user_id_fk" FOREIGN KEY ("akteur_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "veranstaltung_zeile" ADD CONSTRAINT "veranstaltung_zeile_erhalten_nicht_negativ" CHECK ("veranstaltung_zeile"."erhalten_cents" IS NULL OR "veranstaltung_zeile"."erhalten_cents" >= 0);--> statement-breakpoint
ALTER TABLE "verzehr_position" ADD CONSTRAINT "verzehr_position_einzelpreis_nicht_negativ" CHECK ("verzehr_position"."einzelpreis_cents" IS NULL OR "verzehr_position"."einzelpreis_cents" >= 0);