## Codify-Report: Task 233

### Neue Regeln hinzugefügt

- [`docs/factory/lessons/factory-workflow.md`](../docs/factory/lessons/factory-workflow.md)
  (Volltext) + Index-Zeile in
  [`docs/factory/PROJECT-CONTEXT.md`](../docs/factory/PROJECT-CONTEXT.md) – „AK mit
  Pflichtinhalt in der PR-Beschreibung selbst wird vom Standard-Draft-Body nicht erfüllt":
  Review-Runde 1 (Logik) warf ein kritisches Finding zurück, weil AK-8 einen Inhalt in der
  **PR-Beschreibung selbst** forderte (manueller Vercel-Nachlauf-Schritt), der von keinem
  `/implement`/`/test`/`/security-review`-Schritt automatisch gepflegt wird – diese Skills
  committen nur Repo-Dateien. Muster: Ein Spec-AK, das ein GitHub-Artefakt außerhalb des
  Repo-Inhalts betrifft, braucht einen expliziten `gh pr edit`-Schritt vor `/review`, sonst
  bleibt es unbemerkt bis zur Logik-Runde. Trigger: `/implement`, `/review` – bei einem
  Spec-AK, das Inhalt in der PR-Beschreibung selbst fordert.

### Keine Änderungen nötig

- Der zweite Review-Fund (siebte Doku-Fundstelle `docs/factory/OPERATING.md:82`, nicht in der
  ursprünglichen Sechser-Liste des Issues) ist bereits durch die bestehende Lesson „Terminologie-
  Sweep: `-w`-Grep ist blind für Komposita, und Pfad-Beispiele sind nicht neutral" (aus #144,
  `factory-workflow.md`) abgedeckt – kein neues, distinktes Muster, nur eine weitere Instanz
  desselben bekannten Fehlerbilds. Wurde im Diff via Referenz auf Lesson #144 dokumentiert statt
  eine zweite, redundante Lesson anzulegen.
- Der jest-dom-7-Blockade-Check (AK-7) war eine reine Rechercheaufgabe ohne Prozessfehler –
  kein Lesson-würdiges Muster.
- Keine kritischen/wichtigen Security-Findings (Ergebnis: PASSED) – keine neue Regel nötig.
- Kein Out-of-Scope-Fund oberhalb der Issue-Schwelle (ADR-018/ADR-043) – kein neues Issue,
  kein `kleinfunde.md`-Eintrag.

### Empfehlung für nächste Features

Bei jeder Task mit einem AK, das einen manuellen Nachlauf-Schritt "in der PR-Beschreibung"
verlangt: den `gh pr edit`-Schritt direkt in `/implement` (nicht erst `/review` oder
`/pr-shepherd` überlassen) einplanen, sobald die Draft-PR existiert – spart eine
Review-Rework-Runde.
