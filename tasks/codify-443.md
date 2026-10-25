## Codify-Report: Task 443

### Neue Regeln hinzugefügt
- `docs/project/lessons/next-auth.md` – Nachtrag `/_next/image`-Rauchtest: `/favicon.ico` (200) als Nachweis, SVG-400 ist erwartetes Verhalten – wegen: Rauchtest-Befund (Rezidiv-Familie #337)
- `docs/project/lessons/build-tooling.md` – next-Bump: `eslint-config-next` mitheben, untracked `AGENTS.md` nach `next dev` löschen – wegen: in der Spec nicht genannter versionsgleicher Pin, Rezidiv der `next dev`-Artefakt-Lesson (#337/#369)
- `docs/factory/PROJECT-CONTEXT.md` – zwei Index-Zeilen zu den obigen Lessons

### Folge-Arbeit
- Issue #446 (zod ≥ 4.6.6) neu angelegt in /review; `source-map-js` bereits #412. Kein weiterer Fund.

### Keine Änderungen nötig
- Review/Security-Review ohne Kritisch-/Wichtig-Findings; Prozess lief ohne Nacharbeit-Runde.

### Empfehlung für nächste Features
- Für weitere Dependabot-Bumps der Linie: Spec direkt aus #443 ableiten (Registry-Bulk-Abgleich mit Gegenprobe, `/favicon.ico`-Rauchtest, Opt-in-E2E für Server-Action-Nachweis).
