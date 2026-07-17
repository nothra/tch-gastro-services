CREATE TABLE "verzehr_position" (
	"id" text PRIMARY KEY NOT NULL,
	"zeile_id" text NOT NULL,
	"catalog_item_id" text NOT NULL,
	"menge" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "verzehr_position_zeile_item_unique" UNIQUE("zeile_id","catalog_item_id"),
	CONSTRAINT "verzehr_position_menge_nicht_negativ" CHECK ("verzehr_position"."menge" >= 0)
);
--> statement-breakpoint
ALTER TABLE "verzehr_position" ADD CONSTRAINT "verzehr_position_zeile_id_veranstaltung_zeile_id_fk" FOREIGN KEY ("zeile_id") REFERENCES "public"."veranstaltung_zeile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verzehr_position" ADD CONSTRAINT "verzehr_position_catalog_item_id_catalog_item_id_fk" FOREIGN KEY ("catalog_item_id") REFERENCES "public"."catalog_item"("id") ON DELETE no action ON UPDATE no action;