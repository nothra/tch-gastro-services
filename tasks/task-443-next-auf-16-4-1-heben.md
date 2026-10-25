# Task 443: next-auf-16-4-1-heben

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
`next` von 16.3.8 auf die neueste 16.4.x (≥ 16.4.1) heben – schließt 2 kritische RCEs + 1 DoS.
Spec: [`docs/specs/spec-443-next-16-4-1-rce-dos.md`](../docs/specs/spec-443-next-16-4-1-rce-dos.md)

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [ ] `next` exakt ≥ 16.4.1 in package.json + Lockfile
- [ ] Advisory-Abgleich: GHSA-2464-fhr4-w9xw, GHSA-673q-mjm6-r5xr, GHSA-p3m5-59mp-jv5r nicht mehr einschlägig
- [ ] `pnpm build` grün (inkl. PWA)
- [ ] Gates (Lint, Typecheck, Tests) grün
- [ ] Auth-E2E grün
- [ ] `/_next/image`-Rauchtest: 200 + Bild-Content-Type
- [ ] Server Action unverändert funktionsfähig
- [ ] postcss-Pin gemessen, Overrides/Kommentare in `pnpm-workspace.yaml` angepasst
- [ ] `Closes #443` im PR-Body; Alert-Schließung nach Merge am Default-Branch prüfen
- [ ] Fehlerszenarien (Blocker-Doku, Audit-Fallback, CLAUDE.md-Block entfernt) beachtet

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `chore/443-next-auf-16-4-1-heben`
Erstellt: 2026-10-25 20:01
