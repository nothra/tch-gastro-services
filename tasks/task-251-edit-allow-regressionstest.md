# Task 251: edit-allow-regressionstest

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Regressionstest ergänzen, der das Fortbestehen der 16 ursprünglichen #88-`Edit(...)`-Allow-
Einträge in `.claude/settings.json` prüft (z. B. `Edit(app/**)`, `Edit(lib/**)`,
`Edit(scripts/**)`, `Edit(*.ts)`, `Edit(*.md)`). Aktuell deckt keine Assertion in
`scripts/checks/tests/run-tests.sh` diese Einträge ab – nur die #224/#240-spezifischen
(YAML, `pnpm-lock`, `.claude/**`, `.env*`). Kein neues Verhalten, reine Testabdeckung.

Spec: [docs/specs/spec-251-edit-allow-regressionstest.md](../docs/specs/spec-251-edit-allow-regressionstest.md)

## Akzeptanzkriterien
- [ ] GIVEN `.claude/settings.json` enthält alle 16 ursprünglichen #88-`Edit(...)`-Allow-Einträge
      WHEN `run-tests.sh` läuft THEN erzeugt eine geparste (`jq`) Schleife je Eintrag eine eigene
      grüne Assertion.
- [ ] GIVEN einer der 16 Einträge fehlt versehentlich WHEN `run-tests.sh` läuft THEN schlägt
      genau die zugehörige Assertion fehl (kein pauschaler Sammel-Check).
- [ ] GIVEN `jq` ist nicht verfügbar WHEN `run-tests.sh` läuft THEN prüft ein Grep-Fallback
      (analog #91/#240) dieselben 16 Einträge textbasiert.
- [ ] GIVEN die neue Schleife wird geschrieben WHEN implementiert wird THEN vorher gegen die
      bestehende #224-AK1-Schleife abgeglichen (kein struktureller Duplikat-Rumpf).

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/251-edit-allow-regressionstest`
Erstellt: 2026-08-02 07:53
