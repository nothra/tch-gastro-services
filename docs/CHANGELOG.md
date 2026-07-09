# Changelog

Alle nennenswerten Änderungen am dm Development Factory Template.
Format: [Keep a Changelog](https://keepachangelog.com) · Semantic Versioning ab v0.1.0.

> **Für adoptierte Projekte:** Vergleiche deine Basis-Version mit der aktuellen, um zu sehen,
> welche Verbesserungen du manuell nachziehen kannst.
>
> **Konvention:** Die `[Unreleased]`-Sektion sammelt Änderungen, die bereits auf `main`
> liegen, aber noch keiner Version zugewiesen sind. Beim Release wird ihr Inhalt in eine
> neue datierte Versions-Sektion verschoben und `[Unreleased]` wieder geleert.

---

## [Unreleased]

### Added
- **3-Stage-Setup DEV/INT/PRD** (#22): Stage-Erkennung via `NEXT_PUBLIC_STAGE` (`lib/stage.ts`);
  sichtbare Kennzeichnung (Banner in DEV/INT, stage-eingefärbtes Icon/Manifest/Titel, PRD neutral);
  **dualer DB-Treiber** (node-postgres lokal, neon-http auf Vercel) je nach `DATABASE_URL`;
  `docker-compose.yml` für die lokale DEV-Postgres; stage-spezifische Env-Dateien und
  `db:up/down`, `db:migrate:int/prd`, `db:seed:int`; README-Doku je Stage (Migrations-Fluss DEV→INT→PRD).

- **Auth.js Credentials-Login + RBAC** (#16): E-Mail+Passwort-Login (bcrypt, JWT-Sessions,
  next-auth v5) auf dem Drizzle-Schema; Edge/Node-Split (`auth.config.ts`/`auth.ts`),
  `proxy.ts` (Next-16-Nachfolger von middleware) schützt alle Routen außer `/login`,
  Rolle in JWT/Session, Login-Seite + Server-Action, Seed-Script (`db:seed`) für
  Initial-Admin. `passwordHash`-Migration gegen Neon angewendet.

- **Persistenz-Grundlage: Drizzle + Neon** (#14): `db/` mit Neon-serverless-HTTP-Client und
  Auth.js-kompatiblem Schema (user inkl. `role`, account, session, verificationToken),
  `drizzle.config.ts`, generierte Initial-Migration, `db:generate/migrate/studio`-Scripts,
  `.env.example`. Build/lint/test bleiben ohne DB grün. Auth.js-Laufzeit folgt separat.

- **App-Grundgerüst** (#10): lauffähige Next.js-16-App (App Router, TypeScript, pnpm) im
  Repo-Root – Tailwind v4, ESLint + Prettier, Vitest + Smoke-Test, Web-App-Manifest (PWA,
  installierbar), minimale TCH-Startseite. `pnpm install/lint/test/build/format:check`
  lokal grün. Deferred (Folge-Tasks): Service Worker (@serwist), shadcn/ui, Playwright,
  Drizzle+Neon, Auth.js, CI-Node-Setup.

- **Tech-Stack festgelegt** (ADR-014): TypeScript · Next.js (PWA) auf Vercel · Neon
  Postgres (EU) · Drizzle + Zod · Auth.js (RBAC) · Tailwind/shadcn · Vitest/Playwright ·
  ESLint/Prettier · pnpm. Nicht-kommerziell, dauerhaft kostenfrei. `PROJECT-CONTEXT.md`
  vollständig gefüllt (keine Platzhalter mehr → Stage-3-Preflight entblockt).

- **Task ↔ GitHub-Issue-Invariante** (ADR-013): jede `tasks/task-<id>-*.md` hat ein
  Issue #`<id>`. `start-work.sh` arbeitet Issue-first (legt das Issue an, Nummer = Task-ID)
  bzw. validiert bestehende Issues; `scripts/sync-issues.sh` prüft (`--check`) und
  repariert (`--create`) die Invariante; CI-Job `issue-sync` erzwingt sie bei jedem Push/PR.
  Umgekehrte Richtung: `factory-poll.sh` materialisiert eine fehlende Task-Datei aus dem
  Issue (Titel/Body), damit der Async-Trigger ohne vorheriges `start-work` läuft.
  Hinweise in `init-factory.sh`/`git-context-check.sh` auf Issue-first umgestellt.

### Changed
- **Plattform-Migration GitLab → GitHub** (ADR-012). Die Factory ist vollständig
  GitHub-kompatibel: GitLab CI ersetzt durch GitHub Actions
  (`.github/workflows/factory-ci.yml` + `factory-poll.yml`), `glab` → `gh` in
  `factory-poll.sh`/`start-work.sh`/`metrics.sh`, Async-Trigger als Scheduled
  Workflow mit `concurrency`, Wording MR → PR. Budget-Guard, Label-State-Maschine
  und Quality-Gates unverändert; Self-Test-Suite mitmigriert (mockt `gh`) und grün.

### Removed
- `.gitlab-ci.yml` und die `ci/`-Dockerfiles (GitHub-hosted Runner bringen die
  Tools mit; kein Prebuilt-Image/Registry mehr nötig).

### Fixed
- **Bug #8 – Leerzeichen im Pfad:** `completion-check.sh` (Stop-Hook) und `sync-issues.sh`
  zerlegten Pfade mit Leerzeichen (unquotiertes `for x in $VAR`) → `grep`-Fehler. Umgestellt
  auf newline-sichere `while IFS= read -r`-Iteration; SIGPIPE-Absicherung an `grep | head`.
  Regressionstests (Pfad mit Leerzeichen) ergänzt → Self-Test 148 grün.

---

## [0.5.0] – 2026-06-16

### Fixed
- **Interrupt-Check-Polish** (!13): `interrupt-check.sh`-Aufrufe propagieren den Exit-Code
  unverändert (`|| exit $?`) — Aufruf-Fehler (exit 2) bleiben von echten Interrupts (exit 1)
  unterscheidbar
- Blocker-Idempotenz ist datumsunabhängig: ein über Mitternacht wiederholter Lauf erzeugt
  keinen Duplikat-Eintrag mehr
- `set -euo pipefail`-Falle im Preflight entschärft (`find docs/specs/ … || true`)

### Added
- **ADR-005** (!16): kanonische Pipeline-Reihenfolge festgelegt — Security-Review läuft nach
  Refactoring, damit exakt der Code geprüft wird, der gemergt wird
- `run-pipeline.sh`: Phasen 4 (Refactoring) und 5 (Security-Review) entsprechend getauscht
- README: Mermaid-Diagramm zur Pipeline-Reihenfolge + fehlendes `/test`-Beispiel ergänzt (!16)
- README: Abschnitte zu Interrupt-Mechanismus, Test-Suite (26 Fälle) und Versionierungskonvention (!15)
- `docs/CHANGELOG.md` eingeführt, Version in README-Header und CLAUDE.md-Titel (!14)

### Changed
- Test-Suite auf 26 Fälle erweitert (exit-2-Pfad, ACTION-Default, Preflight-Stale-Cleanup)

---

## [0.4.0] – 2026-06-12

### Added
- **Stage-3 Interrupt-Mechanismus** (ADR-004): deterministischer Stopp bei menschlicher Entscheidung
  — `raise-interrupt.sh` schreibt Sentinel, `interrupt-check.sh` stoppt die Pipeline hart (`exit 1`)
- `FACTORY_STAGE=3`-Signal für Agenten: in Stage 3 wird nicht gefragt, sondern Interrupt ausgelöst
- Preflight entfernt Stale-Sentinels aus vorangegangenen Läufen automatisch
- Test-Suite um 7 Interrupt-Fälle erweitert (22 Tests gesamt)

---

## [0.3.0] – 2026-06-09

### Added
- **ADR-Trigger-Check**: Agenten erkennen selbst, wann ein ADR nötig ist (Spec-002, ADR-002)
- **Git-Workflow-Leitlinien**: Branch-Naming-Convention, Session-per-Task-Disziplin, Hook-Guards
- **Modell-Cheat-Sheet** inkl. Fable 5 und aktuellen Modell-IDs
- **Token- & Kosteneffizienz-Leitlinie**: Faustregel-Tabelle, Caching-Hinweise, Tier-Übersicht
- Opus 4.8 als Standard für Heavy-Tier (erfordert Claude Code ≥ v2.1.154)

### Fixed
- Branch-Name-Check deckt nun `git switch -c/-C` und `git checkout -B` ab
- Hook liest Tool-Input korrekt aus stdin-JSON (ADR-003)
- Light-Tier-Modell auf Sonnet 4.6 angehoben

---

## [0.2.0] – 2026-05-28

### Added
- **Stage-3 Pipeline-Runner** (`run-pipeline.sh`): Pre-flight, Retry (exponentielles Backoff), per-Skill Turn-Limits
- **Per-Skill Modell-Tiers**: Heavy (Opus) für Implement/Review/Security, Light (Sonnet) für Rest
- **Pipeline-Summary**: kompakte Übersicht nach dem letzten Schritt (Review-Verdict, Security-Status, neue Regeln)
- **`/release-notes`-Skill**: generiert Changelog-Entwurf aus letzten N Features, schreibt nach `docs/CHANGELOG.md`
- **`/pipeline`-Skill**: Stage-3-Alias als Slash-Command
- Circuit Breaker für Review↔Implement-Loop (konfigurierbar via `MAX_REVIEW_ITERATIONS`)
- Dry-run-Modus: `--dry-run` zeigt alle Schritte ohne Claude-Aufrufe
- Kostenhinweis und Agent-SDK-Billing-Warnung in Dokumentation

### Changed
- README auf Englisch übersetzt
- ADR-001 (Dynamic Workflows) und ADR-Template auf Englisch übersetzt
- Pipeline vs. Dynamic Workflows-Sektion im README ergänzt

---

## [0.1.0] – 2026-05-10

### Added
- Initiales Template: 7 spezialisierte Agenten-Rollen (Requirements, Architect, Coder, Reviewer, Security, Tester, Refactorer)
- 9 Skills als Slash-Commands: `/setup-project`, `/requirements`, `/architecture`, `/implement`, `/review`, `/security-review`, `/test`, `/refactor`, `/codify`
- Deterministische Quality Gates: Pre-Commit, Pre-Push, Completion-Check
- `PROJECT-CONTEXT.md` als Projekt-Gedächtnis (befüllt durch `/setup-project`)
- `start-work.sh` und `init-factory.sh` für reproduzierbares Onboarding
- 5 Leitlinien-Dateien: Clean Code, TDD, Testing Standards, Architecture Principles, Git Workflow
- ADR-Verzeichnis mit Template
