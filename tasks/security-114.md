# Security Review: Task 114

Scope: `/pr-shepherd` Schritt 6 committet+pusht die Abschlussnotiz vor dem Auto-Merge.
Geänderte Artefakte: `.claude/commands/pr-shepherd.md` (Skill-Doku, via Patch),
`docs/factory/PROJECT-CONTEXT.md` (Codify-Regel), `scripts/checks/tests/run-tests.sh`
(Self-Test-Guard + Helper), Task-/Review-/Coverage-Dateien, `tasks/patch-114.diff`.
**Kein Produktcode, kein User-Input, keine neuen Dependencies.**

## Kritische Findings (Blocker)
- keine

## Wichtige Findings
- keine

## Hinweise
- [x] **Injection (Shell) – geprüft, kein Befund.** `first_match_line()` in `run-tests.sh` nutzt
      `grep -nF "$1" "$2"` (Fixed-String, beide Argumente gequotet). Beide Werte sind
      **test-interne Literale** (`'factory-commit.sh'`, `'gh pr merge --auto --squash'`,
      `$SHEPHERD` aus `FACTORY_ROOT`) – **kein externer/User-Input**. Keine Command-/Regex-Injection.
- [x] **Integer-Härtung (positiv).** `case "$n" in ''|*[!0-9]*) n=0 ;; esac` säubert die
      Grep-Ausgabe vor dem arithmetischen Vergleich (`[ -gt ]`/`[ -lt ]`) – folgt
      `clean-code.md` „Config-/nutzerkontrollierte Werte als Daten behandeln". Fail-closed:
      fehlender/ungültiger Treffer → 0 → Assertion schlägt fehl (kein stilles Durchwinken).
- [x] **`task-$ARGUMENTS` in der Commit-Message (Skill-Doku) – geprüft, kein Befund.** Die Task-ID
      ist die GitHub-Issue-Nummer und wird von `start-work.sh` numerisch validiert. Der Wert
      landet als **einzelnes gequotetes Argument** in `bash scripts/factory-commit.sh "…"`; der
      Seam (ADR-019) lehnt Zusatz-Argumente ab (kein `--force`-Einfallstor) und pusht nie force.
- [x] **Security-positiv:** Schritt 6 schreibt jetzt zwingend über den auditierten
      Commit/Push-Seam `factory-commit.sh` (fail-closed gegen `main`/`master` & `--force`) statt
      über rohes `git commit`/`git push`. Reduziert die Angriffs-/Fehlerfläche.
- [x] **Secrets/Keys:** keine im Diff (Doku + Test). **Error-Handling:** keine Stack-Traces/PII.
      **Auth/AuthZ/Krypto/Dependencies:** nicht berührt.

## Ergebnis
PASSED
