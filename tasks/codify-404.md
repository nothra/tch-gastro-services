## Codify-Report: Task 404

### Neue Regeln hinzugefügt
- `docs/factory/lessons/frontend-react.md` – „Schrittwechsel im selben Dialog: Fokus explizit setzen, `autoFocus` greift nur beim Mount" – wegen: Review-Iteration 1 W1 (kein Fokus-Ziel nach Schrittwechsel) und Iteration 2 (Leer-Zweig, erneutes Öffnen ungetestet). Index-Zeile in `PROJECT-CONTEXT.md` (Gruppe `frontend-react.md`).
- `docs/factory/lessons/factory-workflow.md` – „Rezidiv #375/#345: Anker und Fix-Empfehlungen im selben PR prüfen" – wegen: Review-Iteration 2, beide Wichtig-Funde waren vom eigenen Rework erzeugte Doku-Drift (Glossar-Anker `:29` → `:36`; Kleinfund empfahl `db.transaction()` gegen Lesson #345). Index-Zeile mit „Laden bei"-Trigger in `PROJECT-CONTEXT.md`.

### Keine Änderungen nötig
- Offen gehaltene Promises im Dialog-Test (Iteration 1): bereits durch Lesson #370 abgedeckt, im Rework befolgt – kein neues Learning.
- Review-Nitpicks (Bausteine statt Handnachbau, ADR-053-Drift): durch bestehende Lessons (#371/#373, ADR-Drift #55/#211) gedeckt.
- Security-Review: keine Findings. Out-of-Scope-Funde sind bereits kanonisch erfasst (Issue #416, Kleinfund „`createWalkInAction` nicht atomar"); keine neuen Issues/Kleinfunde.

### Empfehlung für nächste Features
- Vor dem Merge (menschlicher Schritt, kein Agenten-Fund): `docs/anleitung/veranstalter/bilder/06-teilnehmer-hinzufuegen.png` neu erzeugen (zeigt noch „Neuer Gast").
- Beim nächsten Anfassen von `app/veranstaltung/actions.ts` (`waehlbareTeilnehmer`) den Kommentar-Begriff angleichen, falls noch „Stammteilnehmer" steht.
