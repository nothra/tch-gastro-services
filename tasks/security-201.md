# Security Review: Task 201

Scope: Branch-Diff `origin/main...HEAD` (6 Dateien). Substanziell relevant sind nur
`factory.defaults.yml` (drei inerte Skill-Einträge entfernt, Kommentarblock ergänzt),
`scripts/checks/tests/run-tests.sh` (yq-Assertion-Block angepasst + `#201`-Block) und
`docs/adr/038-…md` (Kommentarzeile). Spec-, Task- und Review-Doku sind reine Markdown-Texte
ohne ausführbare Angriffsfläche.

## Kritische Findings (Blocker)
- keine

## Wichtige Findings
- keine

## Hinweise
- [ ] **[Cost-Guard / Defense-in-Depth]** Der entfernte `max_turns: 6` fällt für
  `requirements`/`architecture`/`release-notes` auf den `default`-Wert `10` zurück — ein
  minimales Anheben des Turn-Deckels (6 → 10). **Kein realer Sicherheits-/Kostenimpact:**
  Diese drei Skills werden von `run-pipeline.sh` nie über `run_skill` aufgerufen
  (`run_skill` läuft nur für implement/review/test/refactor/security-review/codify/pr-shepherd,
  `run-pipeline.sh:411–484`); folglich wird `get_max_turns` für sie in der Automatisierung
  nie ausgewertet. Selbst hypothetisch bleibt `10` innerhalb des vom Gate erzwungenen Bereichs
  `[1, MAX_TURNS_CEILING=50]` (`config-validation-check.sh` §4b). Kein Handlungsbedarf.
- [ ] **[Config-Integrität]** `config-validation-check.sh factory.defaults.yml` verifiziert:
  Exit 0. Die fail-closed-Regeln bleiben unverändert wirksam — 4a (tier ∈ model_tiers),
  4b (max_turns Integer ∈ [1,50]), 4c (tier_by_size). Der `MAX_TURNS_CEILING=50` liegt weiterhin
  bewusst als Gate-Policy **außerhalb** der merge-baren Config (kann per Override nicht angehoben
  werden). Das Entfernen der Einträge reduziert nur die Zahl der geprüften Blatt-Pfade und
  schwächt keine Regel.
- [ ] **[Injection / Data-as-Code]** Der neue `ph1_ok`-Testblock (`run-tests.sh`) baut
  yq-Ausdrücke über die Skill-Namen `requirements`/`architecture`/`release-notes`. Diese stammen
  aus einer **hartkodierten Literal-Schleife** im Testskript, nicht aus Nutzer-/Config-Eingabe —
  kein Injektionsvektor. Keine neue nutzerkontrollierte Datenquelle im Diff.
- [ ] **[Secrets / Krypto]** Keine Secrets, Credentials, Tokens, URLs oder krypto-relevanten
  Änderungen im Diff. Ausschließlich YAML-Kommentare, Doku-Text und Test-Assertions.
- [ ] **[Hidden Coupling / Info-Disclosure]** Repo-weiter Grep über `scripts/` nach direkten
  `yq`-Lesezugriffen auf `skills.requirements|architecture|release-notes` ist leer — kein Skript
  bricht durch das Entfernen (Fehlerszenario F1 der Spec bestätigt). Keine Stack-Traces,
  Error-Leaks oder Info-Disclosure eingeführt.

## Ergebnis
PASSED
