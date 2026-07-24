# Projekt-Kontext

> **Initialisierung:** Diese Datei wird durch `scripts/init-factory.sh` angelegt (Basis)
> und durch `/setup-project` in Claude Code vervollständigt (Tech-Stack-Analyse).
>
> Halte sie aktuell – sie ist das Projekt-Gedächtnis der Factory.
> Agenten haben kein Langzeitgedächtnis. Diese Datei ist ihr Onboarding-Dokument.

---

## Projekt

| Feld | Wert |
|------|------|
| **Name** | TCH Gastro Services |
| **Beschreibung** | Maßgeschneiderte, nicht-kommerzielle PWA für die Gastronomie-Vorgänge des Tennisclub Heuchelheim (TCH); Browser + iOS + Android, Betrieb auf Vercel |
| **Typ** | webapp / PWA (Browser + Android + iOS, Vercel) |
| **Team** | TCH-Developer |
| **Startdatum** | 2026-07-08 |
| **Repository** | https://github.com/nothra/tch-gastro-services |

---

## Fachdomäne

> Kanonische Quelle: **`docs/specs/README-montagsrunde.md`** (+ `docs/specs/spec-48…55`).
> Hier nur der Einstieg – Details und Akzeptanzkriterien stehen in den Specs.

**Zweck:** Ablösung des Excel-Templates „Abrechnung Veranstaltung". Der Thekenwart
rechnet eine Veranstaltung ab (Getränke aus der Theke, Essen, Kaffee, Auslagen –
je Teilnehmer/Familie) und kassiert bar. Erstes Anwendungsfeld ist die wöchentliche
**Montagsrunde**; der Ablauf gilt sinngemäß für weitere Veranstaltungen.

**Kernbegriffe (Ubiquitous Language):**
- **Veranstaltung** – eine abzurechnende Zusammenkunft (Datum, Bezeichnung, Kasse,
  Status `offen`/`abgeschlossen`). Essen ist **kein** Feld der Veranstaltung, sondern ein
  Katalogartikel (ADR-023 §D4/§D7).
