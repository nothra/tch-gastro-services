## Codify-Report: Task 341

### Neue Regeln hinzugefügt

- [`docs/factory/lessons/testing.md`] Neue Lesson „Locale-abhängige Zahlenformatierung/-parsing
  in Shell-Test-Utilities" (aus #96, #341) – wegen: #341 ist ein Rezidiv derselben Fehlerklasse
  wie #96 (dort bash-`printf '%.1f'`, hier `awk`-Dezimalsummen ohne `LC_ALL=C`), die bislang
  nirgends als Lesson festgehalten war, nur inline in Testkommentaren. Regel: jeder
  awk-/bash-Aufruf, der Dezimalzahlen parst/formatiert, bekommt ein **lokales** `LC_ALL=C`
  direkt am Aufruf (nie global, sonst maskiert es den bewusst locale-abhängigen #96-Test
  selbst); wird der Ausdruck von mehreren Stellen gebraucht, in einen gemeinsamen Helfer
  extrahieren statt kopieren.
- [`docs/factory/PROJECT-CONTEXT.md`] Index-Zeile mit „Laden bei"-Trigger für die neue Lesson
  unter `lessons/testing.md` ergänzt (Gruppen-Header-Trigger `/implement`, `/test`, `/review`
  beim Testschreiben/Coverage gilt bereits für die ganze Gruppe).

### Keine Änderungen nötig

- **Review-Findings:** alle drei Runden APPROVED, keine kritischen/wichtigen Findings. Die vier
  Nitpicks wurden im `/refactor`-Schritt bewusst nicht umgesetzt (entsprechen bestehenden
  Konventionen bzw. der in `/requirements` festgelegten Wortwahl) – kein wiederkehrendes
  Muster, das eine neue Regel rechtfertigt.
- **Security-Review:** PASSED, keine Findings – kein Lernbedarf.
- **CLAUDE.md / Guidelines:** kein fundamentaler Prozessfehler in dieser Task; die bestehenden
  Regeln (Reproduktionstest zuerst, Mutationsbeleg über den echten Aufrufweg, keine
  Content-Scan-Guards) haben den Bug-Fix bereits korrekt geleitet – keine Ergänzung nötig.
- **Neuer automatisierter Check:** kein projektweiter Guard gegen künftige locale-abhängige
  awk-Aufrufe (bewusst außerhalb des Scopes laut Spec/Requirements, `lessons/factory-workflow.md`
  #312/#339: verzeichnisweite Content-Scan-Guards sind eine wiederkehrende Fehlerquelle) – die
  neue Lesson ist der bewusst gewählte, leichtgewichtigere Präventionsmechanismus.

### Empfehlung für nächste Features

Beim nächsten neuen awk- oder bash-`printf`-Aufruf in `scripts/checks/tests/run-tests.sh`
(oder `metrics.sh`), der eine Dezimalzahl parst oder formatiert, die neue Lesson
`lessons/testing.md` → „Locale-abhängige Zahlenformatierung/-parsing" beim Implementieren
gezielt lesen, statt das `LC_ALL=C`-Präfix erneut zu vergessen.
