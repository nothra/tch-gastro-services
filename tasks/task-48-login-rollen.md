# Task 48: login-rollen

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
<!-- Was soll implementiert werden? -->

Login & RBAC für die zwei Rollen **`verwalter`** (Stammdaten & Preise) und **`abrechner`**
(Abende führen & kassieren). Eine Person kann **beide** Rollen gleichzeitig tragen. Baut auf
dem Auth.js-Gerüst aus #16 auf; das dortige Einzel-Rollen-Modell wird auf Mehrfach-Rollen
umgestellt. Rollenrechte werden **serverseitig** durchgesetzt (Middleware + Server Actions),
nicht nur im UI. Abmelden inbegriffen. Kein Self-Signup, kein Passwort-Reset (Scope).
Entscheidungen: siehe [ADR-016](../adr/016-rbac-rollen-login.md).

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [x] GIVEN ein nicht angemeldeter Besucher WHEN er eine geschützte Seite (Stammdaten,
      Abend-Verwaltung) öffnet THEN wird er zur Anmeldung geleitet und sieht keine
      geschützten Daten. — `proxy.ts` (`authorized`-Callback), e2e `auth.spec.ts`.
- [x] GIVEN gültige Zugangsdaten WHEN sich eine Person anmeldet THEN ist sie angemeldet
      und ihre Rolle(n) bestimmen die sichtbaren/erlaubten Aktionen. — `roles` fließen
      `authorize()` → `jwt()` → `session.user.roles`.
- [x] GIVEN ein angemeldeter **Abrechner** (ohne Verwalter-Rolle) WHEN er die
      Katalog- oder Stammdaten-Pflege aufruft THEN wird die Aktion serverseitig
      abgelehnt (nicht nur im UI ausgeblendet). — **Mechanismus** `requireRole("verwalter")`
      in `lib/authz.ts` (unit-getestet); die konkreten Katalog-/Stammdaten-Actions sind F2/F3.
- [x] GIVEN ein angemeldeter **Verwalter** WHEN er Katalog/Stammdaten öffnet THEN darf
      er lesen und schreiben. — Guard lässt bei vorhandener Rolle durch (unit-getestet).
- [x] GIVEN ein angemeldeter Nutzer WHEN er sich abmeldet THEN ist die Sitzung beendet
      und geschützte Seiten sind wieder gesperrt. — `signOutAction` + `AppHeader`-Button.
- [x] GIVEN ein manipulierter/abgelaufener Session-Zustand WHEN eine geschützte Server
      Action aufgerufen wird THEN wird sie abgelehnt. — `requireAnyRole` ruft `auth()`;
      kein/ungültiges Session → `ForbiddenError` (unit-getestet `..._when_noSession`).
- [x] Falsche Zugangsdaten → verständliche Fehlermeldung, kein Zugang, keine Preisgabe,
      ob der Benutzername existiert. — `authorize()` gibt für unbekannte E-Mail **und**
      falsches Passwort identisch `null` zurück; UI zeigt eine generische Meldung.
- [x] Zugriff auf fremde Rolle → serverseitige Ablehnung (403-artig), protokolliert. —
      `ForbiddenError` + `console.warn` im Guard.

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

Ableitung aus [ADR-016](../adr/016-rbac-rollen-login.md). Anzufassende Dateien:

- **`db/schema.ts`** – Enum-Array-Modell (ADR-016, Frage 1):
  - `pgEnum("user_role", ["verwalter","abrechner"])` (Werte ersetzen).
  - `role`-Einzelspalte entfernen → `roles: userRole("roles").array().notNull().default(sql\`'{}'::user_role[]\`)`.
- **Migration** – `pnpm db:generate`, dann **generierte SQL prüfen/anpassen** (Postgres kann
  Enum-Werte nicht entfernen / Enum→Enum[] nicht casten; DB ist praktisch leer →
  drop-and-recreate zulässig, SQL siehe ADR-016 Consequences). Migration einchecken.
- **`types/next-auth.d.ts`** – `role?: string` → `roles: UserRole[]` auf `User`,
  `Session.user`, `JWT` (Frage 4).
- **`auth.ts`** – `authorize()` gibt `roles: user.roles` (statt `role`) zurück; Zod-Login-
  Schema unverändert.
- **`auth.config.ts`** – `jwt()`: `token.roles = user.roles ?? []` (kein `"member"`-Default
  mehr); `session()`: `session.user.roles = token.roles`; `authorized()` bleibt Login-Gate,
  optional grober Verwalter-Pfad-Filter aus `token.roles` (edge-sicher, **kein** DB/bcrypt).
