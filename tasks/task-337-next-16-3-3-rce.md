# Task 337: next-16-3-3-rce

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
`next` auf ≥ 16.3.3 heben — schließt zwei kritische unauth. RCE-GHSAs
(GHSA-2xp9-vwfh-vxw4, GHSA-p293-qw3h-jr36). Gebündelt mit einem Deps-Durchgang
für weitere offene Dependabot-Alerts, die das Lockfile-Refresh mitzieht
(sharp, browserslist/#329, js-yaml, baseline-browser-mapping, vitest).
Spec: `docs/specs/spec-337-next-16-3-3-rce.md`.

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [ ] `next` ≥ 16.3.3 aufgelöst; beide GHSAs (GHSA-2xp9, GHSA-p293) geschlossen
- [ ] `sharp`, `browserslist`, `js-yaml`, `baseline-browser-mapping`, `vitest`/`@vitest/mocker`
      auf/über dem Floor aus der Spec aufgelöst
- [ ] #329 (browserslist) via `Closes #329` im PR-Body mitgeschlossen
- [ ] `pnpm build` grün (inkl. `@serwist/next`-PWA-Build)
- [ ] Auth-E2E (Login, Rollen-Gate, Logout) grün gegen next 16.3 + next-auth v5-beta
- [ ] `/_next/image`-Rauchtest gegen lokales `public/`-Asset liefert weiterhin ein optimiertes Bild
- [ ] #169 neu bewertet: postcss-Pin von next 16.3 geprüft, Override entsprechend
      entfernt oder Kommentar aktualisiert
- [ ] Security-Overrides (`sharp`, `js-yaml`) auf No-op geprüft und ggf. entfernt/angehoben

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
Kein ADR-Trigger — reiner Dependency-Bump ohne Architekturentscheidung. `/architecture`
wird für diese Task übersprungen.

**Reachability-Korrektur (wichtig für Verifikation):** `next/image` wird im App-Code
nirgends importiert, `next.config.ts` hat keine `images`-Config. `/_next/image` ist
trotzdem als Next.js-Framework-Default aktiv (kein `images.unoptimized`) und bedient
lokale `public/`-Assets unauthentifiziert — GHSA-2xp9 ist darüber erreichbar, nicht weil
die App die `next/image`-Komponente nutzt. Der `sharp`-Kommentar in `pnpm-workspace.yaml`
(#291) bleibt in seiner engeren Aussage korrekt (Komponente ungenutzt), ist aber für die
Routen-Erreichbarkeit nicht die vollständige Geschichte.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
Keine — Scope (voller Deps-Durchgang statt Einzel-PR) und Reachability-Einschätzung
sind mit dem Nutzer abgestimmt (siehe Spec).

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `chore/337-next-16-3-3-rce`
Erstellt: 2026-09-15 21:40
