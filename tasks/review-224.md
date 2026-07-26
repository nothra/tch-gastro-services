# Review: Task 224

Drei unabhängige Review-Perspektiven (Logik & Korrektheit, Code-Qualität, Architektur &
Konsistenz) auf `git diff origin/main...HEAD` (Branch `fix/224-top-level-yaml-edit-allow`,
PR #237). Runde 1: 1. Iteration.

## Kritische Findings (müssen behoben werden)

Keine.

## Wichtige Findings (sollten behoben werden)

- [scripts/checks/tests/run-tests.sh:2017-2020 vs. 2056-2059] Der neue `#224`-Block prüft die
  „#88-Grenze bleibt unverändert" (`Edit(.claude/**)`, `Write(.claude/**)`, `Edit(.env*)`,
  `Write(.env*)`, `Read(.env*)`) per **geparster** jq-Assertion je Eintrag – exakt dieselbe
  Invariante, die der direkt darüberstehende, bereits bestehende `#91`-Block schon per
  `grep -qF`-Kombi-Assertion prüft (und dabei `Edit(.env*)` sogar auslässt – eine Lücke, die der
  neue Block stillschweigend schließt). Beide Prüfungen bleiben nebeneinander bestehen, ohne dass
  irgendwo dokumentiert ist, ob das ein bewusster jq-unabhängiger Fallback ist oder schlicht
  vergessene Redundanz. Verstößt gegen „keine Code-Duplikation" (`clean-code.md`) und lässt offen,
  welcher der beiden Checks die kanonische Quelle ist. **Vorschlag:** entweder den alten
  `#91`-Kombi-Deny-Check entfernen (der neue `#224`-Block deckt ihn vollständig und präziser ab,
  solange `jq` vorhanden ist – und ist bereits hinter `HAS_JQ`-Skip abgesichert), oder einen
  Kommentar ergänzen, der die Koexistenz begründet (z. B. „alter Check bleibt als
  jq-unabhängiger Fallback, falls `jq` fehlt" – dann aber `Edit(.env*)` dort ergänzen, damit
  beide dieselbe Menge prüfen).
- [scripts/checks/tests/run-tests.sh:2036] Die jq-Verfügbarkeitsprüfung
  `[ "$(command -v jq >/dev/null 2>&1; echo $?)" -eq 0 ]` ist eine dritte, unnötig umständliche
  Schreibweise derselben Prüfung im selben File: Zeile 254 nutzt die Direktform
  `if command -v jq >/dev/null 2>&1; then`, Zeile 286 setzt eine wiederverwendbare Variable
  `HAS_JQ` (`command -v jq >/dev/null 2>&1 && HAS_JQ=1 || HAS_JQ=0`), die an Zeile 292 bereits per
  `if [ "$HAS_JQ" -eq 1 ]` abgefragt wird und zur Laufzeit an Zeile 2036 immer noch gültig ist
  (keine Subshell, keine Neuzuweisung dazwischen). Die neue Subshell-Konstruktion hätte durch
  Wiederverwendung von `$HAS_JQ` (oder zumindest die einfache Direktform aus Zeile 254) ersetzt
  werden können – keine funktionale Auswirkung, aber eine vermeidbare dritte Stilvariante für
  dieselbe Sache in derselben Datei (alle drei Reviewer haben diesen Punkt unabhängig
  voneinander gefunden).
