# Task 312: verdict-konsum-frische-pruefung

## Status

- [x] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung

Die in #310 eingeführte Frische-Prüfung des Report-Guards in `run_skill()`
(`scripts/run-pipeline.sh`) sitzt ausschließlich im **non-zero-Exit-Zweig**. Endet
`claude --print` mit **Exit 0**, kehrt `run_skill()` mit `return 0` zurück, ohne den erhobenen
`report_fingerprint_before` je anzusehen. Die beiden Verdict-Konsumenten lesen danach ungeprüft
die Report-Datei: Phase 2 (Vergleich gegen `APPROVED`, entscheidet über das Verlassen des
Review-Loops) und Phase 5 (Vergleich gegen `NEEDS_FIXES`, entscheidet über das Security-Gate).

Beendet `/review` einen Aufruf mit Exit 0, ohne seinen Report (neu) zu schreiben, liest Phase 2
einen stehengebliebenen `APPROVED` aus einer früheren Iteration oder einem früheren, committeten
Pipeline-Lauf – die Pipeline verlässt den Review-Loop, ohne dass in diesem Lauf ein Review
stattfand. Dieselbe fail-open-Richtung wie #91/#310, nur über den Erfolgs- statt den Fehlerpfad.

Der Fix macht die Prüfung **symmetrisch**: Für `review`/`security-review` gilt ein Aufruf – egal
mit welchem Exit-Code – nur als Erfolg, wenn der Report **in diesem Aufruf verändert** wurde
**und** einen eindeutigen Verdict enthält. Zusätzlich wird das Security-Gate in Phase 5 auf
fail-closed umgedreht (nur ein eindeutiges `PASSED` passiert), weil es heute auch einen völlig
fehlenden Report durchwinkt.

**Spec:** [`docs/specs/spec-312-verdict-konsum-frische-pruefung.md`](../docs/specs/spec-312-verdict-konsum-frische-pruefung.md)

## Akzeptanzkriterien

- [x] AK1 (Kern, Phase 2): Exit 0 + unveränderter Report mit altem `APPROVED` → Fehlversuch, kein
      `return 0`, Meldung benennt den stale Verdict, Review-Loop wird nicht verlassen.
- [x] AK2 (Regression Erfolgs-Pfad): Exit 0 + im Aufruf geschriebener Report mit gültigem Verdict
      → weiterhin Erfolg, Pipeline arbeitet mit diesem Verdict weiter.
- [x] AK3 (gültiger Verdict verlangt): Exit 0 + frisch geschriebener Report **ohne** eindeutigen
      Verdict-Anker → Fehlversuch (schließt die Phase-5-Lücke „leerer Verdict passiert").
- [x] AK4 (`security-review` stale): Exit 0 + unveränderter Report mit altem `PASSED` →
      Fehlversuch.
- [x] AK5 (Interrupt hat Vorrang): signalisierter Interrupt + Exit 0 ohne frischen Report →
      sofortiger harter Stopp über `interrupt-check.sh`, kein Retry.
- [x] AK6 (Retry-Semantik): drei Exit-0-Versuche ohne frischen, gültigen Report → `exit 1` mit
      „failed after 3 attempts", nicht Circuit Breaker (`exit 2`).
- [x] AK7 (andere Skills unberührt): `implement`/`test`/`refactor`/`codify`/`pr-shepherd` mit
      Exit 0 → unverändert Erfolg, unabhängig von Report-Dateien.
- [x] AK8 (Gate-Polarität Phase 5): Gate blockiert alles außer einem eindeutigen `PASSED`.
- [x] AK9 (eine Bedingung, ein Ort): „frisch UND gültig" steht genau einmal im Code (gemeinsame
      Hilfsfunktion), gleicher Snapshot, gleiche Lib, kein Report-Pfad in `run-pipeline.sh`.
- [x] AK10 (Meldungen unterscheidbar): Exit-0-Erfolgsmeldung bleibt von „Turn-Limit toleriert"
      unterscheidbar; alle bestehenden #310-Assertions bleiben grün.
- [x] AK11 (E2E + Mutationsbeleg): E2E-Tests am echten Skript für beide Richtungen, aufgebaut auf
      dem vorhandenen #310-Harness; Mutation des echten Guard-Ausdrucks macht sie rot.
- [x] AK12 (Gate-Polarität getestet): `PASSED` → weiter, `NEEDS_FIXES` → `exit 1`; die
      unerreichbar gewordene dritte Richtung per Vergleichs-Anker + Mutationsbeleg gepinnt.
