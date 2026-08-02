# Task 255: config-validation-check-ci-verdrahten

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
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
  Architektur-Entscheidung im Commit `523c04f`, die noch "ohne Argumente" vorsah;
  Nitpick aus Review-Runde 1, Task 255).
- **Review-Runde 1 (NEEDS_REWORK) behoben** – siehe [tasks/review-255.md](review-255.md):
  - awk-Job-Block-Extraktion in `run-tests.sh` bricht jetzt zusätzlich am nächsten
    Job-Trennkommentar (`# ───`) ab, nicht nur am nächsten `wort:`-Key – vorher bluteten
    die Header-Kommentarzeilen des Folge-Jobs (`factory-self-test`) in den extrahierten
    Block hinein (aktuell folgenlos, aber brüchig für den AK7-Negativ-Check).
  - AK3-Test prüft jetzt zusätzlich die Positions-Reihenfolge (defaults-Pfad vor
    config-Pfad im Job-Block) statt nur die Anwesenheit beider Strings – das Gate
    liest `$1`/`$2` strikt positional.
  - AK1/AK2/AK4 sind jetzt automatisiert auf Behavior-Level abgedeckt (nicht mehr nur
    "lokal simuliert"/manuell): neue Tests führen `config-validation-check.sh` mit
    `$FACTORY_ROOT/factory.defaults.yml` + `$FACTORY_ROOT/factory.config.yml` real aus
    – einmal unverändert (AK2, exit 0), einmal mit injiziertem unbekanntem Key (AK1,
    exit ≠0) und einmal mit `model_tiers.heavy`-Override (AK4, exit ≠0). Ersetzt
    strukturell die entfernte `Gate #249 AK5`-Zeile auf der neuen CI-Wiring-Ebene.
  - Nitpick (dangling "oben"-Verweis) oben in dieser Notiz korrigiert.
- **Review-Runde 2 (NEEDS_REWORK) behoben** – siehe [tasks/review-255.md](review-255.md):
  reine Doku-Drift, die nach dem Runde-1-Rework entstanden war (ADR-Prosa/Lesson blieben
  hinter dem bereits aktualisierten JSON/Code zurück):
  - `docs/adr/029-branch-protection-main-ruleset.md`: Decision-Prosa um `config-validation`
    ergänzt (war nur im JSON-Sollzustand weiter unten aktuell).
  - `docs/adr/041-config-validation-ci-required-check.md`: Trade-off-Text korrigiert –
    behauptete "ausschließlich in CI abgedeckt", obwohl der Runde-1-Rework die
    Nicht-Regression bereits als AK2-Behavior-Test wieder in `run-tests.sh` eingebaut hatte
    (jetzt als "doppelte Absicherung" beschrieben, CI-Required-Check + Selbsttest).
  - `docs/factory/lessons/factory-workflow.md`: beide required-Checks-Listen (Zeilen ~82
    und ~368) um `config-validation` ergänzt.
- **Review-Runde 3 (NEEDS_REWORK, Circuit Breaker) behoben** – siehe [tasks/review-255.md](review-255.md):
  - `scripts/checks/tests/run-tests.sh`: AK4-Testfixture (`model_tiers.heavy`-Override)
    hängte per `printf` einen zweiten Top-Level-`model_tiers:`-Block an eine Kopie des
    realen `factory.config.yml` an – ein YAML-Duplicate-Key, den `yq` per
    last-key-wins auflöst (`model_tiers.light` verschwand dabei spurlos). Der Test
    bestand nur zufällig, weil Regel 6 ohnehin auf jeden `heavy`-Wert greift. Ersetzt
    durch echten Merge: `yq -i eval '.model_tiers.heavy = "claude-sonnet-5"' ...`
    (verifiziert: `light` bleibt jetzt erhalten, Gate schlägt weiterhin korrekt fehl).
  - `docs/adr/041-config-validation-ci-required-check.md`: Trade-off-Bullet gekürzt –
    erzählte die Rework-Historie inline statt nur den aktuellen Trade-off zu nennen.
  - Uneinheitliche "Nachtrag ADR-041"-Klammer-Schreibweise (Komma vs. Schrägstrich) in
    ADR-029/Lesson-Datei vereinheitlicht.
