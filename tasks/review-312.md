# Review: Task 312

Reviewt wurde `git diff origin/main...HEAD` (7 Dateien, +839/−56) gegen
`docs/specs/spec-312-verdict-konsum-frische-pruefung.md` und
`tasks/task-312-verdict-konsum-frische-pruefung.md`.
Verifikation: volle Bash-Suite `scripts/checks/tests/run-tests.sh` → **1182 grün, 0 rot**
(mit `env -u PR_SHEPHERD -u FACTORY_STAGE`, Lesson #262/#264).

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)

- [ ] `scripts/lib/report-verdict.sh:22-26` – **Der Modul-Header der Lib beschreibt weiterhin die
      alte, einseitige Guard-Mechanik.** Der Block „EINE Quelle für zwei Nutzer" sagt wörtlich:
      „run_skill()-Report-Guard: ein **non-zero Exit** (inkl. „Reached max turns") gilt als
      ERFOLG, wenn report_verdict für dieses Skill etwas liefert UND sich der Report … verändert
      hat". Genau diese Formulierung hat der PR in ADR-019 §4 und in
      `docs/factory/lessons/factory-workflow.md` unter AK13 nachgezogen – die dritte, im Code
      liegende Kopie derselben Prosa wurde übersehen. Sie steht in der Datei, die jeder Nutzer der
      drei Funktionen zuerst liest, und sagt jetzt das Gegenteil des Verhaltens
      (`run-pipeline.sh:304-332` wertet beide Rückkehrpfade aus und verlangt zusätzlich einen
      eindeutigen Verdict). Lesson-Klasse #211/#176 („PR ändert die namentlich beschriebene
      Mechanik → Prosa im selben PR mitpflegen"); der Fix ist ein Satz.

- [ ] `docs/factory/OPERATING.md:214` (und §4.2, `:371`) – **Die kanonische Prozess-Doku nennt
      weiterhin die alte Gate-Polarität.** In der „Eigenschaften"-Liste von `run-pipeline.sh`
      steht „**Security-Gate:** `NEEDS_FIXES` → Abbruch vor Merge." Nach diesem PR bricht das Gate
      bei **allem außer einem eindeutigen `PASSED`** ab (`run-pipeline.sh:540-549`) und wird im
      `--dry-run` übersprungen. Die Zeile beschreibt damit ein fail-open-Verhalten, das es nicht
      mehr gibt – dieselbe Drift-Klasse wie das Finding darüber, nur in der Datei, die
      `CLAUDE.md` als kanonische Quelle des prozeduralen Ablaufs benennt. AK13 hat den Nachzug auf
      ADR + Lesson begrenzt; der Sweep war unvollständig. (`:371` „Ergebnis `NEEDS_FIXES` =
      **Stopp**" ist als menschliche Lesart weiter richtig, aber ebenfalls unvollständig – ein
      fehlender/unklarer Verdict stoppt jetzt genauso.)

## Nitpicks (optional)

- [ ] `scripts/run-pipeline.sh:305,309,317` – `report_verdict` wird pro Versuch bis zu **dreimal**
      aufgerufen (in `report_is_fresh_and_valid`, inline in der Turn-Limit-Erfolgsmeldung, erneut
      für `verdict`). #310 hatte den Wert einmal in eine lokale Variable gelesen. Drei
      `awk`-Subprozesse statt einem, und die Erfolgsmeldung wird durch die eingebettete
      Command Substitution zu einer sehr langen Zeile. Einmal vor dem Guard-Block in `verdict`
      lesen und überall verwenden wäre kürzer und läse sich besser – die Bedingung selbst bliebe
      an ihrem einen Ort (AK9 unberührt).

- [ ] `scripts/run-pipeline.sh:327` – Die Meldung „kein eindeutiger Verdict im Report dieses
      Aufrufs" feuert auch, wenn der Report **gar nicht existiert** (non-zero Exit, Skill kam nie
      zum Schreiben). Der Wortlaut unterstellt einen vorhandenen Report; „kein eindeutiger Verdict
      aus diesem Aufruf" o. Ä. deckt beide Lagen.

