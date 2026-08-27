# Spec: Verdict-Konsum gegen stale Report absichern (Exit-0-Pfad)

## Kontext

#310 hat den Report-Guard in `run_skill()` (`scripts/run-pipeline.sh`, ADR-019 §4) um eine
**Frische-Prüfung** ergänzt: ein Verdict aus `tasks/review-<id>.md` / `tasks/security-<id>.md`
gilt nur als Erfolg, wenn sich die Datei seit Beginn des Skill-Aufrufs verändert hat
(`report_fingerprint`). Der Fingerprint wird dazu einmal vor der Retry-Schleife erhoben
(`report_fingerprint_before`).

**Der Vergleich sitzt jedoch ausschließlich im non-zero-Exit-Zweig.** Verlässt
`claude --print` den Aufruf mit **Exit 0**, kehrt `run_skill()` mit `return 0` zurück, ohne den
erhobenen Fingerprint überhaupt anzusehen. Die beiden Verdict-Konsumenten lesen danach ungeprüft
die Datei:

- **Phase 2** – der Vergleich des review-Verdicts gegen `APPROVED` entscheidet über das
  Verlassen des Review-Loops.
- **Phase 5** – der Vergleich des security-review-Verdicts gegen `NEEDS_FIXES` entscheidet über
  das Security-Gate.

**Auslöser:** Beendet `/review` einen Aufruf mit Exit 0, **ohne** seinen Report (neu) zu
schreiben – etwa weil der Agent den vorhandenen Report für aktuell hält, in einen falschen Pfad
schreibt oder früh abbricht –, liest Phase 2 den stehengebliebenen Verdict aus einer früheren
Iteration bzw. aus einem früheren, committeten Pipeline-Lauf. Ein alter `APPROVED` lässt die
Pipeline den Review-Loop verlassen, ohne dass in diesem Lauf ein Review stattfand. Dieselbe
fail-open-Richtung wie in #91/#310, nur über den Erfolgs- statt den Fehlerpfad.

**Zusatzbefund beim Lesen des Codes (Phase 5):** Das Security-Gate blockiert heute **nur** bei
einem eindeutigen `NEEDS_FIXES`. Ein Exit-0-Aufruf, der **gar keinen** Report schreibt oder einen
Report ohne auswertbaren Verdict-Anker hinterlässt, passiert dieses Gate deshalb schon heute –
unabhängig von Frische. Eine reine Frische-Prüfung schließt diese Lücke nur, wenn sie zusätzlich
einen **gültigen** Verdict verlangt; darum ist beides Teil dieser Spec.

## Scope

**Inbegriffen:**

