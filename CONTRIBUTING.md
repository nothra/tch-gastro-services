# Mitarbeit an TCH Gastro Services

Danke, dass du an **TCH Gastro Services** mitwirkst – der maßgeschneiderten, nicht-kommerziellen
PWA für die Gastronomie-Vorgänge des Tennisclub Heuchelheim. Dieses Dokument beschreibt, wie
weitere Entwickler im TCH-Umfeld an **dieser Anwendung** mitarbeiten.

> **Die dm Development Factory ist ein Werkzeug, kein Gegenstand der Entwicklung.**
> Das Repo nutzt die Factory (agentische Entwicklung mit Claude Code) als **Entwicklungs-Harness**,
> der die Arbeitsweise strukturiert und Qualitäts-Gates erzwingt. Sie ist **nicht** Teil der
> ausgelieferten Anwendung – siehe [`README.md`](README.md), Abschnitt „Entwicklung mit der
> dm-Factory (Werkzeug)". Wir entwickeln **die App**, nicht das Factory-Template.

---

## Einstieg & lokales Setup

Das lokale Aufsetzen ist vollständig in [`README.md`](README.md) beschrieben (Abschnitt
„DEV – lokale Entwicklung"). Kurz:

```bash
pnpm install
cp .env.example .env.local          # NEXT_PUBLIC_STAGE=dev, lokale DATABASE_URL, AUTH_SECRET, SEED_ADMIN_*
pnpm db:up                          # lokale Postgres via Docker Compose
pnpm db:migrate && pnpm db:seed     # Schema anlegen + ersten Admin seeden
pnpm dev                            # http://localhost:3000
```

Voraussetzungen (Node ≥ 20, pnpm, Docker) und die Stages DEV/INT/PRD stehen ebenfalls in der
`README.md`. Der Tech-Stack und die projektspezifischen Konventionen sind in
[`docs/factory/PROJECT-CONTEXT.md`](docs/factory/PROJECT-CONTEXT.md) zusammengefasst.

---

## Arbeitsweise in diesem Projekt

Wir arbeiten **Issue-first** und über die Factory-Pipeline. Die verbindlichen Details stehen in
[`docs/factory/guidelines/git-workflow.md`](docs/factory/guidelines/git-workflow.md) und
[`CLAUDE.md`](CLAUDE.md); hier der Überblick:

1. **Eine Aufgabe = ein Issue = eine Session.** Jede Änderung – auch kleine Fixes – hat ein
   GitHub-Issue; die Issue-Nummer ist die Task-ID.

2. **Task starten (nie von Hand branchen):**
   ```bash
   bash scripts/start-work.sh "<kurzbeschreibung>"        # legt Issue, Branch, Task-Datei, Draft-PR an
   bash scripts/start-work.sh 42 <kurzbeschreibung>        # zu bestehendem Issue #42
   ```
   Das Skript legt die Task per Default in einem **eigenen git-Worktree** an. In den ausgegebenen
   Worktree-Pfad wechseln und dort in einer **neuen** Claude-Session arbeiten – so kollidieren
   parallele Sessions nicht (kein geteilter `HEAD`).

3. **Entwickeln über die Pipeline-Skills** (in Claude Code), jeweils mit der Task-ID:
   `/requirements` → `/architecture` (nur bei Architekturentscheidungen) → `/implement` →
   `/review` → `/test` → `/refactor` → `/security-review` → `/codify`. Test-first (Red → Green →
   Refactor) ist Pflicht – kein Produktionscode ohne Test.

4. **Pull Request:** Der Draft-PR entsteht bereits beim `start-work.sh`. Sein Body schließt das
   Issue mit einem Closing-Keyword (`Closes #<id>`). Vor dem Push gegen aktuellen `main` rebasen
   (**Rebase statt Merge** – lineare History).

5. **Grüne CI-Gates & geschützte `main`:** `main` ist server-seitig durch das Ruleset
   `protect-main` geschützt ([ADR-029](docs/adr/029-branch-protection-main-ruleset.md)) – kein
   Direkt-/Force-Push, PR-Pflicht, Squash-Merge, grüne required Checks (Lint, Tests, Issue-Sync,
   Self-Test u. a.). Typecheck und Format laufen als lokale pre-push-Gates
   ([`scripts/checks/pre-push.sh`](scripts/checks/pre-push.sh)). Erst wenn alle Checkboxen der Task-Datei abgehakt und die Gates grün sind,
   gilt eine Aufgabe als fertig.

---

## Beitragsarten

Beiträge beziehen sich auf das **TCH-Produkt**:

- **✨ Features** – neue fachliche Funktionen (siehe Fachdomäne in
  [`docs/factory/PROJECT-CONTEXT.md`](docs/factory/PROJECT-CONTEXT.md) und die Specs unter
  [`docs/specs/`](docs/specs/)). Label: `enhancement`.
- **🐛 Bugfixes** – Fehlverhalten in der App beheben. Label: `bug`.
- **📖 Dokumentation** – README, ADRs, Specs, Kommentare verbessern. Label: `documentation`.
- **🧪 Tests** – Unit-/Integration- (Vitest) oder E2E-Abdeckung (Playwright) ergänzen. Aspekt-Label: `test`.

Die Label-Konvention („genau ein Art-Label + beliebig viele Aspekt-Labels") ist in
[`docs/factory/guidelines/git-workflow.md`](docs/factory/guidelines/git-workflow.md) beschrieben;
`start-work.sh` setzt das Art-Label automatisch aus dem Branch-Typ.

---

## Verbindliche Konventionen

Diese Dokumente sind für jede Änderung maßgeblich:

- [`CLAUDE.md`](CLAUDE.md) – die nicht verhandelbaren Prinzipien (Tests zuerst, Clean Code, grüne
  Gates, Scope einhalten, Git-Workflow) und die projektspezifischen Stolpersteine.
- [`docs/adr/`](docs/adr/) – Architekturentscheidungen. Neue Entscheidungen mit spürbarer
  Bindewirkung werden als ADR dokumentiert (`/architecture`).
- [`docs/factory/guidelines/`](docs/factory/guidelines/) – Clean Code, TDD, Testing-Standards,
  Architektur-Prinzipien und der [Git-Workflow](docs/factory/guidelines/git-workflow.md).

Ergänzend: Bei jeder Routen-Änderung ist [`docs/routes.md`](docs/routes.md) im selben PR
mitzupflegen (ein Drift-Check im Push-Gate erzwingt das).

---

## Fragen?

Ein Issue im Projekt eröffnen oder direkt über Teams melden.
