# Task 101: pipeline-quality-gates-echte-befehle

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [x] Codify ausgeführt
- [x] Fertig / PR erstellt

## Beschreibung
<!-- Was soll implementiert werden? -->
Die Stage-3-Pipeline (`scripts/run-pipeline.sh`) ruft ihre Quality Gates
(Lint, Tests, Coverage, Tests nach Rework/Refactoring) noch mit
Platzhalter-`echo`-Befehlen auf (`LINT_COMMAND_PLACEHOLDER`,
`TEST_COMMAND_PLACEHOLDER`, `TEST_COVERAGE_PLACEHOLDER`). `echo` liefert immer
Exit 0 → die Gates sind **fail-open**: Sie melden „bestanden", ohne Lint oder
Tests je auszuführen. Die Pipeline kann so mit rotem Code grün durchlaufen.

Diese Task ersetzt die Platzhalter durch die **echten Befehle** – konsistent mit
`scripts/checks/pre-commit.sh`/`pre-push.sh`, die dieselbe Konvention bereits
nutzen: Env-Override (`FACTORY_LINT_COMMAND`/`FACTORY_TEST_COMMAND`/
`FACTORY_COVERAGE_COMMAND`) mit den pnpm-Defaults aus `PROJECT-CONTEXT.md`
(`pnpm lint` / `pnpm test` / `pnpm test:coverage`). Damit sind die Gates
fail-closed: rotes Lint/rote Tests stoppen die Pipeline (`exit 1`).

Scope-Grenze: nur die Gate-Befehle in `run-pipeline.sh`. Kein Umbau der
`quality_gate`-Funktion, der Phasen-Reihenfolge oder der Hook-Gates
(`pre-commit`/`pre-push` sind bereits echt).

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [x] GIVEN die Pipeline erreicht das Lint-Gate WHEN der konfigurierte
      Lint-Befehl fehlschlägt (Exit ≠ 0) THEN stoppt die Pipeline mit „Gate
      fehlgeschlagen: Lint" und Exit 1 (fail-closed, kein stilles Durchwinken).
      → Verhaltens-Test (non-dry-run, mock `claude`, Marker-Nachweis).
- [x] GIVEN keine Env-Overrides gesetzt WHEN die Gates laufen THEN werden die
      Defaults `pnpm lint` / `pnpm test` / `pnpm test:coverage` verwendet
      (identisch zu `pre-commit.sh`/`pre-push.sh`).
- [x] GIVEN `FACTORY_LINT_COMMAND`/`FACTORY_TEST_COMMAND`/
      `FACTORY_COVERAGE_COMMAND` gesetzt WHEN die Gates laufen THEN gewinnt der
      Env-Override (Kosten-/CI-Hebel, konsistent mit den Hook-Gates).
- [x] GIVEN `run-pipeline.sh` WHEN durchsucht THEN enthält es keinen
      `*_PLACEHOLDER`-Gate-Befehl mehr (Regressions-Guard).

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
- Betroffene Zeilen (vor Fix): `run-pipeline.sh` 389/390 (Lint/Tests), 410
  (Tests nach Rework), 418 (Coverage), 424 (Tests nach Refactoring).
- DRY-RUN bleibt unberührt: `quality_gate` short-circuited bei `DRY_RUN=true`
  (Zeile 263) und führt den Befehl nicht aus – die bestehenden Dry-Run-E2E-Tests
  bleiben grün.
- Tests: `scripts/checks/tests/run-tests.sh` – strukturelle Guards (yq-frei) +
  ein Verhaltens-Test (yq-gated, mock `claude`), der beweist, dass ein rotes
  Lint-Gate die Pipeline non-dry-run stoppt.

- Umgesetzt in `scripts/run-pipeline.sh`: `LINT_CMD`/`TEST_CMD`/`COVERAGE_CMD`
  einmal definiert (nach Phase 1), in allen fünf Gate-Aufrufen genutzt
  (Lint, Tests, Tests nach Rework, Coverage, Tests nach Refactoring).
- `quality_gate` selbst unverändert – DRY-RUN short-circuit (führt Befehl nicht
  aus) bleibt erhalten; die bestehenden Dry-Run-E2E-Tests laufen weiter grün.
- Tests: 5 neue Cases in `scripts/checks/tests/run-tests.sh` (3 strukturelle
  Guards yq-frei, 1 Verhaltens-Test yq-gated). Gesamtsuite: 265 grün / 0 rot.
- ADR-Trigger-Check (Schritt 0): kein Trigger – Tooling-Bugfix auf bestehendem
  Stack (pnpm/vitest/eslint), reversibel, keine Schnittstelle/Persistenz.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
- Keine.

## Review-Findings
<!-- Wird durch /review befüllt -->
**APPROVED** (tasks/review-101.md).

Nitpick adressiert (Clean-Code-Pass):
- `run-tests.sh` Zeile 1513–1515: pnpm-Default-Guard prüfte `pnpm test` als Substring
  und hätte `pnpm test:coverage`-Änderungen nicht erkannt. Explizit auf
  `grep -q 'pnpm test:coverage'` erweitert; Assertion-Label angepasst.
  (Nitpick 2 „Platzierung CMD-Vars" war explizit als kosmetisch eingestuft – nicht angefasst.)

## Codify-Notizen

**1 neue Regel hinzugefügt** (vollständiger Bericht: `tasks/codify-101.md`):

- `docs/factory/guidelines/bash-gotchas.md` **Gotcha #7:** Strukturelle Guards müssen den
  spezifischsten (längsten) String suchen – nie eine Abkürzung, die als Substring einer längeren
  Variante aufgehen kann. Anlass: `grep -q 'pnpm test'` deckte `pnpm test:coverage` nur implizit
  ab; eine Änderung des Coverage-Befehls wäre unentdeckt geblieben.

**Keine weiteren Regeln notwendig:** Security-Hinweis (`eval` via Env-Var) ist etabliertes Muster;
kosmetischer Nitpick zur CMD-Var-Platzierung explizit nicht umgesetzt (Review-Empfehlung).

---
Branch: `fix/101-pipeline-quality-gates-echte-befehle`
Erstellt: 2026-07-14 16:33
