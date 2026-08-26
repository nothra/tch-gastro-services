## Codify-Report: Task 308

### Neue Regeln hinzugefügt

- `docs/factory/lessons/factory-workflow.md` (Abschnitt „Report-Guard: Stale-Verdict bei
  Pipeline-Re-Lauf", aus #91) – ergänzt um die **Within-Run-Variante**: derselbe
  Stale-Verdict-Fehlmechanismus tritt auch innerhalb einer laufenden `REVIEW_ITERATION`-Schleife
  auf, nicht nur bei einem Re-Lauf des Pipeline-Skripts. `/review` erreichte in Task 308 in
  Iteration 2 UND 3 das Turn-Limit (30), **bevor** der Report neu geschrieben wurde – der
  Report-Guard akzeptierte daraufhin jeweils den stehengebliebenen `NEEDS_REWORK`-Verdict aus
  Iteration 1 als vermeintlich frisch. Der Circuit Breaker eskalierte nach zwei Iterationen,
  obwohl der Rework nach Iteration 1 bereits fertig und unabhängig verifiziert grün war. –
  wegen: Wiederholung des #91-Musters in einem bisher nicht abgedeckten Kontext (Schleife statt
  Skript-Re-Lauf).
- `docs/factory/PROJECT-CONTEXT.md` – Index-Zeile der obigen Lesson um den Verweis auf #310
  ergänzt.
- **Issue #310** angelegt (`bug` + `tech-debt`, über den zentralen Seam): Fix für den
  Report-Guard, damit er einen Verdict nur honoriert, wenn die Report-Datei **in diesem
  Schleifendurchlauf** entstanden ist (mtime/Hash pro Iteration statt nur im Preflight). Das
  Beheben selbst sprengt den Scope von Task 308 (ändert `run-pipeline.sh`-Kernlogik,
  eigenständige Task).

### Keine Änderungen nötig

- Implementierung, Tests und Security waren inhaltlich sauber – Review Iteration 1 fand keine
  kritischen Findings, nur zwei kleine Doku-/Test-Nachzüge (beide sofort behoben). Die etablierten
  Muster aus früheren Lessons (#188 rAF-Timing, #194 geteilter `raf-stub`, #211/#253
  Divergenz-Assertions, ADR-039 Route-Neutralität) wurden korrekt angewendet – kein Rezidiv.
- Kein neuer Guideline- oder CLAUDE.md-Eintrag nötig: der Fehler ist rein tooling-intern
  (Pipeline-Skript), keine wiederkehrende Implementierungs- oder Review-Schwäche am Produktcode.

### Empfehlung für nächste Features

- Bis Issue #310 behoben ist: Erreicht `/review` in einer Rework-Iteration das Turn-Limit, den
  Report **manuell** auf Aktualität prüfen (git-Diff-Zeitstempel vs. Report-Inhalt), bevor der
  resultierende Verdict als gültig gewertet wird – ein Circuit-Breaker-Stopp kann ein reines
  Turn-Limit-Artefakt sein, kein echtes Nichtkonvergieren.
