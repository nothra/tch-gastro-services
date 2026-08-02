# Task 255: config-validation-check-ci-verdrahten

## Status
- [x] In Bearbeitung
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
- [x] AK1: PR mit unbekanntem Key in `factory.config.yml` → Job `config-validation` rot
- [x] AK2: aktueller valider Config-Stand → Job `config-validation` grün
- [x] AK3: Job ruft das Gate explizit gegen die realen Repo-Dateien auf (keine Fixture)
- [x] AK4: `model_tiers.heavy`-Override (Task-249-Regression) → Job schlägt fehl
- [x] AK5: redundante AK5-Testzeile (Gate #249 AK5) in `run-tests.sh` entfernt, übrige AK5-Zeilen (Gate #241/#254) unangetastet
- [x] AK6: `config-validation` in `protect-main`-Ruleset als required Check (ADR-041 + ADR-029-Nachtrag + Ruleset live aktualisiert)
- [x] AK7: neuer Job ohne Node/pnpm-Setup (nur checkout + yq, analog `factory-self-test`)

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
  pnpm/Node) + `bash scripts/checks/config-validation-check.sh` **mit expliziten**
  `$GITHUB_WORKSPACE/factory.defaults.yml` + `$GITHUB_WORKSPACE/factory.config.yml`
  (AK3/ADR-041 verlangen den expliziten Aufruf gegen die realen Pfade, nicht den
  impliziten Default-Pfad ohne Argumente – Korrektur ggü. der ursprünglichen
  Architektur-Notiz oben, die "ohne Argumente" vorsah).
- AK1/AK2/AK4 lokal simuliert: identischer Aufruf (`config-validation-check.sh
  "$GITHUB_WORKSPACE/factory.defaults.yml" "$GITHUB_WORKSPACE/factory.config.yml"`)
  gegen reale Dateien (exit 0), gegen eine Kopie mit unbekanntem Key (exit 1) und
  mit `model_tiers.heavy`-Override (exit 1) durchgespielt – reale CI-Bestätigung
  erfolgt zusätzlich, sobald der PR läuft.
- ADR-041 Status auf "Accepted" gesetzt (Implementierung erfolgt, Lesson aus #197).
- Neue CI-Wiring-Tests in `run-tests.sh` (Abschnitt "Config-Validation CI-Wiring"):
  Job-Existenz, isolierter Job-Block (kein Node/pnpm), expliziter Aufruf mit den
  realen Pfaden – analog zum bestehenden `issue-sync`-Wiring-Test.
- **AK6 (Ruleset-Update) angewendet:** nach expliziter Bestätigung `gh api -X PUT
  .../rulesets/19162920` mit dem in ADR-029 dokumentierten JSON (inkl.
  `config-validation`) ausgeführt und per `gh api … --jq` verifiziert – Live-Checks
  jetzt `lint, test, issue-sync, factory-self-test, pr-closes-issue, config-validation`,
  `enforcement: active`, `strict: false`, `merge: squash`, `bypass: 0` (deckungsgleich
  mit ADR-029).

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
_Keine – siehe Spec „Offene Fragen"._

## Review-Findings
<!-- Wird durch /review befüllt -->
Siehe [tasks/review-255.md](review-255.md) – Empfehlung: NEEDS_REWORK (3 Wichtig-Findings:
awk-Job-Block-Isolation brüchig, AK3-Test prüft keine Argument-Reihenfolge, fehlende
Behavior-Level-Testabdeckung für AK1/AK2/AK4 nach Entfernung der Gate-#249-AK5-Zeile).

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `chore/255-config-validation-check-ci-verdrahten`
Erstellt: 2026-08-02 03:01
