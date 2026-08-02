## Codify-Report: Task 262

### Neue Regeln hinzugefügt

- [`docs/factory/guidelines/bash-gotchas.md`] **§9** Ein `commit-msg`-Hook sieht die
  Message-Datei, bevor Git sie bereinigt – `-m`, Editor-Pfad und `-v`/`--verbose` hinterlassen
  unterschiedlichen Rohinhalt (Kommentarzeilen bzw. unpräfigierter Diff unter der
  Scissors-Zeile). Ein Filter braucht eine strukturelle Abbruchmarke, nicht nur
  präfixbasiertes Zeilenfiltern. – wegen: dieselbe Fehlerklasse wurde in **zwei separaten**
  Review-Runden gefunden (Editor-Pfad Runde 2, Verbose-Pfad Runde 3), weil die Aufrufpfade
  nicht vorab vollständig aufgelistet wurden.
- [`docs/factory/guidelines/bash-gotchas.md`] **§10** `git diff --cached --quiet` beweist
  „kein `git add`" nicht – vergleicht Index gegen HEAD, nicht gegen leer; nach einem
  hypothetischen `add`+`commit` wäre der Index wieder mit dem neuen HEAD identisch, die
  Assertion bliebe grün. – wegen: genau diese tote Assertion stand seit einer früheren Runde
  im Testcode, unbemerkt bis Review-Runde 3.
- [`docs/factory/lessons/factory-workflow.md`] + Index-Zeile in `PROJECT-CONTEXT.md`:
  `PR_SHEPHERD`/`FACTORY_STAGE`, wenn in der aufrufenden Shell exportiert, schlagen in jedes
  von der Testsuite erzeugte Wegwerf-Repo durch und lösen dort ungewollt Pipeline-Phasen aus
  (hier: Phase 7 bricht im Wegwerf-Repo ab) – vor Einordnung als Regression per `unset`
  gegenprüfen. – wegen: kostete drei Implement-Runden hinweg identische, diff-unabhängige
  rote Assertionen, weil der Zusammenhang zur aufrufenden Pipeline-Shell nicht sofort
  offensichtlich war.

### Keine Änderungen nötig

- Die eigentliche Guard-Logik (`commit-msg-check.sh`, `factory-commit.sh`,
  `install-hooks.sh`) hat laut drei Review-Runden keine strukturellen Clean-Code- oder
  Architektur-Findings hinterlassen (siehe „Positives" in `tasks/review-262.md`) – keine
  weitere Regel daraus ableitbar, die nicht schon in den obigen drei Punkten steckt.
- Security-Review PASSED ohne Findings – keine neue Security-Regel nötig.
- Der Circuit-Breaker-Mechanismus selbst (3 Review-Runden, dann Eskalation an den Menschen)
  hat in dieser Task genau wie in CLAUDE.md beschrieben funktioniert – keine Änderung an der
  Pipeline-Logik nötig.

### Empfehlung für nächste Features

- Beim Schreiben eines Hooks/Guards, der eine von einem externen Tool (Git, Editor, CLI)
  verwaltete Datei roh liest: **vor** der ersten Implementierung alle bekannten Aufrufpfade
  des Tools auflisten und je einen Test dagegen einplanen – nicht erst über mehrere
  Review-Runden einzeln nachliefern, sobald Review sie einzeln findet (siehe §9 oben).
- Beim manuellen Start von `run-pipeline.sh` mit Env-Var-Schaltern (`PR_SHEPHERD=true`,
  `FACTORY_STAGE=3`) den Kommando-Präfix-Stil (`VAR=val bash …`) statt `export VAR=val`
  bevorzugen – das begrenzt die Variable auf den einen Prozess und verhindert das in §-Lesson
  oben beschriebene Durchschlagen in spätere Testläufe derselben Shell.
