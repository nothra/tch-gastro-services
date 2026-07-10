# Task 46: int-db-refresh-von-prd-automatisieren-im-gate

## Status
- [x] In Bearbeitung
- [x] Fertig / PR erstellt

## Beschreibung
INT-DB-Refresh an jeden INT-Deploy koppeln (ADR-015): Das Deploy-Gate setzt vor den E2E den
INT-Neon-Branch von PRD zurück, anonymisiert, migriert und seedet den INT-Admin. Neues Skript
`scripts/neon-reset-int.sh` (Neon Restore-API „Reset from parent" + Operationen-Polling).
Refresh-Schritte sind an das Vorhandensein der Neon-Secrets gebunden (fehlen sie → mit Warnung
übersprungen, kein Reset), laufen sonst fail-closed (Fehler → kein Promote).

## Akzeptanzkriterien
- [x] `scripts/neon-reset-int.sh` resettet INT von PRD und pollt Neon-Operationen (fail-closed)
- [x] `deploy-gate.yml`: Reset → anonymisieren → migrieren → seed vor „Auf INT-Build warten"
- [x] Refresh konditional (Neon-Secrets vorhanden), sonst übersprungen mit `::warning::`
- [x] ADR-015 dokumentiert Kopplung, Reihenfolge, DSGVO-Restfenster, fail-closed
- [x] README (INT + Deploy-Gate) und `.env.example` um Neon-Secrets/Reset ergänzt
- [ ] (nach Merge + Secrets) Gate-Lauf grün: Refresh aktiv, E2E grün, Promote erfolgt

## Technische Notizen
- Reihenfolge anonymisieren **vor** migrieren minimiert das PII-Fenster (Anonymisierung fasst
  nur PRD-Baseline-Spalten an). Neue PII-Spalten → in `db/anonymize.ts` ergänzen (ADR-015).
- Nötige Secrets: `NEON_API_KEY`, `NEON_PROJECT_ID`, `NEON_INT_BRANCH_ID`, `NEON_PRD_BRANCH_ID`,
  `INT_DATABASE_URL`; `SEED_ADMIN_*` = bestehende `E2E_ADMIN_*`.
- `.env.int` wird im Refresh-Schritt aus Secrets erzeugt (die db:*:int-Scripts nutzen dotenv),
  danach wieder gelöscht.

Blocker: keine.

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/46-int-db-refresh-von-prd-automatisieren-im-gate`
Erstellt: 2026-07-10 23:15
