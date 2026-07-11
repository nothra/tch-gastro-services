# Review: Task 48

> Multi-Persona-Review (3 unabhängige Sub-Agenten: Backend/Logik · Code-Qualität ·
> Architektur/Konsistenz) über `git diff main...HEAD`. Alle drei: **APPROVED**, keine
> kritischen Findings.

## Kritische Findings (müssen behoben werden)

- _Keine._ Kern-Logik korrekt, fail-closed und unit-getestet; Migration-SQL und Snapshot
  konsistent; Edge/Node-Trennung sauber (proxy.ts/auth.config.ts ohne db/bcrypt).

## Wichtige Findings (sollten behoben werden)

- [ ] **[auth.ts:28-30] Timing-Seitenkanal zur User-Enumeration** — berührt Fehlerszenario
      spec-48 „keine Preisgabe, ob der Benutzername existiert". Bei unbekannter E-Mail kehrt
      `authorize()` sofort zurück (kein `bcrypt.compare`); bei existierender E-Mail läuft der
      ~100 ms teure Vergleich. Die *Meldung* ist identisch (gut), die *Antwortzeit* verrät die
      Existenz. **Vorbestehend aus #16** (nur `role`→`roles` am Return geändert), niedrige
      Praxisrelevanz für ein Vereinsprojekt. Fix (falls Spec streng ausgelegt): Dummy-bcrypt-
      Vergleich gegen konstanten Hash bei fehlendem User. → Kandidat für `/security-review` / Backlog.
- [ ] **[Test-Deckung] AC5 (Abmelden) nur teilweise abgedeckt** — `AppHeader.test.tsx` prüft nur
      das *Rendern* des Buttons; der Abmelde-Fluss (Klick → Session beendet → Redirect → Seite
      wieder gesperrt) ist nicht end-to-end getestet. Die Task-Datei behauptete e2e-Deckung
      (`auth.spec.ts`) — das ist unzutreffend (kein Logout-Test dort). → e2e-Test in `/test`
      ergänzen; Task-Datei-Claim wird korrigiert (siehe unten).
- [ ] **[lib/authz.test.ts] AC8 „protokolliert" unbelegt** — `requireAnyRole` loggt via
      `console.warn` (authz.ts:39), aber kein Test prüft das (`vi.spyOn(console,"warn")`).
      → in `/test` nachziehen.
