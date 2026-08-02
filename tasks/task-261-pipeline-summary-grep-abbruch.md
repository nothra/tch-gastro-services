# Task 261: pipeline-summary-grep-abbruch

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [ ] Security-Review bestanden
- [x] Refactoring abgeschlossen
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
      garantiert (`|| true` greift nur bei vorangehendem Fehlschlag) UND seit `/test`
      empirisch belegt: End-to-end-Dry-Run-Test gegen den echten `pipeline_summary()`-
      Pfad in `run-tests.sh` (#261 AC2-Block).
- [x] GIVEN >3 Treffer WHEN `pipeline_summary()` läuft THEN erste 3 Zeilen +
      `… (weitere in tasks/codify-<id>.md)` (unverändert). — gleiche strukturelle
      Begründung UND seit `/test` empirisch belegt (#261 AC3-Block, End-to-end-Dry-Run).
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
Vollständige Findings: [tasks/review-261.md](review-261.md). 1. Durchlauf: Runde 1-3,
Empfehlung NEEDS_REWORK (1 Wichtig-Finding). 2. Durchlauf (nach Rework): Runde 1-3,
Empfehlung **APPROVED** (nur noch 4 optionale Nitpicks, keine kritischen/wichtigen
Findings).

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

## Test-Notizen (2026-08-02)
Reine Bash-Skript-Änderung ohne TS-Produktionscode – kein `pnpm test:coverage`-Lauf
nötig, die relevante Test-Suite ist `scripts/checks/tests/run-tests.sh` (Bash,
tabellengetrieben).

Lücke aus der Test-Vollständigkeitsprüfung geschlossen: AC2 (1–3 Treffer) und AC3
(>3 Treffer) waren bisher nur strukturell begründet (`|| true` wirkt nur bei
vorangehendem Fehlschlag), aber nicht durch einen Test belegt, der tatsächlich den
echten `pipeline_summary()`-Pfad mit realen Regelzeilen durchläuft. Ergänzt: zwei
End-to-end-Dry-Run-Tests (analog zum bestehenden #91-Scaffold, `bash
run-pipeline.sh <id> --dry-run` gegen ein isoliertes Temp-Repo) –

- AC2: `tasks/codify-3.md` mit 2 Regelzeilen → Summary zeigt beide Zeilen unverändert,
  kein `… weitere`-Hinweis.
- AC3: `tasks/codify-3.md` mit 5 Regelzeilen → Summary zeigt Regelzahl 5, aber nur die
  ersten 3 Zeilen + den `… weitere`-Hinweis (vierte Zeile fehlt nachweislich).

Volle Suite: `bash scripts/checks/tests/run-tests.sh` → **790 grün, 0 rot** (vorher 782;
+8 neue Assertions durch die beiden End-to-end-Blöcke). `pnpm test`/Typecheck/Format
weiterhin unverändert grün (kein TS-Code betroffen).

## Refactor-Notizen (2026-08-02)
Kein neues Verhalten – nur die beiden verbliebenen Review-Nitpicks aus Durchlauf 2
sauber gemacht:
- Der awk-Regex zur Block-Extraktion (`grep|head|while`…`done`) war wortgleich zweimal
  als Literal dupliziert (reguläre Assertion + Schärfe-Beweis) – jetzt in einer Variable
  `codify_block_awk` gebündelt, damit beide Stellen nicht auseinanderlaufen können.
- Kommentar ergänzt: die Block-Extraktion schließt bewusst Start- **und** Endzeile ein
  (anders als das exklusive Precedent `cv_job_block`/`ci_selftest_block` aus #255) –
  vorher stillschweigend abweichend, jetzt explizit begründet.
- `ZERO2` → `ZERO_WHILE_LOOP` umbenannt (sprechenderer Name im Kontext von `ZERO`).
- Bewusst unverändert: Header-only- statt 0-Byte-Fixture (funktional gleichwertig,
  konsistent mit dem bestehenden `ZERO`-Muster).

Volle Suite nach Refactor: `bash scripts/checks/tests/run-tests.sh` → **790 grün, 0 rot**
(identisch zur Test-Phase – keine Verhaltensänderung).

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
