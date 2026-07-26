# Security Review: Task 239

Scope: `git diff origin/main...HEAD` – geändert wird ausschließlich das privilegierte
Commit/Push-Seam-Skript `scripts/factory-commit.sh` (ADR-019) sowie dessen Bash-Tests, Spec und
ADR-Nachtrag. Keine App-/Auth-/DB-/Dependency-Änderung. Threat Surface = das Seam selbst: es ist
der einzige auditierte Weg, über den ein Stage-3-Sub-Agent (nur `Bash(bash scripts/*)`, keine
git-Schreib-Permission) committen/pushen darf.

## Kritische Findings (Blocker)
- _Keine._

## Wichtige Findings
- _Keine._

## Hinweise
- [ ] [Input/Injection] Kein neuer externer Input: der einzige nutzerkontrollierte Wert `$1`
      (Commit-Message) wird im neuen leeren Zweig nicht verwendet und sonst nur gequotet in
      `git commit -m "$COMMIT_MESSAGE"`. `git rev-list '@{u}..HEAD'` nutzt `@{u}` als Literal
      (single-quoted, nicht user-kontrolliert); die Ausgabe wird nur gequotet in `[ -n "…" ]`
      ausgewertet. Command Injection nicht möglich.
- [ ] [AuthZ/Guard-Umgehung] Der neue Nachhol-Push wird erst **nach** allen Fail-closed-Guards
      erreicht (Argumentanzahl → kein Arbeitsbaum → detached HEAD → main/master, `factory-commit.sh`
      Zeile 34–57). Push auf `main`/`master` bleibt ausgeschlossen; die Erweiterung sitzt hinter
      der Grenze, nicht davor. Durch Testfall 11/Regression + AC6 belegt.
- [ ] [Destruktive Ops] Kein `--force`, kein `reset --hard`. `push_branch` kapselt genau die
      bestehende Push-Logik (`git push` bzw. `git push -u origin HEAD`); ein diverged Branch
      führt zu einem normalen Non-Fast-Forward-Fehlschlag, nicht zu einem Auto-Force
      (Spec-Fehlerszenario 2).
- [ ] [Fail-closed / Error Handling] Scheitert der nachgeholte Push, reicht `set -euo pipefail`
      den Exit ≠ 0 unverändert weiter (Testfall 12) – kein stiller „committed, aber nicht
      gepusht"/„übersprungen"-Erfolg. Der `||`-Kurzschluss in der neuen Bedingung verhindert,
      dass `git rev-list '@{u}..HEAD'` bei fehlendem Upstream unter `set -e` selbst zum Abbruch
      führt (der No-Upstream-Fall wird vom linken `! git rev-parse … '@{u}'`-Zweig abgefangen).
- [ ] [Information Disclosure] `err`-Meldungen (stderr) enthalten nur den Branch-Namen, keine
      Secrets, keine Tokens, keine internen Pfade. Kein Stack-Trace-Leak nach außen.
- [ ] [Dependencies] Keine neuen Dependencies (kein `package.json`/Lockfile-Diff). Nichts zu
      auditieren.

## Ergebnis
PASSED