- [x] AK13 (Doku-Nachzug): ADR-019 §4 und der Report-Guard-Absatz in
      `docs/factory/lessons/factory-workflow.md` beschreiben die symmetrische Bedingung, die
      Verdict-Gültigkeit und die neue Gate-Polarität; Lesson-Regel um „alle Rückkehrpfade"
      geschärft.

## Technische Notizen

Entschieden am 2026-08-27 (vier Design-Forks, Details in der Spec unter „Scope"):

1. **Ort:** Prüfung in `run_skill()`, symmetrisch zum non-zero-Zweig – nicht in den Konsumenten.
   `run_skill()` kann dann per Konstruktion nie mit stale Report zurückkehren.
2. **Strenge:** frisch **und** gültiger Verdict (schließt die Phase-5-Lücke mit).
3. **Fehlerpfad:** Fehlversuch im bestehenden Retry (3 Versuche → `exit 1`), kein neuer
   Interrupt-Typ; Interrupt-Prüfung vor der Frische-Prüfung.
4. **Gate Phase 5:** Polarität gedreht auf „nur eindeutiges `PASSED` passiert".

Umsetzungshinweise (Volltext in der Spec, Abschnitt „Technische Hinweise"):

- Erfolgsbedingung beider Zweige ist nach dem Fix identisch → gemeinsame Hilfsfunktion (AK9);
  die **Meldungen** bleiben `rc`-abhängig, damit die #310-Assertions greifen (AK10).
- Exit-Code `set -e`-sicher einsammeln (`if … then rc=0; else rc=$?; fi`), kein nacktes
  `cmd; rc=$?`.
- `report_fingerprint_before` bleibt oberhalb der Retry-Schleife (AK7 aus #310 ist dort
  positionell getestet); `report_fingerprint_now` im Exit-0-Zweig neu erheben.
- Test-Harness `scaffold_310`/`commit_310`/`run_310` wiederverwenden, keinen parallelen
  Zweitaufbau (Lesson `testing.md`, 5. Vorkommnis des Duplikat-Scaffold-Smells). Fixture-IDs
  `310`–`313` sind belegt – für die neuen Tests andere IDs wählen.
- `--dry-run` kehrt vor jedem `claude`-Aufruf zurück; die neue Prüfung darf dort nicht greifen.

### Umsetzungsnotizen (/implement, 2026-08-27)

- **`--dry-run` und das umgedrehte Security-Gate:** Das fail-closed-Gate braucht einen Report,
  den `--dry-run` per Definition nie erzeugt (dort läuft kein Skill). Es wird deshalb im
  Dry-Run **übersprungen** statt abgeschwächt – dieselbe Ausnahme, die die
  Endzustands-Verifikation (ADR-040) direkt darunter schon hat. Ohne diese Ausnahme hätte
  jeder `--dry-run` ab Phase 5 blockiert.
- **Vorbestehender E2E-Block (Task-Fixture 78) musste mitziehen:** Sein `claude`-Stub legte den
  `APPROVED` **vorab** ab und war ein No-op. Seit dem Fix ist genau das ein stale Report – der
  Lauf wäre in Phase 2 gestorben. Der Stub schreibt die Reports jetzt **im Aufruf** und
  variiert ihren Inhalt über einen Aufrufzähler, damit auch der zweite/dritte Lauf gegen
  dasselbe Scaffold eine echte Veränderung sieht. Die Skill-Erkennung läuft über die
  `SKILL-<name>`-Marker aus dem #310-Harness (`SKILL-review` ist kein Teilstring von
  `SKILL-security-review`).
- **AK5-Mutant ersetzt statt löscht:** Der Exit-0-`interrupt-check`-Aufruf ist der einzige
  Rumpf seines `if`. Gelöscht ergäbe das `if …; then` + `fi` → Syntaxfehler, und der
  Mutationsbeleg belegte nur Parsing statt Kausalität. Er wird darum durch `:` ersetzt.
  Dass die Mutation den **Exit-0**-Aufruf trifft (nicht einen der beiden anderen), belegt eine
  Positions-Assertion, nicht nur die Anzahl.
- **Zeilen-Anker gemeinsam definiert:** `FRESH_CMP_PIPE`/`VERDICT_CHK_PIPE`/`GUARD_CALL_PIPE`/
  `IC_CALL_PIPE` stehen einmal oberhalb des #310-Blocks – #310 und #312 mutieren nach dem Fix
  dieselben Zeilen, zwei gleichlautende Literale wären eine Drift-Quelle.
- **Fixture-IDs 330–334** (die Spec weist darauf hin, dass `310`–`313` und `316` belegt sind).
- **Über AK13 hinaus nachgezogen:** die Index-Zeile des Report-Guard-Learnings in
  `docs/factory/PROJECT-CONTEXT.md` – sie nannte „umgesetzt in #310" als Endstand
  (Doku-Drift-Regel aus #176/#211).
- **Kein UI/keine Routen berührt** → keine Oberflächentests, `docs/routes.md` unverändert.
- **Gates:** `scripts/checks/tests/run-tests.sh` = 1182 grün / 0 rot (vorher gezielt rot in
  genau den zwei AK13-Lesson-Assertions → RED-vor-GREEN belegt).

## Offene Fragen

_Keine._

## Review-Findings

**Runde 1** (`tasks/review-312.md`, `NEEDS_REWORK`): keine kritischen, zwei wichtige Findings,
fünf Nitpicks. Rework in dieser Session – alle sieben umgesetzt:

- **W1** `scripts/lib/report-verdict.sh` – der Modul-Header beschrieb weiterhin die alte,
  einseitige Guard-Mechanik („ein non-zero Exit gilt als ERFOLG, wenn …"). Das ist die dritte
  Kopie derselben Prosa, die AK13 in ADR-019 §4 und der Lesson schon nachgezogen hatte – und die,
  die jeder Nutzer der Funktionen zuerst liest. Auf die symmetrische Bedingung umgeschrieben.
- **W2** `docs/factory/OPERATING.md` – „Security-Gate: `NEEDS_FIXES` → Abbruch vor Merge" in der
  Eigenschaften-Liste (`:214`) und die Lesart in §4.2 beschrieben die alte, fail-open Polarität.
  Beide auf „nur ein eindeutiges `PASSED` passiert" + Dry-Run-Ausnahme nachgezogen.
- **N1** Verdict wird jetzt **einmal** pro Versuch in `verdict` gelesen und von Erfolgs- wie
  Stale-Meldung genutzt (vorher bis zu drei `awk`-Subprozesse). Die Bedingung selbst bleibt in
  `report_is_fresh_and_valid` – AK9 unberührt.
- **N2** Meldung „kein eindeutiger Verdict **aus diesem Aufruf**" statt „im Report dieses
  Aufrufs" – der Zweig feuert auch, wenn gar kein Report existiert.
- **N3** Neues benanntes Prädikat `is_report_skill()` in der Lib ersetzt das
  `[ -n "$(report_file …)" ]` an der Verzweigungsstelle, das sich wie eine Datei-Existenz-Prüfung
  las. AK9 („kein Report-Pfad in `run-pipeline.sh`") wird dadurch strenger erfüllt, nicht
  schwächer. Modul-Header von „DREI" auf „VIER Funktionen" mitgepflegt (Lesson `code-style.md`).
- **N4** Der in #310 begründete WHY-Satz, warum der **verdictlose** Zweig bewusst kein
  `stop_if_interrupted` hat, ist zurück – der Zweig ist seit dem Fix sichtbar, die Antwort war
  beim Umbau verloren gegangen.
- **N5** Direkter Anker für die Dry-Run-Ausnahme des Security-Gates (vorher nur transitiv über
  den #212-F4-Erfolgs-Check abgesichert).

### Verifikation des Reworks

- Volle Bash-Suite: **1193 grün / 0 rot** (vorher 1182; +11 Assertions).
- **RED-vor-GREEN:** Quellen (`run-pipeline.sh`, `report-verdict.sh`, `OPERATING.md`) auf den
  Stand vor dem Rework zurückgedreht, neue Tests behalten → genau **10 rot**, alle neu, keine
  Kollateral-Rotfärbung.
- **Mutationsbeleg N5:** der `if [ "$DRY_RUN" = true ]`-Zweig unmittelbar vor der
  Security-Gate-Meldung auf `if false` gedreht (per `awk`-Ein-Zeilen-Puffer genau diese Stelle,
  nicht die drei anderen `DRY_RUN`-Zweige) → neue Assertion rot. Rot wurden dabei zusätzlich
  sechs `#261 AC2/AC3`-Assertions und zwei `#212 F4`-Assertions: beide Blöcke fahren ebenfalls
  eine `--dry-run`-Pipeline und prüfen Ausgaben **nach** Phase 5, die das dann greifende
  fail-closed-Gate abschneidet. Das ist genau die transitive Absicherung, die der Review
  beschrieben hat – der neue Anker benennt die Absicht jetzt direkt.
- `is_report_skill(implement) → falsch` bleibt beim Entfernen der Funktion grün (fehlendes
  Kommando → Exit ≠ 0). Die Existenz pinnen die beiden Positiv-Assertions daneben, die im
  RED-Lauf rot waren; die Abwesenheits-Assertion trägt allein die Diskriminierung.

## Codify-Notizen

<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---

Branch: `fix/312-verdict-konsum-frische-pruefung`
Erstellt: 2026-08-27 07:25
