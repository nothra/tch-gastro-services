## Codify-Report: Task 236

### Neue Regeln hinzugefügt

- [`docs/factory/guidelines/bash-gotchas.md`](../docs/factory/guidelines/bash-gotchas.md)
  (neuer Punkt 11): **Die eigene Aufräumzeile im Fehlerpfad braucht selbst eine
  `set -e`-Absicherung.** Wegen: Review-Runde 3 fand ein kritisches Finding – die
  Aufräumzeile `rm -f "$WORKDIR/.env.local"` im `cp`-Fehlerpfad von `start-work.sh` stand
  unbedingt im `elif`-Zweig und konnte bei einem eigenen Fehlschlag (`ENOTDIR`/`EACCES`) das
  ganze Skript unter `set -e` **wortlos** abbrechen – exakt der stille Abbruch, den die
  Fehlerbehandlung verhindern sollte. Der Fix in Runde 4 kombinierte zwei Wege
  (`|| true` + Nicht-Verzeichnis-Guard); beide sind jetzt als Muster festgehalten. Diese
  Fehlerklasse ist in `bash-gotchas.md` bisher nicht vertreten (die zehn bestehenden Punkte
  decken Exit-Code-Fallen, Pipe/SIGPIPE, Array-Expansion, Locale, Substring-Matches,
  `commit-msg`-Aufrufpfade und Git-Index-Vergleiche ab, aber nicht „die eigene
  Fehlerbehandlung kann selbst scheitern").

- [`docs/factory/guidelines/git-workflow.md`](../docs/factory/guidelines/git-workflow.md)
  (Abschnitt „Branch-Aufräumen"): Hinweis ergänzt, dass ein Worktree seit #236 eine Kopie der
  lokalen Secrets (`.env.local`) enthält und `git worktree remove` damit auch Secret-Hygiene
  ist, nicht nur Plattenplatz-Aufräumen. Wegen: Die Security-Review (`tasks/security-236.md`,
  Hinweis 1) hatte genau diese Doku-Ergänzung explizit empfohlen, sie aber bewusst als
  „kein Merge-Blocker, keine Code-Änderung" eingestuft – ohne einen Folge-Schritt wäre die
  Empfehlung sonst folgenlos im Security-Report liegen geblieben. `/codify` schließt diese
  Lücke, wie in `git-workflow.md` selbst am identifizierten Ort vorgeschlagen.

Beide Änderungen sind reine Doku-Ergänzungen (kein Produktionscode). Volle Testsuite nach der
Änderung erneut gefahren: `bash scripts/checks/tests/run-tests.sh` → **1029 grün / 0 rot**,
keine Regression durch die neuen Prosa-Absätze (relevant wegen der wiederkehrenden
`grep -qF`-Zeilenumbruch-Lesson aus #240/#249/#286 – geprüft, dass keine bestehende
Fixed-String-Assertion gegen den geänderten Abschnitt läuft).

### Keine Änderungen nötig

- Review- und Security-Review-Endstand waren beide grün (0 kritisch, 0 wichtig). Die übrigen
  in den Rework-Notizen benannten Muster (AK9-Header-Isolation/awk-Sentinel, falsche
  „empirisch verifiziert"-Behauptung im Testkommentar, `grep -qF`-Zeilenumbruch-Empfindlichkeit)
  sind bereits durch bestehende Lessons abgedeckt (`#255`-Muster bzw. `#268`/`#264`/`#284` in
  `docs/factory/lessons/code-style.md`/`testing.md`) – die Task hat diese Lessons korrekt
  angewendet, keine neue Regel nötig.
- Die drei in den Refactoring-Notizen als „bewusst offen" benannten Test-Hygiene-Punkte
  (Helper-Rename `flat_286`/`assert_contains_286`, `set_env_source`-Setter, Zusammenlegen der
  drei Env-Prologe) sind reine Test-Interna ohne Verhaltensbezug und ohne wiederkehrendes
  Muster über mehrere Tasks hinweg – kein Codify-Kandidat.
- Die Terminologie-Korrektur „Quelle ist `$FACTORY_DIR`, nicht der Haupt-Baum" war in dieser
  Task selbst Gegenstand einer Doku-Drift-Korrektur (Runde 3), nicht eines wiederkehrenden
  Fehlermusters über Tasks hinweg – bereits an allen betroffenen Stellen (Spec, Task, drei
  Guideline-/Lesson-Dateien) konsistent nachgezogen, kein zusätzlicher Codify-Bedarf.

### Empfehlung für nächste Features

- Der neue Bash-Gotcha #11 lohnt einen kurzen Blick bei jedem künftigen Fehlerpfad, der einen
  eigenen Teilzustand aufräumt (`rm`/`mv`/`kill` im `else`/`elif`-Zweig unter `set -e`) –
  Faustregel: „Kann diese Aufräumzeile selbst scheitern, und was passiert dann?"
- Security-Review-Hinweise, die explizit „Doku, kein Code" mit einer konkreten Zielstelle
  benennen, sollten künftig direkt im selben `/security-review`- oder `/refactor`-Durchlauf
  umgesetzt werden, statt bis `/codify` liegen zu bleiben – hier war es unschädlich (der
  Hinweis war klar lokalisiert), aber ein genereller Reflex „konkrete Doku-Empfehlung sofort
  einpflegen" spart einen Task-Zyklus.
