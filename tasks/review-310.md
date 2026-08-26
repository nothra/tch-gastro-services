# Review: Task 310

Grundlage: `git diff origin/main...HEAD` (8 Dateien, +719/−34),
`docs/specs/spec-310-report-guard-frische-pruefung.md`,
`tasks/task-310-report-guard-stale-verdict-within-run.md`, ADR-019 §4.
Gate-Nachlauf in dieser Session: `bash scripts/checks/tests/run-tests.sh` → **1112 grün, 0 rot**
(alle 48 #310-Assertions inklusive der Mutationsbelege).

## Kritische Findings (müssen behoben werden)

_Keine._ Die Frische-Prüfung ist in beiden Richtungen am echten Skript belegt (stale → exit 1 im
Retry-Pfad, frisch → toleriert), der Mutationsbeleg reproduziert die Task-308-Symptomatik
(exit 2 über den Circuit Breaker), und `run_skill()` erhebt den Fingerprint korrekt einmal pro
Aufruf oberhalb der Retry-Schleife. AK1–AK12 sind erfüllt.

## Wichtige Findings (sollten behoben werden)

- [x] `scripts/lib/report-verdict.sh:70` – `cksum < "$file" 2>/dev/null` unterdrückt den
      Lesefehler **nicht**: Bash führt die Redirections von links nach rechts aus, `< "$file"`
      scheitert also, **bevor** `2>/dev/null` gilt. Empirisch in dieser Session belegt – bei
      `chmod 000` auf die Report-Datei erscheint
      `report-verdict.sh: line 70: …/review-9.md: Permission denied` im Pipeline-Log, obwohl der
      Code die Meldung offensichtlich schlucken will. Das Ergebnis bleibt korrekt (`UNREADABLE`,
      fail-closed) – es ist reine Log-Verschmutzung an einer Stelle, die ohnehin nur im
      Fehlerfall greift. Fix: Reihenfolge tauschen (`cksum 2>/dev/null < "$file"`).
- [x] `scripts/lib/report-verdict.sh:71` – der `UNREADABLE`-Zweig ist **ungetestet**. Er ist ein
      in der Spec ausdrücklich gelisteter Fehlerszenario-Pfad („Fingerprint nicht ermittelbar →
      fail-closed") und der einzige neue Zweig der Lib ohne Assertion; `ABSENT`,
      `NO_REPORT_SKILL` und der Prüfsummen-Pfad sind alle abgedeckt.
      `testing-standards.md` verlangt für neuen Code 100 % und für Guard-Zweige einen eigenen
      Testfall. Deterministisch erreichbar ohne `chmod`-Abhängigkeit (in dieser Session
      verifiziert): `PATH=/nonexistent-dir report_fingerprint review <id> "$dir/tasks"` →
      `UNREADABLE`. Sinnvoll dazu die Verhaltensaussage, die den Zweig erst wertvoll macht:
      zweimal `UNREADABLE` = identischer Fingerprint = stale = Fehlversuch.
- [x] `scripts/checks/tests/run-tests.sh:5800` – `scaffold_310()` reimplementiert den Rumpf
      bereits vorhandener Scaffoldings statt sie aufzurufen: `_mk_pipe_repo()` (Zeile 3675) und
      die dazu passenden Inline-Blöcke der #212-E2E-Tests (Zeilen 3959–3967 bzw. 4005–4013)
      legen dasselbe Wegwerf-Repo an – `mkdir scripts/checks|scripts/lib|tasks|docs/factory`,
      `cp "$PIPELINE"`, `cp config-validation-check.sh` (+ `interrupt-check.sh`,
      `raise-interrupt.sh`), dieselben drei `scripts/lib/*.sh`, `cp factory.defaults.yml`,
      `echo "# ctx" > PROJECT-CONTEXT.md`. Von neun Zeilen sind sieben deckungsgleich; genuin
      neu sind nur die `SKILL-<name>`-Marker-Mocks und der `sleep`-Stub. Gleiches Muster bei
      `commit_310()` (5821, git-init-mit-Identität) und `run_310()` (5830, der
      `cd … PATH=… FACTORY_*_COMMAND=true env -u … bash run-pipeline.sh`-Aufruf aus 3984–3987 /
      4032–4035). Das ist das fünfte protokollierte Vorkommnis desselben Smells
      (`lessons/testing.md`, #240 → #267: „gegen bereits vorhandene Schleife/Helfer mit
      identischem Rumpf abgleichen, bevor eine parallele Variante angelegt wird") – dass der
      neue Code diesmal überhaupt Helfer extrahiert, ist ein Fortschritt, nur eben ein
      **paralleler** Helfer statt einer Erweiterung des bestehenden. Vorschlag im Scope:
      `scaffold_310` auf `_mk_pipe_repo "$dir"` aufsetzen und nur die Differenz ergänzen
      (`$DEFAULTS` und `$DEFAULTS_YML` zeigen auf dieselbe Datei, die Delegation ist also
      wertneutral); `_mk_pipe_repo` ist am Aufrufort definiert, weil beide Blöcke im selben
      `if [ "$HAS_YQ" = 1 ]`-Zweig liegen.

## Nitpicks (optional)

- [x] `docs/adr/019-stage3-commit-seam-report-guard.md:59` – der Einleitungssatz von §4 sagt
      weiter „gilt als **Erfolg**, wenn der zugehörige Report **bereits** mit gültigem Verdict
      geschrieben wurde"; die Einschränkung „in diesem Aufruf" kommt erst 14 Zeilen später im
      Nachtrag. Wer nur Absatz 1 + Bullet-Liste liest, nimmt die Prä-#310-Regel mit. Ein
      eingeschobenes „in diesem Skill-Aufruf" im Einleitungssatz (mit Verweis auf den Nachtrag)
      macht die Sektion an jeder Lesetiefe korrekt.
- [x] `scripts/checks/tests/run-tests.sh:5762` – die AK9-Drift-Guards verbieten nur das exakte
      Literal `tasks/review-${task_id}.md`. Ein wiedereingeführtes `tasks/review-$task_id.md`
      oder `tasks/review-${TASK_ID}.md` würde nicht auffallen, und es gibt keinen
      **positiven** Guard, der `report_file` an den echten Aufrufzeilen in `pipeline_summary()`
      verankert (`lessons/testing.md`: „Kopplungs-/Drift-Guard … je Seite ein eigener
      Negativtest"). Verhaltensabdeckung besteht mittelbar, weil der #212-W3-Positivlauf
      `pipeline_summary()` erreicht – ein Präsenz-Guard auf die Aufrufzeile wäre trotzdem
      billiger als die nächste Drift.
- [ ] `scripts/lib/report-verdict.sh:79` – `file="$(report_file …)"` läuft jetzt auch für
      Skills, die zwei Zeilen später am `*) return 0` abbiegen (unnötige Subshell). Rein
      kosmetisch; die Zuweisung hinter das `case` zu ziehen wäre etwas sauberer, kostet aber die
      hübsche Symmetrie mit `report_fingerprint`.
- [x] Arbeitsbaum-Hygiene (nicht im Diff): im Worktree liegt eine ungetrackte
      `.issue-body-310.tmp.md` aus der Task-Anlage. Kein Repo-Defekt (kein Skript erzeugt sie,
      `.gitignore` kennt das Muster zu Recht nicht), aber `preflight_checks` und das Push-Gate
      erwarten einen sauberen Baum – vor `/pr-shepherd` entfernen.

## Positives

- **Der Fix trifft genau die Ursache und nicht das Symptom.** Kein Eingriff in
  `circuit_breaker_check()`, `MAX_REVIEW_ITERATIONS` oder das Turn-Budget; der stale Verdict
  fällt in den bereits existierenden Retry-Pfad. Ein Vorher/Nachher-Vergleich pro Aufruf ist die
  minimale Mechanik, die #310 **und** #91 mit derselben Zeile abdeckt.
- **Der Snapshot-Zeitpunkt ist der schwierige Teil und er sitzt.** Einmal pro `run_skill`-Aufruf
  oberhalb der `for attempt`-Schleife – das ist gleichzeitig die Bedingung dafür, dass AK2
  (Turn-Limit nach fertigem Report) überlebt und AK1 (Iteration 2 winkt Iteration 1 nicht durch)
  greift. Die Task-Notiz zerlegt AK7 sauber in „behavioral belegbar" (AK1/AK2) und „rein
  positionell" – und deckt nur den positionellen Rest per Zeilennummern-Vergleich **plus**
  `awk`-Mutant ab, statt zwei isolierte Präsenz-Greps hinzustellen (genau die Korrektur aus dem
  #286-Learning).
- **Nicht-destruktiv statt Preflight-Löschen war die richtige Wahl** – und das bewusst in Kauf
  genommene Restrisiko (byte-identisch neu geschriebener Report gilt als stale) ist in Spec,
  Lib-Kommentar und Lesson als fail-closed begründet, nicht verschwiegen.
- **AK9 ist über die Vorgabe hinaus zu Ende gedacht:** dass `pipeline_summary()` seine
  Report-Pfade jetzt ebenfalls aus `report_file` zieht, war nicht gefordert – ohne diesen Schritt
  hätte das Pfadmuster weiter in `run-pipeline.sh` gestanden und AK9 wäre nur formal erfüllt
  gewesen.
- **Der `extract_verdict_header()`-Nachzug ist ein echter Selbstfund.** Der `header='`-Filter
  verhindert, dass der #214-Guard nach dem Hinzufügen des zweiten `case`-Blocks die Pfadzeile
  liest und aus dem falschen Grund rot wird – eine Kopplung, die man leicht übersieht, weil der
  Test in einem ganz anderen Abschnitt lebt.
- **Die E2E-Tests assertieren pfadspezifische Signale, nicht nur Exit-Codes.** AK4 und AK5
  begründen explizit, warum `failed after 3 attempts` bzw. das nie erreichte „Phase 3"/„Phase 6"
  nötig sind (der Exit-Code 1 allein wäre auch aus einem späteren Abbruch erklärbar) – exakt die
  Isolationsregel aus dem #214-Learning.
- **Doku-Nachzug vollständig und ehrlich im Tempus:** ADR-019 §4 als Nachtrag, die Lesson von
  Präsens („liest") auf Vergangenheit („las") plus „In #310 umgesetzt", die aufgelöste
  Übergangsanweisung, der PROJECT-CONTEXT-Index und sogar die #264-Querverweiszeile
  („Frische-Prüfung seit #310"). Die neue Generalregel am Ende des Lesson-Absatzes („Guard, der
  Erfolg an einem Artefakt statt am Exit-Code misst, braucht einen Frische-Nachweis") ist der
  eigentliche Transfer-Gewinn.
- Keine Routen-Änderung (`app/**` unberührt) → `docs/routes.md` korrekt nicht angefasst; kein
  ADR-Trigger, mit Begründung gegen alle vier Kategorien in der Task-Notiz.

## Rework (`/implement`, 2026-08-27)

Alle drei wichtigen Findings behoben, drei von vier Nitpicks mit umgesetzt:

- **W1 (Redirection-Reihenfolge):** `cksum 2>/dev/null < "$file"` – stderr-Umleitung zuerst,
  dazu ein WHY-Kommentar zur Links-nach-rechts-Auswertung. Verhalten unverändert fail-closed,
  nur der Log-Leak ist weg.
- **W2 (`UNREADABLE` ungetestet):** vier neue Assertions. Der Zweig wird deterministisch über
  `PATH=/nonexistent-dir` erreicht (kein `chmod`/Root-Bezug); dazu die Verhaltensaussage
  „fortbestehender Lesefehler → zweimal derselbe Fingerprint → stale" und die
  Nicht-Kollision mit einer echten Prüfsumme. Die Log-Hygiene aus W1 ist zusätzlich
  behavioral gepinnt (stderr leer) **plus** Mutationsbeleg gegen eine Lib mit getauschter
  Reihenfolge – der Mutant reproduziert genau den gemeldeten Leak. Nur dieser
  `chmod 000`-Block läuft unter `id -u != 0`, mit expliziter Skip-Meldung.
- **W3 (paralleles Scaffolding):** `scaffold_310()` setzt jetzt auf `_mk_pipe_repo` auf und
  ergänzt nur die Differenz (Interrupt-Pfad, Skill-Marker-Mocks, Task-Datei, `sleep`-Stub);
  die `DEFAULTS_YML`-Nutzung entfällt damit. Die #212-Inline-Blöcke bleiben unberührt
  (Fremd-Code, Out-of-Scope – der Doppel-Variablen-Fund steht in `kleinfunde.md`).
- **Nitpick ADR-019 §4:** der Einleitungssatz sagt jetzt „in diesem Skill-Aufruf … (siehe
  Nachtrag #310 unten)" – §4 ist auf jeder Lesetiefe korrekt.
- **Nitpick AK9-Guards:** zwei Positiv-Guards auf die echten `report_file`-Aufrufzeilen in
  `pipeline_summary()`; der Negativ-Guard ist von zwei exakten Literalen auf ein ERE
  erweitert, das `${task_id}`/`$task_id`/`${TASK_ID}` gleichermaßen erfasst.
- **Nitpick Arbeitsbaum:** `.issue-body-310.tmp.md` entfernt (Inhalt liegt als Issue #312).
- **Nitpick Subshell (`report_verdict.sh:79`) bewusst nicht umgesetzt:** die Zuweisung hinter
  das `case` zu ziehen bricht die Symmetrie zu `report_fingerprint` (beide holen den Pfad in
  Zeile 1) für eine Subshell, die nur bei nicht report-erzeugenden Skills anfällt und dort
  keinen messbaren Effekt hat.

Gates nach dem Rework: `prettier --check` grün, `bash -n` grün, Bash-Suite
`scripts/checks/tests/run-tests.sh` → **1120 grün, 0 rot** (+8 gegenüber 1112).

## Empfehlung
NEEDS_REWORK
