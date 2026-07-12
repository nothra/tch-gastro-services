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
- [x] GIVEN start-work.sh legt im Beschreibungs-Modus ein Issue an, WHEN kein Label
      übergeben ist, THEN wird ein Art-Label aus dem Branch-Typ abgeleitet und gesetzt
      (`fix`/`hotfix` → `bug`, `docs` → `documentation`, sonst `enhancement`).
- [x] GIVEN `FACTORY_ISSUE_LABEL` ist gesetzt, WHEN das Issue angelegt wird, THEN
      übersteuert dieser Wert die Ableitung.

## Technische Notizen
- `scripts/start-work.sh`: `PR_DESC` beginnt jetzt mit `Closes #${TASK_ID}` (Leerzeile,
  dann die bisherige `Task #…`-Zeile). Manueller Fallback-Hinweis gibt `--body "$PR_DESC"`
  mit aus.
- `scripts/start-work.sh`: `gh issue create` bekommt ein aus dem Branch-Typ abgeleitetes
  Art-Label (`ISSUE_LABEL`, Override `FACTORY_ISSUE_LABEL`). Fail-open aufs Label
  (Fallback ohne Label + Warnung, falls das Label im Repo fehlt), fail-closed auf die
  Issue-Anlage selbst.
- `docs/factory/guidelines/git-workflow.md`: neue Regeln im Branch-/Labels-Abschnitt –
  PR-Body muss mit Closing-Keyword schließen (deutsches „Behebt" wird von GitHub nicht
  erkannt); start-work.sh setzt das Art-Label automatisch, Aspekt-Labels bleiben manuell.
- Self-Test (`scripts/checks/tests/run-tests.sh`): `gh`-Stub protokolliert jetzt
  `issue create`-Args; 4 neue Assertions zur Label-Ableitung. 158 grün.

## Offene Fragen
Keine.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `fix/80-pr-body-schliesst-issue-via-closes-keyword`
Erstellt: 2026-07-12 14:12
