# Task 12: ci-node-pnpm-setup

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [x] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [x] Fertig / PR erstellt

## Beschreibung
CI-Gates `lint`/`test` scharf schalten: Node+pnpm+`pnpm install --frozen-lockfile`
in beide Jobs, dann FACTORY_*_COMMAND ausführen (fail-closed bleibt). packageManager
in package.json; Repository-Variablen `pnpm lint`/`pnpm test` gesetzt.

## Akzeptanzkriterien
- [x] GIVEN gesetzte Variablen WHEN CI läuft THEN lint + test grün (via pnpm)
- [x] GIVEN fehlende Variable THEN Job failt weiterhin (fail-closed erhalten)
- [x] GIVEN Self-Test WHEN run-tests.sh THEN grün (Gate-Greps unverändert, 148)
- [x] CI-Spiegel lokal grün: `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm test`

## Technische Notizen
- `pnpm/action-setup@v4` liest `packageManager` aus package.json (pnpm@11.10.0);
  `actions/setup-node@v4` mit `cache: pnpm` (action-setup davor).
- Name des Pakets auf `tch-gastro-services` gesetzt.

## Offene Fragen
- Keine.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `chore/12-ci-node-pnpm-setup`
Erstellt: 2026-07-08 21:49
