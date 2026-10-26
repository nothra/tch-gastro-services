# Task 448: zod-auf-4-6-6-heben

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
`zod` auf >= 4.6.6 heben (Dependabot #97, GHSA-mrhx-c7xc-m3w5). Spec: `docs/specs/spec-448-zod-4-6-6-ghsa-mrhx.md`.

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [x] AK1: `package.json` hat `zod` als Caret in 4.x mit Untergrenze >= 4.6.6
- [x] AK2: Lockfile enthält keine `zod`-Version < 4.6.6 (auch transitiv)
- [x] AK3: `pnpm test`, Lint, Typecheck, `pnpm build` grün
- [x] AK4: DB-Integrationstests (mit dotenv) grün
- [x] AK5: Advisory-Prüfung meldet für `zod` nichts Offenes

## Technische Notizen
Kein ADR-Trigger (Versions-Bump einer bestehenden Bibliothek). `zod` 4.4.3 → 4.6.7 (`^4.6.6`), einzige aufgelöste Version (`pnpm why zod`). Gates: lint, tsc, build, `pnpm test` (1769 grün/112 skipped), DB-Suite mit dotenv (1881 grün); npm-Bulk-Advisory für zod@4.6.7 leer. Kein Schema-/Code-Eingriff nötig. Nach-Merge: Dependabot-Alert #97 auf geschlossen prüfen.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `chore/448-zod-auf-4-6-6-heben`
Erstellt: 2026-10-26 07:57
