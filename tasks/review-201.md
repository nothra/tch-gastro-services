# Review: Task 201

## Kritische Findings (müssen behoben werden)
- keine

## Wichtige Findings (sollten behoben werden)
- keine

## Nitpicks (optional)
- [ ] [run-tests.sh:2891 f.] Die 4 roten `#212 W3`-E2E-Tests sind — wie in der Task-Datei
  belegt — nicht durch diesen Diff verursacht (der Diff berührt weder `run-pipeline.sh`,
  `verify-final-state.sh` noch Push-Logik; die einzige `run-tests.sh`-Änderung liegt isoliert
  im yq-Assertion-Block 2643–2666). Sie schlagen umgebungsbedingt fehl (E2E mit echtem
  `git push` gegen ein lokales Bare-Origin im Sandbox-Worktree). Falls sie nicht bereits als
  vorbestehend/CI-grün bekannt sind, wäre ein separates Tracking-Issue sinnvoll — **out of
  scope** für diesen Task und **kein Blocker** hier.

## Positives
- **Scope exakt eingehalten.** Nur die drei Phase-1-Skill-Einträge entfernt; `model_tiers`,
  `default`, `bug-fix` und alle pipeline-getriebenen Skills unverändert (AK1 durch Diff belegt).
- **Verhaltenserhalt live verifiziert (AK2).** `cfg_skill_field` (`.skills.<s>.<feld> //
  .default.<feld>`, run-pipeline.sh:118) löst die drei Skills sauber auf `light` / `max_turns 10`
  auf — kein stilles Heavy-Upgrade. Der neue `#201`-Test belegt genau das.
- **Config-Gate grün (AK3).** `config-validation-check.sh` endet mit Exit 0; Regeln 4a–4c
  unberührt.
- **F1 sauber ausgeschlossen.** Repo-weiter Grep über `scripts/` fördert keinen `yq`-Lesezugriff
  auf `skills.requirements|architecture|release-notes` zutage — nur Prosa-Erwähnungen des
  Skill-*Aufrufs*. Kein verstecktes Coupling.
- **F2 bestätigt.** Das Annotation-Gate `C(a)` iteriert über die tatsächlich vorhandenen Keys
  (14≥8, „alle") → nach dem Entfernen weiterhin vollständig; der eingefügte Kommentarblock ist
  kein Key und stört das Gate nicht.
- **Doku-Konsistenz (AK5/AK6).** Der neue Kommentarblock in `factory.defaults.yml` erklärt das
  WHY (pipeline-inert, Fallback auf `default`) statt nur das WHAT; die ADR-038-Zeile ist im
  selben PR sauber nachgezogen und verweist nicht mehr auf entfernte Einträge.
- **Test dokumentiert Absicht.** Der `#201`-Testblock prüft sowohl die Abwesenheit der Keys
  (`has(...) == false`) als auch die effektive `//`-Auflösung — beide Richtungen, nicht nur eine.

## Empfehlung
APPROVED
