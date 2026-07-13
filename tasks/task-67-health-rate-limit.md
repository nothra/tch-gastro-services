# Task 67: health-rate-limit

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung

Härtung des öffentlichen, unauthentifizierten `/api/health`-Endpunkts gegen
Neon-Free-Amplifikation. Der Endpunkt löst heute pro Request genau einen Neon-DB-Roundtrip aus
(`db.select({ roles }).from(users).limit(1)`), der Schema-Drift erkennt. Ein **Rate-Limit**
deckelt, **wie oft** dieser DB-Read pro Zeitfenster ausgeführt wird → DB-Last wird von der
Request-Zahl entkoppelt. Der Endpunkt bleibt **unauth** und für den Deploy-Gate-Healthcheck
(`200`/`503`) nutzbar.

- **Issue:** #67 · **Typ:** enhancement · security · tech-debt
- **Spec:** `docs/specs/spec-67-health-rate-limit.md`
- **Quelle:** Backlog-Härtung aus `tasks/review-63.md` (Z. 39–40), `tasks/security-63.md` (Z. 26–28)
- **Schutzart (entschieden):** Rate-Limit (Flood-Schutz), **kein** Response-Caching.
- **DB-Read (entschieden):** bleibt erhalten (Schema-Drift-Erkennung), läuft aber nur für erlaubte Anfragen.

## Akzeptanzkriterien

- [ ] AK-1: GIVEN Rate unter Schwellwert WHEN `GET /api/health`, DB erreichbar, Schema ok
  THEN DB-Read läuft, Antwort `200 {status:"ok", stage:…}` (unverändert, keine DB-Daten im Body)
- [ ] AK-2: GIVEN Rate unter Schwellwert WHEN DB-Read schlägt fehl
  THEN `503 {status:"error"}` + server-seitiges `console.error` (unverändert)
- [ ] AK-3: GIVEN N ≫ Schwellwert Anfragen/Fenster WHEN alle gegen `/api/health`
  THEN ausgeführte DB-Reads ≤ Schwellwert pro Fenster (DB-Last von Request-Zahl entkoppelt)
- [ ] AK-4: GIVEN Schwellwert im Fenster erreicht WHEN weitere Anfrage
  THEN Throttle-Antwort **ohne** DB-Read (deterministischer Status, z. B. `429`)
- [ ] AK-5: GIVEN Deploy-Gate führt seinen einzelnen post-promote Healthcheck aus
  THEN Anfrage wird nicht gedrosselt → **live** `200`/`503` aus dem DB-Read
- [ ] AK-6: GIVEN nicht angewandte Migration (fehlende `roles`-Spalte) WHEN Gate-Healthcheck
  THEN DB-Read schlägt fehl → `503` (Schema-Drift bleibt sichtbar)

### Fehlerszenarien
- [ ] FS-1: Limiter-Zustand nicht verfügbar → legitimer Healthcheck wird nicht blockiert (fail-open)
- [ ] FS-2: Kein Gate-Lockout durch Fluten (per-Quelle oder hoher Schwellwert + fail-open)
- [ ] FS-3: Throttle-Pfad nicht langsamer als der DB-Pfad

## Technische Notizen
<!-- Von /architecture befüllt -->

## Offene Fragen
- [ ] Geteilter Zustands-Store (Vercel KV/Upstash) vs. Best-Effort pro Function-Instanz (YAGNI-Abwägung)
- [ ] Zähl-Dimension: global vs. per-Quelle (IP/Header, spoofbar) vs. Route-Kappe (hängt an FS-2)
- [ ] Parameter: Fenstergröße / Schwellwert / Throttle-Statuscode
- [ ] fail-open vs. fail-closed bei Limiter-Störung (endgültig in ADR)

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/67-health-rate-limit`
Erstellt: 2026-07-13 06:37
