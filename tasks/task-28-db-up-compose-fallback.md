# Task 28: db:up Compose-Fallback + .env.example schärfen

## Status
- [x] In Bearbeitung
- [x] Fertig / PR erstellt

## Beschreibung
Verifizierung der lokalen/INT-Umgebung und kleine Doku-Korrektur:
- `.env.example`: stage-abhängige Werte präzisiert (NEXT_PUBLIC_STAGE je Datei:
  local=dev / int=int / prd=prd) und Neon-URL-Beispiel inkl. optionaler Parameter
  (sslmode, channel_binding).
- `db:up`/`db:down`: Compose-V2→V1-Fallback (`docker compose … || docker-compose …`)
  ist bereits vorhanden und wurde auf einem V1-only-System als funktionierend verifiziert.

## Akzeptanzkriterien
- [x] `.env.example` eindeutig je Stage
- [x] `pnpm db:up`/`db:down` funktionieren mit Compose V1 und V2 (verifiziert V1)
- [x] build/lint/test/format:check grün

## Kontext (Verifikation dieser Session)
- INT-DB-Verbindung ok (neondb, 4 Tabellen, Region Frankfurt).
- Lokale DEV-DB via Docker hochgezogen, migriert, Admin geseedet.
- PRD-Deployment geprüft: `/`→307→/login, Manifest = prd (teal, /icon-prd.svg), kein Banner.

---
Branch: `chore/28-db-up-compose-fallback`
Closes #28
