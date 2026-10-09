## Codify-Report: Task 405

### Neue Regeln hinzugefügt
- `lessons/frontend-react.md` + Index (`PROJECT-CONTEXT.md`) – Ersatz-Fokusziel in zugeklapptem `<details>`: auf `<summary>`
  ausweichen, beide Richtungen + Playwright-Gegenprobe – wegen: Fokus fiel auf `<body>`, jsdom sah es nicht (Familie #371/#373).
- `lessons/frontend-react.md` + Index – Komponente mit Ref-Prop: Props vorab destrukturieren (`react-hooks/refs`),
  Union mit `never`-Gegenstücken – wegen: Lint-Treffer bei `ListenZeile`.

### Keine Änderungen nötig
Review APPROVED ohne kritische/wichtige Findings, Security-Review ohne Befund. Die Nitpicks 1 und 3 (Styling-Selektor im
Reihenfolge-Test, E2E-Kommentar) sind in `/refactor` erledigt; Nitpick 2 (`useErsatzFokus` ohne eigenen Test) geht an `/test`.
Der Out-of-Scope-Fund (duplizierte Aktiv-Umschalten-Formulare) steht in `kleinfunde.md`. Die Lessons #371 (Gegenprobe auf
ungelisteten Nachbarn), #370 und #211 haben gegriffen – kein Rezidiv.

### Empfehlung für nächste Features
`/test` steht in der Task-Datei noch offen: `useErsatzFokus` bekommt einen eigenen Test (Review-Nitpick 2). Ändert `/test` nur
Testdateien, bleibt der Security-Bericht gültig.