- [tasks/task-224-top-level-yaml-edit-allow.md, Blocker-Abschnitt] Der zentrale Architektur-Fund
  dieser Task – `Write(...)`-Permission-Regeln werden von der installierten Claude-Code-Version
  systemweit nicht ausgewertet (nur `Edit(pfad)` deckt Edit **und** Write ab) – steht bislang nur
  als Fließtext im Task-File. Sobald die Task-Datei „vergraben" ist, geht dieses Wissen verloren,
  und ein künftiger Agent könnte weiter annehmen, ein neuer `Write(...)`-only-Deny-Eintrag wäre
  eine wirksame Absicherung. Für diesen PR unkritisch (Edit-Deny deckt bereits alles ab,
  #88-Grenze bleibt intakt), aber der Fund sollte spätestens bei `/codify` explizit in eine
  Lesson überführt werden (z. B. `docs/factory/lessons/build-tooling.md`), nicht implizit im
  Task-File verbleiben.

## Nitpicks (optional)

- [scripts/checks/tests/run-tests.sh:2042-2044] Die `for entry in 'Edit(*.yml)' 'Edit(*.yaml)'
  'Write(*.ts)' ...`-Schleife fasst AK1- (Edit) und AK2-Einträge (Write) unter einem gemeinsamen
  „AK1/AK2"-Kommentar zusammen. Da jede Assertion-Meldung den konkreten Eintrag nennt, geht keine
  Diagnostik verloren – eine Aufteilung in zwei Schleifen wäre aber noch etwas eindeutiger
  Kommentar→Assertion zuzuordnen.
- [scripts/checks/tests/run-tests.sh:2041-2047] Der Test verlangt auch die laut eigenem Fund
  wirkungslosen `Write(*.ext)`-Einträge als Assertion – nachvollziehbar im Rahmen des
  abgestimmten Scopes (AK2-Symmetrie), macht diesen Teil aber zu einem reinen
  Config-Paritäts-Test statt einem Verhaltenstest. Ein Kurzverweis auf den Nebenfund direkt im
  Testkommentar wäre für spätere Leser hilfreich, ist aber optional.
- [tasks/task-224-top-level-yaml-edit-allow.md, Offene Fragen] Dass `Edit(*.yml)`/`Edit(*.yaml)`
  laut gitignore-Semantik auf jeder Tiefe matcht (nicht nur Root) und damit implizit auch
  YAML-Dateien in bisher nicht per Verzeichnis-Glob freigegebenen Pfaden erlaubt (z. B.
  `.github/ISSUE_TEMPLATE/*.yml`), ist im Task-File bereits bewusst diskutiert und plausibel als
  unkritisch eingestuft. Für die Nachvollziehbarkeit wäre ein kurzer Verweis darauf auch im
  Spec-Scope-Abschnitt (`docs/specs/spec-224-top-level-yaml-edit-allow.md`) hilfreich, ist aber
  keine Nacharbeit an diesem PR.

## Positives

- Alle acht Akzeptanzkriterien (AK1–AK8) sind sowohl per Datei-Assertion (`jq`-geparst, beide
  Richtungen: Allow-Einträge vorhanden **und** Deny-Einträge erhalten) als auch **behavioral**
  über zwei echte `claude --print`-Proben (FACTORY_STAGE=3, Positiv- und Negativfall) belegt –
  nicht nur am Dateiinhalt. Volle Testsuite: 542 grün, 0 rot.
- `index($v) != null` ist der korrekte jq-Existenz-Check für Array-Elemente (vermeidet die
  klassische jq-Falle, dass Index `0` truthy ist) – sauber gelöst.
- Jeder Allow-/Deny-Eintrag bekommt eine eigene `assert_true`-Zeile statt AND-Verkettung: erfüllt
  AK5 exakt („Wegfall genau eines Eintrags → genau die zugehörige Assertion rot").
- `pnpm-lock.yaml` ist doppelt abgesichert: strukturell (jq-Assertion in `deny`) **und**
  behavioral (MD5 vor/nach dem `claude --print`-Lauf unverändert) – deny schlägt allow, auch bei
  der neuen generischen `*.yaml`-Freigabe.
- Patch-Workflow lückenlos eingehalten: `tasks/patch-224.diff` programmatisch per `jq` erzeugt
  (nicht von Hand getippt), Pfad-Header korrekt über `git diff --no-index --no-prefix` gesetzt,
  read-only per `git apply --check` verifiziert, Blocker mit Datum protokolliert, nach Anwendung
  durch den Menschen wieder entfernt (Commits `28eb44f`/`9140772`).
- Lesson-Korrektur (AK7) in `docs/factory/lessons/factory-workflow.md` präzise: stale
  Präsens-Aussage zu `factory.defaults.yml` korrigiert, `.claude/**`-Patch-Workflow-Regel und
  historische Vorfallschilderung unangetastet.
- ADR-Trigger-Einschätzung im Task-File korrekt begründet (reine deklarative Erweiterung
  innerhalb der #88-Grenze, keine der vier Trigger-Kategorien einschlägig) – kein ADR nötig.
- Scope sauber eingehalten: keine Änderung an Bash-Allow-Liste/Commit-Seam, `docs/routes.md` zu
  Recht nicht angefasst (keine Routen-Dateien im Diff). Der Out-of-Scope-Fund
  (wirkungslose `Write(...)`-Regeln) wurde nicht mitgelöst, sondern für einen eigenen Task
  ausgelagert – jetzt als reales GitHub-Issue [#240](https://github.com/nothra/tch-gastro-services/issues/240)
  über den kanonischen Seam (`create_issue_idempotent`, ADR-018) angelegt.
- Der `AK2`-Fund (Write-Regeln wirkungslos) wird transparent benannt statt verschwiegen, korrekt
  vom neuen auf den bereits bestehenden Bestand verallgemeinert, und ändert nichts an der
  tatsächlichen (behavioral belegten) Erfüllung von AK1–AK3.

## Empfehlung

NEEDS_REWORK

**Begründung:** Kein kritisches oder sicherheitsrelevantes Finding – Kernverhalten (AK1–AK8) ist
sowohl strukturell als auch behavioral einwandfrei belegt. Der Rework-Bedarf ist rein
Code-Qualität/Wartbarkeit im neuen Testabschnitt: die unbegründete Test-Duplikation
(`#91` grep-Kombi-Check vs. `#224` jq-Check derselben Invariante) und die dritte, abweichende
`jq`-Verfügbarkeitsprüfung wurden unabhängig von allen drei Review-Perspektiven aufgegriffen und
verstoßen gegen das nicht verhandelbare Clean-Code-Prinzip dieses Projekts. Beide Punkte sind in
`scripts/checks/tests/run-tests.sh` klein und risikoarm behebbar (kein Verhalten ändert sich,
nur Testcode). Der dritte Punkt (Lesson-Codifizierung des Write-Funds) ist keine Blockade für
diesen PR, sondern ein Hinweis für den anstehenden `/codify`-Schritt.