- ADR-041 Status auf "Accepted" gesetzt (Implementierung erfolgt, Lesson aus #197).
- **`/test`-Vollständigkeitsprüfung:** Diff berührt ausschließlich CI-Workflow-YAML,
  die Bash-Selbsttest-Suite und Doku (0 App-/TS-Dateien) – `pnpm test:coverage` bleibt
  unverändert bei 89,06% Stmts/94,28% Branches (≥ 80%-Schwelle), da kein App-Code
  betroffen ist. Die eigentliche Test-Suite für diese Task ist
  `scripts/checks/tests/run-tests.sh` (609 grün): alle 7 AK haben dedizierte Tests
  (Wiring- UND Behavior-Level für AK1-AK4/AK7, Ruleset-Live-Verifikation für AK6,
  Diff-Check für AK5). Die yq-Download-Fehlerszenario (Spec „Fehlerszenarien") ist
  nicht separat unit-testbar (GitHub-Actions-`run:`-Schritte failen per Default bei
  jedem non-zero exit, identisch zum unveränderten `factory-self-test`-Job-Muster) –
  keine zusätzlichen Tests nötig.
- **`/refactor`-Pass:** Beide geänderten Code-Stellen (`config-validation`-Job in
  `factory-ci.yml`, "Config-Validation CI-Wiring"-Testblock in `run-tests.sh`) gegen
  die Clean-Code-Checkliste geprüft (Naming, Struktur, Magic Numbers, Kommentar-WHY) –
  nach drei Review-Runden, die genau diese Punkte bereits gehärtet haben, kein
  Verbesserungsbedarf ohne Mehrwert gefunden. Kein Code geändert, Tests weiterhin
  609 grün (unverändert).
- **`/security-review`: PASSED** – siehe [tasks/security-255.md](security-255.md).
  Kein Kritisch-/Wichtig-Finding: kein Injection-Vektor (`pull_request`, nicht
  `pull_request_target`; `$GITHUB_WORKSPACE` nicht PR-interpoliert), fail-closed
  verifiziert, keine Secrets im neuen Job, Ruleset-Änderung live gegengeprüft (keine
  Schwächung – nur `config-validation` ergänzt). Ein Hinweis (yq-Download ohne
  Checksum-Verifikation, vorbestehend in `factory-self-test`, hier nur dupliziert)
  als Out-of-Scope-Issue [#258](https://github.com/nothra/tch-gastro-services/issues/258)
  angelegt statt in diesem PR gefixt.
- CI-Wiring-Tests in `run-tests.sh` (Abschnitt "Config-Validation CI-Wiring"):
  Job-Existenz, isolierter Job-Block (kein Node/pnpm), expliziter Aufruf mit den
  realen Pfaden in korrekter Reihenfolge, plus die oben genannten Behavior-Level-Tests
  – analog zum bestehenden `issue-sync`-Wiring-Test, aber mit echter Ausführung.
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
Siehe [tasks/review-255.md](review-255.md).
- Runde 1: NEEDS_REWORK (3 Wichtig-Findings: awk-Job-Block-Isolation brüchig, AK3-Test
  prüft keine Argument-Reihenfolge, fehlende Behavior-Level-Testabdeckung für AK1/AK2/AK4)
  – alle drei behoben in Commit `37cbae2`.
- Runde 2 (Re-Review): NEEDS_REWORK – 3 neue Wichtig-Findings, alle reine
  Dokumentations-Drift (ADR-029-Decision-Prosa, ADR-041-Trade-off-Text,
  factory-workflow.md-Lesson listen die required-Checks ohne `config-validation`) –
  alle drei behoben (siehe Technische Notizen).
- Runde 3 (finale Re-Review): NEEDS_REWORK – 1 Wichtig-Finding (AK4-Testfixture in
  `run-tests.sh` nutzt Duplicate-YAML-Key statt sauberem Merge, besteht nur zufällig)
  + 2 Nitpicks. **Circuit Breaker erreicht (3. Runde) → an den Menschen eskaliert**,
  keine automatische 4. `/implement`-Iteration. Nutzer hat "Jetzt fixen" gewählt –
  alle drei Punkte in Commit nach der Eskalation behoben (siehe unten).

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `chore/255-config-validation-check-ci-verdrahten`
Erstellt: 2026-08-02 03:01
