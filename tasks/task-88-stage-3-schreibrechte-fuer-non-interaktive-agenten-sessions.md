# Task 88: stage-3-schreibrechte-fuer-non-interaktive-agenten-sessions

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [x] Refactoring abgeschlossen (entfällt – triviale, einmalige Config-Änderung)
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

**Hinweis:** Manuell (Stage 2) umgesetzt, nicht über `run-pipeline.sh` – genau dieser Task
behebt ja den Grund, warum Stage 3 aktuell keinen Code schreiben kann (zirkuläre Abhängigkeit).
Kein Multi-Persona-Review-/Security-Review-/Codify-Agentenlauf durchgeführt. Stattdessen: die
ersten beiden Akzeptanzkriterien wurden per echtem `claude --print`-Probe direkt verifiziert
(siehe Diff-Historie/PR-Beschreibung). Die restlichen Checkboxen bleiben bewusst offen, bis ein
Mensch den PR review't und mergt – kein fabriziertes Approval.

## Beschreibung
`scripts/run-pipeline.sh` ruft in `run_skill()` `claude --print ... --model ... --max-turns ...`
non-interaktiv auf (Stage 3, `FACTORY_STAGE=3`). `.claude/settings.json` erlaubt bisher nur
`Bash(scripts/*)` – kein `Edit`/`Write` ist freigegeben. Jede Datei-Schreibaktion eines
Stage-3-Sub-Agenten (z. B. `/implement`) landet dadurch auf einem Permission-Prompt, den in
`--print`-Modus niemand beantworten kann. Beobachtet bei Task #66: `/implement` lief 3x, ohne
je eine Zeile Code zu schreiben – der Review↔Implement-Circuit-Breaker griff, weil `/review`
korrekt "kein Diff" meldete.

Ziel: ein projektweiter, auf die tatsächlich benötigten Quell-/Test-/Workflow-Pfade begrenzter
`Edit`/`Write`-Allow-List-Eintrag in `.claude/settings.json`, damit Stage-3-Sub-Agenten
selbstständig schreiben können – ohne pauschal jeden Pfad freizugeben. `.claude/**` (verhindert
Selbst-Eskalation der eigenen Permissions) und `.env*` (Secrets) bleiben explizit gesperrt.

## Akzeptanzkriterien
- [x] GIVEN ein Stage-3-Sub-Agent (`FACTORY_STAGE=3`, `claude --print`) WHEN er eine Datei
      unter `app/`, `lib/`, `db/`, `e2e/`, `types/`, `scripts/`, `docs/`, `tasks/`, `config/`,
      `public/`, `.github/workflows/` oder eine root-level `*.ts`/`*.tsx`/`*.mjs`/`*.json`/`*.md`-
      Datei schreiben will THEN geschieht das ohne Permission-Prompt (Allow-List greift) –
      verifiziert per echtem Probe: `claude --print` hat `tasks/permission-probe.md` ohne
      Rückfrage geschrieben (danach wieder entfernt, nicht committet)
- [x] GIVEN derselbe Sub-Agent WHEN er `.claude/**` oder `.env*` schreiben/lesen will THEN bleibt
      das weiterhin gesperrt (Deny-Liste) – verifiziert: Versuch, `.claude/settings.json` selbst
      zu erweitern, wurde vom Agenten selbst als "blocked: deny rule" gemeldet, Datei unverändert
- [x] `bash scripts/run-pipeline.sh <task-id> --dry-run` zeigt weiterhin die korrekten
      Modell-/Turn-Angaben – keine Regression an der bestehenden Bash-Allow-List
      (`Bash(scripts/*)`, `Bash(scripts/checks/*)`) – verifiziert mit `run-pipeline.sh 88 --dry-run`

## Technische Notizen
Änderung ist rein deklarativ (`.claude/settings.json`, JSON-Permission-Regeln) – kein
Produktionscode, kein neues Laufzeitverhalten der App. Kein ADR nötig (reine Tooling-Konfiguration,
keine der vier Trigger-Kategorien). Aus demselben Grund kein klassischer TDD-Rot/Grün-Zyklus in
Code; stattdessen manuelle Verifikation der Permission-Regeln (Positiv-/Negativ-Fall je Pfad-Muster).

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `chore/88-stage-3-schreibrechte-fuer-non-interaktive-agenten-sessions`
Erstellt: 2026-07-12 21:52