- **Symmetrische Prüfung in `run_skill()`:** Der Exit-0-Zweig wertet für die zwei
  report-erzeugenden Skills (`review`, `security-review`) dieselbe Bedingung wie der
  non-zero-Zweig aus – Erfolg nur bei **verändertem Fingerprint UND nicht-leerem Verdict**.
  Damit kann `run_skill()` per Konstruktion nie mit einem stale Report zurückkehren; die beiden
  Konsumenten sind ohne eigene Prüfstelle abgesichert (Fork „Ort", entschieden am 2026-08-27).
- **Strenge:** Auch ein frisch geschriebener Report ohne eindeutigen Verdict (fehlender oder
  mehrdeutiger Anker) ist ein Fehlversuch – das schließt die oben beschriebene Phase-5-Lücke
  (Fork „Strenge").
- **Fehlerpfad:** Ein Exit-0-Aufruf ohne frischen, gültigen Report ist ein **Fehlversuch** im
  bestehenden Retry-Pfad (3 Versuche mit Backoff, danach `exit 1`) – genau wie der
  non-zero-Pfad seit #310. Kein neuer Interrupt-Typ. Ein im Versuch **signalisierter** Interrupt
  stoppt weiterhin sofort und hat Vorrang vor der Frische-Prüfung (Fork „Fehlerpfad").
- **Security-Gate-Polarität (Phase 5):** Das Gate passiert künftig nur ein eindeutiges
  `PASSED`, statt nur bei `NEEDS_FIXES` zu blockieren – fail-closed am Gate selbst, unabhängig
  davon, was `run_skill()` garantiert (Fork „Gate Phase 5").
- **Ein Ort für die Bedingung:** Die Bedingung „frisch UND gültig" steht nach dem Fix genau
  einmal (gemeinsame Hilfsfunktion), nicht als zweite Schreibweise im Exit-0-Zweig. Pfadwissen
  und Fingerprint bleiben in `scripts/lib/report-verdict.sh` (AK9 aus #310 gilt weiter).
- **Doku-Nachzug im selben PR:** ADR-019 §4 (beschreibt die Guard-Mechanik namentlich und heute
  ausdrücklich nur für den non-zero Exit) und der Report-Guard-Absatz in
  `docs/factory/lessons/factory-workflow.md`.
- **E2E-Verhaltenstests** in `scripts/checks/tests/run-tests.sh` auf Basis des vorhandenen
  #310-Harness, inkl. Mutationsbeleg.

**Nicht inbegriffen:**

- Keine Änderung an `report_verdict`/`report_fingerprint`/`report_file` selbst
  (Anker-Semantik aus #211, `cksum`-Mechanik und Marker aus #310 bleiben unverändert).
- Keine zusätzliche Prüfstelle in Phase 2 oder Phase 5 für die Frische (die Garantie kommt aus
  `run_skill()`); die Gate-Polarität in Phase 5 ist die einzige Änderung an einem Konsumenten.
- Kein neuer Interrupt-Typ, keine Änderung an der OPERATING.md-Interrupt-Tabelle.
- Keine Änderung an `circuit_breaker_check()`, `MAX_REVIEW_ITERATIONS` oder am Turn-Budget
  (`max_turns`).
- Kein Löschen oder Truncaten von Report-Dateien (nicht-destruktiv wie #310).
- Keine Änderung am Verhalten nicht report-erzeugender Skills (`implement`, `test`, `refactor`,
  `codify`, `pr-shepherd`).
- Keine App-Routen betroffen → `docs/routes.md` bleibt unberührt.

## Akzeptanzkriterien

- [ ] AK1 (Kern, Phase 2): GIVEN `tasks/review-<id>.md` enthält einen `APPROVED`-Verdict aus
      einer früheren Iteration oder einem früheren Pipeline-Lauf, WHEN `/review` mit **Exit 0**
      endet, **ohne** die Report-Datei zu verändern, THEN wertet `run_skill()` den Versuch als
      Fehlversuch (kein `return 0`), gibt eine Meldung aus, die den stale Verdict als Grund
      benennt, und die Pipeline verlässt den Review-Loop **nicht** mit dem alten `APPROVED`.
- [ ] AK2 (Regression Erfolgs-Pfad): GIVEN dieselbe Ausgangslage, WHEN `/review` die Report-Datei
      im Aufruf mit gültigem Verdict schreibt und mit **Exit 0** endet, THEN gilt der Aufruf wie
      bisher als Erfolg und die Pipeline arbeitet mit diesem Verdict weiter.
- [ ] AK3 (gültiger Verdict verlangt): GIVEN `/security-review` schreibt im Aufruf eine
      Report-Datei **ohne** eindeutigen Verdict unter dem Anker `## Ergebnis` (Anker fehlt oder
      die erste nicht-leere Zeile ist mehrdeutig), WHEN es mit **Exit 0** endet, THEN
      Fehlversuch – das Security-Gate wird nicht mit leerem Verdict passiert.
- [ ] AK4 (`security-review` stale): GIVEN `tasks/security-<id>.md` enthält `PASSED` aus einem
      früheren Aufruf, WHEN `/security-review` mit **Exit 0** endet, ohne die Datei zu verändern,
      THEN Fehlversuch – der alte Verdict wird nicht als Ergebnis dieses Laufs gewertet.
- [ ] AK5 (Interrupt hat Vorrang): GIVEN der Versuch hat einen Interrupt signalisiert, WHEN er
      mit **Exit 0** endet und **zugleich** keinen frischen, gültigen Report hinterlässt, THEN
      stoppt die Pipeline sofort über `interrupt-check.sh` – kein Retry, kein stiller
      Fehlversuch; die Interrupt-Prüfung läuft also **vor** der Frische-/Verdict-Prüfung.
- [ ] AK6 (Retry-Semantik): GIVEN alle drei Versuche eines Aufrufs enden mit **Exit 0** ohne
      frischen, gültigen Report, WHEN der dritte Versuch endet, THEN bricht die Pipeline über den
      bestehenden Pfad mit `exit 1` und der Meldung „failed after 3 attempts" ab – nicht über den
      Circuit Breaker (`exit 2`).
- [ ] AK7 (andere Skills unberührt): GIVEN ein nicht report-erzeugender Skill (`implement`,
      `test`, `refactor`, `codify`, `pr-shepherd`), WHEN er mit **Exit 0** endet, THEN gilt der
      Aufruf unverändert als Erfolg – unabhängig davon, ob Report-Dateien existieren, fehlen oder
      stale sind.
- [ ] AK8 (Gate-Polarität Phase 5): GIVEN das Security-Gate in Phase 5, WHEN der
      security-review-Verdict **nicht** eindeutig `PASSED` ist, THEN blockiert das Gate mit
      `exit 1` – statt wie bisher nur bei einem eindeutigen `NEEDS_FIXES` zu blockieren; ein
      eindeutiges `PASSED` passiert weiterhin.
- [ ] AK9 (eine Bedingung, ein Ort): GIVEN die Bedingung „Report im Aufruf verändert UND Verdict
      eindeutig" gilt nach dem Fix in beiden Rückkehrpfaden von `run_skill()`, WHEN sie
      ausgewertet wird, THEN steht sie genau **einmal** im Code (gemeinsame Hilfsfunktion, von
      beiden Zweigen aufgerufen) und nutzt weiterhin denselben `report_fingerprint_before`-
      Snapshot und dieselbe Lib – keine zweite Schreibweise, kein zweiter Snapshot, kein
      Report-Pfad in `run-pipeline.sh`.
- [ ] AK10 (Meldungen unterscheidbar): GIVEN die bestehenden #310-E2E-Assertions ankern an den
      Meldungstexten („Turn-Limit toleriert", „stammt aus einem früheren Aufruf"), WHEN ein
      report-erzeugender Skill mit **Exit 0** und frischem, gültigem Report endet, THEN bleibt
      seine Erfolgsmeldung von der Turn-Limit-Toleranz-Meldung unterscheidbar (letztere nur im
      non-zero-Fall) und alle bestehenden #310-Assertions bleiben grün.
- [ ] AK11 (E2E-Verhaltenstest + Mutationsbeleg): GIVEN die Bash-Suite
      `scripts/checks/tests/run-tests.sh`, WHEN sie läuft, THEN belegen E2E-Tests am **echten**
      Skript mit `claude`-Stub beide Richtungen – Exit 0 + stale Report → Fehlversuch/`exit 1`
      (AK1) und Exit 0 + frisch geschriebener Report → Pipeline läuft weiter (AK2) – aufgebaut
      auf dem vorhandenen #310-Harness (`scaffold_310`/`commit_310`/`run_310`) statt auf einem
      parallelen Zweitaufbau; ein Mutationsbeleg zeigt, dass die Tests bei entfernter
      Exit-0-Prüfung rot werden, wobei die Mutation den **echten** Guard-Ausdruck trifft und
      derselbe Assert-Ausdruck ausgeführt wird wie im Positiv-Test.
- [ ] AK12 (Gate-Polarität getestet): GIVEN das umgedrehte Gate aus AK8, WHEN ein
      security-Report mit eindeutigem `PASSED` bzw. mit `NEEDS_FIXES` vorliegt, THEN belegen
      Tests beide erreichbaren Richtungen behavioral (PASSED → Pipeline läuft weiter;
      NEEDS_FIXES → `exit 1` mit der Security-Meldung); die durch AK3 unerreichbar gewordene
      dritte Richtung (leerer Verdict am Gate) wird über einen Vergleichs-Anker samt
      Mutationsbeleg gepinnt, nicht behauptet.
- [ ] AK13 (Doku-Nachzug): GIVEN ADR-019 §4 formuliert die Guard-Bedingung heute ausdrücklich
      für den non-zero Exit und der Report-Guard-Absatz in
      `docs/factory/lessons/factory-workflow.md` beschreibt sie im Präsens ebenso, WHEN der Fix
      gemerged wird, THEN beschreiben beide Texte die **symmetrische** Bedingung (beide
      Rückkehrpfade), die verlangte Verdict-Gültigkeit und die neue Gate-Polarität in Phase 5;
      die Lesson-Regel „neue Guards dieser Art" ist um „auf **allen** Rückkehrpfaden, nicht nur
      im Fehlerpfad" geschärft.

## Fehlerszenarien

- [ ] Report-Datei fehlt vor **und** nach einem Exit-0-Aufruf → kein Verdict → Fehlversuch
      (**Verhaltensänderung**: bisher Erfolg, danach fail-open beim Konsumenten).
- [ ] Report im Aufruf verändert, Verdict-Anker fehlt oder ist mehrdeutig → `report_verdict`
      liefert leer → Fehlversuch (fail-closed, AK3).
- [ ] Report verändert, Verdict inhaltlich identisch zur Vorrunde (erneut `NEEDS_REWORK` mit
      neuem Text) → **frisch** → gilt, die Iteration zählt regulär.
- [ ] Report byte-identisch neu geschrieben → als stale gewertet → Retry. Bewusst in Kauf
      genommenes Restrisiko der nicht-destruktiven Variante (aus #310 übernommen): die
      Fehlrichtung ist fail-closed, nie ein falscher Erfolg.
- [ ] Fingerprint durchgehend nicht ermittelbar (`UNREADABLE`) → Vorher/Nachher gleich → stale →
      Fehlversuch, nie stiller Erfolg (unverändert aus #310).
- [ ] Interrupt signalisiert **und** kein frischer Report → harter Stopp gewinnt (AK5), damit der
      Blocker-Eintrag in der Task-Datei nicht durch zwei weitere Heavy-Versuche entfällt.
- [ ] `--dry-run`: `run_skill()` kehrt vor jedem `claude`-Aufruf zurück – die neue Prüfung darf
      dort **nicht** greifen, sonst bricht `--dry-run` ohne Report-Dateien sofort ab.
- [ ] Phase 5 mit eindeutigem `NEEDS_FIXES` → weiterhin `exit 1` mit derselben Meldung
      (Polaritätswechsel darf diesen Fall nicht verändern).

## Offene Fragen

_Keine – die vier Design-Forks (Ort der Prüfung, Strenge, Fehlerpfad, Gate-Polarität) sind am
2026-08-27 entschieden und oben unter „Scope" festgehalten._

## Technische Hinweise

- **Struktur:** Nach dem Fix sind die Erfolgsbedingungen beider Zweige identisch – Erfolg für
  `review`/`security-review` genau dann, wenn Fingerprint verändert **und** Verdict eindeutig;
  für alle anderen Skills genau dann, wenn `rc = 0`. Das erlaubt eine gemeinsame Hilfsfunktion
  (AK9). Die **Meldungen** bleiben `rc`-abhängig, damit die #310-Assertions weiter greifen
  (AK10): `rc = 0` → bestehende „abgeschlossen"-Meldung, `rc ≠ 0` + frisch → „Turn-Limit
  toleriert".
- **`set -euo pipefail`:** Der `claude`-Aufruf steht heute in einem `if`. Wird der Exit-Code für
  eine gemeinsame Auswertung gebraucht, muss er in einer `set -e`-sicheren Form eingesammelt
  werden (`if … then rc=0; else rc=$?; fi` o. Ä.) – ein nacktes `cmd; rc=$?` beendet die Shell.
- **`report_fingerprint_now`** ist im Exit-0-Zweig neu zu erheben (nach dem Aufruf), nicht vor
  dem `claude`-Aufruf; der Snapshot `report_fingerprint_before` bleibt einmal pro `run_skill()`-
  Aufruf oberhalb der Retry-Schleife (AK7 aus #310, dort positionell getestet).
- **Test-Harness:** `scaffold_310`, `commit_310`, `run_310`, `STALE_MSG_310`, `FRESH_MSG_310` und
  die `SKILL-<name>`-Marker-Stubs existieren bereits im #310-Block von `run-tests.sh` und sind
  wiederzuverwenden (Lesson `testing.md`: 5. Vorkommnis des Duplikat-Scaffold-Smells stammt aus
  genau diesem Harness). Differenz ergänzen, keinen parallelen Zweitaufbau anlegen. Die
  Fixture-Task-IDs `310`–`313` sind im vorhandenen Block belegt (der AK3-Test nutzt bereits
  `312` als Fixture-ID) – für die neuen Tests andere IDs wählen, damit Fixture- und
  Task-Nummer nicht verwechselt werden.
- **Mutationsbeleg:** Lösch-Anker und Wirksamkeits-Prüfung müssen dieselbe **volle** Zeile
  treffen (Lesson `factory-workflow.md`, 7. Rezidiv aus #310), und der Beleg muss denselben
  Assert-Ausdruck ausführen wie der Positiv-Test (Lesson `testing.md`, #286) – sonst belegt er
  nur Syntax, nicht Kausalität.
- **Portabilität:** nur POSIX-Regex / portables `awk`, macOS/BSD + GNU/Alpine
  (`clean-code.md` „Portabilität in Gate-Skripten").
