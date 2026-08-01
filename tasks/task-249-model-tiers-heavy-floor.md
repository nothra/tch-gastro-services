# Task 249: model-tiers-heavy-floor

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Härtung zu #241: `model_tiers.heavy` (der Blatt-Pfad in `factory.defaults.yml`, der das Modell
hinter dem Tier-Label `heavy` bestimmt) bleibt aktuell über `factory.config.yml` override-bar. Ein
Override wie `model_tiers.heavy: claude-sonnet-5` passiert alle bestehenden Gate-Regeln (2, 4a,
5a, 5b aus Task 241) unverändert und lässt `/review`/`/security-review` trotz gepinntem
`heavy`-Label auf einem schwächeren Modell laufen (PoC in Issue #249 verifiziert). Diese Task
sperrt `model_tiers.heavy` als reine Gate-Policy-Konstante (analog `MAX_TURNS_CEILING` /
`MIN_TIER_REQUIRED`) — Details siehe `docs/specs/spec-249-model-tiers-heavy-floor.md`.

Siehe Spec für vollständigen Kontext: `docs/specs/spec-249-model-tiers-heavy-floor.md`

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [ ] AK1 – `model_tiers.heavy`-Override wird abgelehnt, unabhängig vom Wert
- [ ] AK2 – Auch eine redundante Bestätigung des Default-Werts wird abgelehnt
- [ ] AK3 – `model_tiers.light`-Override bleibt erlaubt (Nicht-Regression)
- [ ] AK4 – Reiner Default-Lauf bleibt grün
- [ ] AK5 – Das bestehende, produktive `factory.config.yml` bleibt gültig
- [ ] AK6 – Die Sperre ist selbst nicht override-bar (Regel 2 fängt neue Steuer-Keys)
- [ ] AK7 – Regressionstest deckt Positiv- und Negativfälle ab (yq-gated)
- [ ] AK8 – `factory.config.yml.example` widerspricht der neuen Regel nicht

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
- [ ] ADR-010-Drift: `docs/adr/010-config-validation-gate.md` §„Konsequenzen" ggf. nachziehen –
      Entscheidung liegt bei `/architecture`.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `fix/249-model-tiers-heavy-floor`
Erstellt: 2026-08-01 15:48
