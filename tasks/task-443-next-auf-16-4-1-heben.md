# Task 443: next-auf-16-4-1-heben

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
`next` von 16.3.8 auf die neueste 16.4.x (≥ 16.4.1) heben – schließt 2 kritische RCEs + 1 DoS.
Spec: [`docs/specs/spec-443-next-16-4-1-rce-dos.md`](../docs/specs/spec-443-next-16-4-1-rce-dos.md)

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [x] `next` exakt ≥ 16.4.1 in package.json + Lockfile
- [x] Advisory-Abgleich: GHSA-2464-fhr4-w9xw, GHSA-673q-mjm6-r5xr, GHSA-p3m5-59mp-jv5r nicht mehr einschlägig
- [x] `pnpm build` grün (inkl. PWA)
- [x] Gates (Lint, Typecheck, Tests) grün
- [x] Auth-E2E grün
- [x] `/_next/image`-Rauchtest: 200 + Bild-Content-Type
- [x] Server Action unverändert funktionsfähig
- [x] postcss-Pin gemessen, Overrides/Kommentare in `pnpm-workspace.yaml` angepasst
- [ ] `Closes #443` im PR-Body; Alert-Schließung nach Merge am Default-Branch prüfen
- [x] Fehlerszenarien (Blocker-Doku, Audit-Fallback, CLAUDE.md-Block entfernt) beachtet

## Technische Notizen
- Zielversion `next` **16.4.3** (neueste 16.x, mit Nutzer bestätigt); `eslint-config-next` mit gehoben (versionsgleich gepinnt, sonst Drift). sharp löst jetzt 0.35.5 auf.
- Messung postcss: next 16.4.3 pinnt weiterhin exakt 8.5.23 (aufgelöst 8.5.23/8.5.26) – Kommentare in `pnpm-workspace.yaml` ergänzt, kein Override nötig.
- Advisory-Abgleich (npm-Bulk-API): `next@16.3.8` → 3 Treffer (1 high, 2 critical); `next@16.4.3` → keine.
- Gates: Lint, `tsc --noEmit`, `pnpm build` grün; Vitest inkl. DB (`dotenv`) 1881/1881 grün.
- E2E (eigener Dev-Server, localhost:3000, geseedete DB): Standardsuite 14 grün/0 rot (29 Opt-in-Specs übersprungen); Server-Action-Nachweis über `E2E_LISTENSEITEN_373=1` listenseiten.spec.ts 4/4 grün.
- `/_next/image`-Rauchtest: `/favicon.ico` → 200 `image/x-icon`; SVG-Quellen → 400 (dangerouslyAllowSVG aus – genau der GHSA-2464-Vektor). `/next.svg` → 500 durch Proxy-Self-Fetch (Lesson #337, kein Befund).
- `next dev` hat `AGENTS.md` erzeugt – vor dem Commit entfernt.
- Nach Merge am Default-Branch prüfen: Dependabot-Alerts #87–#89, #94–#96 geschlossen.
- Out-of-Scope-Fund (`pnpm audit --prod`, vorbestehend, nicht durch den Bump verursacht): `source-map-js` <1.2.2 (GHSA-68fv-2mgg-jv7q, via next>postcss) und `zod` <4.6.6 (GHSA-mrhx-c7xc-m3w5) – je high.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

## Test-Notizen (/test)
- Keine neuen Tests nötig: reiner Dependency-Bump ohne Code-Änderung; jedes AK ist durch bestehende Tests/Messungen belegt (Spec-AK → Task-Notizen).
- Vitest inkl. DB 1881/1881 grün, Coverage 98,68 % Statements (Schwelle 80 %); Bash-Suite `scripts/checks/tests/run-tests.sh` (inkl. Floor-Guard gegen das neue Lockfile) 1836 grün / 0 rot.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `chore/443-next-auf-16-4-1-heben`
Erstellt: 2026-10-25 20:01
