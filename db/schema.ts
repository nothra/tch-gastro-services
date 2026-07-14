import { sql } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  text,
  integer,
  boolean,
  timestamp,
  primaryKey,
  unique,
} from "drizzle-orm/pg-core";

// Rollen für RBAC (ADR-016): zwei fachliche Rollen. Eine Person kann beide tragen.
export const userRole = pgEnum("user_role", ["verwalter", "abrechner"]);
export type UserRole = (typeof userRole.enumValues)[number];

// Auth.js-kompatibles Schema (Drizzle-Adapter). users trägt die Rollen als Array,
// damit Mehrfach-Rollen ohne Join abbildbar sind (ADR-016, Frage 1).
export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => globalThis.crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  roles: userRole("roles")
    .array()
    .notNull()
    .default(sql`'{}'::user_role[]`),
  // Credentials-Login (ADR-014): bcrypt-Hash. Null bei OAuth-only-Nutzern.
  passwordHash: text("passwordHash"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [primaryKey({ columns: [account.provider, account.providerAccountId] })],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);

// Getränke-Katalog (F2, #49). Deutsche Enum-Werte wie user_role. Essen gehört NICHT
// hierher (wird pro Abend in F4 gesetzt).
export const catalogCategory = pgEnum("catalog_category", ["getraenk", "kaffee"]);
export type CatalogCategory = (typeof catalogCategory.enumValues)[number];

// Artikel werden nie hart gelöscht, sondern über `active` deaktiviert/reaktiviert
// (spec-49). Preis als ganzzahlige Cent (ADR-021, Spalte *_cents). `size` ist
// NOT NULL DEFAULT '' (leer = "ohne Größe", z. B. Kaffee), damit die Duplikat-Regel
// eine einfache zusammengesetzte Unique-Constraint UNIQUE(name, size) ist.
export const catalogItems = pgTable(
  "catalog_item",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => globalThis.crypto.randomUUID()),
    name: text("name").notNull(),
    size: text("size").notNull().default(""),
    priceCents: integer("price_cents").notNull(),
    category: catalogCategory("category").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (item) => [unique("catalog_item_name_size_unique").on(item.name, item.size)],
);

export type CatalogItem = typeof catalogItems.$inferSelect;
export type NewCatalogItem = typeof catalogItems.$inferInsert;

// Teilnehmer-Stammdaten (F3, #50, ADR-022). Eine Zeile ist eine Abrechnungseinheit und
// kann eine Einzelperson ODER eine Familie sein – unterschieden nur über `typ` (deutsche
// Enum-Werte wie user_role/catalog_category). Bewusste Abweichung vom Katalog: KEIN
// Unique auf `name` – Namensgleichheit ist erlaubt (ADR-022, Frage 2), die Warnung sitzt
// applikativ in der Action. `mitglied` ist reines Info-/Auswertungskennzeichen und NICHT
// preisrelevant (spec-50). Kein Hard-Delete – Deaktivieren über `active`.
export const teilnehmerTyp = pgEnum("teilnehmer_typ", ["person", "familie"]);
export type TeilnehmerTyp = (typeof teilnehmerTyp.enumValues)[number];

export const teilnehmer = pgTable("teilnehmer", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => globalThis.crypto.randomUUID()),
  name: text("name").notNull(),
  typ: teilnehmerTyp("typ").notNull(),
  mitglied: boolean("mitglied").notNull().default(false),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Teilnehmer = typeof teilnehmer.$inferSelect;
export type NewTeilnehmer = typeof teilnehmer.$inferInsert;
