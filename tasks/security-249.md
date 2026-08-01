# Security Review: Task 249

## Kritische Findings (Blocker)
- Keine.

## Wichtige Findings
- [x] [Robustheit] `scripts/checks/config-validation-check.sh` hat keinen expliziten Root-Typ-Guard für den Override (Skalar/Bool/Mehrdokument-YAML statt Mapping) — fail-closed-Verhalten heute nur ein Nebeneffekt eines yq-Merge-Fehlers, nicht Design. Aktuell nicht ausnutzbar (ein Nicht-Map-Root kann `model_tiers.heavy` strukturell nicht setzen). Out-of-Scope für diese Task (betrifft das gesamte Gate-Skript, nicht die model_tiers.heavy-Sperre) — als Issue [#254](https://github.com/nothra/tch-gastro-services/issues/254) ausgelagert.
- [x] [CI-Verdrahtung] `config-validation-check.sh` ist kein dedizierter, benannter CI-Required-Check in `.github/workflows/factory-ci.yml` — der CI-seitige Schutz gegen einen Policy-verletzenden Override in `factory.config.yml` hängt heute an der AK5-Testfixture in `run-tests.sh`, nicht an einem eigenständigen Gate-Schritt. Funktioniert aktuell, ist aber strukturell fragil gegen künftiges Test-Aufräumen. Out-of-Scope für diese Task (vorbestehende CI-Architektur-Frage, nicht durch Task 249 verursacht) — als Issue [#255](https://github.com/nothra/tch-gastro-services/issues/255) ausgelagert.

## Hinweise
- [ ] [Verifikation] Adversariale Tests gegen Regel 6 (Flow-Style `{heavy: x}`, Großschreibung `Heavy`, YAML-Anchor/Alias, `<<`-Merge-Key, `model_tiers` als Sequenz) wurden durchgeführt — alle zuverlässig durch Regel 6 oder Regel 2 abgelehnt. Die im PoC (Issue #249) verifizierte Lücke ist vollständig geschlossen.
- [ ] [Injection] `grep -qxF -- "$path"` / `-- "$LOCKED_MODEL_TIER_PATH"` ist bereits korrekt mit `--` gegen Options-Injection über YAML-Werte abgesichert.
- [ ] [Information Disclosure] Die neue Fehlermeldung (Regel 6) nennt nur den Config-Pfad und verweist auf `factory.defaults.yml` — keine sensiblen internen Daten.
- [ ] [Scope-Abgrenzung] Der bewusste Ausschluss von `CLAUDE_MODEL_HEAVY`/`CLAUDE_MODEL`-Env-Vars aus dem Scope (Spec-249) ist security-technisch konsistent begründet: anderer Bedrohungsvektor (Shell-/CI-Zugriff nötig, nicht nur ein Datei-Edit), bereits dokumentiert.
- [ ] [Bedrohungsmodell] Die Annahme "Team-Override (`factory.config.yml`) < Defaults (`factory.defaults.yml`)" ist konsistent mit ADR-029 (PRs ohne Pflicht-Approval, Gates sind die einzige Kontrollinstanz) — die neue Regel 6 ist die richtige Kontrollebene für diesen Bedrohungsvektor.

## Ergebnis
PASSED
