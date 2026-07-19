## Codify-Report: Task 148

### Muster-Analyse

Der Zyklus lief **ohne Findings** durch (/review APPROVED, /security-review PASSED, kein Rework).
Das ist kein „nichts gelernt", sondern die Bestätigung eines Meta-Musters:

- **Die #144-Codify-Notiz hat funktioniert.** #148 war dort explizit als „gleichartige
  Folge-Task" benannt; die zwei prognostizierten Fallen (`-w`-Grep blind für Komposita;
  Pfad-/Identifier-Beispiele nicht automatisch neutral) wurden **aktiv** abgesichert
  (Doppel-Grep mit identischer Ausgabe; spec-120 als Entscheidungs-Record bewusst ausgenommen)
  → APPROVED in Runde 1. Der Self-Improvement-Loop hat einen Fehler in der Nachfolge-Task
  präventiv verhindert.

### Neue Regeln hinzugefügt

- **`docs/factory/PROJECT-CONTEXT.md`** (Erweiterung des #144-Stolpersteins „Terminologie-Sweep"):
  neue **Homograph-/Wortstamm-Falle**. Bei einem Sweep kann der Ziel-Begriff einen anderen
  Begriff mit gemeinsamem Stamm haben, der erhalten bleiben muss (hier Rolle `Abrechner` vs.
  Tätigkeit `Abrechnung`, Stamm `Abrechn-`). Regel: nie auf den Stamm ersetzen, den
  distinktesten vollständigen Token wählen und den zu erhaltenden Homograph per
  **Count-Assertion vor/nach** absichern (`git grep -c abrechnung` unverändert). – wegen:
  ein blindes `sed s/Abrechn.../` hätte die Tätigkeit stillschweigend mitverändert; diese
  Sub-Falle war von der #144-Regel (Komposita/Pfade) noch nicht abgedeckt.

### Bewusst KEINE Regel hinzugefügt

- **zsh-Wortsplitting bei `sed … $files`** (die Ad-hoc-Ersetzung schlug zunächst fehl, weil der
  Bash-Tool-Shell hier zsh ist und unquoted `$files` nicht wortsplittet): Das ist ein
  **Harness-/Shell-Quirk der interaktiven Session**, kein Projekt-Skript-Problem – alle
  committeten Gates laufen über `#!/usr/bin/env bash` (`scripts/checks/*`, `factory-commit.sh`).
  Eine Projekt-Regel/Guideline dafür wäre fehl am Platz (würde `bash-gotchas.md` mit einer
  Nicht-Projekt-Umgebung verwässern). Nur hier als Prozess-Notiz festgehalten.

### Keine Out-of-Scope-Issues

Keine Folge-Arbeit nötig. Die verbleibenden `abrechner`-Referenzen im Repo (Migrations-Historie
`db/migrations/**`, `db/schema.ts`-Kommentar, `lib/authz.test.ts` Legacy-Ablehnung) sind
ausnahmslos legitim historisch/intentional und dürfen **nicht** angefasst werden.

### Empfehlung für nächste Features

- Künftige Terminologie-/Identifier-Sweeps: **vor** dem Bulk-Replace prüfen, ob ein zu
  erhaltender Homograph mit gemeinsamem Wortstamm existiert, und dafür eine Count-Assertion
  in die Akzeptanzkriterien aufnehmen (Muster jetzt in PROJECT-CONTEXT). Die Doppel-Grep-Disziplin
  (`-w` + Substring, identische Ausgabe) als Abschluss-Beleg beibehalten.
