## Codify-Report: Task 82

### Muster-Analyse (Review + Security)

Der einzige **kritische** Fund war ein klassischer „Tests grün, Verhalten falsch"-Fall – genau
die Sorte, für die `bash-gotchas.md` existiert:

- **F1 (Review, Kritisch):** `"${repo_args[@]}"` ohne `+`-Guard → „unbound variable" unter
  `set -u` auf **bash 3.2** (macOS-Default `env bash` = 3.2.57). Betroffen war der no-repo-Pfad
  (gh-Auto-Erkennung), den die Skills nutzen. Der „deckende" Test lief ohne `set -u` und übersah
  den Bug – **Test-Umgebung war nachsichtiger als die Produktion.** Erst der unabhängige Review
  fand ihn.
- **Zweit-Erkenntnis:** Command-Substitution `$(…)` unterdrückt `set -e`, **nicht** `set -u`.
  Das erklärt, warum F1 (nounset) auch im gefangenen `num=$(create_issue …)` zuschlug, während
  das parallel gemeldete errexit-Finding (R3#1) dort **nicht** reproduzierte – ich habe R3#1
  gezielt gegengeprüft und als für die realen Aufrufer nicht zutreffend widerlegt (trotzdem als
  Defense-in-depth mit gehärtet).

Wiederkehrendes Meta-Muster (schon in Gotcha 1–3 sichtbar): Bash-Fehler, die nur unter
bestimmten Shell-Optionen / bestimmten Bash-Versionen auftreten und durch zu nachsichtige Tests
maskiert werden.

### Neue Regeln hinzugefügt

- **`docs/factory/guidelines/bash-gotchas.md` → Gotcha 4** – „`"${arr[@]}"` bei leerem Array
  unter `set -u` → unbound variable (bash < 4.4 / macOS 3.2)". Enthält: den `+`-Guard
  (`${arr[@]+"${arr[@]}"}`), die Unterscheidung „`$(…)` unterdrückt errexit, nicht nounset",
  und die Test-Regel „gesourcte Libs unter den `set -euo pipefail` der echten Aufrufer testen,
  inkl. Leer-Array-Grenzfälle". Wegen: F1.

### Bewusst KEINE weitere Änderung

- **Kein automatisches Gate** für unguarded `"${arr[@]}"`: nicht zuverlässig maschinell
  erkennbar (sichere Nutzung innerhalb `[ ${#arr[@]} -gt 0 ]`-Guards → zu viele False-Positives).
  Ein Gate, das nicht verlässlich greift, ist schlechter als keins (clean-code.md „Portabilität
  in Gate-Skripten"). Bleibt Review-/Checklisten-Regel in bash-gotchas.md.
- **Security H-1** (Seam wies `factory::`-Präfix nicht ab): kein „wiederholter Fehler", sondern
  ein proaktiv im Security-Gate gefundener + im selben Zyklus behobener Punkt. Design in
  ADR-018 §3 dokumentiert; keine PROJECT-CONTEXT-Regel nötig.
- **F2** (`--labels` ohne Wert → `shift 2`-Abbruch): Einzelfall, kein Muster; inline behoben +
  Regressionstest. Keine Regel.

### Was überraschend gut funktionierte (bewahren)

- **Unabhängiger Multi-Persona-Review fand den kritischen Bug, den die Tests verpassten** – der
  Wert der drei getrennten Perspektiven hat sich konkret ausgezahlt.
- **Findings reproduzieren, bevor man handelt** (Factory-Ethos): R3#1 wäre sonst als „wichtig"
  fehl-priorisiert worden; die Reproduktion zeigte die echte Grenze (nounset ≠ errexit in `$()`).

### Empfehlung für nächste Features

- Bei **jedem** neuen sourcebaren Shell-Helper: mindestens einen Test unter `set -euo pipefail`
  fahren, mit den Leer-Array-Grenzfällen – nicht nur im nachsichtigen `bash -c 'source …'`.
- `env bash` auf Zielsystemen ist oft **3.2** (macOS). Neue Bash-Konstrukte gegen 3.2 prüfen
  (keine 4.x-only-Features ohne Guard).
