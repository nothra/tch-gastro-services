## Codify-Report: Task 407

### Neue Regeln hinzugefügt
- `docs/factory/lessons/factory-workflow.md` + Index-Zeile in `PROJECT-CONTEXT.md` (Laden bei `/requirements`,
  `/implement`): Neues Zeilen-/Listenlayout gegen die Dichte-Grenzen bestehender Specs und E2E-Tests messen, bevor
  es in die Spec kommt – wegen: spec-407 (zweizeilige Artikelzeile) riss spec-373 AK4.6 (1796 > 1624 px). Erst der
  E2E-Lauf in `/review` Iteration 2 fand es; Folge waren drei Review-Iterationen und die Circuit-Breaker-Eskalation.
  Im selben Eintrag: „gelöscht“-Notiz erst nach `ls` auf die Dateinamen schreiben (Wegwerf-Dateien lagen noch im
  Worktree, Rezidiv #372).

### Keine Änderungen nötig
- Opt-in-E2E-Specs vor `/review` nicht gelaufen (Iteration 1/2): bereits durch Lesson #403/#406 abgedeckt.
- Rework nicht committet (Iteration 2): bereits durch Lesson #391 abgedeckt.
- Wegwerf-Dateien im Worktree: Lesson #372 deckt es ab, Hinweis ist im Eintrag oben nur als Rezidiv ergänzt.
- Security-Review ohne Findings (reine UI-Änderung, gleiche Actions und Rechte): kein Learning.
- Out-of-Scope: Wortumbruch „Cola/Fanta/Spezi/Limo“ bei 375 px im Baustein `ListenZeile` – im Review bewusst ohne
  Issue eingestuft (kein funktionaler Auslöser, Anzeige bleibt lesbar); kein neuer Eintrag.

### Empfehlung für nächste Features
- Vor dem Merge von Hand löschen: gitignorierte `*407*.tmp.*`-Dateien (`e2e/katalog-407.tmp.spec.ts`,
  `playwright-407.tmp.config.ts`, `scripts/{cov,e2e,mutation,vitest}407.tmp.sh`, `e2e407.tmp.log`,
  `tasks/telemetry-raw-407-*.tmp.txt`, `test-results/407-*.png`).
- Nach `next dev`-Läufen `git checkout -- CLAUDE.md` prüfen (Lesson build-tooling).
