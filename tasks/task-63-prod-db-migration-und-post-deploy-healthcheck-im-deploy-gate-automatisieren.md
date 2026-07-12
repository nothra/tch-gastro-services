# Task 63: prod-db-migration-und-post-deploy-healthcheck-im-deploy-gate-automatisieren

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [ ] Tests vollständig
- [x] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
<!-- Was soll implementiert werden? -->

Lücke aus #48 schließen: Das Deploy-Gate promotet den **Code** nach Production, migriert aber
nur die **INT**-DB – `db:migrate:prd` war ein bewusst **manueller** Schritt. Ergebnis: Prod-Code
kann ein Schema erwarten, das die Prod-DB noch nicht hat (Login bricht). Zusätzlich verifizierte
`post-merge-verify` faktisch nichts (kein Healthcheck konfiguriert, und `/api/version` berührt die
DB nicht).

Diese Task automatisiert die Prod-DB-Migration im Gate (abgesichert durch das INT-Gate + E2E),
legt ein Prod-Login-Seed-Skript an und schärft den Healthcheck. Entscheidung: siehe
[ADR-017](../adr/017-prod-migration-im-deploy-gate.md).

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [ ] GIVEN grüner INT-E2E-Lauf im Deploy-Gate WHEN das Gate weiterläuft THEN wird die
      **Prod-DB automatisch migriert** (`db:migrate:prd`) – **bevor** der Code promotet wird.
- [ ] GIVEN eine fehlschlagende Prod-Migration WHEN das Gate läuft THEN erfolgt **kein** Promote
      nach `production` (fail-closed; Prod-Code bleibt konsistent zum alten Schema).
- [ ] GIVEN fehlende Prod-Secrets (`PRD_DATABASE_URL`/`PRD_ADMIN_EMAIL`/`PRD_ADMIN_PASSWORD`)
      WHEN das Gate startet THEN bricht es mit klarer Fehlermeldung ab (kein stilles Überspringen).
- [ ] GIVEN eine migrierte Prod-DB WHEN das Gate seedet THEN existiert ein Prod-Login
      (`db:seed:prd`, idempotent).
- [ ] GIVEN ein Deploy WHEN Production live ist THEN prüft das Gate `/api/health` (DB-Read auf
      die `roles`-Spalte) und schlägt fehl, wenn die deployte App die (migrierte) DB nicht erreicht.
- [ ] GIVEN `/api/health` WHEN die DB erreichbar & Schema korrekt ist THEN `200 {status:"ok"}`,
      sonst `503 {status:"error"}` – ohne Datenpreisgabe.

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

Ableitung aus [ADR-017](../adr/017-prod-migration-im-deploy-gate.md). Anzufassen:
- **`.github/workflows/deploy-gate.yml`** – Reihenfolge: … E2E@INT grün → **PRD migrieren+seeden**
  → Promote `main`→`production` → **auf PRD-Deploy warten + `/api/health`-Check**. `PRD_DATABASE_URL`,
  `PRD_ADMIN_EMAIL`, `PRD_ADMIN_PASSWORD` in den Pflicht-Secrets-Check.
- **`app/api/health/route.ts`** (NEU, + Test) – Healthcheck mit DB-Read (`roles`-Spalte), 200/503.
- **`package.json`** – `db:seed:prd` (spiegelt `db:seed:int`).
- **README / .env.example** – Prod-Migration jetzt automatisiert; neue CI-Secrets dokumentieren.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
- [x] ADR-würdig (Persistenz/irreversibel) → **entschieden vom Menschen** (automatisieren, durch
      INT-Gate+E2E ausreichend abgesichert) → dokumentiert in [ADR-017](../adr/017-prod-migration-im-deploy-gate.md).

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/63-prod-db-migration-und-post-deploy-healthcheck-im-deploy-gate-automatisieren`
Erstellt: 2026-07-12 06:57
