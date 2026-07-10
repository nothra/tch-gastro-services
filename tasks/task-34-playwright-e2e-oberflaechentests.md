# Task 34: playwright-e2e-oberflaechentests

## Status
- [x] In Bearbeitung
- [x] Tests vollständig
- [x] Fertig / PR erstellt

## Beschreibung
Playwright-E2E-Oberflächentests: playwright.config.ts (baseURL je Stage, Vercel-Bypass-Header,
webServer nur lokal), e2e/auth.spec.ts (Redirect-Schutz, Login-Formular, Admin-Login,
Falsch-Login-Fehler, Stage-Banner), Scripts test:e2e / test:e2e:int. Nicht im CI-Gate.

## Akzeptanzkriterien
- [x] `pnpm test:e2e` (lokal DEV) grün — 4 passed (Redirect, DEV-Banner, Login, Falsch-Login)
- [x] `pnpm test:e2e:int` lauffähig vorbereitet (nutzt Bypass-Header + INT-Admin) — läuft, sobald
      `VERCEL_AUTOMATION_BYPASS_SECRET` in `.env.int` gesetzt ist
- [x] build/lint/unit/format grün; Playwright-Artefakte gitignored

## Technische Notizen
- baseURL/Server aus NEXT_PUBLIC_STAGE abgeleitet (dev→localhost+webServer, int→INT-URL).
- Bypass via `x-vercel-protection-bypass` (+ set-bypass-cookie) aus VERCEL_AUTOMATION_BYPASS_SECRET.
- Chromium-Browser lokal installiert (nicht committet); E2E bewusst NICHT im CI-`test`-Gate.

## Offene Fragen
- INT-Lauf steht aus, bis der Vercel-Bypass-Secret vorliegt (Dashboard-Aktion des Nutzers).

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/34-playwright-e2e-oberflaechentests`
Erstellt: 2026-07-10 19:19