- **Teilnehmer** – Person **oder** Familie (eine Abrechnungszeile); Mitglied/Nicht-Mitglied.
- **Katalog** – pflegbare Preisliste je Kategorie (`getraenk`/`kaffee`/`essen`); **Kaffee**
  und **Essen** sind Katalogartikel mit **festem** Preis (Essen = Kategorie `essen`, kein
  Veranstaltungs-Property), gewählt bei der Erfassung (ADR-023 §D4/§D7, #116).
- **Verzehr** – Getränke + Essen + Kaffee eines Teilnehmers.
- **Auslagenerstattung** – vorgestreckte Kosten, als **eigener Vorgang** (getrennt vom
  Kassieren) erstattet; je Auslage ein Teilnehmer + Kategorie (**Getränke/Essen/Sonstiges**).
- **Kasse** – Abrechnungs­topf je Veranstaltung (fester Satz: `montagsrunde` | `vereinskasse`).
- **Kassieren / Spende** – Barzahlung des Verzehrs; Überzahlung = Spende.

**Zentrale Regeln:**
- `Verzehr-Gesamt = Summe Getränke (Theke) + Summe Sonstige (Essen + Kaffee)`
- `Spende = Erhalten − Verzehr-Gesamt`
- Auslagen mindern den Verzehr **nicht** (Abweichung vom Excel); Erstattung ist ein
  eigener Vorgang.
- `Kassenveränderung der Veranstaltung = Σ Erhalten − Σ Auslagenerstattungen` – **je zugeordneter
  Kasse**. Ein laufender Saldo über mehrere Veranstaltungen ist noch nicht umgesetzt (Backlog #57).

**Rollen:** `verwalter` (Stammdaten & Preise) und `veranstalter` (Owner des Veranstaltungs-
Lebenszyklus: anlegen, führen, kassieren – vormals `abrechner`, umbenannt in ADR-024);
Teilnehmer erfassen ohne Konto per Veranstaltungs-Link/QR + Namenswahl. Details in `spec-48`.

---

## Tech-Stack

| Feld | Wert |
|------|------|
| **Primärsprache** | TypeScript |
| **Framework / Runtime** | Next.js (App Router) / Node 20+ · Hosting: Vercel (Region fra1) |
| **Datenbank** | PostgreSQL (Neon, Free-Tarif, Region Frankfurt/EU) |
| **Build-Tool** | pnpm + Next.js |
| **Weitere Technologien** | PWA (@serwist/next), Tailwind CSS + shadcn/ui, Drizzle ORM, Zod, Auth.js (NextAuth v5) |

---

## Build & Run

```bash
# Abhängigkeiten installieren
pnpm install

# Dev-Server / lokale Ausführung starten
pnpm dev

# Produktions-Build
pnpm build
```

---

## Testing

```bash
# Alle Tests ausführen (Unit/Integration)
pnpm test

# Tests mit Coverage-Report
pnpm test:coverage

# Einen einzelnen Test ausführen
pnpm vitest run <pfad-oder-muster>

# End-to-End-Tests (Playwright)
pnpm test:e2e
```

- **Test-Framework:** Vitest (Unit/Integration) + Playwright (E2E)
- **Mindest-Coverage:** 80 %
- **Test-Konventionen:** Arrange-Act-Assert; Unit-Tests neben dem Code als `*.test.ts(x)`, E2E unter `e2e/`; siehe `docs/factory/guidelines/testing-standards.md`

---

## Code-Qualität

```bash
# Linting ausführen
pnpm lint

# Formatierung prüfen
pnpm format:check

# Formatierung automatisch anwenden
pnpm format
```

- **Linter:** ESLint (`next/core-web-vitals`, TypeScript)
- **Formatter:** Prettier

---

## Architektur

- **Stil:** Feature-orientierte Schichtung mit dem Next.js App Router; UI (Server/Client Components) → Server Actions/Route Handlers → gekapselte Data-Layer (Drizzle). Clean Code/SOLID gemäß `docs/factory/guidelines/`.
- **Domain-Aufteilung:** nach Feature/Domäne unter `app/`; DB-Schema & -Zugriff gebündelt in einer Data-Layer (`db/`), nicht in UI/Actions verstreut.
- **API-Stil:** primär **Server Actions** für Formular-Erfassung; REST-artige **Route Handlers** (`app/api/`) wo externe/GET-Zugriffe nötig sind.
- **Besonderheiten:** installierbare **PWA**; **RBAC** über Auth.js + Rollen-Spalte (serverseitig durchgesetzt); **EU-Datenresidenz** (Neon Frankfurt, Vercel `fra1`).

**Routen-Übersicht:** Alle Seiten und API-Route-Handler mit Pfad, Funktion und Zugriff
(Rolle/öffentlich) stehen kuratiert in [`docs/routes.md`](../routes.md). Kanonische Quelle bleibt
der Code (`app/**/page.tsx`, `app/api/**/route.ts`); die Übereinstimmung sichert der Drift-Check
`scripts/checks/routes-doc-check.sh` fail-closed im Push-Gate.

Relevante ADRs: siehe `docs/adr/` – insbesondere **ADR-014** (Tech-Stack-Wahl).

---

## Projektspezifische Coding-Konventionen

> Hier nur Ergänzungen zu den globalen Guidelines in `docs/factory/guidelines/`.
> Nur dokumentieren, was in diesem Projekt anders oder zusätzlich gilt.

- **TypeScript strict**; Eingaben an jeder Server-Grenze mit **Zod** validieren.
- **DB-Zugriff nur über die Drizzle-Data-Layer** – keine rohen SQL-Strings in UI/Server Actions.
- Aus Vercel-Functions den **Neon serverless HTTP-Treiber** (`@neondatabase/serverless`) nutzen (kein klassischer TCP-Pool → keine Verbindungs-Erschöpfung).
- **Auth-/Rollen-Checks immer serverseitig** (Routen-Gate + in Server Actions), nie ausschließlich clientseitig.
- Secrets (DB-URL, Auth-Secret) nur als Env-Vars (Vercel), nie im Repo.
- **Login/Credential-Prüfung in konstanter Zeit:** `bcrypt.compare` immer ausführen – bei unbekanntem Nutzer gegen einen konstanten Dummy-Hash (`lib/credentials.ts`), damit die Antwortzeit keine User-Enumeration erlaubt.
- **Rollen als Enum-Array** (`roles user_role[]`, ADR-016); Prüfung über den Guard `lib/authz.ts` (`requireRole`/`requireAnyRole`, fail-closed), nie über clientseitig ausgeblendete UI.

---

## Bekannte Stolpersteine

> Wird durch `/codify` befüllt – Dinge, die Claude wiederholt falsch gemacht hat
> und die als projektspezifische Regeln gelten.
>
> **Volltext ausgelagert (ADR-037):** Die vollständigen Learnings stehen thematisch
> getrennt unter [`docs/factory/lessons/`](lessons/) und sind **nicht** mehr `@import`-
> geladen – bei Bedarf die passende Datei gezielt lesen. `/codify` schreibt neue Learnings
> dorthin (Volltext) **plus** eine Index-Zeile hier, nicht mehr in diesen Abschnitt.
>
> **Bedarfsgesteuertes Laden:** Der Index (unten) trägt je Eintrag/Gruppe einen
> **„Laden bei"-Trigger** (Skill + Situation). Beim Start eines Skills nur die Lessons öffnen,
> deren Trigger zum **laufenden Skill** und zur **Domäne der Task** passt – nicht alle
> `lessons/` vorsorglich lesen. Beispiel: `/pr-shepherd` lädt nur die `/pr-shepherd`-Zeilen aus
> `factory-workflow.md`; eine `/implement`-Task an einer Server Action lädt `db-drizzle.md`
> (+ ggf. `frontend-react.md`), aber nicht `next-auth.md`, wenn kein Auth/Routen betroffen ist.

### Kern-Kurzregeln (immer geladen)

> Die wenigen Regeln, die praktisch **jede** Feature-Task berühren (Data-Layer/Validierung),
> bleiben als Einzeiler inline. Volltext + Begründung je in der verlinkten Lesson.

1. **Drizzle `.returning()` bei UPDATE/DELETE → Rückgabetyp `T | undefined`** (nicht `T`); bei No-Match ist das Array leer. → [`lessons/db-drizzle.md`](lessons/db-drizzle.md)
2. **IDOR: DELETE/UPDATE auf Zeilen-Tabellen führen den Parent-Key im `WHERE` mit** (nicht nur den Primärschlüssel). → [`lessons/db-drizzle.md`](lessons/db-drizzle.md)
3. **Soft-Delete: nach jedem Laden by ID `active` prüfen, bevor geschrieben wird** (die Action ist die Grenze, nicht die UI). → [`lessons/db-drizzle.md`](lessons/db-drizzle.md)
4. **Zod: Felder auf `int4`/`text` bekommen eine Obergrenze** (`.max`/`.refine`), sonst ist der DB-Overflow die einzige Fehlergrenze. → [`lessons/db-drizzle.md`](lessons/db-drizzle.md)

### Index der ausgelagerten Learnings

> Eine Zeile je Learning (Titel + Herkunfts-Issue), gruppiert nach Ziel-Lesson-Datei. Jede Gruppe
> nennt einen **„Laden bei"-Trigger** (Skill + Situation); wo eine Datei gemischte Auslöser hat
> (`factory-workflow.md`), steht der Trigger `→ …` je Zeile. Danach entscheiden, welche Lesson der
> aktuelle Skill wirklich braucht.

**[`lessons/frontend-react.md`](lessons/frontend-react.md)** – React/UI, Client Components, route-neutrale UI-Bausteine · **Laden bei:** `/implement`, `/review` bei React/UI-Komponenten

- `useActionState` + Inline-Toggle: ESLint `react-hooks/set-state-in-effect` (aus #49)
- Route-neutrale Module: keine Feature-Imports beim Implementieren prüfen (aus #52, Review-Finding)
- Formular-Reset nach jeder Erfassung: key-Remount wirkt nur einmalig (aus #53, Review-Finding W1)
- `aria-modal="true"` ist ein Versprechen, kein Automatismus – Fokus-Trap explizit bauen + alle Branches testen (aus #134)
- Schreib-Gate darf die Lese-Ansicht nicht mitverstecken – vorhandenes `editable`-Flag nutzen (aus #54, Review-Runde-1-Finding)
- `setState`-Updater-Funktionen müssen rein bleiben – keine Seiteneffekte darin (aus #183, Review-Runde-1-Finding)
- Layout-abhängige DOM-Aktion nach layout-änderndem `setState` erst im nächsten Frame; sticky Header braucht `scroll-margin-top` am Ziel (aus #188)
- Route-neutrale Komponente: Fremd-Layout-Offset vom Konsumenten via `className` steuern, nicht hardcoden/an fremd-semantischen Prop koppeln (aus #188, Review-Finding; Nachtrag aus #187)
- Verschieben eines route-neutralen Moduls: alte Datei löschen ist Teil des Moves, nicht optional (aus #187, Review-Eskalation Runde 1–4)
- `.map`-Key aus Anzeigefeldern statt stabilem Identifier ist eine latente Kollisionsquelle (aus #206, Review-Runde-2-Finding)

**[`lessons/next-auth.md`](lessons/next-auth.md)** – Next.js-Framework, `proxy.ts`, NextAuth/Session, öffentliche Routen · **Laden bei:** `/implement`, `/review` bei Auth/`proxy.ts`/Routen

- Next.js 16: Middleware heißt `proxy.ts` (aus #48)
- NextAuth v5: Custom-Session-/JWT-Claims typisieren (aus #48)
- Öffentliche API-Routen aus dem Auth-Proxy ausnehmen (aus #63)
- Auto-Prefetch geschützter Routen belebt die Session nach dem Abmelden wieder (aus #164)

**[`lessons/db-drizzle.md`](lessons/db-drizzle.md)** – Drizzle ORM, Migrationen, IDOR, Soft-Delete, Joins, guarded UPDATE, Zod-Obergrenzen · **Laden bei:** `/implement`, `/review`, `/test` bei Data-Layer (Drizzle)

- Drizzle-Migration bei Enum-Wert-Wechsel / Spalte→Array (aus #48)
- Drizzle UPDATE/DELETE: `.returning()` liefert `T | undefined`, nicht `T` (aus #50, Refactoring-Finding)
- Zod-Schema: Obergrenze für Integer-mapped Inputs fehlt (aus #49, Security-Hint)
- IDOR: Data-Layer DELETE/UPDATE müssen Parent-ID einschließen (aus #51, Security-Finding)
- Soft-Delete: `active`-Prüfung nach jedem Laden by ID (aus #51, Review-Finding)
- Orphan-sichere Joins: Snapshot-Referenz kann verschwinden, auch wenn die Business-Entity bleibt (aus #53, Review-Finding K1)
- Guarded UPDATE bei Status-Transition-Actions: `undefined`-Rückgabe auswerten, nicht `{ok:true}` annehmen (aus #55, Review-Runde-1-Finding W1)

**[`lessons/testing.md`](lessons/testing.md)** – Vitest, Coverage, Guard-Tests, Zod-Meldungs-Tests · **Laden bei:** `/implement`, `/test` beim Testschreiben/Coverage

- Vitest + Testing Library ohne `globals: true` (aus #48)
- Guard-Clause-Branches in Server Actions brauchen dedizierte Tests (aus #51, Review-Finding)
- AC mit Direktive + Begründung: je separierbaren Teil eine eigene Assertion (aus #117, /test-Selbstfund)
- Zod-Fehlermeldung: Ablehnungs-Test ≠ Meldungs-Test (aus #116, Review-Runde-1-Finding)
- Neue gesourcte Lib in run-pipeline.sh → alle Temp-Repo-Scaffoldings in run-tests.sh mitkopieren (aus #197)
- Layout-Timing-Test-Stub (rAF) vor dem Neuschreiben im selben Verzeichnis suchen, nicht duplizieren (aus #194, Review-Finding)
- Callback-Prop nur durch Codelesen belegt ist keine Testabdeckung – Coverage-Report gegen jedes Review-Positiv gegenprüfen (aus #187, /test-Selbstfund)
- Spiegel-/Symmetrie-Akzeptanzkriterien beide Richtungen explizit assertieren – Wiring-/Abwesenheits-Guard ersetzt die zweite Assertion nicht (aus #211, Review-Finding)
- Strict-mode-/Umgebungs-Kontrakt-Tests auf die Fehler-/No-Match-Zweige legen, nicht den früh-returnenden Happy-Path (aus #207, Review-Finding W3)
- Deterministisches Gate/Backstop im Orchestrator-Skript braucht E2E-Verhaltenstest, nicht nur Wiring-Grep (aus #212, Review-Finding)
- Negativ-Test mit mehreren Fail-Pfaden auf den Ziel-Pfad isolieren (nur er darf greifen) + pfadspezifisches Signal assertieren – sonst grün aus dem falschen Grund (aus #214, Review-Finding W1)
- Kopplungs-/Drift-Guard (liest Quelle A, prüft gegen B): je Seite ein eigener Negativtest (A brechen / B brechen) + Fail-closed bei unlesbarer Quelle (aus #214, /test-Selbstfund)

**[`lessons/build-tooling.md`](lessons/build-tooling.md)** – pnpm, Turbopack/Vercel-Bundling, Typecheck-Gate, gitignore-Artefakte · **Laden bei:** bei Build/CI/Dependencies/Vercel-Bundling

- Debug-/Lint-Artefakte nicht durch .gitignore gedeckt (aus #67)
- Lint/Vitest fangen keine Typfehler – Gate-Lücke bis zum manuellen `pnpm build` (aus #137)
- pnpm@11: `overrides`/Settings gehören in `pnpm-workspace.yaml`, nicht ins `package.json`-`pnpm`-Feld (aus #167)
- Turbopack/Vercel: Node-Libs mit Laufzeit-`fs.readFileSync(__dirname + …)` externalisieren (aus #193)

**[`lessons/code-style.md`](lessons/code-style.md)** – Clean-Code-Muster (Naming, Kommentar-Ort) · **Laden bei:** `/refactor`, `/review` (Clean-Code)

- WHAT-Kommentar am Modul-Level (aus #67, Refactoring-Finding)
- Neue `lib/`-Module domänenspezifisch benennen, kein generisches `utils` (aus #105, Review-Finding)
- Fail-Safe/Guard symmetrisch auf alle Inputs einer Vergleichsoperation (aus #197, Review-Finding)
- Zähl-/Aufzählungs-nennender Modul-Header („stellt EINE Funktion bereit") beim Hinzufügen einer Einheit mitpflegen (aus #207, Review-Finding W1)

**[`lessons/factory-workflow.md`](lessons/factory-workflow.md)** – Git/CI, Pipeline-Skills, Patch-Workflow, Branch/Label, Review-Scope, Terminologie-Sweep, kanonische Quellen, Blocker · **Laden bei:** je Eintrag unterschiedlich – Trigger je Zeile

- Agenten-Blockerverhalten (aus Task 002 / K-01, K-02) → jeder Skill – beim Blockieren/Abbruch
- Kanonische Quellen immer referenzieren (aus Task 002 / W-02, W-03) → `/codify`, `/implement` – bei Regel-Listen
- Fast-Forward-Pushes aus CI brauchen vollen Verlauf (aus Task 42, bei Live-Verifikation #40) → CI-/Deploy-Gate-Arbeit
- Branch-Typ und Label korrigieren wenn Scope über die initiale Annahme hinauswächst (aus #120) → `/architecture`→`/implement` – Branch/Label
- Branch-Protection required Checks: nur `pull_request`-getriggerte Jobs (aus #155) → CI-/Ruleset-Arbeit
- Report-Guard: Stale-Verdict bei Pipeline-Re-Lauf (aus #91, Review-Finding) → `/pipeline` (run-pipeline.sh)
- `.claude/**`-Änderungen erfordern Patch-Workflow (aus #91) → `/implement`, `/codify` – bei `.claude/**`-Änderung
- Notiz-vor-Merge bei Squash-Strategie (aus #114) → `/pr-shepherd` – Merge mit Notiz
- Reihenfolge-Guards: Kommando ≠ Prosa-Erwähnung (aus #114, Implement-Selbstfund) → Skill-Doc-Guards/Self-Tests
- App-Router erzeugt Routen aus mehr als `page.tsx`/`route.ts` (aus #145) → `/implement` – bei Routen/`docs/routes.md`
- Terminologie-Sweep: `-w`-Grep ist blind für Komposita, und Pfad-Beispiele sind nicht „neutral" (aus #144) → Doku-/Rename-Sweeps
- Repo-Setting „Allow auto-merge" muss aktiv sein, sonst scheitert `--auto` (aus #155/#158) → `/pr-shepherd` – Merge-Freigabe
- Doku über „die Gates": required CI-Checks ≠ lokale pre-push-Gates nicht vermischen (aus #160) → Doku über CI/Gates
- Review-Diff-Scope: `git diff main...HEAD` zeigt Fremd-PRs, wenn lokales `main` hinter `origin/main` liegt (aus #161; Skill-Vorlagen seit #176 auf `origin/main...HEAD`) → `/review`, `/security-review`, `/refactor` – Diff-Scope
- ADR nach Review-Rework auf Drift prüfen – nicht nur `docs/routes.md` (aus #55, Review-Runde-2-Finding) → `/review`, `/implement` – bei ADR-Änderung
- `/refactor` Turn-Limit-Exhaustion: Retry ohne Gedächtnis baut auf halbfertigem Fremd-Stand auf (aus #185) → `/pipeline`, `/refactor` – bei Turn-Limit
- Verlustfreie Doku-Migration/Split: skriptbasiert + Byte-Reconstruction-Assertion (aus #196) → `/implement` – bei Doku-Migration/Split
- ADR-Status beim Implementieren einer frisch erstellten ADR auf Accepted flippen (aus #197, Review-Finding) → `/implement`, `/review` – bei ADR-Umsetzung
- PR ändert die von einer ADR namentlich beschriebene Mechanik → ADR-Beschreibung im selben PR mitpflegen (ergänzt #55; triggert auch ohne ADR-Datei-Änderung) (aus #211, Review-Finding) → `/implement`, `/review` – bei Code-Änderung, die eine ADR beschreibt
- Auch Lesson-/Kontext-Doku im Präsens beschreibt eine Mechanik / nennt einen offenen „Follow-up (#N)" – erledigt der PR die Mechanik/den Follow-up, dieselbe Prosa im selben PR nachziehen (erweitert #211 über ADRs hinaus; historische Vorfall-Narrative bleiben) (aus #176, Review-Finding) → `/codify`, `/review` – bei Doku, die die geänderte Mechanik/einen erledigten Follow-up beschreibt
- Test einer `.claude/**`-Patch-Lieferung prüft den Endzustand der committeten Live-Datei, nicht das transiente Patch-Artefakt (ergänzt #145) (aus #212, Review-Finding) → `/implement`, `/review`, `/test` – bei Test zu einer `.claude/**`-Patch-Änderung
- Neuer Interrupt-Typ → OPERATING.md-Interrupt-Tabelle mitpflegen (kanonische Registry, kein Gate) (aus #212, Review-Finding) → `/implement`, `/review` – bei neuem `raise-interrupt.sh`-Typ

---

## Offene Architektur-Fragen

> Noch nicht entschiedene Fragen, die eine ADR benötigen.

_Derzeit keine offenen Fragen._

> **Erledigt (ADR-024, #120):** Die Frage nach dem Route-Schnitt des Veranstaltungs-Bereichs
> (`/abrechnung/veranstaltung` – Bereich- vs. Ressource-zuerst) ist entschieden: Bereich nach
> der Entität benennen → **`/veranstaltung`** (Liste) + **`/veranstaltung/[id]`** (Detail), je
> Lifecycle-Phase eine Unterroute. Zugleich Rolle `abrechner` → `veranstalter` umbenannt.
> Details in [ADR-024](../adr/024-route-schnitt-veranstaltung-lifecycle.md).
