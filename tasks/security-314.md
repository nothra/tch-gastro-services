# Security Review: Task 314

## Kritische Findings (Blocker)

_Keine._

## Wichtige Findings

_Keine._

## Hinweise

- [ ] [Command-/Argument-Injection] `FACTORY_METRICS_ISSUE` wird per
      `case "$issue" in *[!0-9]*) …` fail-closed geprüft (`scripts/metrics.sh:176`), **bevor**
      ein `gh`-Aufruf möglich ist – auch ein CLI-Flag-Payload wie `--repo` wird abgelehnt
      (durch Test belegt). Der Report geht über `--body-file "$report_file"`
      (`scripts/metrics.sh:187`), nicht als Argument-String – vermeidet Shell-Interpretation/
      Quoting-Probleme. `$GITHUB_STEP_SUMMARY` wird ausschließlich als Ziel eines
      `cat >> "$GITHUB_STEP_SUMMARY"` genutzt (`scripts/metrics.sh:161`), nie evaluiert. Kein
      `eval` im gesamten Diff. Keine Korrektur nötig – als Beleg dokumentiert.
- [ ] [Freitext-Kanal / Prompt-Injection] ADR-045-Invariante „kein neuer Freitext-Kanal, der
      von einem Agenten zurückgelesen wird" empirisch gegen den Code geprüft
      (`scripts/metrics.sh:82,98`): `gh pr list` zieht nur `createdAt,mergedAt`, `gh run list`
      nur `conclusion` – keine PR-/Commit-/Issue-Freitextfelder (Titel, Body, Message) fließen
      in den Report ein. Die Invariante hält; nichts Angreifer-Kontrollierbares landet im
      veröffentlichten Report.
- [ ] [Prompt-Injection über Patch-Inhalt] Der Inhalt von
      `tasks/patch-314-daily-metrics.diff` (künftiger Inhalt von
      `.claude/commands/daily-metrics.md`, einer von Agenten gelesenen Skill-Datei) wurde
      gelesen: reine Dokumentations-Prosa, kein Imperativ an einen Agenten außerhalb des
      erwarteten Skill-Inhalts, keine ausführbaren Marker. Unbedenklich.
- [ ] [Least Privilege] Die zwei neuen `factory-poll.yml`-Scopes (`pull-requests: read`,
      `actions: read`, Zeilen 39-40) sind exakt die von `gh pr list`/`gh run list` benötigten
      Minimalrechte – rein lesend, keine Ausweitung auf Secrets. Der Workflow läuft weiterhin
      nur per `workflow_dispatch`; das dokumentierte, separate Restrisiko des unpinnten
      `npm install -g`-Runtime-Schritts (Issue #290) bleibt unverändert und wird durch diese
      zwei Read-Scopes nur marginal vergrößert (kein zusätzlicher Schreibzugriff).
- [ ] [Secrets/Error-Handling] Keine hartkodierten Credentials eingeführt; `GH_TOKEN`/
      `ANTHROPIC_API_KEY` unverändert aus `secrets.*`. Fehlerpfade (`gh` fehlt, Summary nicht
      schreibbar, Kommentar-Fehlschlag – `scripts/metrics.sh:164,190`) geben nur feste,
      generische Hinweistexte aus; `stderr` der `gh`-Aufrufe wird jeweils nach `/dev/null`
      umgeleitet, keine Stack-Traces/internen Pfade landen im GitHub-sichtbaren Output
      (Job-Summary/Issue-Kommentar).
- [ ] [Fail-open-Mechanik] `measure_process_metrics_on_exit()`
      (`scripts/run-pipeline.sh:506-521`) sichert `$?` als erste Anweisung, jeder Folgebefehl
      ist `|| true`-geschützt, kein `exit` im Trap – verändert den Pipeline-Exit-Code nicht
      (durch Mutationstest in `run-tests.sh` belegt, nicht nur behauptet).

## Ergebnis

PASSED
