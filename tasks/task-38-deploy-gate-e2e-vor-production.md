# Task 38: deploy-gate-e2e-vor-production

## Status
- [x] In Bearbeitung
- [x] Fertig / PR erstellt

## Beschreibung
Deploy-Gate: Push→main → INT auf Commit syncen → auf INT-Build warten (`/api/version`==SHA) →
Playwright-E2E gegen INT → nur bei Grün `main`→`production` (Vercel-Prod-Branch). Neuer
`/api/version`-Endpunkt + Proxy-Ausnahme. Secrets: Bypass + E2E_ADMIN_*.

## Akzeptanzkriterien
- [x] Workflow `deploy-gate.yml` vorhanden; promotet nur bei grünem E2E nach `production`
- [x] `/api/version` liefert SHA/Stage, ist ungeschützt erreichbar (Proxy-Ausnahme)
- [x] build/lint/unit/format grün; deploy-gate.yml YAML valide
- [ ] (nach Merge) Gate-Erstlauf grün → `production` angelegt; danach Nutzer stellt Vercel Prod-Branch um

## Technische Notizen
- Warten deterministisch via `/api/version` (VERCEL_GIT_COMMIT_SHA) statt Deployment-API-Raten.
- `pnpm exec playwright test` mit Env aus Secrets (nicht `test:e2e:int`, das .env.int bräuchte).
- Aktivierung erst scharf, wenn Vercel Production Branch = `production` (README).
- [ ] GIVEN ... WHEN ... THEN ...

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/38-deploy-gate-e2e-vor-production`
Erstellt: 2026-07-10 21:56
