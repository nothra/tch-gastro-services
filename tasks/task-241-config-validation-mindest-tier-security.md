# Task 241: config-validation-mindest-tier-security

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
`scripts/checks/config-validation-check.sh` erzwingt für sicherheitsrelevante Skills
(`security-review`, `review`) eine Mindest-Tier-Schwelle (`heavy`), damit ein Override diese
Gates nicht unbemerkt schwächen kann (weder über das statische `tier`-Feld noch – bei
`security-review` – über `tier_by_size`). Details, Kontext und Abgrenzung: siehe
[spec-241-config-validation-mindest-tier-security.md](../docs/specs/spec-241-config-validation-mindest-tier-security.md).

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [ ] AK1 – `security-review.tier` unter `heavy` wird abgelehnt
- [ ] AK2 – `review.tier` unter `heavy` wird abgelehnt
- [ ] AK3 – `tier_by_size` bei `security-review` wird abgelehnt, auch mit gültigem Signal/Threshold
- [ ] AK4 – `review.tier_by_size` bleibt erlaubt (Nicht-Regression zu ADR-038)
- [ ] AK5 – Reiner Default-Lauf bleibt grün
- [ ] AK6 – Explizite Bestätigung des Minimums (`tier: heavy`) bleibt gültig
- [ ] AK7 – Die Mindest-Tier-Schwelle ist nicht override-bar (Policy-Konstante im Gate-Skript)
- [ ] AK8 – Regressionstest deckt Positiv- und Negativfälle ab (yq-gated)

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
Keine – Scope im Requirements-Gespräch geklärt (siehe Spec).

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/241-config-validation-mindest-tier-security`
Erstellt: 2026-08-01 07:46
