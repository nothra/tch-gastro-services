# Task 160: contributing-tch-app-ausrichten

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden (n/a – reine Doku, keine Auth-/Secret-/Angriffsflächen)
- [x] Refactoring abgeschlossen (n/a – reine Doku, kein Verhalten)
- [x] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Projektbeschreibung – vor allem `CONTRIBUTING.md` – auf die **TCH-Gastro-Services-App**
ausrichten. Die dm Development Factory ist ein **genutztes Entwicklungswerkzeug/Harness**,
nicht der Gegenstand der Entwicklung (konsistent zu `README.md`). Reine Doku-/Terminologie-
Anpassung, kein Produktionscode. Sprache: **Deutsch** (mit dem Entwickler bestätigt).

Details & Akzeptanzkriterien: [`docs/specs/spec-160-contributing-tch-app-ausrichten.md`](../docs/specs/spec-160-contributing-tch-app-ausrichten.md).

## Akzeptanzkriterien
- [x] AC1 – `CONTRIBUTING.md` (Titel + Einleitung) beschreibt die Mitarbeit an der TCH-App, nicht am Template. (Titel jetzt „Mitarbeit an TCH Gastro Services".)
- [x] AC2 – Factory eindeutig als genutztes Werkzeug dargestellt (konsistent zu README „… nicht Teil der Anwendung"). (Blockquote-Hinweis + README-Verweis.)
- [x] AC3 – Setup-/Beitrags-Workflow konsistent mit README, CLAUDE.md, git-workflow.md (Issue-first, Worktree, PR-Gates, Rebase, geschützte `main`).
- [x] AC4 – Beitragsarten app-bezogen (Features/Bugfixes/Docs/Tests); Template-Versionierung & „universal over specific" entfernt.
- [x] AC5 – Verweise auf `CLAUDE.md`, `docs/adr/`, `docs/factory/guidelines/` als verbindliche Konventionen.
- [x] AC6 – Sweep über `*.md` (ohne `docs/factory/**`, `tasks/**`): keine „Repo = Weiterentwicklung des Templates"-Reste; Historie (ADRs/CHANGELOG) bleibt korrekt.
- [x] AC7 – Alle Links in `CONTRIBUTING.md` zeigen auf existierende Ziele (9 Ziele geprüft, alle vorhanden; keine externen URLs mehr).

## Technische Notizen
Keine ADR nötig (reine Doku, kein Architektur-Entscheid).

**`CONTRIBUTING.md` vollständig neu gefasst (Deutsch):** Titel/Einleitung auf die TCH-App,
Factory als Werkzeug (Blockquote + README-Verweis), Setup verweist auf README „DEV – lokale
Entwicklung", Pipeline-/PR-Workflow, app-bezogene Beitragsarten, verbindliche Konventionen.
Template-Passagen (Versionierung, „universal over specific", „new skills / guideline
extensions", „Maintainer creates a new release") entfernt.

**Sweep-Ergebnis (AC6) – bewusste Nicht-Änderungen (Own-Voice vs. Historie, aus #144):**
- `README.md:209` – bereits korrekt (Factory als „Entwicklungs-Harness/Werkzeug"). Unverändert.
- `docs/CHANGELOG.md` (Z. 205/213/219) – historische Changelog-Einträge über die Herkunft aus
  dem Template. Historie bleibt korrekt, nicht verfälscht.
- `docs/adr/001/005/007/008/009/010/012` – ADRs treffen ihre Entscheidungen legitim im
  Template-Kontext (ADR-012 dokumentiert die GitHub-Migration/Template-Herkunft). Historie.
- `docs/adr/README.md:38` – „Template" = **ADR-Boilerplate**, nicht das Factory-Template. Anderer
  Wortsinn, keine Änderung.
- Specs (`README-montagsrunde`, `spec-49/51/53/91`) – „Excel-Template", „Preis-Templates",
  „aus dem Template erzeugt" = anderer Wortsinn (Excel/Preise/Task-Datei). Keine Änderung.
- `.claude/commands/post-merge-verify.md:27` – eingebettete Factory-Skill-Doku (analog
  `docs/factory/**` außerhalb des Sweep-Scopes; zudem `.claude/**` für Agenten hart denied).

Verifikation: `npx prettier --check` grün; Link-Prüfung 9/9 Ziele vorhanden; Framing-Grep auf
CONTRIBUTING.md ohne Treffer.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

## Review-Findings
Runde 1 → NEEDS_REWORK (1 Wichtig): `CONTRIBUTING.md` listete Typecheck fälschlich als required
CI-Check. Rework: korrigiert auf „(Lint, Tests, Issue-Sync, Self-Test u. a.)"; Typecheck/Format
als lokale pre-push-Gates ausgewiesen. Runde 2 → **APPROVED**. Details: [`tasks/review-160.md`](review-160.md).

## Codify-Notizen
1 Learning aus Review-Runde 1: Onboarding-Doku darf **required CI-Checks** und **lokale
pre-push-Gates** nicht als eine Liste vermischen (Typecheck ist pre-push-only, kein required
Check). Neue Regel in `docs/factory/PROJECT-CONTEXT.md` → „Bekannte Stolpersteine". Report:
[`tasks/codify-160.md`](codify-160.md). Kein Folge-Issue (kein offener Aufwand).

Security-Review/Refactor als n/a übersprungen: reine Doku-Änderung ohne Auth-/Secret-/Angriffs-
flächen und ohne Verhalten (in Absprache mit dem Entwickler).

---
Branch: `docs/160-contributing-tch-app-ausrichten`
Erstellt: 2026-07-19 12:09
