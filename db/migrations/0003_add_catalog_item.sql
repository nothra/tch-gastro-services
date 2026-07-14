CREATE TYPE "public"."catalog_category" AS ENUM('getraenk', 'kaffee');--> statement-breakpoint
CREATE TABLE "catalog_item" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"size" text DEFAULT '' NOT NULL,
	"price_cents" integer NOT NULL,
	"category" "catalog_category" NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_item_name_size_unique" UNIQUE("name","size")
);
