# Task 80: pr-body-schliesst-issue-via-closes-keyword

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [x] Fertig / PR erstellt

## Beschreibung
Die von `start-work.sh` erzeugten Draft-PRs referenzierten das zugehörige Issue nur als
Erwähnung (`Task #<id>: …`, Titel-Suffix `(#<id>)`). GitHub schließt ein Issue beim Merge
aber nur, wenn Titel oder Body ein **Closing-Keyword** direkt vor der Nummer trägt
(`Closes`/`Fixes`/`Resolves #<id>`). Folge: gemergte PRs ließen ihre Issues offen –
beobachtet an #74, #71, #76 (und deren PRs #75, #72, #77, alle mit leerem
`closingIssuesReferences`).

## Akzeptanzkriterien
- [x] GIVEN start-work.sh legt einen Draft-PR an, WHEN der Body erzeugt wird, THEN
      beginnt er mit `Closes #<task-id>`.
- [x] GIVEN der PR wird gemergt, WHEN GitHub den Merge verarbeitet, THEN wird das Issue
      automatisch geschlossen (Closing-Keyword erkannt).
- [x] GIVEN die automatische PR-Anlage scheitert, WHEN der manuelle Fallback-Hinweis
      ausgegeben wird, THEN enthält er `--body` mit derselben `Closes`-Zeile.
- [x] GIVEN die Git-Workflow-Guideline, WHEN ein Mensch einen PR manuell anlegt, THEN
      ist die `Closes #<id>`-Regel dort dokumentiert.

## Technische Notizen
- `scripts/start-work.sh`: `PR_DESC` beginnt jetzt mit `Closes #${TASK_ID}` (Leerzeile,
  dann die bisherige `Task #…`-Zeile). Manueller Fallback-Hinweis gibt `--body "$PR_DESC"`
  mit aus.
- `docs/factory/guidelines/git-workflow.md`: neue Regel im Branch-Abschnitt – PR-Body
  muss mit Closing-Keyword schließen; deutsches „Behebt" wird von GitHub nicht erkannt.
- Self-Test (`scripts/checks/tests/run-tests.sh`) stubbt `gh pr create` nur ab und
  assertet den Body-Inhalt nicht → keine Testanpassung nötig, 154 grün.

## Offene Fragen
Keine.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `fix/80-pr-body-schliesst-issue-via-closes-keyword`
Erstellt: 2026-07-12 14:12
