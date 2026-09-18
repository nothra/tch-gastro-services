# Task 348: turn-limit-implement-80

## Status
- [x] In Bearbeitung
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
- [x] ADR-009 §6 / ADR-010 (bzw. neue Amendment-ADR) begründet die neue Ceiling 80 mit der
      Eskalationshistorie (#49, #53, #324) – nicht nur dem Einzel-Incident #324
      → [ADR-051](../docs/adr/051-turn-limit-ceiling-implement-80.md)
- [x] `MAX_TURNS_CEILING=80` in `scripts/checks/config-validation-check.sh`, Kommentar auf die
      neue ADR aktualisiert
- [x] `skills.implement.max_turns: 80` in `factory.config.yml`, `@reason`-Kommentar auf #324
      aktualisiert (überholte „80 wurde abgelehnt"-Notiz entfernt)
- [x] Gate akzeptiert `max_turns: 80` (Positiv-Test) – neues Fixture `ceil80.yml`,
      `scripts/checks/tests/run-tests.sh`
- [x] Gate lehnt `max_turns: 81` weiterhin fail-closed ab (Grenzfall-Negativ-Test) – neues
      Fixture `ceil81.yml`
- [x] Andere Skills (`pr-shepherd`, `codify`, `test`) bleiben bei ihren bisherigen Werten
      (20/30/40) – Regressions-Check: keine Änderung an diesen Zeilen in `factory.config.yml`
- [x] Bestehende Negativ-Tests (Tippfehler-Key, `max_turns: 0`, nicht-Integer) bleiben grün
      – volle Suite: 1563 grün, 0 rot (`scripts/checks/tests/run-tests.sh`)

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
**ADR:** [ADR-051](../docs/adr/051-turn-limit-ceiling-implement-80.md) – erweitert ADR-009 §6 /
ADR-010 (Mechanismus unverändert, nur der Zahlenwert 50→80). ADR-010 hat eine kurze
Blockquote-Notiz am Absatz „Heimat der Obergrenze" erhalten (Muster: ADR-036 D1 ↔ ADR-046).
ADR-009 §6 bleibt **unverändert** – beschreibt nur den Mechanismus, keinen Zahlenwert, daher
keine Drift.

**Implementierung (für `/implement`):**
1. `scripts/checks/config-validation-check.sh:34` → `MAX_TURNS_CEILING=80`; Kopf-Kommentar
   (~Zeile 20-31) um Verweis auf ADR-051 ergänzen.
2. `factory.config.yml:50` → `implement: { max_turns: 80 }`; `@reason`-Kommentar (~Zeile 38-48)
   umschreiben: überholte „80 wurde abgelehnt"-Notiz raus, Verweis auf ADR-051 +
   Eskalationshistorie (#49/#53/#324) rein.
3. `scripts/checks/tests/run-tests.sh` (Abschnitt „Config-Validierungs-Gate", ab ~Zeile 1500):
   - Neuer Positiv-Test `max_turns: 80` → Exit 0 (analog `ok.yml`, Zeile 1508).
   - Neuer Negativ-Grenzfall-Test `max_turns: 81` → Exit ≠ 0 (analog `ceil.yml`, Zeile 1528 –
     **nicht** überschreiben, `9999` bleibt als „weit über Ceiling"-Fall bestehen).
   - Bestehende Fixtures (`typo.yml`, `zero.yml`, `nonint.yml`, `tier.yml`, `broken.yml`)
     unverändert – ceiling-wert-unabhängig.
4. Optional (empfohlen, kein hartes AC): kurzer Nachtrag in
   `docs/factory/lessons/factory-workflow.md` beim #324-Eintrag
   („Ceiling seit #348/ADR-051 auf 80 angehoben"). **Erledigt.**

**TDD-Nachweis (RED → GREEN):**
- RED: direkte Gate-Probe + neue Fixtures vor der Ceiling-Änderung → `max_turns: 80` schlägt
  fehl (`außerhalb [1, 50]`), volle Suite `scripts/checks/tests/run-tests.sh`: 1562 grün, 1 rot
  (genau der neue `Gate #348: max_turns = 80`-Test).
- GREEN: nach `MAX_TURNS_CEILING=80` + `factory.config.yml`-Update → volle Suite:
  1563 grün, 0 rot.
- `pnpm lint` (via `scripts/checks/pre-commit.sh`) grün.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
- [x] Amendment-Form: **entschieden** – neue eigenständige ADR-051 mit Verweis auf 009/010
      (analog ADR-046 „Erweitert ADR-036"), keine Status-Änderung an ADR-009/010 selbst.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/348-turn-limit-implement-80`
Erstellt: 2026-09-18 03:58
