# Task 44: docs-changelog-projektname-und-codify-fetch-depth

## Status
- [x] In Bearbeitung
- [x] Codify ausgeführt
- [x] Fertig / PR erstellt

## Beschreibung
Reiner Docs-/Codify-Change:
1. CHANGELOG-Kopf: „dm Development Factory Template" → „Projekt TCH Gastro Services"; die nur für
   Template-Adoption gedachte Notiz „Für adoptierte Projekte …" entfernt (dieses Repo ist das
   Produkt, kein Template). Historische Versions-Einträge (0.1.0–0.5.0) bleiben unverändert – sie
   dokumentieren wahrheitsgemäß die geerbte Template-Historie.
2. Codify des Deploy-Gate-Bugs aus #42: neue Regel „Fast-Forward-Pushes aus CI brauchen vollen
   Verlauf (`fetch-depth: 0`)" unter „Bekannte Stolpersteine" in `PROJECT-CONTEXT.md`.

## Akzeptanzkriterien
- [x] CHANGELOG-Kopf nennt „TCH Gastro Services"; keine Template-Adoptions-Notiz mehr
- [x] `PROJECT-CONTEXT.md` enthält die fetch-depth-Regel als Stolperstein
- [ ] CI grün, Merge auf `main`; Gate-Lauf grün (Docs-Change deployt via gefixtem Gate)

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/44-docs-changelog-projektname-und-codify-fetch-depth`
Erstellt: 2026-07-10 22:44
