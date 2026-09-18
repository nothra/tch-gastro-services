# Task 348: turn-limit-implement-80

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
`MAX_TURNS_CEILING` (Gate-Policy-Konstante, `scripts/checks/config-validation-check.sh`,
ADR-009 §6 / ADR-010) von 50 auf 80 anheben, damit `skills.implement.max_turns` in
`factory.config.yml` ebenfalls auf 80 gesetzt werden kann. Wiederkehrendes Muster: `/implement`
wurde schon zweimal wegen Turn-Limit-Abbrüchen angehoben (Task #49: 20→40, Task #53: 40→50)
und reißt jetzt erneut ab – diesmal am bereits maximal erlaubten Wert (Incident #324, 3×
Abbruch trotz fast fertigem Diff). Läuft über `/architecture` (ADR-Amendment), nicht direkt
über `/implement`. Details: [spec-348](../docs/specs/spec-348-max-turns-ceiling-implement.md).

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [ ] ADR-009 §6 / ADR-010 (bzw. neue Amendment-ADR) begründet die neue Ceiling 80 mit der
      Eskalationshistorie (#49, #53, #324) – nicht nur dem Einzel-Incident #324
- [ ] `MAX_TURNS_CEILING=80` in `scripts/checks/config-validation-check.sh`, Kommentar auf die
      neue ADR aktualisiert
- [ ] `skills.implement.max_turns: 80` in `factory.config.yml`, `@reason`-Kommentar auf #324
      aktualisiert (überholte „80 wurde abgelehnt"-Notiz entfernt)
- [ ] Gate akzeptiert `max_turns: 80` (Positiv-Test)
- [ ] Gate lehnt `max_turns: 81` weiterhin fail-closed ab (Grenzfall-Negativ-Test)
- [ ] Andere Skills (`pr-shepherd`, `codify`, `test`) bleiben bei ihren bisherigen Werten
      (20/30/40) – Regressions-Check
- [ ] Bestehende Negativ-Tests (Tippfehler-Key, `max_turns: 0`, nicht-Integer) bleiben grün

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
- [ ] Amendment-Form: Status-Update in ADR-010 selbst, oder neue eigenständige ADR mit Verweis
      auf 009/010 (analog ADR-046 „Erweitert ADR-036")? → Entscheidung bei `/architecture`.
- [ ] Kurzer Nachtrag in `docs/factory/lessons/factory-workflow.md` beim #324-Eintrag
      („Ceiling seit #348 auf 80 angehoben")? Empfehlung: ja, aber kein hartes AC.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/348-turn-limit-implement-80`
Erstellt: 2026-09-18 03:58
