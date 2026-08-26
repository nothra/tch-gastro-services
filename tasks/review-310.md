# Review: Task 310

Grundlage: `git diff origin/main...HEAD` (10 Dateien, +983/−36),
`docs/specs/spec-310-report-guard-frische-pruefung.md`,
`tasks/task-310-report-guard-stale-verdict-within-run.md`, ADR-019 §4.

**Runde 2** (nach dem Rework aus Runde 1 – Verlauf und Rework-Notizen der ersten Runde stehen
unten unter „Historie Runde 1"). Gate-Nachlauf in dieser Session:
`bash scripts/checks/tests/run-tests.sh` → **1120 grün, 0 rot** (davon 58 grüne
#310-Assertions), `bash scripts/checks/pre-commit.sh` grün (inkl. Lint), `git status` sauber.

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)

_Keine._ Die drei wichtigen Findings aus Runde 1 sind belegbar behoben:

- **W1** – `report-verdict.sh:75` lautet jetzt `cksum 2>/dev/null < "$file"`, mit WHY-Kommentar
  zur Links-nach-rechts-Auswertung. Zusätzlich behavioral gepinnt (stderr leer) **plus**
  Mutant mit getauschter Reihenfolge, der den Leak reproduziert.
- **W2** – der `UNREADABLE`-Zweig ist über zwei unabhängige Zugänge getestet (fehlendes
  Werkzeug via `PATH=/nonexistent-dir`, unlesbare Datei via `chmod 000` mit Root-Skip) und
  trägt die Verhaltensaussage „fortbestehender Lesefehler = identischer Fingerprint = stale"
  sowie die Nicht-Kollision mit einer echten Prüfsumme.
- **W3** – `scaffold_310()` setzt auf `_mk_pipe_repo` auf und ergänzt nur die Differenz; die
  Abhängigkeit zum `HAS_YQ`-Zweig ist im Kommentar benannt und stimmt (Definition bei 3675,
  alle Aufrufe im Zweig ab 5898).

Eigene Nachprüfung dieser Runde, ohne neuen Befund:

- Die Guard-Bedingung selbst ist über alle Zustandsübergänge sauber: `ABSENT` → Prüfsumme
  zählt als Veränderung, leere Datei liefert eine echte Prüfsumme (kein `UNREADABLE`-Fehlalarm),
  die Marker kollidieren nicht mit `cksum`-Ausgaben, und für nicht report-erzeugende Skills ist
  `verdict` ohnehin leer – die zweite Bedingung ist dort folgenlos.
- `report_fingerprint_before` liegt vor der Retry-Schleife **und** hinter dem `--dry-run`-Return;
  ein Dry-Run erhebt also gar keinen Fingerprint (Spec-Fehlerszenario „`--dry-run`").
- Die `Datei:Zeile`-Anker des in Runde 1 angelegten `kleinfunde.md`-Eintrags sind nach dem
  Rework-Commit noch exakt (`run-tests.sh:241`, `:1379`, `:3681`, `:3966`, `:4012` – alle
  nachgeprüft). Der Drift-Check aus dem #291-Learning greift hier also ins Leere: kein Defekt.
- Das in Runde 1 als Out-of-Scope ausgelagerte Issue **#312** (Verdict-Konsum in Phase 2/5 prüft
  die Frische nicht, wenn `claude` mit Exit 0 endet) besteht unverändert – die AK5-E2E-Fixture
  nutzt genau diesen Pfad, um überhaupt bis Phase 5 zu kommen. Das ist korrekt so: Spec-AK1
  begrenzt #310 explizit auf den **non-zero**-Exit.

## Nitpicks (optional)

- [ ] `docs/adr/019-stage3-commit-seam-report-guard.md:165-166` – die „Betroffene
      Artefakte"-Liste wird in diesem PR als **Ist-Stand** gepflegt (`:159` bekam „inkl.
      Frische-Fingerprint pro Aufruf (#310)", `:161` ist neu für die Lib). Der Eintrag zu
      `run-tests.sh` beschreibt den Guard aber weiter als „(Verdict da → Erfolg; ohne →
      Fehlschlag)" – seit diesem PR ist „Verdict da" allein nicht mehr hinreichend, und genau
      diese Tests hat der PR erweitert. Entweder das Klammer-Kürzel um „und frisch" ergänzen
      oder die Liste bewusst als historische #91-Liste lesen – dann wäre allerdings `:159`
      die Ausnahme. Gleiche Klasse wie der §4-Einleitungssatz aus Runde 1 (Aussage stimmt auf
      Lesetiefe „Sektion", nicht auf Lesetiefe „Stichzeile").
- [ ] `scripts/run-pipeline.sh:283-285` – im neuen Stale-Zweig läuft **kein**
      `interrupt-check.sh`. Vor #310 wäre ein Aufruf, der einen Interrupt signalisiert **und**
      danach non-zero endet, bei vorhandenem Verdict über den Erfolgs-Zweig sofort gestoppt
      worden; jetzt folgen zwei weitere Heavy-Versuche desselben Skills, und der Blocker-Eintrag
      in der Task-Datei (den `interrupt-check.sh` schreibt) entfällt. Ausdrücklich **kein**
      Merge-Blocker: das Verhalten ist spec-konform („stale Verdict = regulärer Fehlversuch im
      bestehenden Retry-Pfad"), für den viel häufigeren Fall „gar kein Verdict" galt es schon
      vorher, und die Label-Vergabe bleibt korrekt, weil `factory-poll.sh:180` am **Sentinel**
      hängt, nicht am Exit-Code. Wer es dennoch schließen will: eine Zeile
      `bash "$FACTORY_DIR/scripts/checks/interrupt-check.sh" "$task_id" || exit $?` im
      Stale-Zweig – das bleibt ein Fehlversuch und stoppt trotzdem hart bei signalisiertem
      Interrupt.
- [ ] `scripts/checks/tests/run-tests.sh:5867` – `scaffold_310()` kopiert
      `raise-interrupt.sh` ins Wegwerf-Repo, obwohl kein #310-Stub einen Interrupt auslöst;
      nur `interrupt-check.sh` wird von `run_skill()` wirklich aufgerufen. Eine Zeile
      totes Scaffolding.
- [ ] `scripts/checks/tests/run-tests.sh:5799` –
      `assert_true "$(! [ -z "$(fp310_stderr …)" ]; echo $?)"` prüft doppelt verneint, was
      `[ -n … ]` direkt sagt. Die Gegenprobe bei `:5787` nutzt korrekt `[ -z … ]` – die
      Mutations-Assertion wäre als `[ -n … ]` symmetrisch lesbar.
- [ ] `tasks/task-310-…​.md` (Umsetzungs-Notizen, „Gates") – die Notiz nennt „56
      #310-Assertions – 48 aus der ersten Runde, 8 aus dem Review-Rework"; der Lauf in dieser
      Session zählt **58** grüne #310-Zeilen. Reine Zahlendrift in der Notiz, kein Testproblem.

## Positives

- **Der Rework hat die Findings nicht nur abgehakt, sondern kausal belegt.** W1 war ein reines
  Log-Hygiene-Finding – trotzdem gibt es dazu jetzt einen Mutanten, der den Leak reproduziert,
  statt nur die neue Zeichenfolge zu greppen. Das ist genau die Korrektur aus dem
  #286-Learning („Mutationsbeleg muss denselben Assert-Ausdruck ausführen"), angewandt auf
  einen Fund, bei dem man sich den Aufwand leicht gespart hätte.
- **Der `UNREADABLE`-Test hat zwei unabhängige Zugänge statt eines fragilen.** Der
  `PATH=/nonexistent-dir`-Weg läuft überall (auch als root, auch in CI), der `chmod 000`-Weg
  deckt zusätzlich die echte Rechte-Situation ab und meldet seinen Skip explizit, statt still
  durchzurutschen. Dass beide Zugänge dieselbe Aussage („zweimal derselbe Fingerprint = stale")
  tragen, macht den Zweig erst wertvoll – ein reiner `= "UNREADABLE"`-Check hätte den
  fail-closed-Sinn nicht belegt.
- **W3 ist die richtige Auflösung des wiederkehrenden Duplikat-Smells.** `scaffold_310` delegiert
  an `_mk_pipe_repo` und ergänzt nur die Differenz; die #212-Inline-Blöcke bleiben als
  Fremd-Code unberührt, und die dabei entdeckte `DEFAULTS`/`DEFAULTS_YML`-Doppelung landet mit
  verifizierten Zeilenankern und Aufwandsschätzung in `kleinfunde.md` statt als sechstes
  Factory-Issue – exakt die Schwelle aus ADR-043.
- **Die AK9-Guards decken jetzt beide Seiten ab.** Zwei Präsenz-Guards auf die echten
  `report_file`-Aufrufzeilen in `pipeline_summary()` **plus** ein ERE-Negativ-Guard, der auch
  `$task_id`/`${TASK_ID}` erfasst. Der projektweite Gegen-Grep bestätigt: in
  `run-pipeline.sh` steht kein Report-Pfad mehr selbstgebaut (nur noch `task-`, `codify-` und
  `INTERRUPT-`, die nicht zur Lib gehören).
- **Der Fix trifft weiterhin die Ursache und nicht das Symptom** – kein Eingriff in
  `circuit_breaker_check()`, `MAX_REVIEW_ITERATIONS` oder das Turn-Budget; der Snapshot sitzt
  einmal pro `run_skill`-Aufruf oberhalb der Retry-Schleife und hinter dem `--dry-run`-Return.
  Positionell per Zeilennummern-Vergleich **plus** `awk`-Mutant gepinnt, behavioral über AK1/AK2.
- **Der Doku-Nachzug ist vollständig und im Tempus ehrlich:** ADR-019 §4 mit Nachtrag, die
  Lesson von Präsens auf Vergangenheit plus „In #310 umgesetzt", die aufgelöste
  Übergangsanweisung (mit Absenz-Guard), der PROJECT-CONTEXT-Index und die #264-Querverweiszeile.
  Ein Repo-weiter Grep über `Report-Guard`/`report_verdict` findet außerhalb historischer
  Task-/Spec-Dateien keine weitere Stelle, die die alte Mechanik im Präsens beschreibt.
- Keine Routen-Änderung (`app/**` unberührt) → `docs/routes.md` korrekt nicht angefasst; kein
  ADR-Trigger, mit Begründung gegen alle vier Kategorien in der Task-Notiz; PR-Body enthält
  `Closes #310`.

## Historie Runde 1

Runde 1 endete mit `NEEDS_REWORK`: keine kritischen Findings, drei wichtige (W1
Redirection-Reihenfolge, W2 ungetesteter `UNREADABLE`-Zweig, W3 paralleles Scaffolding) und
vier Nitpicks (ADR-019 §4-Einleitungssatz, einseitige AK9-Guards, Subshell in
`report_verdict`, ungetrackte `.issue-body-310.tmp.md`). Alle drei wichtigen Findings und drei
der vier Nitpicks sind im Rework-Commit `aac62bc` umgesetzt; die Subshell wurde bewusst nicht
angefasst (Begründung in den Rework-Notizen der Task-Datei). Out-of-Scope-Fund der Runde 1:
Issue **#312**.

## Empfehlung
APPROVED
