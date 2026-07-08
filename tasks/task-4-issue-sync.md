# Task 4: Issue-Sync – jeder Task hat ein GitHub-Issue-Pendant

## Status
- [ ] In Bearbeitung
- [ ] Fertig / PR erstellt

## Beschreibung
Invariante "jede tasks/task-<id>-*.md hat GitHub-Issue #<id>" in die Factory
einbauen. Siehe Issue #4.

## Akzeptanzkriterien
- [ ] sync-issues.sh --check meldet Drift (exit 1); grün wenn synchron
- [ ] start-work.sh garantiert Task-ID = Issue-Nummer (Issue-first + ID-Modus)
- [ ] CI-Job issue-sync prüft die Invariante bei Push/PR
- [ ] Self-Test-Suite bleibt grün, deckt sync-issues.sh ab
- [ ] ADR-013 dokumentiert die Konvention

---
Branch: `feature/4-issue-sync`
Closes #4
