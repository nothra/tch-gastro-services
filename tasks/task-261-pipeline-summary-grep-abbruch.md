# Task 261: pipeline-summary-grep-abbruch

## Status
- [x] In Bearbeitung
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
- [x] GIVEN `tasks/codify-<id>.md` mit 0 Treffern auf `^- ` WHEN `pipeline_summary()`
      unter `set -euo pipefail` läuft THEN kein Abbruch (Exit 0), Rest des Skripts
      (inkl. `verify_final_state`) wird erreicht.
- [x] GIVEN 1–3 Treffer WHEN `pipeline_summary()` läuft THEN alle Zeilen werden wie
      bisher ausgegeben (keine Verhaltensänderung im Treffer-Fall). — strukturell
      garantiert: `|| true` greift nur, wenn die vorangehende Pipeline bereits fehlschlägt
      (Exit ≠ 0); bei ≥1 Treffer ist der Exit-Code schon 0, `|| true` ändert nichts.
- [x] GIVEN >3 Treffer WHEN `pipeline_summary()` läuft THEN erste 3 Zeilen +
      `… (weitere in tasks/codify-<id>.md)` (unverändert). — gleiche Begründung wie oben,
      der nachgelagerte `rule_count -gt 3`-Zweig ist vom Fix unberührt.
- [x] GIVEN ein Regressionstest analog zu `run-tests.sh:1078-1091` (K-1) WHEN das
      korrigierte Idiom gegen ein 0-Treffer-File unter `set -euo pipefail` läuft THEN
      Exit 0 – UND die Gegenprobe ohne Fix bricht nachweislich ab. — K-2-Testblock in
      `run-tests.sh` (nach K-1, vor Factory-Config Phase 1b).

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
Vollständige Findings: [tasks/review-261.md](review-261.md) (Runde 1-3, Empfehlung
NEEDS_REWORK).

Rework [2026-08-02]: Das einzige Wichtig-Finding (Testguard
`scripts/checks/tests/run-tests.sh:1105` war nicht an die konkrete Codify-Pipeline
gebunden, sondern an ein datei-weites `done || true`-Fragment) behoben – der Guard
extrahiert jetzt per `awk` gezielt den Block zwischen der Codify-Pipeline-Zeile und
ihrem `done` (analog zur bereits etablierten Job-Block-Isolation aus #255) und prüft
`|| true` nur innerhalb dieses Blocks. Zusätzlich ein Schärfe-Beweis ergänzt: ein
unabhängiges `done || true` an anderer Stelle im Skript darf den Guard nicht täuschen.
Die Kommentar-Nummerierung wurde dabei auf `(3)` korrigiert (Nitpick). Die übrigen
Nitpicks (`ZERO2`-Naming, 0-Byte- vs. Header-only-Fixture) bewusst nicht angefasst –
optional laut Review-Persona, kein funktionaler Unterschied.

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->
Hinweis für /codify: Musterkandidat für `lessons/factory-workflow.md` oder
`lessons/code-style.md` – jede `grep | head | while read`-Pipeline (oder allgemein jede
Pipeline, deren letztes Glied bei 0 Treffern non-zero zurückgibt) braucht unter
`set -euo pipefail` ein `|| true` **nach dem gesamten Pipeline-Ausdruck** (hier: nach
`done`), nicht nur bei einfachen `grep -c`-Zuweisungen (bereits als Gotcha 2 codifiziert).
Fix ist strukturell verhaltensneutral bei ≥1 Treffer, da `||` nur bei vorangehendem
Fehlschlag greift.

---
Branch: `fix/261-pipeline-summary-grep-abbruch`
Erstellt: 2026-08-02 19:10
