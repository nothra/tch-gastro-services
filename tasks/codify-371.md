## Codify-Report: Task 371

### Neue Regeln hinzugefügt
- `docs/factory/lessons/frontend-react.md` + Index-Zeile in `PROJECT-CONTEXT.md` – Statuswechsel, der den
  Seitenzweig tauscht, remountet den Auslöser; Fokus-Rückgabe im Erfolgsfall gesondert festlegen und
  testen – wegen: Review-Nitpick 1 (Fokus landet vermutlich auf `<body>`, nicht per Test belegt).
- `docs/factory/lessons/testing.md` + Index-Zeile (mit „Laden bei") – Negativ-Fixture auf einem realen
  Pfad bricht, sobald dieser in eine Gate-Liste (`eslint/ui-token-files.mjs`) kommt – wegen:
  /implement-Selbstfund im `color-gate-wiring`-Test.

### Keine Änderungen nötig
- Review (APPROVED, 0 kritisch/0 wichtig) und Security-Review (PASSED) ohne weitere Muster. Die
  Nitpicks 2 und 3 (stehende Erfolgs-Notice, Abschluss-Link bei abgeschlossener Veranstaltung) sind
  Produktentscheidungen, keine Fehlermuster.
- Bereits gelernt und diesmal korrekt befolgt (keine neue Regel): StatusToggle-Doku-Sweep per Grep (#370),
  eigener Dev-Server auf freiem Port (#368), Lesson #370 für den Test mit offen gehaltener Action,
  `.env.local`-Guardrail (#370).

### Empfehlung für nächste Features
- Fokus nach erfolgreichem Statuswechsel in #372 (einheitliches Bestätigen/Rückmelden) mitnehmen.
- Menschlicher Nachtest vor dem Merge: Anleitungsbilder `10-kassieren.png`/`11-abrechnung.png` neu
  erzeugen (Capture-Spec, frisch geseedete DB) und die 375-px-Screenshots an den PR hängen.
- Offene Frage zur Task: Protokoll langfristig auf die Detailseite? (ggf. eigenes Issue).
