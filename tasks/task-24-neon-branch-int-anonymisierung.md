# Task 24: neon-branch-int-anonymisierung

## Status
- [x] In Bearbeitung
- [x] Fertig / PR erstellt

## Beschreibung
INT auf Neon-Branch-Modell (CoW-Klon von PRD) umgestellt (Doku) und `db/anonymize.ts` +
`db:anonymize:int` ergänzt (überschreibt Namen/E-Mails, entwertet Prod-Passwörter),
mit Guard NEXT_PUBLIC_STAGE=int.

## Akzeptanzkriterien
- [x] `db:anonymize:int` vorhanden; bricht ohne NEXT_PUBLIC_STAGE=int ab (Guard)
- [x] README beschreibt INT als Neon-Branch + Fluss Branch → anonymize:int → migrate:int → seed:int
- [x] build/lint/test/format:check grün (anonymize.ts typgeprüft)

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/24-neon-branch-int-anonymisierung`
Erstellt: 2026-07-10 06:18
