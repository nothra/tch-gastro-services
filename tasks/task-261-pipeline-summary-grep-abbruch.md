# Task 261: pipeline-summary-grep-abbruch

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
`pipeline_summary()` in `scripts/run-pipeline.sh:385-387` bricht unter
`set -euo pipefail` ab, wenn `/codify` 0 neue Regeln liefert: der
`grep "^- " | head -3 | while read` -Block liefert dann einen Exit-Code ≠ 0 (die
`while`-Schleife bricht sofort auf `EOF` mit Exit 1 ab), wodurch der komplette
Pipeline-Lauf fälschlich als `failed` gemeldet wird – noch bevor die
ADR-040-Endzustandsverifikation (`verify_final_state`) je läuft. Vollständige
Spec: [docs/specs/spec-261-pipeline-summary-grep-abbruch.md](../docs/specs/spec-261-pipeline-summary-grep-abbruch.md).

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [ ] GIVEN `tasks/codify-<id>.md` mit 0 Treffern auf `^- ` WHEN `pipeline_summary()`
      unter `set -euo pipefail` läuft THEN kein Abbruch (Exit 0), Rest des Skripts
      (inkl. `verify_final_state`) wird erreicht.
- [ ] GIVEN 1–3 Treffer WHEN `pipeline_summary()` läuft THEN alle Zeilen werden wie
      bisher ausgegeben (keine Verhaltensänderung im Treffer-Fall).
- [ ] GIVEN >3 Treffer WHEN `pipeline_summary()` läuft THEN erste 3 Zeilen +
      `… (weitere in tasks/codify-<id>.md)` (unverändert).
- [ ] GIVEN ein Regressionstest analog zu `run-tests.sh:1078-1091` (K-1) WHEN das
      korrigierte Idiom gegen ein 0-Treffer-File unter `set -euo pipefail` läuft THEN
      Exit 0 – UND die Gegenprobe ohne Fix bricht nachweislich ab.

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
Naheliegendes Idiom (bereits im selben Skript für `rule_count`, Zeile 383, etabliert):
`|| true` nach dem `done`. Endgültige Wahl obliegt /implement bzw. /architecture bei
Bedarf.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
Keine – Root-Cause, Reproduktion und Testkonvention sind durch Issue #261 und den
bestehenden K-1-Testblock bereits eindeutig belegt.

Root Cause [2026-08-02]: `scripts/run-pipeline.sh:385-387` – der `grep "^- " | head -3 |
while IFS= read -r line; do … done`-Block ist unter `set -euo pipefail` nicht gegen den
0-Treffer-Fall abgesichert (kein `|| true` wie beim benachbarten `rule_count`, Zeile 383).
Bei 0 Treffern liefert `grep` Exit 1; unter `pipefail` wird daraus der Exit-Code der
`while`-Schleife (1, da `read` sofort auf EOF trifft), und das Skript bricht ab, bevor
`verify_final_state` je läuft.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `fix/261-pipeline-summary-grep-abbruch`
Erstellt: 2026-08-02 19:10
