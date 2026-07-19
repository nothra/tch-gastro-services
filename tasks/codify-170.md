## Codify-Report: Task 170

### Neue Regeln hinzugefügt
- (keine)

### Keine Änderungen nötig

Review (`tasks/review-170.md`, APPROVED) und Security-Review (`tasks/security-170.md`,
PASSED) enthalten beide **keine** kritischen oder wichtigen Findings. Die einzigen zwei
Nitpicks sind kein neues, wiederkehrendes Fehler-Muster, sondern bereits sauber behandelt:

1. **Doppelter Prädikat-Test** (`should_returnTrue_when_getWithoutAnySignals` vs.
   `should_returnTrue_when_getRequest`) – wurde **noch in der /test-Phase** entfernt (Commit
   `84223f2`), bevor der Review-Report committet wurde. Kein Regelbedarf: Der bestehende
   Clean-Code-Grundsatz „keine Duplikation" hat hier bereits gegriffen, ohne dass ein Fund im
   Review nötig war, um es zu entdecken.
2. **Case-Normalisierung der HTTP-Methode** (`MUTATION_METHODS.has(request.method)` gegen
   Uppercase-Literale, keine `.toUpperCase()`-Normalisierung) – taucht in Review **und**
   Security-Review identisch als nicht-blockierender Hinweis auf, wurde aber bewusst
   **nicht** gefixt: `.toUpperCase()` wäre eine Verhaltensänderung (Robustheit), keine reine
   Refactoring-Maßnahme, und würde damit gegen „kein neues Verhalten" verstoßen (`/refactor`
   hat das explizit so entschieden, siehe Refactor-Notizen in der Task-Datei). Die Rationale
   (Web-Request-API liefert Methoden uppercase; ein Risiko in unsichere Richtung existiert
   nicht) ist bereits im Code-Kommentar (`lib/prefetch-session.ts:23-24`), im ADR-032, im
   Review und im Security-Review konsistent dokumentiert. Kein Widerspruch, keine Lücke –
   eine bewusste, mehrfach bestätigte Design-Entscheidung ist kein Kandidat für eine neue
   Regel.

Die eigentliche Lehre aus dem #164-Vorfall (Session-Rotation methodenbasiert statt
GET-only unterdrücken) wurde bereits **während der Implementierung** (AC7) in
`docs/factory/PROJECT-CONTEXT.md` als Korrektur des bestehenden #164-Stolpersteins
nachgezogen – inklusive Verweis auf ADR-032 und der Begründung, warum die ursprüngliche
Header-Heuristik (`next-url`/`sec-fetch-dest`) fragil war (Whack-a-Mole: OPTIONS/HEAD blieben
offen). Ein zusätzlicher Codify-Eintrag dafür wäre eine Dopplung derselben Quelle.

### Empfehlung für nächste Features
Keine. Die Pipeline für #170 lief für diesen Scope sauber durch (Requirements → Architecture
→ Implement → Test → Refactor → Review → Security-Review), ohne Iterationsbedarf zwischen
Review und Implement (Circuit Breaker nicht berührt).
