# Task 448: zod-auf-4-6-6-heben

## Status
- [ ] In Bearbeitung
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
- [ ] AK1: `package.json` hat `zod` als Caret in 4.x mit Untergrenze >= 4.6.6
- [ ] AK2: Lockfile enthält keine `zod`-Version < 4.6.6 (auch transitiv)
- [ ] AK3: `pnpm test`, Lint, Typecheck, `pnpm build` grün
- [ ] AK4: DB-Integrationstests (mit dotenv) grün
- [ ] AK5: Advisory-Prüfung meldet für `zod` nichts Offenes

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `chore/448-zod-auf-4-6-6-heben`
Erstellt: 2026-10-26 07:57
