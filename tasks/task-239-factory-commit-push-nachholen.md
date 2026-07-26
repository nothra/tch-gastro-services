# Task 239: factory-commit-push-nachholen

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
`scripts/factory-commit.sh` (mandatierte Commit/Push-Seam, ADR-019) holt im „nichts zu
committen"-Zweig einen zuvor fehlgeschlagenen Push nicht nach – der Commit bleibt lokal liegen,
was für Stage-3-Agenten zum Pipeline-Abbruch führt (kein Weg, rohes `git push` auszuführen).
Fix: der leere Zweig prüft zusätzlich auf ungepushte Commits/fehlenden Upstream und holt den
Push in dem Fall nach. Details siehe [spec-239](../docs/specs/spec-239-factory-commit-push-nachholen.md).

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [ ] GIVEN nichts zu committen UND Branch hat Commits voraus (`git rev-list @{u}..HEAD` nicht leer) WHEN `factory-commit.sh` läuft THEN Push wird nachgeholt, Exit 0
- [ ] GIVEN nichts zu committen UND Branch hat keinen Upstream WHEN `factory-commit.sh` läuft THEN Push mit `-u origin HEAD`, Exit 0
- [ ] GIVEN nichts zu committen UND Branch ist deckungsgleich mit Upstream WHEN `factory-commit.sh` läuft THEN keine Aktion, unveränderte Meldung, Exit 0
- [ ] GIVEN nichts zu committen UND ungepushte Commits vorhanden, nachgeholter Push scheitert WHEN `factory-commit.sh` läuft THEN Exit ≠ 0, Fehlschlag weitergereicht
- [ ] Bestehende Fail-closed-Guards (main/master, kein Repo, detached HEAD, Argumentanzahl) bleiben unverändert wirksam

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
Keine – Problem/Fix-Ansatz sind im Issue #239 bereits vollständig beschrieben. `/architecture`
entscheidet nur noch, ob eine eigene ADR nötig ist oder eine Ergänzung von ADR-019 genügt.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `fix/239-factory-commit-push-nachholen`
Erstellt: 2026-07-26 13:47
