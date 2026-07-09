# Task 22: drei-stage-setup-dev-int-prd

## Status
- [x] In Bearbeitung
- [x] Tests vollständig
- [x] Fertig / PR erstellt

## Beschreibung
3-Stage-Setup DEV/INT/PRD: `lib/stage.ts` (Stage via NEXT_PUBLIC_STAGE), Stage-Banner +
stage-eingefärbtes Icon/Manifest/Titel, dualer DB-Treiber (node-postgres lokal, neon-http
auf Vercel), docker-compose (lokale Postgres), stage-spezifische Env-Dateien + db:*-Scripts,
README-Doku je Stage.

## Akzeptanzkriterien
- [x] GIVEN NEXT_PUBLIC_STAGE=dev|int|prd THEN Banner (DEV/INT) + Icon/Titel je Stage; PRD ohne Banner
- [x] GIVEN lokale/Neon-URL THEN db/index.ts wählt node-postgres bzw. neon-http automatisch
- [x] GIVEN Stages THEN db:migrate/db:migrate:int/db:migrate:prd + docker-compose vorhanden
- [x] GIVEN Doku THEN README beschreibt DEV/INT/PRD-Setup inkl. Vercel-Branch-Modell
- [x] build/lint/test/format:check grün (2 Test-Files)

## Technische Notizen
- Treiberwahl an DATABASE_URL (Neon-Host → neon-http, sonst node-postgres), db lazy (Build ohne Secret grün).
- INT branch-basiert (`int` → Vercel Preview), branch-spezifische Env-Vars.
- Env-Dateien `.env.local|int|prd` gitignored; Migrationen laufen DEV → INT → PRD.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/22-drei-stage-setup-dev-int-prd`
Erstellt: 2026-07-09 07:01
