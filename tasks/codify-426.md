## Codify-Report: Task 426

### Neue Regeln hinzugefügt
- `docs/factory/lessons/testing.md` (+ Index-Zeile in `PROJECT-CONTEXT.md`) – Test, der die Git-Historie liest (`git log --follow`), braucht in CI einen sichtbaren Shallow-Clone-Skip – wegen: AK-B1-Test wäre auf dem flachen `actions/checkout` rot, lokal grün.
- `docs/factory/lessons/code-style.md` (+ Index-Zeile) – BSD-`awk`: Zeichen-Mitgliedschaft per `index()` statt Bracket-Ausdruck mit `\\`/`[`/`]` – wegen: Glob→Regex-Übersetzer in `ownership-check.sh` verhielt sich unter macOS-awk falsch.
- `docs/factory/lessons/factory-workflow.md` (+ Index-Zeile mit Trigger) – Repo-weite Referenz-Scanner nehmen `tasks/patch-*.diff` per Pathspec aus – wegen: `adr-links-check.sh` meldete Links im Patch (künftiger Stand) als tot.
- Zuordnung nach der neuen Regel: alle drei betreffen Factory-Dateien (Skripte/Self-Tests) → `docs/factory/lessons/`, Index-Gruppe „Factory-Lessons“.

### Keine Änderungen nötig
- Kein Eintrag in CLAUDE.md/Guidelines: nichts davon ist taskübergreifend genug für Dauerkontext; @import-Deckel 968 von 1100.
- Bereits vorhandene Lessons deckten ab (nicht doppelt aufgenommen): `grep -q` + `pipefail`/SIGPIPE (bash-gotchas #3), Selbsttreffer-Literale im Content-Scan (#319), verlustfreie Doku-Migration per Rekonstruktions-Assertion (#196), Inline-Nachbau vorhandener Assert-Helfer (#267/#310 – im `/refactor` wieder gefunden, Rezidiv, keine neue Regel), `.claude/**` nur über Patch-Workflow.
- Review/Security: keine Kritisch-/Wichtig-Findings, daher keine Fehler-Muster aus den Reports.

### Empfehlung für nächste Features
- #431/#432 (T1a-2/-3): Beim Verschieben jeder Datei die Zeile in `docs/factory/OWNERSHIP.md` im selben Commit nachziehen – `ownership-check.sh` blockiert sonst den Push.
- Vor dem Merge: AK-X2 per `gh pr checks` (Check-Namen unverändert) belegen; AK-X3 (`start-work.sh` Echtlauf) nach dem Merge.
- Nitpick offen: Dateinamen mit `|` werden von `ownership-check.sh` übersprungen (kein Ist-Fall) – bei Gelegenheit fail-closed machen (Kleinfunde-Kandidat).
