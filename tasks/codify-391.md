## Codify-Report: Task 391

### Neue Regeln hinzugefügt
- `docs/factory/lessons/factory-workflow.md` + Index-Zeile in `PROJECT-CONTEXT.md`: Rework-Ende = sauberes
  `git status` + Commit (Code und Task-Datei) vor dem nächsten `/review` – wegen: Rezidiv #251, Iteration 2 meldete
  die ungecommittete Nacharbeit als Kritisch.
- Gleiche Dateien: Verschobener UI-Einstiegspunkt → E2E-Helfer, Capture-Spec, Screenshots, Anleitung per Grep im
  selben Schritt mitziehen – wegen: Iteration-1-Findings, die kein Unit-Test/Lint abdeckt.

### Keine Änderungen nötig
Security-Review ohne Findings (reine UI-Umordnung, Actions/Auth unverändert); Refactor- und Test-Lauf ohne Befund.
Kein Issue/Kleinfund nötig, kein neuer Check.

### Empfehlung für nächste Features
Beim Verschieben von UI-Einstiegen die Checkliste (E2E, Capture, Anleitung) schon in `/implement` abarbeiten.
