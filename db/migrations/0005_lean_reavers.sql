CREATE TYPE "public"."teilnehmer_typ" AS ENUM('person', 'familie');--> statement-breakpoint
CREATE TABLE "teilnehmer" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"typ" "teilnehmer_typ" NOT NULL,
	"mitglied" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
