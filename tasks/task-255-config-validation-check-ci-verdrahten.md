# Task 255: config-validation-check-ci-verdrahten

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
`scripts/checks/config-validation-check.sh` läuft in CI heute nur indirekt über
eine Testzeile in `run-tests.sh` (Gate #249 AK5), nicht als eigener, benannter
CI-Schritt. Diese Task verdrahtet das Gate als dedizierten Job `config-validation`
in `.github/workflows/factory-ci.yml` (analog `issue-sync`), entfernt die dadurch
redundante Testzeile und hebt den neuen Job ins Branch-Protection-Ruleset
`protect-main` (ADR-029) als required Check.

Details: [docs/specs/spec-255-config-validation-check-ci-verdrahten.md](../docs/specs/spec-255-config-validation-check-ci-verdrahten.md)

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [ ] AK1: PR mit unbekanntem Key in `factory.config.yml` → Job `config-validation` rot
- [ ] AK2: aktueller valider Config-Stand → Job `config-validation` grün
- [ ] AK3: Job ruft das Gate explizit gegen die realen Repo-Dateien auf (keine Fixture)
- [ ] AK4: `model_tiers.heavy`-Override (Task-249-Regression) → Job schlägt fehl
- [ ] AK5: redundante AK5-Testzeile (Gate #249 AK5) in `run-tests.sh` entfernt, übrige AK5-Zeilen (Gate #241/#254) unangetastet
- [ ] AK6: `config-validation` in `protect-main`-Ruleset als required Check (ADR-041 + ADR-029-Nachtrag + Ruleset live aktualisiert)
- [ ] AK7: neuer Job ohne Node/pnpm-Setup (nur checkout + yq, analog `factory-self-test`)

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
- Entscheidung aus /requirements: neuer eigener Job (nicht nur ein Step in `factory-self-test`).
- **ADR-041 erstellt:** [docs/adr/041-config-validation-ci-required-check.md](../docs/adr/041-config-validation-ci-required-check.md)
  – ADR-Trigger griff, weil ADR-029 für Ruleset-Änderungen explizit "einen neuen ADR"
  vorschreibt (nicht nur eine stille Ruleset-Änderung).
- **ADR-029 nachgezogen:** `required_status_checks`-JSON + Querverweis auf ADR-041
  ergänzt (aus #211/#176-Lesson, `factory-workflow.md` – ADR-namentlich-beschriebene
  Mechanik im selben PR mitpflegen).
- Implementierung: neuer Job `config-validation` in `.github/workflows/factory-ci.yml`,
  Struktur wie `issue-sync` (nur `actions/checkout` + yq-Bereitstellung, kein
  pnpm/Node) + `bash scripts/checks/config-validation-check.sh` ohne Argumente
  (Default-Pfade zeigen bereits auf Repo-Root, s. Script-Header).
- Ruleset-Update per `gh api -X PUT .../rulesets/19162920` ist eine echte GitHub-Settings-
  Änderung — vor Ausführung nochmal explizit bestätigen lassen.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
_Keine – siehe Spec „Offene Fragen"._

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `chore/255-config-validation-check-ci-verdrahten`
Erstellt: 2026-08-02 03:01
