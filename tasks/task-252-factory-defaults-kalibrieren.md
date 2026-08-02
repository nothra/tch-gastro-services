# Task 252: factory-defaults-kalibrieren

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
`factory.defaults.yml` (kanonische Quelle, ADR-009) trägt veraltete Modell-Tiers
(`model_tiers.heavy: claude-opus-4-8`, `model_tiers.light: claude-sonnet-4-6`) und zu knapp
bemessene `max_turns` für `review`/`security-review` (`14`, wiederholt „Reached max turns" in
Task 91/241). `factory.config.yml` korrigiert das bereits projektweise per Override. Diese Task
zieht die validierten Werte in die Defaults, entfernt die dadurch redundanten Overrides, hält
`scripts/run-pipeline.sh`-Fallback-Literale konsistent und dokumentiert die Entscheidung zu
Issue-Punkt 3 (keine dritte Tier-Stufe). Details, Scope und volle Akzeptanzkriterien:
[`docs/specs/spec-252-factory-defaults-kalibrieren.md`](../docs/specs/spec-252-factory-defaults-kalibrieren.md).

## Akzeptanzkriterien
<!-- Volltext inkl. GIVEN/WHEN/THEN in der Spec -->
- [ ] AK1 – `model_tiers.heavy` → `claude-opus-5`
- [ ] AK2 – `model_tiers.light` → `claude-sonnet-5`
- [ ] AK3 – `skills.review.max_turns` → `30`
- [ ] AK4 – `skills.security-review.max_turns` → `30`
- [ ] AK5 – redundanter `model_tiers.light`-Override in `factory.config.yml` entfernt
- [ ] AK6 – redundanter `skills.review.max_turns`-Override entfernt
- [ ] AK7 – redundanter `skills.security-review.max_turns`-Override entfernt
- [ ] AK8 – weiterhin nötige Overrides (implement/pr-shepherd/codify/test) unverändert
- [ ] AK9 – `config-validation-check.sh` bleibt grün
- [ ] AK10 – `run-pipeline.sh`-Fallback-Literale auf `claude-opus-5`/`claude-sonnet-5` aktualisiert
- [ ] AK11 – betroffene Regressionstests in `run-tests.sh` auf neue Literal-Werte angepasst
- [ ] AK12 – dritte Tier-Stufe dokumentiert entschieden (Nein, kein ADR)

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

## Offene Fragen
- [ ] ADR-019 §5 („Budget-Puffer") nennt `max_turns: 14` als aktuellen Wert – nach AK3/AK4 nicht
      mehr zutreffend. `/architecture` entscheidet: Nachtrag oder historischer Schnappschuss.
- [ ] ADR-038-Beispielblock zeigt ebenfalls `max_turns: 14` – gleiche Frage.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `chore/252-factory-defaults-kalibrieren`
Erstellt: 2026-08-02 09:47
