## Codify-Report: Task 372

### Neue Regeln hinzugefügt
- `docs/factory/lessons/frontend-react.md` – **Overlay außerhalb eines modalen `<dialog>` ist verdeckt und inert** (Portal in den offenen Dialog; Nachweis per Klick + Screenshot, nicht `toBeVisible()`) – wegen: Toast lag unter dem offenen „Einstellungen"-Dialog, E2E war trotzdem grün.
- `docs/factory/lessons/frontend-react.md` – **Rezidiv #373: Erfolgs-Fokus-Vertrag in zwei Hooks kopiert** (ganzen Vertrag extrahieren, Helfer als eigenes Modul) – wegen: Review-Iteration 1/2 fand die Dopplung trotz vorhandener Lesson.
- `docs/factory/lessons/testing.md` – **`getByRole(name)` ist Teilstring-Treffer** (`exact: true` nach neuem Element im Dialog) – wegen: „Meldung schließen" brach drei Specs auf „Schließen".
- `docs/factory/lessons/build-tooling.md`-Index-Zeile (Wegwerf-Artefakte) in `PROJECT-CONTEXT.md` um das vierte Vorkommnis ergänzt (`playwright-372.tmp.config.ts`, `scripts/advisory372.tmp.sh`).
- Alle drei neuen Lessons mit Index-Zeile in `docs/factory/PROJECT-CONTEXT.md` (die Playwright-Lesson mit „Laden bei"-Trigger).

### Keine Änderungen nötig
- Security-Review: keine Findings, daher keine sicherheitsbezogene Regel. Lieferketten-Hinweis zu `react-hot-toast` ist durch die bestehende Lesson (#390) abgedeckt.
- Übrige Review-Nitpicks (ADR „Konsequenzen" unvollständig, `kleinfunde`-Anker, Alias-Konstante) sind Rezidive bereits dokumentierter Lessons (#55/#211, #351, #176); kein neuer Mehrwert.
- Keine Issues/Kleinfunde: Out-of-Scope-Funde (#402, Kleinfunde-Einträge) entstanden schon im `/review`.

### Empfehlung für nächste Features
- **Vor dem Merge manuell löschen** (in der Session war `rm` nicht freigegeben): `playwright-372.tmp.config.ts`, `scripts/advisory372.tmp.sh` (beide gitignoriert).
- Der Erfolgs-Fokus-Vertrag und das Toast-Portal sind jetzt Bausteine – künftige Dialoge nutzen `useFormularDialog`/`useBestaetigung` und `meldeErfolg`, keine eigene Variante.
- `pnpm typecheck` lief in dieser Task nie in der Session (nicht freigegeben) – Beleg kommt erst aus dem pre-push-Gate.