- [ ] `scripts/run-pipeline.sh:304` – `[ -n "$(report_file "$skill" "$task_id")" ]` wird als
      Prädikat „ist das ein report-erzeugendes Skill?" benutzt. Der Ausdruck liest sich beim ersten
      Blick wie eine Datei-**Existenz**-Prüfung (die er nicht ist – `report_file` druckt den Pfad
      unabhängig davon, ob die Datei da ist). Ein benanntes `is_report_skill()` in
      `scripts/lib/report-verdict.sh` würde die Absicht aussprechen, ohne AK9 („kein Report-Pfad in
      `run-pipeline.sh`") zu verletzen.

- [ ] `scripts/run-pipeline.sh:320-325` – Beim Umbau ist der #310-Satz entfallen, der begründet,
      warum der **verdictlose** Fall auf dem non-zero-Pfad bewusst *keinen* `stop_if_interrupted`
      hat („vorbestehender Zustand, kein Scope dieses Fixes", #310 Review-Runde-3-Nitpick). Genau
      dieser Fall hat jetzt einen eigenen sichtbaren `else`-Zweig – die Frage stellt sich beim
      Lesen also stärker als vorher, während die Antwort aus dem Code verschwunden ist.

- [ ] `scripts/checks/tests/run-tests.sh` – Für die neue Dry-Run-Ausnahme des Security-Gates
      (`[DRY-RUN] Security-Gate übersprungen`) gibt es keinen eigenen Anker. Das Verhalten ist
      transitiv abgesichert (der #212-F4-Dry-Run-Test bei `:1437-1447` erreicht „Pipeline
      erfolgreich abgeschlossen" und würde rot, wenn das fail-closed-Gate im Dry-Run bliebe) –
      eine direkte Assertion würde die Absicht benennen, statt sie zu implizieren.

## Positives

- **Der Fix trifft die Ursache statt des Symptoms.** Die Bedingung sitzt in `run_skill()`, nicht
  in den beiden Konsumenten – damit kann die Funktion per Konstruktion nicht mehr mit einem stale
  oder verdictlosen Report zurückkehren, und Phase 2/5 brauchen keine eigene Prüfstelle. Die
  `set -e`-sichere Exit-Code-Erfassung (`if … then rc=0; else rc=$?; fi`) ist korrekt umgesetzt,
  der Snapshot bleibt einer pro Aufruf, und die Meldungen bleiben `rc`-abhängig – die
  #310-Assertions greifen unverändert (AK9/AK10 auch strukturell getestet).
- **Die Mutationsbelege sind diesmal wirklich kausal.** Jede Mutation trifft die **volle** echte
  Guard-Zeile (`FRESH_CMP_PIPE`/`VERDICT_CHK_PIPE`/`IC_CALL_PIPE`), und der Beleg führt dieselben
  Assert-Ausdrücke aus wie der Positivtest (Lessons #114/#286). Der AK5-Mutant **ersetzt** den
  einzigen `if`-Rumpf durch `:` statt ihn zu löschen – sonst hätte er nur einen Syntaxfehler
  belegt – und eine Positions-Assertion beweist, dass er den Exit-0-Aufruf trifft und nicht einen
  der beiden anderen. Genau die Fallen, an denen frühere Tasks hängengeblieben sind.
- **Gemeinsame Zeilen-Anker statt zweier gleichlautender Literale.** `FRESH_CMP_PIPE` & Co. stehen
  einmal oberhalb des #310-Blocks und werden von #310 **und** #312 benutzt; der #310-Mutant wurde
  im selben Zug vom brüchigen `sed`-Muster auf denselben Anker umgestellt. Das ist die richtige
  Antwort auf das wiederkehrende Drift-Risiko, nicht Copy-Paste.
- **AK5 ist auf den Zielpfad isoliert** (bewusst der „kein Verdict"-Zweig, weil nur er keinen
  eigenen interrupt-check hat) – Lesson #214 sauber angewendet; AK2 hat mit den gegenteiligen
  Vorab-Verdicts eine echte divergenzerzeugende Ausgangslage (Lesson #253); AK4 belegt zusätzlich
  die Nicht-Destruktivität per `cksum`-Vergleich.
- **Der vorbestehende Task-78-E2E-Block wurde erkannt und richtig mitgezogen**, statt den neuen
  Guard abzuschwächen: sein `claude`-Stub schreibt die Reports jetzt im Aufruf und variiert sie
  über einen Aufrufzähler, und die Skill-Erkennung nutzt die `SKILL-<name>`-Marker (kein
  Teilstring-Konflikt zwischen `review` und `security-review`). Die Behauptung, dass die
  untrackten Hilfsdateien Preflight und `verify_final_state` nicht stören, stimmt – beide werten
  nur `git diff`/`--cached` (`run-pipeline.sh:176`, `verify-final-state.sh:90`).
- **Doku-Nachzug über AK13 hinaus**: die Index-Zeile in `docs/factory/PROJECT-CONTEXT.md` nannte
  „#310" als Endstand und wurde ungefragt nachgezogen (#176/#211) – die zwei oben gemeldeten
  Fundstellen sind der Rest desselben Sweeps, nicht ein anderes Versäumnis.
- **`--dry-run` mitgedacht**: das umgedrehte Gate hätte jeden Dry-Run ab Phase 5 blockiert; die
  Ausnahme ist begründet und spiegelt die bereits bestehende Ausnahme der
  Endzustands-Verifikation (ADR-040), statt das Gate abzuschwächen.
- Keine Routen/UI berührt → `docs/routes.md` zu Recht unverändert; PR-Body enthält `Closes #312`.

## Empfehlung

NEEDS_REWORK

Beide wichtigen Findings sind reine Prosa-Nachzüge derselben Drift-Klasse, die AK13 bereits
adressiert – zusammen ca. drei Zeilen. Der Code selbst, die Testabdeckung und die Mutationsbelege
sind aus meiner Sicht merge-reif; nach dem Doku-Sweep ist der PR APPROVED-fähig.
