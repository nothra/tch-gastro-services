# Review: Task 201

## Kritische Findings (müssen behoben werden)
- keine

## Wichtige Findings (sollten behoben werden)
- keine

## Nitpicks (optional)
- [ ] [run-tests.sh (E2E `#212 W3`)] Die 4 roten `#212 W3`-E2E-Tests sind **nicht** durch diesen
  Diff verursacht — unabhängig verifiziert: `git diff --name-only origin/main...HEAD` berührt
  keine `run-pipeline`-, `verify-final-state`-, `proxy`- oder Push-Datei (nur `factory.defaults.yml`,
  `run-tests.sh`, ADR-038 sowie Spec/Task/Report-Doku). Sie schlagen umgebungsbedingt fehl (E2E mit
  echtem `git push` gegen ein lokales Bare-Origin im Sandbox-Worktree). Falls nicht bereits als
  vorbestehend/CI-grün bekannt, wäre ein separates Tracking-Issue sinnvoll — **out of scope** und
  **kein Blocker** hier.

## Positives
- **Scope exakt eingehalten (AK1).** `factory.defaults.yml:59-87` — nur die drei
  Phase-1-Skill-Einträge (`requirements`/`architecture`/`release-notes`) entfernt; `model_tiers`,
  `default` (`light`/`10`), `bug-fix` und alle pipeline-getriebenen Skills (`implement`, `review`,
  `test`, `refactor`, `security-review`, `codify`, `pr-shepherd`) unverändert (per Diff belegt).
- **Verhaltenserhalt unabhängig verifiziert (AK2).** `cfg_skill_field` (`run-pipeline.sh:118-120`,
  `.skills.<s>.<feld> // .default.<feld>`) löst die drei Skills auf `light` / `max_turns 10` auf.
  In `get_model` (Z. 130-150) ist `tier_by_size.signal` für sie leer → **kein** Größen-Upgrade,
  `tier` bleibt `light` — kein stilles Heavy. Prämisse „pipeline-inert" durch die
  `run_skill`-Aufrufliste (Z. 411-484: implement/review/implement/test/refactor/security-review/
  codify/pr-shepherd — keiner der drei enthalten) bestätigt.
- **Config-Gate grün (AK3).** `config-validation-check.sh factory.defaults.yml` → Exit 0 (selbst
  ausgeführt); Regeln 4a-4c (tier ∈ model_tiers, max_turns ∈ [1,50], tier_by_size) unberührt.
- **F1 sauber ausgeschlossen.** Repo-weiter Grep über `scripts/` nach direkten `yq`-Lesezugriffen
  auf `skills.{requirements,architecture,release-notes}` ist leer — kein verstecktes Test-/Skript-
  Coupling bricht durch das Entfernen.
- **Symmetrischer Test (AK4).** Der neue `#201`-Block (`run-tests.sh:2656-2666`) prüft beide
  Richtungen: Abwesenheit der Keys (`has(...) == false`) **und** die effektive `//`-Fallback-
  Auflösung (`tier=light`, `max_turns=10`) — deckt mehr ab als der alte AK7-Eintrag (der
  `max_turns` nicht prüfte) und folgt dem etablierten `_ok`-Akkumulator-Idiom. Selbst ausgeführt:
  `#201`- und `#197 AK7`-Test grün; Suite 521 grün / 4 rot (nur `#212 W3`, s. Nitpick).
- **Doku-Konsistenz (AK5/AK6), kein Drift.** Der neue Kommentarblock in `factory.defaults.yml:78-81`
  erklärt das WHY (pipeline-inert, Fallback auf `default`) statt nur das WHAT; die ADR-038-Zeilen
  (`docs/adr/038-…:62-64`) sind im selben PR nachgezogen und das YAML-Beispiel dort ist in sich
  konsistent (führt die drei Skills nicht mehr als eigene Einträge, sondern als „kein eigener
  Eintrag → effektiv light über den default-Block").

## Empfehlung
APPROVED
