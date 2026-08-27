# Review: Task 312

Grundlage: `git diff origin/main...HEAD` (10 Dateien, +1073/−64),
`docs/specs/spec-312-verdict-konsum-frische-pruefung.md`,
`tasks/task-312-verdict-konsum-frische-pruefung.md`, ADR-019 §4.

**Runde 2** – Anlass ist der Rework-Commit `b2e211b` (zwei wichtige Findings + fünf Nitpicks aus
Runde 1). Er enthält Code-Änderungen (`run-pipeline.sh`, `report-verdict.sh`: neues Prädikat
`is_report_skill`, einmaliges Verdict-Lesen, neuer Dry-Run-Anker) und war damit von keiner
Review-Runde geprüft. Verlauf der Runde 1 steht unten unter „Historie".

Gate-Nachlauf in dieser Session: `env -u PR_SHEPHERD -u FACTORY_STAGE bash
scripts/checks/tests/run-tests.sh` → **1193 grün, 0 rot** (111 s, Lesson #262/#264),
`git status` sauber, PR #313 trägt `Closes #312`.

> **Circuit Breaker:** Dies ist die zweite Review-Anwendung von drei. Kein Abbruch-Fall –
> Runde 1 endete mit `NEEDS_REWORK`, alle sieben Findings sind umgesetzt, und der eine offene
> Punkt unten ist ein neuer Fund am nachgezogenen Stand, keine ungelöste Kontroverse.

## Kritische Findings (müssen behoben werden)

_Keine._ Der Guard selbst ist korrekt und vollständig:

- **Symmetrie hält per Konstruktion.** `run-pipeline.sh:279-341`: der Exit-Code wird
  `set -e`-sicher eingesammelt (`if … then rc=0; else rc=$?; fi`), beide Rückkehrpfade laufen
  durch **denselben** `report_is_fresh_and_valid`-Aufruf mit **demselben** Snapshot
  (`report_fingerprint_before`, weiterhin genau einmal oberhalb der Retry-Schleife). Es gibt
  keinen Pfad mehr, auf dem `run_skill()` mit `return 0` zurückkehrt, ohne den Fingerprint
  angesehen zu haben – `:318` ist der einzige `return 0` für report-erzeugende Skills und liegt
  hinter der Bedingung.
- **Reihenfolge Interrupt → Frische ist richtig herum** (`:295-297` vor `:310`): AK5 verlangt
  Vorrang des harten Stopps, und die zweite `stop_if_interrupted`-Stelle im Stale-Zweig (`:328`)
  ist auf dem Exit-0-Pfad damit nachweislich unerreichbar (der erste Aufruf hätte schon
  `exit`iert) – kein Doppel-Blocker-Eintrag in der Task-Datei.
- **Gate-Polarität fail-closed und ohne Loch** (`:549-558`): `run_skill()` garantiert einen
  frischen, eindeutigen Verdict, das Gate blockiert zusätzlich alles außer `PASSED`; die
  Dry-Run-Ausnahme ist die einzige Abschwächung und spiegelt die bereits bestehende Ausnahme
  der Endzustands-Verifikation (ADR-040).
- **AK7 ist jetzt explizit statt implizit:** vor dem Fix trug die leere `report_verdict`-Ausgabe
  die Unterscheidung, jetzt trennt `is_report_skill` die beiden Welten sichtbar – und die
  ADR-Zusage „für alle anderen Skills entscheidet allein der Exit-Code" ist am Code ablesbar.

## Wichtige Findings (sollten behoben werden)

- [ ] `scripts/checks/tests/run-tests.sh:6255-6272, 6337-6371` – **AK12 verlangt beide
      erreichbaren Gate-Richtungen behavioral, belegt ist nur `PASSED`.** Der Wortlaut ist
      eindeutig: „belegen Tests beide erreichbaren Richtungen behavioral (PASSED → Pipeline läuft
      weiter; **NEEDS_FIXES → `exit 1` mit der Security-Meldung**)"; die Spec führt denselben Fall
      zusätzlich als Fehlerszenario („Polaritätswechsel darf diesen Fall nicht verändern").
      Vorhanden sind:
      (a) `PASSED` → „Phase 6" erreicht + `assert_absent $SEC_GATE_MSG_312` (TMP_B312, `:6356-6366`),
      (b) leerer Verdict → `exit 1` + Meldung, aber **auf dem mutierten Skript** (TMP_MC312,
      `:6400-6420`), und
      (c) ein Grep-Anker auf `[ "$SECURITY_VERDICT" != "PASSED" ]` samt Mutationsbeleg (`:6262-6272`).
      Ein Lauf, in dem `security-review` einen **frischen, eindeutigen `NEEDS_FIXES`** schreibt
      und das **unmutierte** Gate mit `exit 1` + `$SEC_GATE_MSG_312` blockiert, existiert nicht –
      `grep -n 'Kritische Security-Findings'` findet in der ganzen Suite nur die
      `SEC_GATE_MSG_312`-Definition und die zwei Stellen aus (a)/(b). Die Richtung **funktioniert**
      (`!= "PASSED"` deckt sie ab, gelesen an `:553`); es fehlt die Abdeckung, nicht das
      Verhalten. Genau das macht den Fund wichtig statt kritisch – aber AK12 ist in der
      Task-Datei als erledigt abgehakt, und das ist die AK-Ehrlichkeit, die ein Review halten
      muss. Fix: ein weiteres Fixture auf demselben Harness (`scaffold_310` + Stub schreibt
      `## Ergebnis\nNEEDS_FIXES` im Aufruf, review-Report frisch `APPROVED`) mit
      `assert_exit 1`, `assert_contains_286 … "$SEC_GATE_MSG_312"`, `assert_contains_286 …
      "Security Review: NEEDS_FIXES"` und `assert_absent … "Phase 6"` – ca. 20 Zeilen, keine
      Retry-Wartezeit (alle Skills enden erfolgreich, `bin/sleep` ist ohnehin gestubbt).

## Nitpicks (optional)

- [ ] `.claude/commands/pipeline.md:38-41` – die dritte Doku-Stelle, die das Security-Gate
      namentlich beschreibt („Ergebnis: PASSED oder NEEDS_FIXES / NEEDS_FIXES: zurück zu
      Phase 1"), ist nach dem Polaritätswechsel ebenfalls falsch. **Bewusst kein blockierendes
      Finding:** die Zeile war schon vor #312 falsch (das Skript springt nicht zurück, es
      `exit 1`t), die Datei driftet in fast jeder Zeile (Phasen 4/5 vertauscht, Circuit Breaker
      mit 3 statt 2 Iterationen, versprochener `WIP:`-Commit, fehlende Phase 7), und sie liegt
      unter `.claude/**` (Patch-Workflow, #91). Umfang deutlich über „unter zehn Zeilen" →
      als eigener Task angelegt: **Issue #316** (`documentation`, `tech-debt`).

- [ ] `docs/adr/019-stage3-commit-seam-report-guard.md:59-64, 95-101, 253-262` – die symmetrische
      Bedingung steht nun **dreimal** in derselben Datei: im §4-Körper, als Absatz „Symmetrie
      beider Rückkehrpfade (Nachtrag #312)" im #310-Nachtrag und als Punkt 1 des #312-Nachtrags.
      Inhaltlich deckungsgleich, aber drei Kopien sind drei Drift-Stellen beim nächsten Fix an
      dieser Mechanik – genau die Klasse, die Runde 1 in zwei anderen Dateien gemeldet hat. Der
      Absatz im #310-Nachtrag könnte auf einen Ein-Satz-Verweis („in #312 auf beide
      Rückkehrpfade ausgeweitet, siehe Nachtrag unten") eindampfen.

- [ ] `scripts/checks/tests/run-tests.sh:6250-6252` – der Abwesenheits-Guard
      `! grep -q "Verdict '\$(report_verdict" "$PIPELINE"` koppelt **Meldungstext** und
      **Code-Konstrukt** in einem Fragment. Wird die Meldung umformuliert (ohne das Präfix
      `Verdict '`), aber der Verdict erneut inline per Command Substitution gelesen, bleibt der
      Guard grün, obwohl genau das Verhalten zurück ist, das er verbieten soll – die
      Fragment-Falle aus Lesson `factory-workflow.md` (#114), diesmal in der
      Abwesenheits-Richtung. Ein Anker auf die volle Zeile oder eine Zählung der
      `report_verdict`-Aufrufe in `run_skill()` wäre robuster. (Nur Nitpick: die Aussage ist eine
      Stil-Regel aus Runde 1, kein Guard über korrektes Verhalten.)

- [ ] `scripts/run-pipeline.sh:237-352` – `run_skill()` ist mit dem Fix auf 116 Zeilen und vier
      Verschachtelungsebenen gewachsen (`for` → `if is_report_skill` → `if fresh` → `if rc`).
      Die Guideline nennt ~20 Zeilen als Orientierung; die Funktion war vorher schon lang, aber
      die neue Ebene macht den Kern (Aufruf, Bewertung, Retry) schwerer als nötig lesbar. Kein
      Verhaltensproblem – Kandidat für den `/refactor`-Schritt (z. B. ein
      `evaluate_report_attempt`-Helfer, der Meldung + Rückgabewert kapselt), nicht für diesen
      Rework.

- [ ] `docs/factory/OPERATING.md:373-377` – der eingefügte Satz („Es ist fail-closed: weiter geht
      es nur mit einem eindeutigen `PASSED` …") steht **vor** dem älteren „Ergebnis `NEEDS_FIXES`
      = **Stopp**:", das damit als Spezialfall hinter der allgemeineren Regel nachklappt. Inhalt
      korrekt, Leserichtung leicht verdreht – ein Umstellen läse sich flüssiger.

## Positives

- **Alle sieben Findings aus Runde 1 sind umgesetzt, keines nur behauptet.** Nachgeprüft:
  Lib-Modul-Header beschreibt die symmetrische Bedingung („auf BEIDEN Rückkehrpfaden",
  `report-verdict.sh:22-32`), OPERATING.md nennt an beiden Stellen die neue Polarität, der
  Verdict wird einmal pro Versuch gelesen, die Meldung heißt „kein eindeutiger Verdict **aus
  diesem Aufruf**" (deckt „Report existiert gar nicht" mit ab), der #310-WHY-Satz zum
  verdictlosen Zweig ist zurück, und der Dry-Run-Anker existiert direkt statt transitiv. Jedes
  dieser sechs Prosa-/Struktur-Versprechen ist zusätzlich durch eine Assertion gepinnt – der
  Rework hat sich nicht auf „steht jetzt da" verlassen.
- **`is_report_skill` ist die richtige Antwort auf N3, nicht die bequeme.** Das Prädikat liegt in
  der Lib (Zuordnung bleibt an einem Ort, AK9 wird strenger erfüllt), es wird in **beide**
  Richtungen getestet (`:5740-5749`), und die Gegenrichtung ist als
  Diskriminierungs-Assertion ausgewiesen (Lesson #172). Der zähl-nennende Modul-Header ist von
  „DREI" auf „VIER Funktionen" mitgepflegt und **das** ist ebenfalls assertiert (Lesson
  `code-style.md`) – genau der Nachzug, der in #207 vergessen wurde.
- **Die Mutationsbelege sind kausal, nicht dekorativ.** Jede Mutation trifft die **volle** echte
  Zeile über die gemeinsamen Anker `FRESH_CMP_PIPE`/`VERDICT_CHK_PIPE`/`GUARD_CALL_PIPE`/
  `IC_CALL_PIPE`, und jeder Beleg führt **dieselben** Assert-Ausdrücke aus wie der Positivtest
  (Lessons #114/#286). Der AK5-Mutant **ersetzt** den einzigen `if`-Rumpf durch `:` statt ihn zu
  löschen (sonst Syntaxfehler = Beleg nur für Parsing), und eine **Positions**-Assertion beweist,
  dass er den Exit-0-Aufruf trifft und nicht einen der beiden anderen. Der #310-Mutant wurde im
  selben Zug vom brüchigen `sed`-Muster auf denselben Anker umgestellt – eine echte
  Konsolidierung statt einer zweiten Kopie.
- **AK5 ist auf den Zielpfad isoliert** (bewusst der „kein Verdict"-Zweig, weil nur er keinen
  eigenen interrupt-check hat – Lesson #214), **AK2 hat eine divergenzerzeugende Ausgangslage**
  (vorbestehende Reports mit dem *gegenteiligen* Verdict, Lesson #253), **AK4 belegt zusätzlich
  die Nicht-Destruktivität** per `cksum`-Vergleich, und der AK1-Stub bedient `security-review`
  mit, damit der Mutant nicht an einer zweiten Ursache scheitert.
- **Der vorbestehende Task-78-E2E-Block wurde mitgezogen statt der Guard abgeschwächt:** sein
  Stub schreibt die Reports jetzt **im** Aufruf und variiert sie über einen Aufrufzähler, die
  Skill-Erkennung nutzt die `SKILL-<name>`-Marker (kein Teilstring-Konflikt `review` ↔
  `security-review`). Nachgeprüft: `bin/sleep` ist im Harness gestubbt, die drei neuen
  Fehlversuch-Fixtures kosten deshalb keine 30 s Backoff – die Suite bleibt bei 111 s.
- **`--dry-run` mitgedacht und begründet:** das umgedrehte Gate hätte jeden Dry-Run ab Phase 5
  blockiert; die Ausnahme spiegelt ADR-040 statt das Gate zu verwässern, und der Anker dafür
  ist seit dem Rework direkt (nicht mehr transitiv über den #212-F4-Erfolgs-Check).
- **Doku-Nachzug über AK13 hinaus:** die Index-Zeile in `docs/factory/PROJECT-CONTEXT.md` nannte
  „#310" als Endstand und wurde ungefragt nachgezogen (#176/#211). Der Sweep ist nach Runde 1
  vollständig – die einzige verbleibende Fundstelle liegt unter `.claude/**` und ist als #316
  ausgelagert.
- Keine Routen/UI berührt → `docs/routes.md` zu Recht unverändert; keine `.claude/**`-Datei im
  Diff (kein Patch-Workflow nötig); kein neuer Interrupt-Typ → OPERATING.md-Interrupt-Tabelle
  zu Recht unberührt.

## Empfehlung

NEEDS_REWORK

Der Code ist aus meiner Sicht merge-reif – der Guard ist symmetrisch, das Gate fail-closed, die
Belege kausal. Offen ist genau eine Testlücke: die von AK12 wörtlich verlangte
`NEEDS_FIXES`-Richtung am **unmutierten** Gate. Rund 20 Zeilen auf dem vorhandenen Harness;
danach APPROVED-fähig. Die fünf Nitpicks sind optional, zwei davon bewusst nach `/refactor`
(Funktionslänge) bzw. in Issue #316 (`.claude/**`-Doku) ausgelagert.

---

## Historie

### Runde 1 – `NEEDS_REWORK`, alle Findings umgesetzt (Commit `b2e211b`)

Reviewt wurde `git diff origin/main...HEAD` (7 Dateien, +839/−56); Suite damals 1182 grün / 0 rot.
Keine kritischen Findings, zwei wichtige, fünf Nitpicks – in dieser Runde 2 alle als erledigt
nachgeprüft:

- **W1** `scripts/lib/report-verdict.sh:22-26` – Modul-Header beschrieb weiterhin die alte,
  einseitige Guard-Mechanik („ein non-zero Exit gilt als ERFOLG, wenn …"); dritte Kopie derselben
  Prosa, die AK13 in ADR-019 §4 und der Lesson schon nachgezogen hatte. → umgeschrieben +
  assertiert.
- **W2** `docs/factory/OPERATING.md:214` und §4.2 – kanonische Prozess-Doku nannte die alte
  Gate-Polarität („`NEEDS_FIXES` → Abbruch vor Merge"). → beide Stellen nachgezogen + assertiert.
- **N1** `report_verdict` wurde bis zu dreimal pro Versuch aufgerufen. → einmal in `verdict`
  gelesen, Bedingung bleibt an ihrem einen Ort (AK9 unberührt).
- **N2** Meldung „kein eindeutiger Verdict **im Report** dieses Aufrufs" unterstellte einen
  vorhandenen Report. → „aus diesem Aufruf".
- **N3** `[ -n "$(report_file …)" ]` als Skill-Prädikat las sich wie eine Datei-Existenz-Prüfung.
  → benanntes `is_report_skill()` in der Lib, Modul-Header „DREI" → „VIER Funktionen".
- **N4** Der #310-WHY-Satz zum bewusst fehlenden `stop_if_interrupted` im verdictlosen Zweig war
  beim Umbau verloren gegangen. → zurück.
- **N5** Kein direkter Anker für die Dry-Run-Ausnahme des Security-Gates (nur transitiv).
  → direkte Assertion.
