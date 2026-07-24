# Task 201: inerte-phase1-config-bereinigen

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung

Inerte `tier`/`max_turns`-Einträge der Phase-1-Skills aus `factory.defaults.yml` bereinigen.
`requirements`, `architecture` und `release-notes` werden von `run-pipeline.sh` nie über
`run_skill` ausgeführt (Phase 1 ist immer interaktiv); ihre Config-Einträge steuern damit nichts
und suggerieren eine Automatik, die es nicht gibt.

**Entscheidung:** Die drei Einträge werden **entfernt** → sauberer Fallback auf den
`default`-Block (`light`, `10`). **`bug-fix` bleibt unverändert** (konzeptioneller Entrypoint,
Config bleibt bereit). Reine Config-/Doku-Klarheit, kein neues Verhalten.

Spec: [`docs/specs/spec-201-inerte-phase1-config-bereinigen.md`](../docs/specs/spec-201-inerte-phase1-config-bereinigen.md)

## Akzeptanzkriterien

- [ ] **AK1** – `skills.requirements`/`architecture`/`release-notes` aus `factory.defaults.yml`
  entfernt; `model_tiers`, `default`, `bug-fix` und pipeline-getriebene Skills unverändert.
- [ ] **AK2** – Fallback: `get_model` liefert für die drei Skills `light`, `get_max_turns` den
  `default`-Wert `10` (kein stilles Heavy-Upgrade).
- [ ] **AK3** – `config-validation-check.sh` bleibt Exit 0 und fail-closed konsistent (Regeln 4a–4c).
- [ ] **AK4** – Test „#197 AK7" (`run-tests.sh:2648`) belegt die effektive `default`-`light`-
  Auflösung der drei Skills; `run-tests.sh` vollständig grün.
- [ ] **AK5** – Kein `tier`/`max_turns`-Knopf suggeriert mehr eine Phase-1-Automatik.
- [ ] **AK6** – ADR-038-Kommentar (Zeile ~62) beschreibt den tatsächlichen Zustand, ohne auf
  entfernte Einträge zu verweisen.

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

Kein neuer ADR nötig (abgedeckt durch ADR-009/011/038). Fehlerszenarien F1–F3 (verstecktes
Test-Coupling, Annotation-Gate C(a), Doku-Drift) siehe Spec.

## Offene Fragen

Keine offen (siehe Spec).

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `chore/201-inerte-phase1-config-bereinigen`
Erstellt: 2026-07-24 14:13
