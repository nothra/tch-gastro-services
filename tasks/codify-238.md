## Codify-Report: Task 238

### Neue Regeln hinzugefügt
- [`docs/factory/lessons/testing.md`](../docs/factory/lessons/testing.md) – Neuer Eintrag:
  „Flaky Timeout durch unamortisierten teuren Erst-Aufruf: in `beforeAll` aufwärmen mit eigenem,
  endlichem Timeout – nicht das Default-Timeout global erhöhen" – wegen: Der Bug-Fix-Kern dieser
  Task (Root Cause = teure, cachende Erst-Aufruf-Kosten unter Parallellast, fälschlich als reines
  Last-Problem wahrnehmbar) ist ein generalisierbares Muster, das über `eslint.config.test.ts`
  hinaus wieder auftreten kann (jede teure, aber cachende Ressourcen-Resolution in einem ersten
  Testaufruf). Index-Zeile mit Trigger in `docs/factory/PROJECT-CONTEXT.md` ergänzt
  (`/implement`, `/test` beim Testschreiben/Coverage).

### Keine Änderungen nötig
- Review (`tasks/review-238.md`) und Security-Review (`tasks/security-238.md`) meldeten **keine**
  kritischen oder wichtigen Findings. Der einzige Nitpick (doppelter Pfad-Literal
  `"app/layout.tsx"`) wurde bereits im `/refactor`-Schritt durch die benannte Konstante
  `NORMALE_QUELLDATEI` behoben – kein weiterer Regel- oder Guideline-Bedarf daraus.
- Kein neuer automatisierbarer Check nötig: Das Problem war ein Testkörper-Timing-Bug, kein
  wiederkehrender, grep-barer Muster-Fehler.
- Keine Folge-Arbeit außerhalb des Scopes identifiziert → kein neues GitHub-Issue angelegt.

### Empfehlung für nächste Features
Bei künftigen „isoliert grün, unter voller Suite gelegentlich Timeout"-Symptomen zuerst prüfen,
ob der erste Testfall eine teure, aber cachende Operation erstmalig auslöst (Config-Resolution,
Erst-Verbindung, Erst-Kompilierung) – Muster und Fix-Vorlage stehen jetzt in
`docs/factory/lessons/testing.md`.
