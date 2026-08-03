## Codify-Report: Task 264

### Neue Regeln hinzugefügt

- **`docs/factory/lessons/factory-workflow.md`** (Nachtrag zur bestehenden `/refactor`
  Turn-Limit-Exhaustion-Lesson, aus #185) – wegen: Der automatisierte `/refactor`-Schritt
  riss auch **ohne jede Code-Änderung** 3× das Turn-Limit; die Konklusion („kein Refactoring
  nötig") stand bereits nach Versuch 1 fest, allein Verifikations-Overhead (volle Testsuite,
  Review-Rundenabgleich) sprengte das Budget vor dem Commit. Der Orchestrator
  (`run_skill()` in `scripts/run-pipeline.sh`) prüft zwischen Retries – anders als die
  eigene, bereits kodifizierte Regel es verlangt – nicht auf `git status`, retryt blind und
  bricht die Pipeline ab, obwohl ein vollständig committierbarer Zwischenstand vorlag.
  Index-Zeile in `docs/factory/PROJECT-CONTEXT.md` ergänzt. Härtung des Orchestrators als
  eigenes Issue ausgelagert: **#275** (Scope sprengt #264 selbst).
- **`docs/factory/lessons/code-style.md`** (neuer Eintrag) – wegen: Review-Runde 1 korrigierte
  einen falschen WHY-Kommentar (falsche Kausalkette „Skript kehrt vor Phase X zurück") an
  zwei Stellen; Runde 3 fand dieselbe falsche Behauptung an einer dritten, copy-paste-
  verwandten Stelle (Dry-Run-Ausnahme-Kommentar + Spec-Prosa) wieder, die beim ersten Fix
  übersehen wurde. Generalisiert das bestehende Sweep-Prinzip aus #142 (Magic Numbers) und
  #144 (Terminologie) auf WHY-Kommentar-Kausalketten. Index-Zeile in `PROJECT-CONTEXT.md`
  ergänzt.

### Keine Änderungen nötig

- Die eigentliche #264-Härtung (Env-Isolation der `run-tests.sh`-Testaufrufe) selbst zeigte
  keine neuen, bisher unkodifizierten Fehlerklassen in Implementierung/Review-Runde 2
  (Guard-Reichweite, Spec-Drift) – beide Findings sind bereits durch bestehende Lessons
  (#114/#255/#261/#265 Block-Extraktion, #253 Spec-Drift-im-selben-PR) abgedeckt und wurden
  entsprechend angewendet, nicht neu erfunden.
- Security-Review (`tasks/security-264.md`) ergab PASSED ohne Findings – kein Muster zum
  Kodifizieren.

### Empfehlung für nächste Iteration

- Issue **#275** (run_skill()-Retry-Härtung für code-schreibende Skills) hat keine Priorität
  vorgegeben – sollte vor dem nächsten `/refactor`-Turn-Limit-Vorfall aufgegriffen werden,
  sonst wiederholt sich derselbe Kostenverlust (3× identische Analyse) beim nächsten
  No-op-Refactoring.
