# Task 390: next-16-3-6-rce-ghsa-heben

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Sicherheits-Deps-Durchgang (Issue #390): `next` 16.3.5 → ≥ 16.3.6 (kritisch, GHSA-vcvr-r3jv-pc5j) und alle weiteren offenen Dependabot-Alerts (14 gesamt): `brace-expansion` (6, bis high), `undici` (6, bis high, nur dev). Spec: `docs/specs/spec-390-security-deps-durchgang.md`. Details und Verifikation siehe Issue #390.

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [ ] `next` ≥ 16.3.6 aufgelöst (Alerts #65, #80)
- [ ] `brace-expansion` ≥ 1.1.21 bzw. ≥ 2.1.7 (Alerts #74–#79)
- [ ] `undici` ≥ 7.29.1 (Alerts #64, #67–#69, #72, #73)
- [ ] Dependabot meldet keine offenen Alerts mehr (oder begründete Restausnahme)
- [ ] Build, Auth-E2E, `next/image`-Rauchtest, PWA-Build grün
- [ ] #169 (postcss-Override) neu bewertet

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `chore/390-next-16-3-6-rce-ghsa-heben`
Erstellt: 2026-10-05 18:41
