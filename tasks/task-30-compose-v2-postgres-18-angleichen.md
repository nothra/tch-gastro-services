# Task 30: compose-v2-postgres-18-angleichen

## Status
- [x] In Bearbeitung
- [x] Tests vollständig
- [x] Fertig / PR erstellt

## Beschreibung
Lokale DEV-Umgebung auf Docker Compose v2 (V2-only-Skripte) und lokale Postgres von
16-alpine auf **18-alpine** (= Neon 18.4) umgestellt. Compose-V2-Plugin lokal via Homebrew
verlinkt.

## Akzeptanzkriterien
- [x] `docker compose version` liefert v2; `pnpm db:up`/`db:down` nutzen `docker compose` (V2-only)
- [x] `docker exec tch-gastro-db postgres --version` = 18.4 (= Neon)
- [x] lokale DB neu aufgesetzt (Volume-Reset), migrate + seed grün
- [x] build/lint/test/format:check grün

## Technische Notizen
- **PG18-Image-Änderung:** Daten liegen unter `/var/lib/postgresql/<major>` → Volume-Mount von
  `/var/lib/postgresql/data` auf **`/var/lib/postgresql`** umgestellt (docker-library/postgres#37),
  sonst crash-loop ("unused mount/volume").
- Compose V2 wird über `~/.docker/cli-plugins/docker-compose` → Homebrew-Binary bereitgestellt
  (Colima-Engine bleibt).
- Volume-Reset = DEV-Datenverlust (nur lokal); INT/PRD unberührt.

## Offene Fragen
- Keine.

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `chore/30-compose-v2-postgres-18-angleichen`
Erstellt: 2026-07-10 18:24
