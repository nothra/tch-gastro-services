# Task 214: contract-drift-guard-report-anker

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Drift-Guard-Test, der die harte Kopplung zwischen den Anker-Überschriften der Report-Contracts
(`.claude/commands/review.md`, `security-review.md`) und den Parser-Konstanten
(`report_verdict` in `scripts/lib/report-verdict.sh`, `count_section_items` in
`scripts/run-pipeline.sh`) absichert. Benennt jemand eine Überschrift im Command um, bricht die
Pipeline heute **still** (leeres Verdict / Count 0), ohne dass ein Test rot wird. Der Guard macht
diesen Drift sichtbar. Reiner Test, kein neues Verhalten (`tech-debt` + `test`).

Spec: `docs/specs/spec-214-contract-drift-guard-report-anker.md`
Bezug: #211 (Out-of-Scope-Fund), Codify-Learning #55.

## Akzeptanzkriterien
- [ ] AC1 – `## Empfehlung` (report_verdict review) ist als exakte Anker-Überschrift in `review.md` vorhanden
- [ ] AC2 – `## Ergebnis` (report_verdict security) ist als exakte Anker-Überschrift in `security-review.md` vorhanden
- [ ] AC3 – `## Kritische Findings` / `## Wichtige Findings` / `## Nitpicks` (count_section_items) sind in `review.md` auffindbar
- [ ] AC4 – Negativ-Fall: bei simuliertem Drift (umbenannte Überschrift) wird der Guard rot (Exit ≠ 0) und nennt die betroffene Konstante
- [ ] AC5 – Guard ist in `scripts/checks/tests/run-tests.sh` verdrahtet und läuft beim Suite-Lauf mit
- [ ] AC6 – erwartete Konstanten werden aus den echten Parser-Skripten gelesen, nicht im Test dupliziert

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
- Matching-Semantik je Parser respektieren: `report_verdict` matcht die Anker-Zeile **exakt**
  (`^[[:space:]]*## Empfehlung[[:space:]]*$`); `count_section_items` matcht **unankert/Teilstring**
  (`## Kritische Findings` trifft `## Kritische Findings (müssen behoben werden)`).
- Nur POSIX-Regex / portables awk (macOS/BSD + GNU/Alpine), konsistent mit den Gate-Skripten.
- Kein bidirektionaler Check → `## Positives` / `## Hinweise` sind legitim ohne Parser.

## Offene Fragen
Keine – Scope bestätigt (alle 3 Parser, ein-direktional, mit verpflichtendem Negativ-Fall).

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `test/214-contract-drift-guard-report-anker`
Erstellt: 2026-07-24 08:07
