# Task 4: Issue-Sync – jeder Task hat ein GitHub-Issue-Pendant

## Status
- [x] In Bearbeitung
- [x] Fertig / PR erstellt

## Beschreibung
Invariante "jede tasks/task-<id>-*.md hat GitHub-Issue #<id>" in die Factory
einbauen. Siehe Issue #4.

## Akzeptanzkriterien
- [x] sync-issues.sh --check meldet Drift (exit 1); grün wenn synchron
- [x] start-work.sh garantiert Task-ID = Issue-Nummer (Issue-first + ID-Modus)
- [x] CI-Job issue-sync prüft die Invariante bei Push/PR
- [x] Self-Test-Suite bleibt grün (140 grün), deckt sync-issues.sh ab
- [x] ADR-013 dokumentiert die Konvention

---
Branch: `feature/4-issue-sync`
Closes #4