- **`middleware.ts`** (NEU, Root) – exportiert die Auth-Middleware inkl. `matcher` (alles außer
  `/login`, statische Assets, `/api/auth/*`). Bisher fehlt die Datei → `authorized` war nie
  verdrahtet.
- **`lib/authz.ts`** (NEU) – wiederverwendbarer Guard (Frage 2), von F2–F8 genutzt:
  - `hasRole(roles, required)` – reines Prädikat, keine Framework-/DB-Abhängigkeit.
  - `requireRole(required)` / `requireAnyRole(required[])` – rufen `auth()`, prüfen
    `session.user.roles`, werfen `ForbiddenError` (403-artig, protokolliert), fail-closed.
- **`db/seed.ts`** – Konto mit `roles: ["verwalter","abrechner"]` anlegen (statt `role:"admin"`);
  Idempotenz beibehalten. **Keine** Nutzerverwaltungs-UI in #48 (YAGNI, ADR-016 Frage 3).
- **Logout** – `signOut`-Action + Button (z. B. in Layout/Header) verdrahten.

**TDD-Startpunkt (erster fehlschlagender Test):** `lib/authz.test.ts` gegen die reine
Prädikatsfunktion `hasRole` – simpelster Happy-Path, keine Mocks:
`should_returnTrue_when_rolesContainRequired`, danach
`should_returnFalse_when_rolesUndefinedOrEmpty`. Anschließend `requireRole`/`requireAnyRole`
mit gemocktem `auth()`-Session-Rückgabewert (`should_throwForbidden_when_userLacksRole`).
Erst danach Schema/JWT-Propagation und der geschützte-Action-Integrationspfad.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

- [x] Mechanik der initialen Konto-Anlage → **entschieden in [ADR-016](../adr/016-rbac-rollen-login.md)
      (Frage 3): Seed-Skript (`db/seed.ts`); keine Nutzerverwaltungs-UI im Scope von #48.**

## Implementierungs-Notizen (nicht-offensichtliche Entscheidungen)

- **`middleware.ts` → `proxy.ts` (Next 16).** Die Task-Notiz/ADR-016 gingen von einer
  neu anzulegenden `middleware.ts` aus. Next 16 hat die Konvention in `proxy.ts` umbenannt;
  die Datei existierte bereits (aus #42) und verdrahtete den `authorized`-Callback bereits.
  Die Prämisse „`authorized` nie verdrahtet" gilt für Next 16 also nicht mehr. Statt einer
  zweiten Datei (Build-Fehler: beide gleichzeitig verboten) wurde `proxy.ts` genutzt und ihr
  `matcher` um die Stage-SVG-Icons (`icon-dev/int/prd.svg`) erweitert (vorher nur `icon.svg`),
  damit deren Auslieferung auf `/login` nicht auf die Anmeldung umgeleitet wird.
- **Migration 0002 hand-angepasst (ADR-016 Consequences).** `drizzle-kit generate` erzeugte
  inkohärentes SQL (ALTER auf die noch nicht existierende `roles`-Spalte). SQL durch die
  klare drop-and-recreate-Reihenfolge ersetzt; der **Snapshot** ist der von drizzle-kit
  korrekt generierte Stand. Migration lokal gegen eine Wegwerf-DB verifiziert
  (0000→0001→0002 grün, Ergebnis `roles user_role[]`, Enum `verwalter/abrechner`).
- **JWT-Claim-Typisierung.** `next-auth/jwt` re-exportiert nur (`export *`) → Augmentierung
  greift dort nicht; daher `@auth/core/jwt` augmentiert. Im `session()`-Callback typisiert
  next-auth v5 beta den Custom-Claim dennoch nicht sauber → expliziter Cast wie beim
  Vorgänger (#16). Runtime-Verhalten ist korrekt (getestet).
- **Test-Isolation:** `vitest.setup.ts` um `afterEach(cleanup)` ergänzt (ohne `globals:true`
  registriert Testing Library kein Auto-Cleanup → DOM leakte zwischen Tests).
- **Env-Var-Namen `SEED_ADMIN_*` beibehalten** (kein Churn in `.env*`/e2e); der Seed vergibt
  jetzt beide Rollen `["verwalter","abrechner"]`.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/48-login-rollen`
Erstellt: 2026-07-11 11:01
