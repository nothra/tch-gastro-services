# ADR 016: RBAC – Mehrfach-Rollen (Verwalter/Abrechner) & serverseitige Durchsetzung

## Status
Proposed

## Date
2026-07-11

## Context
Feature **F1 / Issue #48** ([spec-48](../specs/spec-48-login-rollen.md)) verlangt zwei
Verantwortlichkeiten mit Login: **`verwalter`** (Stammdaten & Preise) und **`abrechner`**
(Abende führen & kassieren). **Eine Person kann beide Rollen gleichzeitig haben**
(Dieter/Ralf sind faktisch beides). Die Rollenrechte-Matrix aus spec-48 wird von F2–F8
serverseitig durchgesetzt (Middleware **und** Server Actions).

ADR-014 hat den Stack und den Grundsatz „**eigenes RBAC, serverseitig**" fixiert
(Auth.js/NextAuth v5, Credentials, JWT-Sessions, Nutzer/Rollen in eigener Neon-DB).
Task #16 hat das Gerüst gebaut – es passt aber **nicht** zu spec-48:

1. **Rollen-Modell falsch.** `db/schema.ts` definiert `pgEnum("user_role",
   ["admin","staff","member"])` und **eine** `role`-Spalte pro User (Default `"member"`).
   Ein Einzel-Enum kann weder die geforderten Rollennamen noch **Mehrfach-Rollen** abbilden.
2. **JWT-Claim ist ein Einzelwert.** `auth.config.ts` setzt `token.role`/`session.user.role`
   als `string`; `types/next-auth.d.ts` typisiert `role?: string`.
3. **Keine Rollen-Prüfung, kein Routen-Schutz.** `authorized()` prüft nur *eingeloggt ja/nein*.
   Es existiert **keine `middleware.ts`** – der `authorized`-Callback ist damit derzeit gar
   nicht verdrahtet.
4. **Seed legt nur einen `admin` an** – eine Rolle, die es künftig nicht mehr gibt.

Diese ADR entscheidet die vier offenen Architektur-Fragen für #48 im Rahmen eines
kleinen, nicht-kommerziellen Vereinsprojekts (wenige Nutzer, genau zwei Rollen, laut
Scope **keine** feingranularen Rechte).

## Decision

**Frage 1 – Rollen-Datenmodell: Enum-Array-Spalte (Option A).**
Das Enum wird auf die fachlichen Werte umgestellt und die Spalte wird ein Array:
```ts
export const userRole = pgEnum("user_role", ["verwalter", "abrechner"]);
// user-Tabelle: role (Einzelwert) entfällt → roles (Mehrfach)
roles: userRole("roles").array().notNull().default(sql`'{}'::user_role[]`),
```
Eine Person trägt beide Rollen als `["verwalter","abrechner"]`. Kein Join, ein Read beim
Login, direkt als JWT-Claim serialisierbar.

**Frage 2 – Durchsetzung: zweistufig, Server Actions sind autoritativ.**
- **Autoritativ in Server Actions** über einen wiederverwendbaren Helper `lib/authz.ts`:
  - `hasRole(roles, required)` – reine Prädikatsfunktion (kein Framework, kein DB).
  - `requireRole(required)` / `requireAnyRole(required[])` – rufen `auth()`, lesen
    `session.user.roles`, werfen bei Verstoß einen `ForbiddenError` (403-artig, protokolliert).
  Jede geschützte Action ruft den Guard als **erste Zeile** auf (Fail-closed).
- **Coarse Routen-Schutz in `middleware.ts`** (neu anzulegen): edge-sicher, liest die
  Rolle(n) **ausschließlich aus dem JWT** (kein DB-/bcrypt-Zugriff im Edge-Runtime).
  Der `authorized`-Callback bleibt der Login-Gate; die Rollen-Prüfung für
  Verwalter-only-Pfade wird dort optional als grober Filter ergänzt. Die
  UI-Sichtbarkeit ist nur Komfort, **nie** die Sicherheitsgrenze.

**Frage 3 – Initiale Konto-Anlage: Seed-Skript. Keine Nutzerverwaltungs-UI in #48.**
`db/seed.ts` wird angepasst und legt die Login-Konten (Verwalter/Abrechner) an. Eine
Verwalter-UI zur Nutzerpflege ist in spec-48 **nicht** im Scope → bewusst **YAGNI**,
späteres Feature. Damit beantwortet diese ADR die offene Frage der Spec.

**Frage 4 – Session-Claims: eine Quelle für UI und Server.**
`roles: UserRole[]` wird durchgängig geführt: `authorize()` gibt `roles` zurück → `jwt()`
schreibt `token.roles` → `session()` spiegelt `session.user.roles`. Typen in
`types/next-auth.d.ts` von `role?: string` auf `roles: UserRole[]` umgestellt. UI-Anzeige
(`session.user.roles`) und Guard (`auth()` → `session.user.roles`) lesen dieselbe Quelle.

## Alternatives

### Option A: Enum-Array-Spalte `roles user_role[]` (gewählt)
**Pros:** Mehrfach-Rollen in einem Feld; ein Read beim Login (kein Join); 1:1 als
JWT-Claim `roles: string[]` serialisierbar; Zod trivial (`z.array(z.enum([...]))`);
Prüfung = `roles.includes(x)`; neue Rolle = Enum-Wert ergänzen, **keine** Tabellen-
Strukturänderung; sehr gut testbar (reines Prädikat).
**Cons:** Array-Spalten sind weniger „relational" (Abfrage „wer hat Rolle X" braucht
`ANY(...)`/`@>`); Enum-Werte in Postgres nur additiv änderbar (Entfernen umständlich) –
bei diesem Scope irrelevant.

