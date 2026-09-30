# Task 379: modell-defaults-auf-5-5-anheben

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [x] Fertig / PR erstellt

## Beschreibung
Modell-Defaults der Tiers auf die aktuellen Modelle anheben: heavy `claude-opus-5` → `claude-opus-5-5`, light `claude-sonnet-5` → `claude-sonnet-5-5` (`factory.defaults.yml`, Fallback in `run-pipeline.sh`, Erwartungswerte in `run-tests.sh`). Kleine Chore-Änderung, bewusst ohne Spec/Pipeline-Lauf.

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [x] GIVEN die Defaults WHEN die Pipeline startet THEN laufen heavy auf `claude-opus-5-5` und light auf `claude-sonnet-5-5`.
- [x] `run-tests.sh` grün (1564/0).

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `chore/379-modell-defaults-auf-5-5-anheben`
Erstellt: 2026-09-30 22:13
