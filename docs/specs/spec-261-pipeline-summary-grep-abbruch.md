# Spec: pipeline_summary() bricht bei 0 Codify-Regeln ab

## Kontext
`pipeline_summary()` in `scripts/run-pipeline.sh` gibt am Ende eines Pipeline-Laufs
eine Zusammenfassung aus, u. a. die von `/codify` neu hinzugefügten Regeln
(`tasks/codify-<id>.md`). Der Abschnitt „Codify – neue Regeln" liest die Datei zweimal:

1. `rule_count=$(grep -c "^- " "$codify_file" 2>/dev/null || true)` – bereits gegen den
   0-Treffer-Fall abgesichert (`|| true`).
2. `grep "^- " "$codify_file" 2>/dev/null | head -3 | while IFS= read -r line; do …; done`
   (Zeilen 385–387) – **nicht** abgesichert.

Liefert `/codify` 0 neue Regeln (kein `- `-Treffer in der Datei), gibt `grep` Exit 1
zurück. Unter `set -euo pipefail` (Zeile 26) wird der Exit-Code des gesamten
`grep | head | while`-Pipeline zum rechtesten nicht-null Exit-Code – hier: der `while`-
Schleife, deren `read` sofort auf EOF trifft und mit `1` zurückkehrt. Das Skript bricht
an dieser Stelle sofort ab, **bevor** die nachgelagerte Endzustandsverifikation
(ADR-040, `verify_final_state`) je läuft.

Beobachtetes Symptom: Ein vollständig erfolgreicher Pipeline-Lauf (Implement→Review
APPROVED→Test→Refactor→Security PASSED→Codify) wird fälschlich als `failed` (Exit 1)
gemeldet, obwohl der reale Zustand (PR grün, mergebar) in Ordnung war. Das verfälscht
die Autonomie-/CI-Quote (ADR-006) und lässt den ADR-040-Sicherheitsbackstop
(`raise-interrupt.sh` bei echten Problemen) genau im häufigen 0-Regeln-Fall nie greifen.

Reproduziert in Task 252, 2026-08-02 (siehe Issue #261 für das Minimalbeispiel).

## Scope

**Inbegriffen:**
- Der `grep "^- " | head -3 | while read` -Block in `pipeline_summary()`
  (`scripts/run-pipeline.sh:385-387`) bricht bei 0 Treffern nicht mehr ab.
- Verhalten bei ≥1 Treffer bleibt unverändert (bis zu 3 Zeilen werden weiterhin
  ausgegeben, `… (weitere in tasks/codify-<id>.md)` bei >3 weiterhin korrekt).
- Ein Regressionstest, der (a) den Laufzeit-Beweis führt (das korrigierte Idiom bricht
  unter `set -euo pipefail` bei 0 Treffern nicht ab; die Gegenprobe ohne Fix bricht ab)
  und (b) das tatsächlich in `scripts/run-pipeline.sh` verwendete Idiom prüft –
  analog zum bestehenden Testpaar für `rule_count` in
  `scripts/checks/tests/run-tests.sh:1078-1091` (K-1-Regression).

**Nicht inbegriffen:**
- Die bereits abgesicherte `rule_count`-Berechnung (Zeile 383) – keine Änderung nötig.
- Andere Abschnitte von `pipeline_summary()` (Review-, Security-Status) – dort existiert
  das Grep-mit-möglichen-0-Treffern-Muster nicht in dieser Form.
- `verify_final_state()` / ADR-040 selbst – wird durch den Fix nur wieder erreichbar,
  nicht inhaltlich verändert.
- Rückwirkende Korrektur bereits gelaufener, fälschlich als `failed` markierter
  Pipeline-Läufe (Metriken-Korrektur ist kein Teil dieser Task).

## Akzeptanzkriterien
- [ ] GIVEN `tasks/codify-<id>.md` existiert mit 0 Zeilen, die auf `^- ` matchen,
      WHEN `pipeline_summary()` (bzw. das äquivalente Idiom) unter `set -euo pipefail`
      ausgeführt wird, THEN bricht die Ausführung nicht ab (Exit 0) und der Rest des
      Skripts (inkl. `verify_final_state`) wird erreicht.
- [ ] GIVEN `tasks/codify-<id>.md` existiert mit 1–3 Zeilen, die auf `^- ` matchen,
      WHEN `pipeline_summary()` läuft, THEN werden alle Regelzeilen unverändert
      ausgegeben (keine Verhaltensänderung im Treffer-Fall).
- [ ] GIVEN `tasks/codify-<id>.md` existiert mit >3 Zeilen, die auf `^- ` matchen,
      WHEN `pipeline_summary()` läuft, THEN werden die ersten 3 Zeilen ausgegeben plus
      der Hinweis `… (weitere in tasks/codify-<id>.md)` (unverändert).
- [ ] GIVEN ein Regressionstest analog zu `run-tests.sh:1078-1091`,
      WHEN das korrigierte Idiom gegen ein 0-Treffer-File unter `set -euo pipefail`
      läuft, THEN ist der Exit-Code 0 – UND die Gegenprobe ohne Fix bricht nachweislich
      ab (beweist, dass der Test scharf ist, gemäß `lessons/testing.md`
      Negativ-Test-Isolations-Regel).

## Fehlerszenarien
- [ ] `tasks/codify-<id>.md` fehlt ganz (bereits durch den umgebenden
      `if [ -f "$codify_file" ]`-Zweig abgedeckt – keine Änderung nötig, nur als
      Abgrenzung hier vermerkt).
- [ ] `tasks/codify-<id>.md` existiert, ist aber leer (0 Bytes) – muss ebenfalls den
      0-Treffer-Fall durchlaufen, ohne abzubrechen.

## Offene Fragen
- [ ] Keine – Root-Cause, Reproduktion und Testkonvention sind durch Issue #261 und
      den bestehenden K-1-Testblock bereits eindeutig belegt.
