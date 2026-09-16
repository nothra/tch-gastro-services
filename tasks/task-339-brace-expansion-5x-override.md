# Task 339: brace-expansion-5x-override

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Dritter, konditionaler `brace-expansion`-Override (4.x/5.x-Linie, Selektor
`>=4.0.0 <5.0.9`, Ziel-Range als Caret innerhalb der 5er-Linie) gegen zwei neue
High-Advisories (GHSA-mh99-v99m-4gvg, GHSA-rgw5-rvv9-x895), gefunden in der Security-Review
von Task 337. Betroffen: `brace-expansion@5.0.7` im Lockfile (dev-only, via
`minimatch@10.2.5` → `@typescript-eslint/typescript-estree`). Details: Spec-339.

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
Siehe [`docs/specs/spec-339-brace-expansion-5x-override.md`](../docs/specs/spec-339-brace-expansion-5x-override.md).
- [ ] Dritter Override-Eintrag in `pnpm-workspace.yaml` (`brace-expansion@>=4.0.0 <5.0.9` → Caret-Range)
- [ ] Keine aufgelöste `brace-expansion`-4.x/5.x-Kopie unter 5.0.9 im Lockfile
- [ ] No-op-Kriterium gemessen (Override entfernen, neu auflösen, tatsächliche Version dokumentieren)
- [ ] Floor-Guard in `scripts/checks/tests/run-tests.sh` (`floor_cases_291`) um dritten Fall erweitert
- [ ] Bestehende 1.x/2.x-Overrides und -Guards unverändert
- [ ] Pre-Push-Checks (Lint, Tests, Typecheck, Format) grün

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `fix/339-brace-expansion-5x-override`
Erstellt: 2026-09-16 11:54
