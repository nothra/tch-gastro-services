## Codify-Report: Task 214

### Neue Regeln hinzugefügt
- [`docs/factory/lessons/testing.md` + Index in `PROJECT-CONTEXT.md`] **Negativ-Test mit mehreren
  Fail-Pfaden auf den Ziel-Pfad isolieren** – wegen: Review-Finding W1 (von 2 Personas unabhängig).
  Der F2-Test war grün aus dem falschen Grund: das Fixture ließ zwei unabhängige Fail-closed-Pfade
  gleichzeitig auslösen, sodass die Sektions-Prüfung das `exit 1` trug statt der geprüften Verdict-
  Exaktverankerung – die eigentliche #211-Regression wäre unentdeckt geblieben.
- [`docs/factory/lessons/testing.md` + Index in `PROJECT-CONTEXT.md`] **Kopplungs-/Drift-Guard
  braucht einen Negativtest je gekoppelter Seite** – wegen: /test-Selbstfund zu AC6. Die erste
  Implementierung testete Drift nur über Mutation der Command-Seite; die vom AC geforderte
  Gegenrichtung (Parser-Konstante driftet) blieb ungetestet, obwohl alle Tests grün waren.

### Muster
Beide Learnings sind derselbe Grundfehler in zwei Ausprägungen: **ein grüner Test, der das
behauptete Verhalten gar nicht ausübt.** Einmal, weil ein anderer Fail-Pfad das Rot trug (W1);
einmal, weil nur eine von zwei Drift-Richtungen mutiert wurde (AC6). Gegenmittel jeweils: das
Fixture präzise auf das Zielmerkmal zuschneiden und das **pfadspezifische Signal** (Meldung/
Konstante) assertieren, nicht bloß den Exit-Code.

### Keine Änderungen nötig
- Security-Review: PASSED ohne Findings → keine Security-Regel.
- Portabilität (POSIX/awk) war von Anfang an eingehalten – bestehende Regel greift, kein neues
  Learning.
- `/refactor` (toten `found_any`-Wächter entfernt) war eine saubere Anwendung der bestehenden
  clean-code-Regel „Keine Fallbacks für bereits ausgeschlossene Fälle" – kein neues Learning.

### Empfehlung für nächste Features
Bei jedem neuen Guard/Backstop mit **mehreren** Fail-Bedingungen oder **mehreren** gekoppelten
Quellen: pro Bedingung/Quelle einen isolierten Negativtest + pfadspezifische Assertion einplanen –
und optional per no-op-Stub die Nicht-Vakuität der Negativtests belegen (RED aus dem richtigen
Grund), wie in #214 praktiziert.
