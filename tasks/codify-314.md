## Codify-Report: Task 314

### Neue Regeln hinzugefügt

- [`docs/factory/guidelines/bash-gotchas.md`] Neuer Eintrag #12 „EXIT-Trap: `return`/letzter
  Befehl des Handlers bestimmt NICHT den Skript-Exit-Code" – wegen: Ein Review-Sub-Agent
  behauptete in Runde 1, `return "$_exit_code"` am Ende des neuen EXIT-Trap-Handlers in
  `run-pipeline.sh` sei „empirisch geprüft" tragend für den Exit-Code-Erhalt. Empirisch
  widerlegt (drei Standalone-Bash-Tests + eine echte Mutation gegen `run-pipeline.sh`, die
  beide `return`-Zeilen entfernte – Exit-Code blieb erhalten). Der tatsächliche
  Erhaltungsmechanismus sind die `|| true`-Guards + das Fehlen eines `exit`-Aufrufs im Trap.
  Ein wiederverwendbares Bash-Detail, das künftig sowohl beim Schreiben als auch beim Reviewen
  von EXIT-Traps Fehleinschätzungen vorbeugt.
- [`docs/factory/lessons/factory-workflow.md`] Neue Lesson „Review-Sub-Agent kann eine falsche
  Bash-/Shell-Verhaltensbehauptung als 'empirisch geprüft' ausgeben" (+ Index-Zeile in
  `PROJECT-CONTEXT.md`, Laden bei `/review`/`/security-review`) – wegen: derselbe Vorfall wie
  oben, aber als Prozess-Lesson statt Bash-Detail: anders als die bekannte
  Fork-Kontaminations-Klasse (#298/#267, dort lieferte der Agent gar keine echten Findings)
  war dies ein korrekt beauftragter, frischer Agent, der eine detaillierte, selbstsichere,
  aber inhaltlich falsche technische Tatsachenbehauptung produzierte. Regel: jede Kritisch-/
  Wichtig-Einstufung mit einer überprüfbaren Verhaltensbehauptung über Sprach-/Shell-Semantik
  selbst per Standalone-Repro nachvollziehen, bevor sie in den finalen Report übernommen wird.
- [`docs/factory/lessons/testing.md`] Neue Lesson „Neuer EXIT-Trap/Hook, der ein externes CLI
  aufruft: geteiltes Test-Scaffold braucht einen deterministischen Stub" (+ Index-Zeile in
  `PROJECT-CONTEXT.md`, Laden bei `/implement`/`/test` beim Testschreiben) – wegen: Review-
  Runde 2 fand, dass die neue `metrics.sh --quiet --publish`-Verdrahtung in `run-pipeline.sh`
  ab sofort in **allen** bereits bestehenden `scaffold_310`-basierten echten Pipeline-Tests
  (#310/#312) einen `gh`-Aufruf mitlaufen ließ, ohne dass diese Tests davon wussten – grün nur
  dank ambientem Fail-Fast von `gh` gegen einen unbekannten Git-Host, nicht dank eines echten
  Stubs. In `/refactor` behoben (`scaffold_310()` legt jetzt einen fehlschlagenden `bin/gh`-
  Stub an), hier zusätzlich als wiederverwendbare Regel für künftige Hooks/CLI-Aufrufe
  festgehalten.

### Keine Änderungen nötig

- Der `.claude/**`-Patch-Workflow-Blocker (`daily-metrics.md`) ist bereits vollständig durch
  bestehende Lessons abgedeckt (`docs/factory/lessons/factory-workflow.md` → „.claude/**-
  Änderungen erfordern Patch-Workflow") – kein neuer Eintrag nötig, die Task folgte dem
  etablierten Muster korrekt (Patch erzeugt, `git apply --check` verifiziert, Blocker in der
  Task-Datei dokumentiert).
- Die übrigen Review-/Security-Review-Nitpicks (dritte inline-Kopie des Bare-Origin-Push-
  Musters in `run-tests.sh`, `PATH="/usr/bin:/bin"`-Isolationstechnik im AK9-Test) wurden
  bewusst nicht behoben (Begründung in `review-314.md` bzw. `task-314-*.md` dokumentiert) –
  kein Lernmuster, das eine neue Regel rechtfertigt, solange die jeweilige Schwelle (4.
  Vorkommnis / etabliertes Alternativmuster) nicht erreicht ist.
- Keine kritischen oder wichtigen Security-Findings (`security-314.md`: PASSED) – nichts zu
  codifizieren.

### Empfehlung für nächste Features

- Jeder künftige `trap … EXIT`/Hook-Mechanismus in `run-pipeline.sh` (oder einem anderen
  Skript mit geteilten Test-Scaffolds) sollte von Anfang an prüfen, ob er ein externes CLI
  aufruft, das in bestehenden Scaffolds (`scaffold_310` & Nachfolger) gestubbt werden muss –
  nicht erst im Review nachgezogen werden.
- Bei mehrrundigen Reviews mit Bash-/Shell-lastigem Diff: Findings, die eine Verhaltens-
  behauptung über Exit-Codes/Traps/Quoting enthalten, routinemäßig gegen ein minimales
  Standalone-Repro prüfen, bevor sie übernommen werden – besonders wenn eine spätere Runde
  dieselbe Stelle unabhängig bestätigt oder widerlegt (hier: Runde 2 widerlegte Runde 1 mit
  derselben Methode).
