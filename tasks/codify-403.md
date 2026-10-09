## Codify-Report: Task 403

### Neue Regeln hinzugefügt
- `docs/factory/lessons/testing.md` (+ Index-Zeile, „Laden bei": `/implement`, `/test`, `/review` bei
  env-flag-gesteuerter E2E-Spec oder CSS-Eigenschafts-Assertion) – Opt-in-E2E-Spec, die nie lief, belegt
  nichts; prüfte `transform` statt Tailwind-v4-`rotate`. Wegen: Review-Iteration 1 K1, blieb bis zum
  Circuit Breaker (Iteration 3) ungelaufen.
- `docs/factory/lessons/code-style.md` (+ Index-Zeile) – Rezidiv der „X erzwingt/schützt Y"-Behauptung:
  `group/aufklapper` schützt nicht vor verschachtelten Aufklappern. Wegen: Review-Iteration 2 W1
  (ADR, Kommentar, Testname gleichlautend falsch).

### Keine Änderungen nötig
- Security-Review PASSED ohne Findings → keine Security-Regel.
- Wegwerf-Dateien (`scripts/*403.tmp.sh`), `rm` nicht freigegeben: bereits durch die bestehende Lesson in
  `build-tooling.md` (viertes Vorkommnis #372) abgedeckt; kein neuer Eintrag.
- `border-line-subtle` vs. ADR-052 D2 (Iteration 1 W1) und ADR-055-Nachtrag (W2): einmalige ADR-Pflege,
  durch die bestehende ADR-Drift-Lesson (#55/#211) gedeckt.

### Empfehlung für nächste Features
- Vor dem Merge von Hand: Playwright-Lauf `e2e/bausteine-listenzeile-aufklapper.spec.ts`
  (`E2E_BAUSTEINE_403=1`, lokale DB, eigener Port, `localhost`), danach AK1.2 + Playwright-Checkbox abhaken;
  `scripts/format403.tmp.sh`, `scripts/review403.tmp.sh`, `tasks/telemetry-raw-403-*.tmp.txt` löschen.
- Nitpick aus dem Review: Kurzzeile in ADR-059 (Zeilen ~192–193) neu umbrechen (nur Optik).
- Bei neuen Bausteinen mit Env-Flag-gesteuerter E2E-Spec die Lauf-Freigabe schon in `/implement` klären.
