## Codify-Report: Task 370

### Neue Regeln hinzugefügt
- `lessons/testing.md` + Index – React-19-Async-Actions: nie auflösende Promises halten einen modulweiten Scope offen, spätere Abwesenheits-Tests sind „grün aus dem falschen Grund" – wegen: Selbstfund beim Mutationsbeleg (Review-Runde 2).
- `lessons/factory-workflow.md` + Index – Löschen/Ersetzen eines Moduls: alle Doku-Treffer per Grep im selben Schritt abräumen, Wegwerf-Sonden als `*.tmp.*` – wegen: drei Review-Runden fanden je neue ADR-Treffer (Circuit Breaker), untracked `tmp-debug.test.tsx`.
- `lessons/factory-workflow.md` + Index – E2E im frischen Worktree: `.env.local` ≠ geseedete DB (`CredentialsSignin`), Secret-Datei-Guardrail bei `dotenv` – wegen: erster E2E-Nachtest scheiterte an fehlendem Seed.
- `lessons/build-tooling.md` + Index-Zeile – `next dev` schreibt `CLAUDE.md`: viertes Vorkommnis (#370).

### Keine Änderungen nötig
Security-Review: PASSED ohne Findings, nichts zu codifizieren. Keine neue CLAUDE.md-/Guideline-Regel – alles projekt-/Lesson-spezifisch.

### Empfehlung für nächste Features
- Größere UI-Umbauten mit Modul-Löschung: Doku-Grep (s. o.) schon in `/implement`, spart Review-Zyklen.
- Der `next dev`/`CLAUDE.md`-Effekt ist jetzt viermal aufgetreten – ein Tooling-Fix (eigenes Issue) lohnt sich; hier bewusst nicht angelegt, da bereits in #369 als Folge benannt.
