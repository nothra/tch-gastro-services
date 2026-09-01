# Review: Task 314

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)

_Keine._ (Ein zunächst gemeldeter Verdacht – der `return "$_exit_code"` am Ende von
`measure_process_metrics_on_exit()` in `scripts/run-pipeline.sh` sei für den Exit-Code-Erhalt
tragend – wurde in zwei unabhängigen Review-Runden empirisch geprüft und widerlegt: bash erhält
den auslösenden Exit-Code nach einem EXIT-Trap unabhängig vom `return`-Wert der Handler-Funktion,
solange kein `exit` aufgerufen wird und kein ungeschützter Befehl unter `set -e` fehlschlägt
(gegengetestet u. a. mit einer echten Mutation, die beide `return`-Zeilen entfernt – Exit-Code
blieb erhalten). Der tatsächliche Schutzmechanismus sind die `|| true`-Guards + das Fehlen eines
`exit`-Aufrufs, nicht das `return`. Siehe Nitpick unten.)

## Nitpicks (optional)

- [ ] [scripts/run-pipeline.sh:499-518] Die `return "$_exit_code"`-Zeilen sind defensiv, nicht
      kausal notwendig (siehe oben) – der WHY-Kommentar könnte das eine Zeile klarer fassen,
      damit ein künftiger Aufräum-Versuch nicht fälschlich annimmt, `return` sei der
      Erhaltungsmechanismus (er ist es nicht; die `|| true`-Guards sind es).
- [ ] [scripts/metrics.sh:175-179] Die `''|`-Alternative in `case "$issue" in ''|*[!0-9]*)` ist
      unerreichbar, weil der vorangehende `[ -z "$issue" ]`-Guard (Zeile 169) bei leerem Wert
      bereits vorher zurückkehrt. Harmlos, aber redundant – könnte zu `*[!0-9]*)` vereinfacht
      werden.
- [ ] [scripts/checks/tests/run-tests.sh, scaffold_310/run_314-basierte echte Pipeline-Läufe]
      Diese Läufe schränken `PATH`/`gh` nicht ein, wenn `metrics.sh --quiet --publish` (ohne
      `--no-api`) über den EXIT-Trap läuft – funktioniert heute nur, weil ein ambienter `gh`
      gegen den lokalen Bare-Remote sofort fehlschlägt (kein GitHub-Host). Keine aktuelle
      Flakiness, aber eine unausgesprochene Umgebungsannahme; ein Fake-`gh`/`--no-api` würde die
      Tests von der lokalen `gh`-Installation entkoppeln.
- [ ] [scripts/checks/tests/run-tests.sh, commit_314_pushed()] Dritte inline-Kopie des Musters
      „bare origin anlegen + committen + pushen" (Geschwister bereits bei den #212- und
      #310-Blöcken). Noch kein extrahierter Helper vorhanden – bei einem vierten Vorkommnis lohnt
      sich ein gemeinsamer `git_bare_origin_push`-Helper.
- [ ] [scripts/checks/tests/run-tests.sh, AK9-Test] `PATH="/usr/bin:/bin"` zur Simulation von
      „gh fehlt" ist ein ad-hoc-Isolationstrick statt eines etablierten Musters; funktional
      unproblematisch (die Produktionsmeldung deckt „fehlt" und „nicht authentifiziert" ohnehin
      gemeinsam ab), aber nicht besonders robust gegen eine geänderte lokale Toolchain-Ablage.
- [ ] Informativ, nicht Teil dieses Diffs: für das Issue/PR-Label würde neben `enhancement`
      (Default aus dem `chore`-Branch-Typ) das Aspekt-Label `tech-debt` passen – reine
      Tooling-/Prozess-Verdrahtung ohne Nutzer-Verhalten.

## Positives

- ADR-045 (Option D: Trap-basierter Auslöser + `--publish` in `metrics.sh`) wird exakt
  umgesetzt: genau ein Aufrufort, Registrierung nach `preflight_checks`, fail-open und
  exit-code-neutral – durch eine echte Mutation (Trap-Zeile entfernt → keine Messung mehr,
  Abbruch-Exit-Code bleibt trotzdem korrekt) belegt, nicht nur behauptet.
- Saubere Schicht-Trennung: `run-pipeline.sh` kennt weiterhin weder `gh` noch
  `$GITHUB_STEP_SUMMARY` – die gesamte Veröffentlichungslogik lebt in `metrics.sh` hinter
  `--publish` (ADR-045 Entscheidung 4).
- Der vorbestehende `metrics.sh --quiet`-Exit-Code-Bug (AK14) ist mit explizitem `exit 0`
  behoben und durch einen eigenen Test festgenagelt.
- `FACTORY_METRICS_ISSUE` bewusst außerhalb von `factory.defaults.yml` gehalten (ADR-041-Config-
  Validierung bleibt unberührt) und folgt demselben Muster wie `FACTORY_HEALTHCHECK_URL`.
- Integer-Guard vor jedem `gh`-Aufruf ist fail-closed und sauber isoliert getestet (AK7 „kein
  Ziel" und AK8 „nicht-numerisch" haben je ein eigenes, pfadspezifisches Signal statt eines
  gemeinsamen Symptom-Greps).
- Neue Tests in `run-tests.sh` sind echte Verhaltensläufe (kein Wiring-Grep), nutzen konsequent
  bestehende Helfer (`_mk_pipe_repo`, `scaffold_310`, `commit_310`, `poll_permission_guard`,
  `assert_contains_286`) statt einer parallelen Scaffold-Struktur, und die
  Reihenfolge-Prüfung „Trap nach `preflight_checks`" ist ein echter Positionsvergleich, kein
  Präsenz-Grep.
- Vollständiger `run-tests.sh`-Lauf: 1249 grün / 2 rot – beide rot ausschließlich wegen des
  dokumentierten, erwarteten `.claude/**`-Patch-Blockers (AK12/`daily-metrics.md`), kein neuer
  Fund. `pre-commit.sh`/`pre-push.sh` (Lint, Tests, Typecheck, Format, Routen-Doku, Hooks) grün.
- ADR-045 „Betroffene Stellen" ist im Diff vollständig abgedeckt; keine Doku-Drift außerhalb des
  bekannten Blockers gefunden (`docs/routes.md` korrekt unberührt, da keine `app/**`-Änderung).

## Empfehlung

APPROVED
