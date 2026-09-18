# Coverage-Report: Task 348

## Statement-/Branch-Coverage (`pnpm test:coverage`, Vitest v8)

**Nicht ausgeführt – nicht anwendbar.** Der Diff dieser Task berührt keine Anwendungs-
(TypeScript-)Datei unter `app/`, `db/`, `lib/`: geändert wurden ausschließlich
`scripts/checks/config-validation-check.sh` (Bash), `factory.config.yml` (YAML-Kommentare +
ein Wert), `scripts/checks/tests/run-tests.sh` (Bash-Testsuite) und Doku (ADR/Lesson/Spec/
Task). Die 80 %-Vitest-Coverage-Schwelle aus `docs/factory/PROJECT-CONTEXT.md` bezieht sich auf
die App-Codebasis und bleibt durch diesen PR unverändert (Baseline unberührt, da 0 App-Dateien
im Diff).

Die relevante „Testsuite" für diese Task ist die Bash-Tabellen-Suite
`scripts/checks/tests/run-tests.sh` (kein Coverage-Tool, Verhalten wird über
Positiv-/Negativ-Fixtures + End-to-End-Aufrufe belegt, siehe unten).

## AK-Vollständigkeit (spec-348, AC1–AC8)

| AC | Beschreibung | Test | Positiv/Negativ | Status |
|----|--------------|------|------------------|--------|
| AC1 | ADR begründet neue Ceiling mit Eskalationshistorie (#49/#53/#324), nicht nur #324 | [ADR-051](../docs/adr/051-turn-limit-ceiling-implement-80.md) „Kontext"-Tabelle | Doku/Review (kein automatisierter Test möglich – Design/Intent, ADR-009 §G) | ✅ |
| AC2 | `MAX_TURNS_CEILING=80` im Gate-Skript, Kommentar aktualisiert | `config-validation-check.sh:36` + Gate-Verhalten (AC4/AC5) | Positiv (Wert), Verhalten indirekt über AC4/AC5 | ✅ |
| AC3 | `skills.implement.max_turns: 80` in `factory.config.yml`, `@reason` aktualisiert | `factory.config.yml:56` + „#348: realer Repo-Override löst implement end-to-end zu max 80 turns auf" (neu, `run-tests.sh`) | Positiv, End-to-End | ✅ |
| AC4 | Gate akzeptiert `max_turns: 80` | „Gate #348: max_turns = 80 (neue Ceiling) → exit 0" (neu) | Positiv (Grenzfall) | ✅ |
| AC5 | Gate lehnt `max_turns: 81` weiterhin fail-closed ab | „Gate #348: max_turns = 81 (über neuer Ceiling) → fail-closed" (neu) | Negativ (Grenzfall) | ✅ |
| AC6 | Effektive Config trägt 80 in `run-pipeline.sh` für `/implement` (kein stiller Fallback) | „#348: realer Repo-Override löst implement end-to-end zu max 80 turns auf" (neu – nutzt den **realen** `factory.config.yml`, nicht nur einen synthetischen Testwert) | Positiv, End-to-End | ✅ |
| AC7 | Andere Skills (`pr-shepherd`/`codify`/`test`) unverändert (20/30/40) | Diff-Review (keine Zeilenänderung) + AK2-Realdatei-Gate-Test bleibt grün | Regressions-Check | ✅ |
| AC8 | ADR-Drift-Freiheit (009/010 konsistent mit neuer Ceiling) | ADR-010 Blockquote-Erweiterung; ADR-009 §6 bewusst unverändert (kein Zahlenwert dort) | Review (Doku-Konsistenz) | ✅ |

**Fehlerszenarien (spec-348):**
- Override 51–80 für einen ANDEREN Skill wird ebenfalls akzeptiert (globale Ceiling) – durch
  Konstruktion abgedeckt (kein skill-spezifisches Limit im Gate), keine eigene Regression nötig.
- Tippfehler-Key, `max_turns: 0`, nicht-Integer bleiben fail-closed – bestehende Fixtures
  (`typo.yml`, `zero.yml`, `nonint.yml`) unverändert grün (Regression bestätigt, volle Suite).

## Testsuite-Ergebnis

- **RED** (vor der Ceiling-Änderung, direkte Gate-Probe + neue Fixtures): 1562 grün, 1 rot
  (genau `Gate #348: max_turns = 80`).
- **GREEN** (nach `MAX_TURNS_CEILING=80` + `factory.config.yml`-Update): 1563 grün, 0 rot.
- **Nach `/test`-Ergänzung** (End-to-End-Test AC6/AC3, realer Repo-Override): **1564 grün, 0 rot**.
- `pnpm lint`, `pnpm test` (812 Tests), `pnpm typecheck`, `pnpm format:check`,
  Routen-Doku-Drift-Check: alle grün (unverändert, kein App-Code betroffen).

## Fehlende Tests, die geschrieben wurden

- End-to-End-Assertion „realer Repo-Override löst implement end-to-end zu max 80 turns auf"
  (`scripts/checks/tests/run-tests.sh`, Abschnitt „Factory-Config Phase 1b") – schließt die
  einzige echte Lücke: die bisherigen Gate-Tests (AC4/AC5) belegen nur, dass das Gate den Wert
  80 als *gültig* einstuft, nicht, dass `run-pipeline.sh` ihn auch tatsächlich für `/implement`
  *anwendet*. Nutzt bewusst die **reale** `factory.config.yml` (nicht einen weiteren
  synthetischen Wert), um genau AC6 ("kein stiller Fallback") direkt zu belegen.

## Keine weiteren Lücken

Kein Mocking von internem Code nötig (reine Bash/Config-Änderung, keine externen Systeme).
Keine Test-Helfer dupliziert – die neue Assertion erweitert den bestehenden TMP_CFG-Scaffold
der Phase-1b-Sektion um einen dritten Schritt, statt einen eigenen Scaffold aufzubauen.
