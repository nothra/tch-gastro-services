# Task 214: contract-drift-guard-report-anker

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
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
- [x] AC1 – `## Empfehlung` (report_verdict review) ist als exakte Anker-Überschrift in `review.md` vorhanden
- [x] AC2 – `## Ergebnis` (report_verdict security) ist als exakte Anker-Überschrift in `security-review.md` vorhanden
- [x] AC3 – `## Kritische Findings` / `## Wichtige Findings` / `## Nitpicks` (count_section_items) sind in `review.md` auffindbar
- [x] AC4 – Negativ-Fall: bei simuliertem Drift (umbenannte Überschrift) wird der Guard rot (Exit ≠ 0) und nennt die betroffene Konstante
- [x] AC5 – Guard ist in `scripts/checks/tests/run-tests.sh` verdrahtet und läuft beim Suite-Lauf mit
- [x] AC6 – erwartete Konstanten werden aus den echten Parser-Skripten gelesen, nicht im Test dupliziert

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
- Matching-Semantik je Parser respektieren: `report_verdict` matcht die Anker-Zeile **exakt**
  (`^[[:space:]]*## Empfehlung[[:space:]]*$`); `count_section_items` matcht **unankert/Teilstring**
  (`## Kritische Findings` trifft `## Kritische Findings (müssen behoben werden)`).
- Nur POSIX-Regex / portables awk (macOS/BSD + GNU/Alpine), konsistent mit den Gate-Skripten.
- Kein bidirektionaler Check → `## Positives` / `## Hinweise` sind legitim ohne Parser.

## Offene Fragen
Keine – Scope bestätigt (alle 3 Parser, ein-direktional, mit verpflichtendem Negativ-Fall).

## Implementierungs-Notizen (/implement)
- Guard liegt in `scripts/checks/tests/run-tests.sh` als Block „#214 Contract-Drift-Guard" –
  drei Helfer (`drift_guard`, `extract_verdict_header`, `extract_section_headers`), nach dem
  Block per `unset -f` wieder entfernt (kein Namensleck in die restliche Suite).
- AC6 umgesetzt ohne Literal-Duplikat: die erwarteten Anker werden zur Laufzeit aus
  `report-verdict.sh` (`header='…'` je case-Zweig) bzw. aus den `count_section_items "…"`-Aufrufen
  in `run-pipeline.sh` extrahiert. Ein konsistenter Rename auf **beiden** Seiten bleibt grün;
  ein einseitiger Rename (nur Command **oder** nur Parser) wird rot.
- Matching-Semantik je Parser gespiegelt: `report_verdict` exakt verankert
  (`^[[:space:]]*<header>[[:space:]]*$`), `count_section_items` unankert/Teilstring (wie das
  awk-`/pattern/`). Fail-closed bei fehlender/leerer Command-Datei und bei leerer Extraktion
  (Parser-Format geändert) – kein stilles „bestanden".
- TDD: RED über einen `drift_guard`-Stub (`return 0`) → 8 Negativ-Assertions rot; GREEN nach echter
  Implementierung → 12/12 grün. Volle Suite: 512 grün, 0 rot. Nur POSIX-Regex / portables
  `sed -E`/`grep -oE` (kein `\s`/`\d`, kein `grep -P`).

## Review-Findings
Multi-Persona-Review (3 Personas) → NEEDS_REWORK (Iteration 1): 0 kritisch, 2 wichtig, 4 Nitpicks.
Kern-Finding (W1, von 2 Personas unabhängig): F2-Test war grün aus dem falschen Grund (fehlende
Sektionen trugen das Exit-1 statt der Verdict-Exaktverankerung). Alle 6 Findings in derselben
Session behoben; Re-Review APPROVED. Details in `tasks/review-214.md`.

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `test/214-contract-drift-guard-report-anker`
Erstellt: 2026-07-24 08:07
