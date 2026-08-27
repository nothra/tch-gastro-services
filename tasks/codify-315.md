## Codify-Report: Task 315

### Neue Regeln hinzugefügt

- **`docs/factory/lessons/factory-workflow.md`** (+ Index-Zeile in `PROJECT-CONTEXT.md`):
  „Anker-Liste einer Fail-safe-Klassifizierungsregel braucht einen Verteilungs-Check gegen den
  echten Repo-Inhalt" – wegen: Review-Runde 4 fand, dass drei vorangegangene Runden den
  zweiseitigen Pfad-Anker für `factory-pipeline` (`git-workflow.md`) nur auf Vollständigkeit
  und Nicht-Überlappung geprüft hatten, nie auf tatsächliche Vorhersagekraft. Der Anker
  `docs/specs/` (App-Seite) erwies sich bei Nachzählung (78 Specs, 40 mit Factory-Bezug) als
  nahe am Münzwurf, weil `/requirements` jede Spec dort ablegt – unabhängig von Werkzeug- oder
  Produkt-Bezug. Die Zweifelsregel fing zwar jeden real vorkommenden Fall ab, aber genau der
  Fall, für den AK3 eine Zuordnung *ohne Rückfrage* versprach, hätte über diesen einen Anker
  die falsche Antwort bekommen. Trigger: `/implement`, `/review` – bei neuem oder geprüftem
  Pfad-Anker in einer Fail-safe-Klassifizierungs-/Tie-Break-Regel. Zusätzlich in derselben
  Regel mitgezogen: Anker sollten explizit als Repo-Wurzel-Präfix ausgewiesen sein (Nitpick aus
  derselben Runde – `lib/` matcht sonst als freier Teilstring auch in `scripts/lib/`).

### Keine Änderungen nötig (geprüft, aber verworfen)

- **Security-Review (PASSED, keine Findings):** Die geprüften Muster (Namensraum-Trennung
  `factory-pipeline` vs. `factory::*`, Shell-Hygiene in `name_hits_315()`, Fail-open-Bewertung
  von `mktemp`) bestätigen bereits etablierte Regeln (`clean-code.md` → Config-Werte als Daten;
  `factory-workflow.md` → reservierter `factory::`-Namensraum) – keine neue Lesson nötig, da
  kein neues Fehlermuster, nur eine erfolgreiche Anwendung bestehender.
- **Nitpick „ADR-018 §30" statt Zeilennummer 30:** Einmaliger Wortlaut-Schnitzer in einem
  WHY-Kommentar, keine wiederkehrende Verwechslungsquelle – nicht codify-würdig.
- **Nitpick „redundante zweite `assert_scan_clean_315`-Prüfung gegen dasselbe Fixture":** Korrekt,
  aber wirkungslose Doppelung in einer einzelnen Testdatei – kein Muster, das sich über Tasks
  hinweg wiederholt hat (anders als die bekannte #240/#267/#310-Duplikat-Schleifen-Familie, die
  bereits durch eine bestehende Lesson gedeckt ist).
- **Aus Runde 3 unverändert offen gebliebene Nitpicks** (Mutations-Anker als Teilstring bei 3
  von 7 Fundstellen, Singular im Mutationslabel, `tasks/*315*` breiter als nötig): bewusst ohne
  Wirkung im aktuellen Repo-Zustand belassen, vom Review selbst als akzeptierte Kosten
  eingestuft – keine neue Regel nötig.

### Offener Punkt außerhalb von `/codify`

Review-Runde 4 (Empfehlung **APPROVED**) hat ein „wichtiges" Finding (W1: `docs/specs/`-Anker
falsch der App-Seite zugeordnet) offen gelassen und dem Menschen zwei Wege zur Wahl gestellt
(Drei-Zeilen-Fix jetzt vs. Issue als Schuld). Das ist eine Review-Entscheidung, keine
Codify-Aufgabe – die hier neu geschriebene Lesson dokumentiert das *Muster*, das den Fund erst
in Runde 4 sichtbar machte, behebt aber nicht den Fund selbst.

**Nachtrag:** Der Mensch hat sich für Option 1 entschieden – W1 ist behoben (Commit `7b4d288`,
nachgeprüft in Review-Runde 5).

### Empfehlung für nächste Features

Bei künftigen Doku-Änderungen, die eine neue Anker- oder Tie-Break-Liste einführen (nicht nur
bei Labels – auch Routing-Regeln, Zuständigkeits-Grenzen, Auto-Trigger-Filter), die neue Lesson
gezielt laden und den Verteilungs-Check als festen Schritt in die Review-Checkliste
aufnehmen, bevor die Liste als kanonisch gilt.
