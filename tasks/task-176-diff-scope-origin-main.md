# Task 176: diff-scope-origin-main

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Die Skills `/review`, `/security-review`, `/refactor` und `/pr-shepherd` bestimmen ihren
Diff-/Log-Scope per `git diff main...HEAD` bzw. `git log main...HEAD` gegen das **lokale**
`main`. Nach `start-work.sh` basiert der Worktree auf `origin/main`, das lokale `main` bleibt
zurück – liegt es hinter `origin/main`, enthält der Scope fremde, bereits gemergte PRs (#161:
PR #170 tauchte im Review-Scope auf). Alle **fünf Fundstellen** in **vier** Skill-Dateien auf
`origin/main` umstellen und `git fetch origin` voranstellen. Reine Doku-Umstellung, kein neues
Gate. Lieferung via Patch-Workflow (`tasks/patch-176.diff`), da `.claude/**` agent-hard-denied.

Spec: [`docs/specs/spec-176-diff-scope-origin-main.md`](../docs/specs/spec-176-diff-scope-origin-main.md)

## Akzeptanzkriterien
- [ ] `/review`: `git diff origin/main...HEAD` – zeigt nur eigene Branch-Änderungen, keine Fremd-PRs (review.md:12)
- [ ] `/security-review`: `git diff origin/main...HEAD` (security-review.md:9)
- [ ] `/refactor`: `git diff origin/main...HEAD` (refactor.md:11)
- [ ] `/pr-shepherd`: `git log origin/main...HEAD --oneline` an beiden Stellen (pr-shepherd.md:12 + :21)
- [ ] Jede Fundstelle hat ein vorangestelltes `git fetch origin` (Aktualisierung des origin/main-Refs)
- [ ] Kein `main...HEAD` ohne `origin/`-Präfix mehr in den vier Command-Dateien (grep-verifiziert)
- [ ] Fehlerfall: `git fetch origin` ist best-effort formuliert (kein harter Abbruch bei Offline)

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
- **Patch-Workflow zwingend:** `.claude/**` ist agent-hard-denied → Änderung als `tasks/patch-176.diff`
  aufbereiten und über den etablierten Weg committen.
- **Verifikation am Endzustand der committeten Live-Datei**, nicht am Patch-Artefakt (Lesson #212).
- Kein automatisiertes Gate/Test (bewusste Scope-Entscheidung, YAGNI). Prüfung per grep (siehe Spec).

## Offene Fragen
- [ ] Prosa in `docs/factory/lessons/factory-workflow.md:308` (beschreibt Skills noch mit
      `git diff main...HEAD`) nachziehen? Vorschlag: im `/codify`-Schritt, nicht hier.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/176-diff-scope-origin-main`
Erstellt: 2026-07-24 07:34
