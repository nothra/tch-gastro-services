# Review: Task 255

> Runde 2 (Re-Review nach Rework, Commit `37cbae2`). Runde-1-Findings siehe Historie
> (`git log -p -- tasks/review-255.md`) — alle drei live nachgestellt und als behoben
> bestätigt (awk-Job-Block-Isolation, AK3-Positions-Reihenfolge, AK1/AK2/AK4-Behavior-
> Level-Tests). Keine neuen Logik- oder Code-Qualitäts-Findings in Runde 2. Alle drei
> Wichtig-Findings dieser Runde sind Dokumentations-Drift (ADR-Prosa/Lesson blieb hinter
> dem aktualisierten Code zurück), keine funktionalen Fehler.

## Kritische Findings (müssen behoben werden)
_Keine._

## Wichtige Findings (sollten behoben werden)
- [ ] [docs/adr/029-branch-protection-main-ruleset.md:44-45] Die Prosa-Aufzählung im „Decision"-Abschnitt ("Required Status Checks: `lint`, `test`, `issue-sync`, `factory-self-test`, `pr-closes-issue`") wurde nicht um `config-validation` ergänzt, obwohl der JSON-Sollzustand im selben Dokument (Zeile 171) und der live per `gh api .../rulesets/19162920` abgefragte Ruleset-Zustand bereits korrekt `config-validation` enthalten. Verstößt gegen die im selben ADR dokumentierte Gegenmaßnahme „Änderungen am Ruleset laufen über einen neuen ADR" und die Projekt-Lesson „ADR-namentlich-beschriebene Mechanik im selben PR mitpflegen" (#211/#176).
- [ ] [docs/adr/041-config-validation-ci-required-check.md:104-108] Der „Negativ/Trade-offs"-Abschnitt behauptet weiterhin, `run-tests.sh` verliere die Nicht-Regressions-Prüfung gegen das reale `factory.config.yml` dauerhaft und dieser Fall werde „ausschließlich in CI (Job `config-validation`) abgedeckt, nicht mehr lokal". Das Rework (Commit `37cbae2`) hat diese Prüfung als neuen Behavior-Level-Test AK2 (`scripts/checks/tests/run-tests.sh`, Aufruf `bash "$GATE" "$FACTORY_ROOT/factory.defaults.yml" "$FACTORY_ROOT/factory.config.yml"`) wieder in `run-tests.sh` eingebaut — die ADR-Aussage ist damit für den aktuellen Code-Stand falsch.
- [ ] [docs/factory/lessons/factory-workflow.md:82,367] Beide Stellen zählen die required-CI-Checks als aktuelle Zustandsbehauptung auf (nicht als historisches Vorfalls-Narrativ zu #155, sondern als geltende Regel-Beispielliste bzw. Tatsachenbehauptung über den Workflow-Datei-Inhalt) und wurden nicht um `config-validation` ergänzt, obwohl genau diese Mechanik (welche Jobs required sind) Gegenstand dieses PRs ist.

## Nitpicks (optional)
_Keine weiteren über die drei Wichtig-Findings hinaus gefunden (gezielter Grep über `docs/`, `CLAUDE.md`, `PROJECT-CONTEXT.md` nach der required-Checks-Liste ergab keine weiteren aktuellen Treffer)._

## Positives
- Alle drei Runde-1-Findings sind nachweislich (nicht nur behauptet) behoben: die awk-Extraktion wurde live erneut ausgeführt und endet jetzt sauber am Job-Ende; der AK3-Reihenfolge-Test wurde inkl. Edge-Case (kein Treffer → Guard fail-closed) geprüft; die neuen AK1/AK2/AK4-Tests wurden real ausgeführt und liefern die erwarteten, regelspezifischen Fehlermeldungen — Testisolation (`mktemp -d` + `cp`) per `git status` als mutationsfrei verifiziert.
- AK6 erneut live gegen die GitHub-API verifiziert: `gh api .../rulesets/19162920` liefert exakt `lint, test, issue-sync, factory-self-test, pr-closes-issue, config-validation`, `enforcement: active`, `strict: false`, `merge: [squash]`, `bypass: 0` — deckungsgleich mit dem (im JSON bereits korrekten) ADR-029-Sollzustand.
- Volle Suite weiterhin grün (609 Tests), keine Kollateralschäden durch das Rework; die drei Fixes sind chirurgisch auf die gemeldeten Findings begrenzt.
- Keine Schicht-Verletzung, keine `docs/routes.md`-Drift (keine Routen-Änderungen im Diff) — reine CI-/Doku-Infrastruktur-Änderung, ADR-Prozess (neues ADR statt stiller Ruleset-Änderung) korrekt eingehalten.

## Empfehlung
NEEDS_REWORK