### Option B: Join-Tabelle `user_roles (userId, role)`
**Pros:** klassisches, voll normalisiertes RBAC; maximal flexibel; einfache „wer hat
Rolle X"-Abfragen; problemlos erweiterbar bis zu feingranularen Rechten.
**Cons:** zusätzliche Tabelle + Join bzw. zweiter Query beim Login; mehr bewegliche
Teile und Migrations-/Testaufwand – **Over-Engineering** für genau zwei feste Rollen und
eine Handvoll Nutzer (YAGNI, Scope schließt feingranulare Rechte aus).

### Option C: Boolean-Flags `is_verwalter` / `is_abrechner`
**Pros:** maximal explizit und typsicher; keine Enum-/Array-Mechanik; einfachste Zod-
Abbildung.
**Cons:** nicht erweiterbar – jede weitere Rolle erzwingt Schema-**und** Code-Änderungen
an allen Prüfstellen; Rollen-Liste ist kein iterierbarer Wert (Guard-Helper müsste je Flag
verzweigen statt generisch `includes`); skaliert schlecht mit der F2–F8-Matrix.

## Rationale
Für ein kleines, nicht-kommerzielles Projekt mit genau zwei Rollen ist die Join-Tabelle (B)
zu viel Apparat und die Boolean-Flags (C) zu starr. Die **Enum-Array-Spalte (A)** trifft die
Mitte: sie modelliert Mehrfach-Rollen ohne zusätzliche Tabelle, liefert den JWT-Claim
verlustfrei, hält die Guard-Logik generisch (`roles.includes(...)`) und bleibt additiv
erweiterbar. Die zweistufige Durchsetzung folgt direkt ADR-014 („RBAC serverseitig") und den
Projekt-Konventionen (Zod an jeder Server-Grenze, Auth-Checks serverseitig): Server Actions
sind die harte Grenze (erfüllen die AK „serverseitig abgelehnt, nicht nur im UI ausgeblendet"),
die Middleware ist der edge-sichere, DB-freie Vorfilter. Seed statt Nutzerverwaltungs-UI hält
#48 im Spec-Scope.

## Consequences

**Positiv:**
- Mehrfach-Rollen sauber modelliert; F2–F8 erben einen einheitlichen Guard
  (`requireRole`/`requireAnyRole`) und `session.user.roles` als einzige Rollen-Quelle.
- Guard-Kern ist eine reine, framework-freie Funktion → schnelle, mockfreie Unit-Tests.
- Kein Vendor-Lock, keine neue Infrastruktur; bleibt dauerhaft kostenfrei (ADR-014).

**Negativ / Trade-offs & konkrete Migration:**
- **Schema-Migration (`db/schema.ts` + neue SQL-Migration).** Enum-Werte wechseln
  (`admin/staff/member` → `verwalter/abrechner`) und die Spalte wird ein Array. Postgres
  kann Enum-Werte nicht entfernen und eine Enum-Spalte nicht direkt nach Enum[] casten.
  Da die DB praktisch leer ist (nur ein Seed-Konto, kein Prod-Datenbestand), ist
  Drop-and-recreate zulässig. `pnpm db:generate` ausführen und die **generierte SQL
  prüfen/anpassen**, effektiv:
  ```sql
  ALTER TABLE "user" DROP COLUMN "role";
  DROP TYPE "user_role";
  CREATE TYPE "user_role" AS ENUM ('verwalter','abrechner');
  ALTER TABLE "user" ADD COLUMN "roles" "user_role"[] DEFAULT '{}' NOT NULL;
  ```
- **`auth.ts` / `auth.config.ts`:** `authorize()` gibt `roles` statt `role` zurück;
  `jwt()` setzt `token.roles = user.roles ?? []`; `session()` spiegelt `session.user.roles`.
  Der `??"member"`-Default entfällt (leeres Array = keine Rollen-Rechte).
- **`types/next-auth.d.ts`:** `role?: string` → `roles: UserRole[]` auf `User`,
  `Session.user`, `JWT`.
- **Neue Datei `middleware.ts` (Root):** exportiert die Auth-Middleware mit `matcher`
  (schützt alles außer `/login`, statischen Assets und dem NextAuth-Route-Handler);
  optionaler grober Verwalter-Pfad-Filter aus `token.roles`. **Kein** DB-/bcrypt-Import.
- **`db/seed.ts`:** legt Konto/Konten mit `roles: ["verwalter","abrechner"]` an (statt
  `role: "admin"`); Idempotenz beibehalten.
- **Neue Datei `lib/authz.ts` (+ `lib/authz.test.ts`):** `hasRole`, `requireRole`,
  `requireAnyRole`, `ForbiddenError`.
- **Token-Staleness:** Rollen stecken im JWT; eine Rollen-Änderung in der DB wirkt erst
  nach erneutem Login (Middleware liest kein DB). In diesem Projekt akzeptabel; bei Bedarf
  später kürzere Session-Lebensdauer oder DB-Session-Strategie (eigene ADR).
- **Nutzer anlegen** erfolgt bis zu einem späteren User-Admin-Feature über Seed/DB
  (bewusste Scope-Grenze von #48).
