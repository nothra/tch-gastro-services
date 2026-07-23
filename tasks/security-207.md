# Security Review: Task 207

> Diff-Scope: `git diff origin/main...HEAD` (nur #207). Rein Bash + Doku – kein App-/Auth-/DB-/
> Routen-Code, keine neuen Dependencies. Angriffsfläche: die `gh`-Aufrufe im Idempotenz-Lookup
> und die Delegation an `create_issue`.

## Kritische Findings (Blocker)

_Keine._

## Wichtige Findings

_Keine._

## Hinweise

- [ ] **[Injection – informativ, kein Fix]** Der Titel wird an `gh issue list --search
  "in:title $title"` als **Daten** übergeben (ein quotiertes Argument, kein Word-Splitting) und
  landet **nicht** im `-q`-jq-Filter (der ist ein fixes Literal `.[] | .number, .title`). Ein Titel
  mit gh-Suchoperatoren könnte höchstens die *Kandidaten-Verengung* verzerren – der clientseitige
  **exakte** Vergleich (`[ "$cand_title" = "$title" ]`) verhindert jeden False-Positive-Treffer.
  Kein Shell-/Command-/jq-Injection-Vektor. (Design-Stärke aus ADR-040 §3.)
- [ ] **[Logik – informativ]** Theoretische „Finding-Unterdrückung": Wer mit Repo-Schreibrechten
  vorab ein offenes Issue mit exakt dem künftigen Fund-Titel anlegt, ließe den Guard die bestehende
  Nummer zurückgeben statt neu anzulegen. Praktisch irrelevant: (a) erfordert bereits Repo-Write,
  (b) der Fund geht **nicht** verloren – der Aufrufer erhält eine gültige Issue-Nummer. Kein
  Handlungsbedarf.

## Geprüft & unauffällig

- **Command/Shell-Injection:** kein `eval`, keine Backticks; einzige Substitution `raw=$(gh …)` mit
  quotierten Argumenten. `${repo_args[@]+"…"}` set-u-sicher.
- **jq-Injection:** Filter ist fixes Literal, Titel nicht interpoliert; keine externe `jq`-Dependency.
- **Reserved-Label-Guard (#82 H-1):** `create_issue_idempotent` delegiert an `create_issue`, das den
  `factory::`-Denylist-Guard unverändert durchläuft → kein Bypass des Selbst-Trigger-Schutzes. Auf dem
  Treffer-Pfad wird gar nichts angelegt (kein Label-Handling).
- **Secrets/Credentials/Krypto:** keine – kein Secret-Handling, keine Zufallszahlen, kein `Math.random`.
- **Fehler-/Info-Leak:** stderr-Meldungen nennen nur eine numerische Issue-Nummer (`$existing` ist per
  Numerik-Guard garantiert eine reine Zahl) bzw. eine generische fail-open-Warnung – keine sensiblen
  Daten, keine Stack Traces.
- **Fail-open-Semantik:** ein nicht durchführbarer Lookup führt zur regulären Anlage (höchstens ein
  Duplikat), nie zu Exposure oder Rechteausweitung. Anlage bleibt fail-closed.
- **Dependencies:** keine neuen (bewusst kein `jq`).

## Ergebnis

PASSED
