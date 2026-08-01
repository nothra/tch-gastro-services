## Codify-Report: Task 240

### Neue Regeln hinzugefügt

- [`docs/factory/lessons/testing.md`](../docs/factory/lessons/testing.md) – „Neue
  Regressions-Assertion-Schleife gegen bereits vorhandene Schleife mit identischem Rumpf
  abgleichen, bevor eine parallele Schleife angelegt wird" – wegen: `/test` fügte 11 neue
  Einzel-Assertionen als **zweite** `for entry in ...`-Schleife hinzu, obwohl im selben
  Testabschnitt bereits eine strukturgleiche Schleife (identischer `jq`-Prüfausdruck, gleiches
  Assert-Message-Format) für eine andere Eintragsliste existierte – echte Duplikation, erst in
  `/refactor` bemerkt statt beim Schreiben. Konkrete Instanz der bereits bestehenden
  `code-style.md`-Regel zu Capability-Checks, jetzt auch für Regressions-Assertion-Schleifen
  in Bash-Testsuiten formuliert.
- [`docs/factory/lessons/testing.md`](../docs/factory/lessons/testing.md) – „`grep -qF`-Fixed-
  String-Regressionstest gegen Markdown-Prosa: beim Umbrechen die Testphrase auf einer Zeile
  halten" – wegen: ein Review-Rework-Fix brach **zweimal hintereinander** einen bestehenden
  `#224`-AK7-Regressionstest, weil ein manueller Zeilenumbruch die vom Test erwartete
  Zeichenkette über zwei Zeilen verteilte – `grep -qF` matched nur innerhalb einer Zeile, der
  Test schlägt dabei lautlos (nicht mit erkennbarem Syntaxfehler) fehl.
- [`docs/factory/lessons/factory-workflow.md`](../docs/factory/lessons/factory-workflow.md) –
  „Write-Tool-Zielpfad im Worktree explizit gegen den Worktree-Suffix prüfen, nicht dem
  Bash-cwd vertrauen" – wegen: die neue Spec-Datei landete beim ersten Anlauf im geteilten
  Hauptbaum statt im Worktree, weil der Bash-cwd nach jedem Bash-Aufruf auf den Hauptbaum
  zurückspringt und das `Write`-Tool einen absoluten Pfad genau so nimmt, wie er getippt wird
  – kein Tool-Bug, sondern ein veraltetes mentales Modell aus einem vorherigen `cd`. Nur durch
  Zufall (`git status --short` im Hauptbaum) bemerkt.

Alle drei Index-Zeilen mit „Laden bei"-Trigger in `docs/factory/PROJECT-CONTEXT.md` ergänzt
(ADR-037: Volltext nicht im `@import`-Pfad).

### Keine Änderungen nötig

- **Review-Finding „stale Prosa an dritter Stelle" (Runde 2+3):** bereits durch die bestehende
  `#176`-Regel („Auch Lesson-/Kontext-Doku im Präsens... dieselbe Prosa im selben PR
  nachziehen") abgedeckt – kein neues Muster, nur eine Instanz, bei der ich die eigene Regel
  nicht vollständig (nicht auf alle Fundstellen im selben File) angewendet habe. Keine neue
  Regel nötig, aber ein Hinweis für die nächste Iteration (siehe unten).
- **Security-Review-Finding „Rückfallebene nur prozedural abgesichert":** kein Code-/Doku-Fix
  nötig – der bestehende Lesson-Reminder ("bei größerem CLI-Update erneut verifizieren") ist
  bereits die angemessene Mitigation; ein automatisierter CI-Test dafür ist ohne interaktive
  `claude --print`-Ausführung nicht sinnvoll baubar.
- **Out-of-Scope-Fund (fehlender Regressionstest für #88-Edit(...)-Einträge):** bereits als
  Issue [#251](https://github.com/nothra/tch-gastro-services/issues/251) angelegt, kein
  Codify-Learning (ist ein Backlog-Item, kein Prozessfehler).

### Empfehlung für nächste Features

- Beim Beheben eines "stale Prosa"-Findings (`#176`/`#211`) **immer** den gesamten
  betroffenen Lesson-/Doku-File nach `Write(...)`- bzw. dem jeweiligen Schlüsselbegriff
  greppen, nicht nur den offensichtlichsten Abschnitt korrigieren – derselbe Sachverhalt kann
  in mehreren, nicht querverweisenden Abschnitten derselben Datei beschrieben sein (in diesem
  Fall: `#91`-Patch-Workflow-Abschnitt und `#224`-Permission-Regeln-Abschnitt beschrieben
  beide dieselbe Write(...)-Mechanik, unabhängig voneinander).
- Nach jeder Prosa-Umformulierung in einer Datei mit `grep -qF`-Regressionstests sofort den
  vollen Testlauf ausführen, nicht erst am Ende des Schritts – die neuen Lessons oben
  dokumentieren beide Fälle mit konkreten Ankerpunkten zum Selbst-Prüfen.
