import { sql } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  text,
  integer,
  boolean,
  timestamp,
  date,
  primaryKey,
  unique,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";

// Rollen für RBAC (ADR-016, umbenannt in ADR-024): zwei fachliche Rollen. Eine Person kann
// beide tragen. `veranstalter` (vormals `abrechner`) ist Owner des ganzen Veranstaltungs-
// Lebenszyklus (Anlage → Führen → Abrechnen), nicht nur der Abrechnungs-Phase.
export const userRole = pgEnum("user_role", ["verwalter", "veranstalter"]);
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

// Getränke-Katalog (F2, #49). Deutsche Enum-Werte wie user_role. Essen ist – seit der
// Modelländerung 2026-07-15 (spec-51, ADR-023 D4) – ebenfalls ein Katalogartikel (eigene
// Kategorie `essen` mit festen Preisen); diese Kategorie kommt als F2-Erweiterung (#116).
// Ein Essenpreis je Veranstaltung existiert bewusst NICHT mehr.
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

// Veranstaltung (F4, #51, ADR-023): die zentrale Vorgangs-Entität der Abrechnung – die
// Klammer um alle Erfassungen (F5–F8). Zwei Typen in EINER Tabelle (ADR-023 D1): die
// datierte `veranstaltung` (Veranstalter legt sie mit Datum/Kasse an) und die dauerhaft
// offene `theke` (stehende Selbstbedienung je Kasse). Deutsche Enum-Werte wie user_role.
export const veranstaltungTyp = pgEnum("veranstaltung_typ", ["veranstaltung", "theke"]);
export type VeranstaltungTyp = (typeof veranstaltungTyp.enumValues)[number];

export const veranstaltungStatus = pgEnum("veranstaltung_status", ["offen", "abgeschlossen"]);
export type VeranstaltungStatus = (typeof veranstaltungStatus.enumValues)[number];

// Kasse ist bewusst KEIN Enum, sondern ein stabiler Text-Key (ADR-023 D2): eine spätere
// Kassen-Entität (#57, laufender Saldo) kann dieselben Keys als PK adoptieren – per FK,
// ohne Migration bestehender Zeilen. Diese Konstante ist die kanonische Wertmenge (von Zod
// und Seed genutzt); die DB-CHECK `veranstaltung_kasse_gueltig` unten muss synchron bleiben.
export const KASSEN = ["montagsrunde", "vereinskasse"] as const;
export type Kasse = (typeof KASSEN)[number];

// Zugangs-Token für die öffentliche Selbstbedienung/Theke (F7/#54). Bewusst hoch-entropisch
// (2× UUID = 256 bit) – Länge/Rotation/Rate-Limit sind offen für F7/#54 & /security-review.
function unguessableToken(): string {
  const hex = () => globalThis.crypto.randomUUID().replace(/-/g, "");
  return hex() + hex();
}

export const veranstaltung = pgTable(
  "veranstaltung",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => globalThis.crypto.randomUUID()),
    typ: veranstaltungTyp("typ").notNull().default("veranstaltung"),
    bezeichnung: text("bezeichnung").notNull(),
    // Pflicht nur für `veranstaltung` (CHECK unten erzwingt es); `theke` hat kein Datum.
    datum: date("datum", { mode: "date" }),
    kasse: text("kasse").notNull(),
    status: veranstaltungStatus("status").notNull().default("offen"),
    token: text("token").notNull().unique().$defaultFn(unguessableToken),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (v) => [
    // ADR-023 D6/D3 – genau EINE stehende Theke je Kasse (Partial-Unique → Idempotenz).
    uniqueIndex("veranstaltung_eine_theke_je_kasse")
      .on(v.kasse)
      .where(sql`${v.typ} = 'theke'`),
    // ADR-023 D4 – Datum ist Pflicht für datierte Veranstaltungen, nicht für die Theke.
    check("veranstaltung_datum_pflicht", sql`${v.typ} <> 'veranstaltung' OR ${v.datum} IS NOT NULL`),
    // ADR-023 D2 – Kasse fail-closed ohne Enum-Typ (Werte synchron zu KASSEN halten).
    check("veranstaltung_kasse_gueltig", sql`${v.kasse} IN ('montagsrunde', 'vereinskasse')`),
  ],
);

export type Veranstaltung = typeof veranstaltung.$inferSelect;
export type NewVeranstaltung = typeof veranstaltung.$inferInsert;

// Abrechnungszeile je Teilnehmer (ADR-023 D5). `anzeigename` ist ein SNAPSHOT aus
// teilnehmer.name beim Anlegen der Zeile (ADR-022-Vertrag): abgeschlossene Veranstaltungen
// zeigen den Namen wie damals. UNIQUE verhindert Doppel-Zeilen desselben Teilnehmers.
export const veranstaltungZeile = pgTable(
  "veranstaltung_zeile",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => globalThis.crypto.randomUUID()),
    veranstaltungId: text("veranstaltung_id")
      .notNull()
      .references(() => veranstaltung.id, { onDelete: "cascade" }),
    teilnehmerId: text("teilnehmer_id")
      .notNull()
      .references(() => teilnehmer.id),
    anzeigename: text("anzeigename").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (z) => [unique("veranstaltung_zeile_unique").on(z.veranstaltungId, z.teilnehmerId)],
);

export type VeranstaltungZeile = typeof veranstaltungZeile.$inferSelect;
export type NewVeranstaltungZeile = typeof veranstaltungZeile.$inferInsert;
