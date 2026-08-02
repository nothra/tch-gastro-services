# Spec: config-validation-check.sh als dedizierten CI-Required-Check verdrahten

## Kontext

Bei der Security-Review zu Task 249 (`model_tiers.heavy`-Sperre) aufgefallen:
`.github/workflows/factory-ci.yml` ruft `scripts/checks/config-validation-check.sh`
an keiner Stelle direkt als eigenen CI-Schritt auf. Das Gate läuft heute nur zur
Laufzeit über `run-pipeline.sh` (`load_config`) und wird in CI nur *indirekt*
geschützt — über eine einzelne Testzeile in `scripts/checks/tests/run-tests.sh`
("Gate #249 AK5", ~Zeile 1317-1320), die zufällig das reale, produktive
`factory.config.yml` gegen das Gate laufen lässt. Würde diese Testzeile künftig
entfernt oder umgebaut, verschwindet der einzige CI-seitige Schutz gegen einen
Policy-verletzenden Override in `factory.config.yml`, ohne dass das auffällt.

Diese Task löst die strukturelle Kopplung: ein benannter, dedizierter CI-Job
validiert die realen Repo-Dateien direkt — unabhängig von Testfixtures.

## Scope

**Inbegriffen:**
- Neuer eigener Job `config-validation` in `.github/workflows/factory-ci.yml`,
  der `scripts/checks/config-validation-check.sh` explizit gegen
  `factory.defaults.yml` + `factory.config.yml` im Checkout aufruft (fail-closed).
- Entfernen der jetzt redundanten AK5-Testzeile in `run-tests.sh` (Gate #249 AK5,
  "reales factory.config.yml … bleibt gültig"), die übrigen AK5-Zeilen im selben
  Testblock (Gate #241 AK5, Gate #254 AK5 — arbeiten mit Fixture-Dateien) bleiben
  unangetastet.
- Aufnahme von `config-validation` in die `required_status_checks` des
  Branch-Protection-Rulesets `protect-main` (ADR-029) — inkl. Aktualisierung des
  in ADR-029 dokumentierten JSON-Sollzustands und tatsächlicher Anwendung per
  `gh api -X PUT repos/nothra/tch-gastro-services/rulesets/19162920`.

**Nicht inbegriffen:**
- `routes-doc-check.sh` hat ebenfalls keinen dedizierten CI-Schritt (nur
  `pre-push.sh` lokal) — das ist eine separate, aus dieser Task nicht
  abgeleitete Lücke. Kein Bestandteil dieser Task; bei Bedarf eigenes Issue.
- Keine inhaltliche Änderung an `config-validation-check.sh` selbst (Regeln 1-6
  bleiben unverändert).
- Kein Umbau von `run-pipeline.sh`s Laufzeit-Validierung (`load_config`) — die
  bleibt als zusätzliche Absicherung zur Laufzeit bestehen.

## Akzeptanzkriterien

- [ ] AK1: GIVEN ein PR ändert `factory.config.yml` und fügt einen unbekannten
      Key hinzu WHEN die CI-Pipeline für den PR läuft THEN scheitert der neue
      Job `config-validation` (exit ≠ 0) und wird als roter Check am PR angezeigt.
- [ ] AK2: GIVEN der aktuelle, valide Zustand von `factory.defaults.yml` +
      `factory.config.yml` WHEN CI läuft THEN ist der Job `config-validation`
      grün (exit 0).
- [ ] AK3: GIVEN der neue Job `config-validation` WHEN er ausgeführt wird THEN
      ruft er `scripts/checks/config-validation-check.sh` explizit mit den
      Pfaden der realen Repo-Dateien auf (`$GITHUB_WORKSPACE/factory.defaults.yml`,
      `$GITHUB_WORKSPACE/factory.config.yml`) — kein impliziter Aufruf über
      `run-pipeline.sh` oder eine Test-Fixture.
- [ ] AK4: GIVEN ein PR versucht, `model_tiers.heavy` in `factory.config.yml`
      zu überschreiben (Task-249-Regression) WHEN CI läuft THEN schlägt der Job
      `config-validation` fail-closed fehl.
- [ ] AK5: GIVEN die jetzt redundante AK5-Testzeile in
      `scripts/checks/tests/run-tests.sh` (Gate #249 AK5) WHEN die Verdrahtung
      abgeschlossen ist THEN ist diese Zeile entfernt, während die übrigen
      AK5-Zeilen im selben Testblock (Gate #241 AK5, Gate #254 AK5) unverändert
      bleiben.
- [ ] AK6: GIVEN der neue Job `config-validation` WHEN das
      Branch-Protection-Ruleset `protect-main` aktualisiert wird THEN enthält
      `required_status_checks` zusätzlich `{ "context": "config-validation" }`
      (dokumentiert in ADR-041, mit Nachtrag im JSON-Sollzustand von ADR-029),
      und die Änderung ist live per `gh api -X PUT
      repos/nothra/tch-gastro-services/rulesets/19162920` angewendet (Ist-Zustand
      verifiziert über den in ADR-029 dokumentierten `gh api … --jq`-Befehl).
- [ ] AK7: GIVEN der neue Job WHEN er läuft THEN benötigt er kein
      Node/pnpm-Setup — nur `actions/checkout` + yq-Bereitstellung analog zum
      bestehenden `factory-self-test`-Job (schlanker, schneller Job).

## Fehlerszenarien

- [ ] yq-Download im neuen Job schlägt fehl (Netzwerkfehler) → Job rot, kein
      stiller Fallback/Skip.
- [ ] `factory.config.yml` existiert nicht (kein Override) → Gate läuft
      trotzdem gegen die Defaults allein (bestehendes Verhalten von
      `config-validation-check.sh`) — gültiger Pfad, kein Fehlerfall.

## Offene Fragen

_Keine offenen Fragen mehr — Platzierung (eigener Job), Umgang mit der
AK5-Testzeile (entfernen) und Required-Check-Umfang (inkl. Ruleset-Update)
wurden im Requirements-Gespräch geklärt._