- [ ] **[lib/authz.ts + F2–F8] `ForbiddenError` braucht eine 403-Boundary beim Konsumenten** —
      ein ungefangener Throw in einer Server Action rendert Next als 500-artig, nicht „403-artig".
      Kein Live-Defekt (keine Konsumenten in #48). **Konvention für F2–F8:** `ForbiddenError`
      fangen und 403-artig beantworten.
- [ ] **[db/migrations/0002…sql:7] Re-Seed nach Migration auf bereits provisionierten Stages** —
      `DROP COLUMN "role"` + neue `roles`-Spalte mit Default `'{}'`: vorhandene Seed-Konten
      behalten E-Mail/passwordHash, verlieren aber ihre Rolle → nach Deploy einmal `pnpm db:seed`
      nötig (idempotent, setzt `roles` per E-Mail-Match). Operativer Schritt im Deploy sicherstellen.

## Nitpicks (optional)

- [ ] **[proxy.ts:14]** Matcher `.*\.svg$` schließt *jeden* SVG-Pfad vom Auth-Gate aus (nötig waren
      nur `icon-dev/int/prd.svg`). Unbedenklich (SVGs sind hier nur statische Assets), aber breiter
      als nötig; enger wäre `icon(-(dev|int|prd))?\.svg$`. **Vorausschauend:** bei künftigem
      `@serwist/next` liegt der Service Worker unter `/sw.js` — nicht ausgenommen → im PWA-Task mitdenken.
- [ ] **[lib/authz.ts:29]** Kommentar „Verlangt genau die angegebene Rolle" ist bei Mehrfach-Rollen
      irreführend — der Guard prüft „Nutzer *hat* die Rolle", nicht „hat *nur* diese". Präziser formulieren.
- [ ] **[types/next-auth.d.ts]** Asymmetrie `roles?` (User/JWT) vs. `roles` (Session.user) ist korrekt,
      aber unkommentiert — ein Halbsatz zur Absicht (nach `session()` immer gesetzt) hilft künftigen Lesern.
- [ ] **[lib/authz.test.ts]** `hasAnyRole([...], [])` (leeres `required`) und die `ForbiddenError`-
      Default-Message sind ungetestet (in Produktion tritt der Fall nicht auf → niedrig).
- [ ] **[auth.config.ts:14-16]** Login-Gate leitet auch angemeldete Nutzer *mit leeren Rollen* von
      `/login` auf `/`. Konsistent mit „leeres Array = keine Rechte"; falls später eine „kein-Zugriff"-
      Seite gewünscht ist, hier bedenken.
- [ ] **[lib/authz.ts:35]** `console.warn` gibt vorhandene Rollen aus (leichtes Info-Leak in Logs) —
      für dieses Projekt vernachlässigbar, strukturiertes Logging wäre YAGNI.

## Positives

- **Guard-Logik vorbildlich fail-closed:** `hasRole(undefined|null|[], …)` → false; `requireAnyRole([])`
  wirft immer; `!session?.user || !hasAnyRole(...)` deckt fehlende/manipulierte Session ab — unit-getestet.
- **Reine, framework-/DB-freie Prädikate** (`hasRole`/`hasAnyRole`) → mockfreie, schnelle Tests; genau
  der in `tdd-principles.md` geforderte Aufbau. `requireRole` delegiert DRY an `requireAnyRole`.
- **Rollen-Fluss** `authorize()` → `jwt()` → `session()` durchgängig als Array, `?? []`-Default statt
  altem `"member"`-Fallback — treu zu ADR-016 Frage 4. Alte JWTs ohne Claim fallen fail-closed auf `[]`.
- **Edge/Node-Trennung sauber:** proxy.ts/auth.config.ts ohne `db`/`bcrypt`; der `UserRole`-Import ist
  `import type` (Compile-Zeit-gelöscht) → Drizzle wird nicht in die Edge-Runtime gezogen. Keine Zirkularität.
- **ADR-016 vollständig & treu** umgesetzt (alle 4 Entscheidungen); Schicht-Grenzen eingehalten (DB nur
  über Drizzle in auth.ts/seed.ts, keine rohen SQL-Strings in UI/Actions).
- **Migration & Snapshot konsistent** (roles `user_role[]` notNull default `'{}'`, Enum `verwalter/abrechner`);
  drop-and-recreate-Reihenfolge korrekt; nicht-offensichtliche Entscheidungen (proxy.ts, hand-SQL,
  `@auth/core/jwt`-Augmentierung, Cast) ausführlich in der Task-Datei dokumentiert.
- **Testqualität:** `should_…_when_…`, Arrange-Act-Assert, Isolation via `clearAllMocks` + neu
  `afterEach(cleanup)` (behebt DOM-Leak korrekt). Namen aussagekräftig, Booleans `has…`, Collections Plural.

## Empfehlung

APPROVED

> Innerhalb des deklarierten Scopes (#48 = Login-Gate + RBAC-Mechanismus; die geschützten
> Katalog-/Stammdaten-Actions sind bewusst F2/F3) sind alle Akzeptanzkriterien erfüllt und die
> Gates grün. Keine kritischen/blockierenden Findings; alle drei Perspektiven empfehlen APPROVED.
> Die „Wichtig"-Punkte sind Test-/Traceability-Lücken und Konventions-/Betriebshinweise — sie
> gehören in `/test` (e2e-Logout, `console.warn`-Assertion) bzw. `/security-review` (Timing) und
> blockieren den Merge nicht. Nächster Pipeline-Schritt: `/test`.
