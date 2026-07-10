# Task 36: e2e-timeouts-int-remote

## Status
- [x] In Bearbeitung
- [x] Tests vollständig
- [x] Fertig / PR erstellt

## Beschreibung
E2E-Timeouts remote-tauglich gemacht: `expect.timeout=15s`, `actionTimeout=15s`,
`navigationTimeout=30s` in playwright.config.ts. Der INT-Login funktioniert (POST /login →
303 → /), war aber langsamer als das 5-s-Default.

## Akzeptanzkriterien
- [x] `pnpm test:e2e:int` grün — **4 passed** gegen echte INT-Umgebung (Bypass, Banner, Login, Falsch-Login)
- [x] `pnpm test:e2e` (lokal) weiterhin grün (4 passed)
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
Branch: `fix/36-e2e-timeouts-int-remote`
Erstellt: 2026-07-10 19:34
