import { sql } from "drizzle-orm";
import { pgTable, pgEnum, text, integer, timestamp, primaryKey } from "drizzle-orm/pg-core";

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
