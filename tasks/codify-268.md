## Codify-Report: Task 268

### Neue Regeln hinzugefügt

- `docs/factory/lessons/code-style.md` + Index-Zeile in `PROJECT-CONTEXT.md`: **„Empirisch
  verifiziert" im Kommentar ohne tatsächliche Prüfung – Rezidiv trotz Fix an anderer Stelle.**
  Wegen: Review-Runde 2 (Finding W3) korrigierte einen WHY-Kommentar, der „empirisch
  verifiziert" behauptete, obwohl die Reproduktion (Sandbox-Permission-Block bei `git`-Aufrufen
  in Wegwerf-Repos) nie stattgefunden hatte. Runde 4 (Finding W1) fand **dasselbe
  Overclaiming-Muster** an einer anderen Stelle im selben Skript wieder – der erste Fix deckte
  nur die gemeldete Zeile, nicht das Muster. Zusätzlich hatte sich eine falsche Versionsangabe
  („git 2.51" statt der tatsächlich installierten 2.50.1, nie per `git --version` geprüft) auf
  sieben Stellen über vier Dateien kopiert, bevor Runde 4 es bemerkte. Klar
  wiederholbares, spezifisches Muster (Evidenz-Überziehung statt bloßer Kausalketten-Fehler wie
  im verwandten #264-Learning) – eigene Lesson statt Ergänzung der bestehenden #264-Regel, weil
  der Fehlertyp (unbelegte Empirie-Behauptung) ein anderer ist als die dort behandelte falsche
  Kausalkette.

### Out-of-Scope-Issues angelegt

- **#282** – Test-Fixtures in `run-tests.sh` (#268-Suite) isolieren ihre Commit-Kommandos nicht
  gegen ambiente globale `core.hooksPath` (`rc_hooks()` selbst isoliert korrekt, die
  Fixture-Commits nicht) → latente Testfragilität auf Entwicklermaschinen mit
  `git config --global core.hooksPath …` (husky-/dotfiles-Muster). Aus Review-Runde-4-Nitpick
  N3, nicht mergeblockierend, daher als eigenes Issue statt in #268 nachgezogen. `bug` +
  `tech-debt` + `test`.
- Bereits von `/review`/`/security-review` autonom angelegt (kein Codify-Zutun nötig, hier nur
  zur Vollständigkeit verlinkt): **#278** (Opt-out für global gesetztes `core.hooksPath`),
  **#279** (Leerstring-Blindspot in `install-hooks.sh`), **#280** (`echo -e`
  Escape-Interpretation des config-kontrollierten Werts), **#281** (`core.hooksPath`, das auf
  den Standard-Hookpfad zeigt, wird fälschlich abgelehnt).

### Keine Änderungen nötig

- Die übrigen Review-Nitpicks (spec-268-AK-Checkbox-Drift, restliche
  `HOOKS_PATH_HINT`-Duplikation N1, ungepinnte „byte-identisch"-Zusage N4, Runde-1-Testdatei-
  Nitpicks zu Testorganisation/Magic-String/Traceability) sind rein kosmetisch bzw.
  Test-Hygiene ohne Verhaltensrisiko, in `tasks/review-268.md` vollständig dokumentiert und
  bleiben dort als Backlog für den nächsten Anfassen der Datei – kein eigenes Issue, analog zur
  bisherigen Praxis, nicht jeden optionalen Nitpick zu tracken.
- Die Circuit-Breaker-Nutzung (Runde 3 erschöpft, Runde 4/5 als reine Re-Reviews der
  Folge-Commits statt neuer Implement-Iterationen) folgte der bestehenden Regel korrekt – keine
  neue Regel nötig.
- Die wiederholten Pipeline-Neustarts dieser Session (Bash-Timeout killte `run-pipeline.sh`
  mehrfach mitten in einer Skill-Ausführung, jeder Neustart begann bei Phase 1 neu) sind bereits
  unter dem bestehenden Out-of-Scope-Issue **#275** („Härtung" für die Turn-Limit-Retry-/
  Resume-Problematik) getrackt – deckt auch dieses Verhalten ab, kein zusätzliches Issue.

### Empfehlung für nächste Features

- Bei WHY-Kommentaren, die eine konkrete Umgebungs-Tatsache (Version, Reproduzierbarkeit)
  behaupten: den Beleg-Befehl tatsächlich in der aktuellen Session ausführen, bevor „empirisch"
  geschrieben wird – sonst lieber „analytisch begründet" formulieren.
