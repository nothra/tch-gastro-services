# Review: Task 201

## Kritische Findings (müssen behoben werden)
- keine

## Wichtige Findings (sollten behoben werden)
- keine

## Nitpicks (optional)
- [ ] [run-tests.sh (E2E `#212 W3`)] Die 4 roten `#212 W3`-E2E-Tests sind — wie in der
  Task-Datei belegt und in diesem Review erneut geprüft — **nicht** durch diesen Diff verursacht:
  der Diff berührt weder `run-pipeline.sh` noch `verify-final-state.sh` oder Push-Logik; die
  einzige `run-tests.sh`-Änderung liegt isoliert im yq-Assertion-Block (2643–2666). Sie schlagen
  umgebungsbedingt fehl (E2E mit echtem `git push` gegen ein lokales Bare-Origin im
  Sandbox-Worktree). Falls nicht bereits als vorbestehend/CI-grün bekannt, wäre ein separates
  Tracking-Issue sinnvoll — **out of scope** und **kein Blocker** hier.

## Positives
- **Scope exakt eingehalten (AK1).** `factory.defaults.yml:59-87` — nur die drei
  Phase-1-Skill-Einträge (`requirements`/`architecture`/`release-notes`) entfernt; `model_tiers`,
  `default` (`light`/`10`), `bug-fix` und alle pipeline-getriebenen Skills (`implement`, `review`,
  `test`, `refactor`, `security-review`, `codify`, `pr-shepherd`) unverändert. Per Diff belegt.
- **Verhaltenserhalt unabhängig verifiziert (AK2).** `cfg_skill_field` (`run-pipeline.sh:118-119`,
  `.skills.<s>.<feld> // .default.<feld>`) löst die drei Skills sauber auf `light` / `max_turns 10`
  auf; da `tier_by_size.signal` für sie leer ist, greift in `get_model` (Z. 143) **kein**
  Größen-Upgrade — kein stilles Heavy. Prämisse „pipeline-inert" durch die `run_skill`-Aufrufliste
  (Z. 411–484, keiner der drei enthalten) bestätigt.
- **Config-Gate grün (AK3).** `config-validation-check.sh factory.defaults.yml` → Exit 0; Regeln
  4a–4c (tier ∈ model_tiers, max_turns ∈ [1,50], tier_by_size) unberührt.
- **F1 sauber ausgeschlossen.** Repo-weiter Grep über `scripts/` fördert keinen `yq`-Lesezugriff
  auf `skills.requirements|architecture|release-notes` zutage — kein verstecktes Test-/Skript-
  Coupling bricht durch das Entfernen.
- **Symmetrischer Test (AK4).** Der neue `#201`-Block prüft beide Richtungen: Abwesenheit der Keys
  (`has(...) == false`) **und** die effektive `//`-Fallback-Auflösung (`tier=light`,
  `max_turns=10`). Er deckt sogar mehr ab als der alte AK7-Eintrag (der `max_turns` nicht prüfte)
  und folgt dem im File etablierten `_ok`-Akkumulator-Idiom.
- **Doku-Konsistenz (AK5/AK6).** Der neue Kommentarblock in `factory.defaults.yml:78-81` erklärt
  das WHY (pipeline-inert, Fallback auf `default`) statt nur das WHAT; die ADR-038-Zeile ist im
  selben PR nachgezogen und verweist nicht mehr auf entfernte Einträge.

## Empfehlung
APPROVED
