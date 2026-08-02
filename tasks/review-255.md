# Review: Task 255

> Runde 3 (finale Re-Review nach zwei Rework-Zyklen, Commit `596c227`). Runde-1- und
> Runde-2-Findings (Historie: `git log -p -- tasks/review-255.md`) sind alle live
> nachgestellt und als behoben bestätigt. Diese Runde ist die dritte Anwendung des
> Reviews auf denselben Code – **Circuit Breaker greift**: keine weitere automatische
> `/implement`-Iteration, stattdessen Eskalation an den Menschen mit dem verbleibenden
> Finding.

## Kritische Findings (müssen behoben werden)
_Keine._

## Wichtige Findings (sollten behoben werden)
- [ ] [scripts/checks/tests/run-tests.sh:1425-1429] Der AK4-Test (`model_tiers.heavy`-Override-Regression, Task 249) kopiert das reale `factory.config.yml` (enthält bereits einen Top-Level-Key `model_tiers: { light: ... }`) und hängt per `printf '\nmodel_tiers:\n  heavy: ...\n' >>` einen **zweiten** Top-Level-`model_tiers:`-Block an. Live verifiziert: `yq` löst diesen Duplicate-Key per "last-key-wins" auf, wodurch `model_tiers.light` aus dem effektiven Dokument komplett verschwindet (`yq eval '.model_tiers' heavy-override.yml` → nur noch `{heavy: claude-sonnet-5}`). Der Test besteht nur, weil Regel 6 (`model_tiers.heavy` grundsätzlich nicht override-bar) ohnehin auf jeden gesetzten `heavy`-Pfad greift, unabhängig vom Duplicate-Key-Nebeneffekt — er prüft kein realistisches Override-Szenario (ein echter Nutzer würde `heavy` in den bestehenden Block einfügen, nicht einen zweiten Top-Level-Key anlegen) und die Assertion prüft nur `rc -ne 0`, kein pfadspezifisches Signal. Verletzt die bereits kodifizierte Projekt-Lesson „Negativ-Test mit mehreren Fail-Pfaden auf den Ziel-Pfad isolieren … sonst grün aus dem falschen Grund" (#214). Fix-Vorschlag: `yq -i eval '.model_tiers.heavy = "claude-sonnet-5"' "$CVTMP/heavy-override.yml"` statt `printf >>` verwenden (echter Merge in den bestehenden Block, `light` bleibt erhalten, YAML bleibt eindeutig). Zum Vergleich: die AK1-Fixture (`bogus_unknown_key_ak1`) hat dieses Problem NICHT, da dort ein neuer, nicht bereits vorhandener Key angehängt wird (kein Duplicate-Key-Effekt).

## Nitpicks (optional)
- [ ] [docs/adr/041-config-validation-ci-required-check.md:104-112] Der Trade-off-Bullet unter „Negativ / Trade-offs" erzählt die Review-Historie inline („eine Review-Runde (Task 255) verlangte diese Absicherung strukturell zurück") statt nur den aktuellen Trade-off zu benennen, und ist teilweise redundant zum bereits im Positiv-Abschnitt (Zeilen 91-93) beschriebenen Vorteil. Empfehlung: auf den tatsächlich verbleibenden Negativ-Punkt kürzen (der `run-tests.sh`-Test ist nicht Teil von `pre-push.sh`); die Rework-Historie steht bereits in der Task-Datei.
- [ ] [docs/adr/029-branch-protection-main-ruleset.md:45 vs. docs/factory/lessons/factory-workflow.md:83,369] Uneinheitliche Schreibweise der Nachtrag-Referenz: „(Nachtrag ADR-041, Task 255)" (Komma) vs. „(Nachtrag ADR-041/Task 255)" (Schrägstrich) an den beiden Lesson-Stellen. Rein kosmetisch.

## Positives
- Alle Runde-1- und Runde-2-Findings sind nachweislich (live nachgestellt, nicht nur gelesen) behoben: awk-Job-Block-Isolation, AK3-Positions-Reihenfolge, AK1/AK2/AK4-Behavior-Level-Tests (Grundfunktion), sowie die drei ADR-/Lesson-Doku-Drifts.
- AK6 erneut live gegen die GitHub-API verifiziert: `gh api .../rulesets/19162920` liefert exakt `lint, test, issue-sync, factory-self-test, pr-closes-issue, config-validation`, deckungsgleich mit dem jetzt in ADR-029 korrekt dokumentierten Sollzustand (Prosa UND JSON).
- Volle Suite weiterhin grün (609 Tests), keine Regression über alle drei Rework-Runden hinweg.
- Die AK1-Fixture (`bogus_unknown_key_ak1`) ist im Gegensatz zur AK4-Fixture korrekt konstruiert (neuer Key statt Duplicate-Key) — das Wichtig-Finding ist eng auf eine Stelle begrenzt, keine systemische Schwäche der neuen Tests.
- Saubere Referenzkette Spec → ADR-041 → ADR-029-Nachtrag → CI-Job → Ruleset → Tests bleibt über alle drei Runden konsistent und live nachvollziehbar.

## Empfehlung
NEEDS_REWORK

**Circuit Breaker (3. Review-Runde erreicht):** Laut Skill-Vorgabe wird nicht automatisch
eine weitere `/implement`-Iteration angestoßen. Das verbleibende Finding ist klein und
lokal begrenzt (Ein-Zeilen-Fix in einer Testfixture), berührt aber die Robustheit eines
sicherheitsrelevanten Regressionstests (Task 249, `model_tiers.heavy`-Sperre) – Eskalation
an den Menschen zur Entscheidung, wie weiter verfahren wird.
