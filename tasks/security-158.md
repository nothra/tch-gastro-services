# Security Review: Task 158

Änderungsumfang: `.claude/commands/pr-shepherd.md` Schritt 6 (Shell-Snippet für die
Merge-Freigabe), Konsistenz-Test in `scripts/checks/tests/run-tests.sh`, Doku (ADR-030,
Spec, PROJECT-CONTEXT). **Kein Produktcode, keine Auth-/DB-/Payment-/User-Input-Fläche.**

## Kritische Findings (Blocker)

_Keine._

## Wichtige Findings

_Keine._

## Hinweise

- [ ] **Portabilität/Härtung (pre-existing, optional):** `first_match_line`
  (`scripts/checks/tests/run-tests.sh:1516`) nutzt `grep -nF "$1" "$2"` **ohne** `--` vor
  dem Pattern – anders als `section_contains` (nutzt `grep -qF -- "$needle"`). Kein
  Live-Vektor: alle Needles sind **fest im Testcode kodierte Literale** (`factory-commit.sh`,
  `gh pr merge --auto --squash`, …), keine nutzer-/fremdkontrollierten Werte erreichen die
  Funktion; die codifizierte #36-Regel zielt explizit auf *nutzerkontrollierte* Suchwerte.
  Rein defense-in-depth/Konsistenz. **Nicht durch Task 158 eingeführt** (bestehende Helper-
  Funktion); kein Issue angelegt (kein Vektor, trivial). Bei Gelegenheit `-- ` ergänzen.

## Geprüft (unauffällig)

- **Command Injection:** `MERGE_STATE="$(gh pr view --json mergeStateStatus -q
  .mergeStateStatus)"` liefert einen GitHub-API-**Enum**-Wert (CLEAN/BLOCKED/…), wird im Test
  `[ "$MERGE_STATE" = "CLEAN" ]` **gequotet** verglichen, nie ge-`eval`t oder ungequotet
  expandiert. Kein interpolierter User-Input in den `gh`-Aufrufen. → sicher.
- **Fail-closed / kein Merge-Gate-Bypass:** Der neue direkte `gh pr merge --squash` kann die
  required Checks **nicht umgehen** – das GitHub-Ruleset `protect-main` (ADR-029) erzwingt
  sie server-seitig, unabhängig vom gewählten Merge-Kommando. `mergeStateStatus == CLEAN`
  bedeutet, dass alle required Checks bereits grün sind; alle anderen Zustände fallen auf
  `--auto` zurück (das nie einen roten PR mergt). Die Merge-Modus-Wahl ist nur ein Auslöser,
  keine Autorisierung.
- **Secrets:** keine Tokens/Keys/Credentials im Diff (grep auf `ghp_`/`github_pat`/`secret`/
  `token`/`api_key`/PRIVATE KEY – 0 Treffer). Das dokumentierte `gh api … -F
  allow_auto_merge=true` (PROJECT-CONTEXT) enthält kein Secret.
- **Dependencies:** keine neuen Abhängigkeiten.
- **Error Handling / Info-Leak:** keine Stack Traces / sensiblen Ausgaben; Gate-Skript
  fail-closed, integer-sichere `case`-Absicherung in `first_match_line`.

## Ergebnis

PASSED
