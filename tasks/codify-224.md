## Codify-Report: Task 224

### Neue Regeln hinzugefügt

- [`docs/factory/lessons/factory-workflow.md`](../docs/factory/lessons/factory-workflow.md)
  „Permission-Regeln in `.claude/settings.json`: Pfad-Semantik und `Write`-Wirkungslosigkeit
  vorab prüfen" – wegen: Zwei nicht offensichtliche Verhaltensweisen der Claude-Code-
  Permission-Engine wurden erst durch echte `claude --print`-Verhaltensproben in `/implement`
  und `/security-review` aufgedeckt, nicht durch Nachdenken über die Config allein: (1)
  slash-freie Muster (`Edit(*.yml)`) matchen auf jeder Verzeichnistiefe, nicht nur Root –
  ein Root-Anker braucht einen führenden Slash (`Edit(/*.yml)`); (2) `Write(pfad)`-Regeln
  werden von der installierten Claude-Code-Version überhaupt nicht ausgewertet, nur
  `Edit(pfad)` deckt Edit **und** Write ab. Beide Fakten betreffen jede künftige
  `.claude/settings.json`-Änderung in diesem Projekt und wären ohne Dokumentation beim
  nächsten Permission-Task wieder neu (mühsam) entdeckt worden.
- [`docs/factory/lessons/factory-workflow.md`](../docs/factory/lessons/factory-workflow.md)
  „Neue Edit-Freigabe auf bislang gesperrter Config-Klasse: Selbstschwächungs-Check für
  Review-/Security-Review-Parameter" – wegen: Das `/security-review`-Finding, dass eine neu
  gewährte Edit-Freigabe auf `factory.config.yml` in Kombination mit einer fehlenden
  Tier-Floor-Validierung (`config-validation-check.sh`) einen Selbstschwächungs-Pfad für die
  eigene Sicherheits-Kontrollinstanz öffnet, ist ein wiederkehrbares Muster: Jede Task, die
  einer bislang gesperrten Config-Klasse erstmals Edit-Zugriff gewährt, sollte künftig genau
  darauf geprüft werden – nicht nur auf die übliche #88-Grenze (`.claude/**`/`.env*`).
- [`docs/factory/lessons/code-style.md`](../docs/factory/lessons/code-style.md) „Neue
  Verfügbarkeits-/Capability-Prüfung immer gegen bereits vorhandene im selben File abgleichen"
  – wegen: Alle drei unabhängigen `/review`-Perspektiven (Logik, Code-Qualität, Architektur)
  fanden **unabhängig voneinander** dieselbe dritte, abweichende jq-Verfügbarkeitsprüfung in
  `run-tests.sh`, obwohl zwei etablierte Varianten (Direktform + `HAS_JQ`-Variable) bereits in
  derselben Datei existierten. Dreifacher unabhängiger Fund desselben Musters ist ein starkes
  Signal, dass der zugrundeliegende Reflex („kurz `command -v` inline prüfen, statt im File
  nach Vorhandenem zu suchen") verallgemeinerbar und regelwürdig ist.
- Index-Zeilen für alle drei Lessons in
  [`docs/factory/PROJECT-CONTEXT.md`](../docs/factory/PROJECT-CONTEXT.md) ergänzt (mit
  „Laden bei"-Trigger je Zeile, ADR-037-Konvention).

### Keine Änderungen an CLAUDE.md / Guidelines / neuen Checks nötig

Beide Kern-Findings sind Eigenschaften der Claude-Code-Version bzw. einer projektspezifischen
Config-Datei (`factory.config.yml`) – kein universelles/fundamentales Factory-Prinzip, daher
Lessons statt CLAUDE.md/Guidelines. Kein neuer automatisierbarer Check nötig: Die
Verhaltensfakten (Punkt 1) sind aus einer Repo-Bibliothek heraus nicht prüfbar (die Auswertung
liegt in Claude Code selbst, wie bereits bei #88 festgestellt) – die einmalige, dokumentierte
`claude --print`-Probe bleibt hier der richtige Beleg-Mechanismus, kein Shell-Test. Der
Config-Gate-Floor (Punkt 2) ist bereits als eigenständiges Issue #241 mit konkretem
Test-Vorschlag ausgelagert – dort gehört der neue Check hin, nicht in diese Lesson.

### Out-of-Scope-Folgearbeit (bereits während `/review`/`/security-review` angelegt, hier nur verlinkt)

- Issue [#240](https://github.com/nothra/tch-gastro-services/issues/240) – wirkungslose
  `Write(...)`-Regeln repo-weit entfernen (aus `/review`).
- Issue [#241](https://github.com/nothra/tch-gastro-services/issues/241) – Mindest-Tier-Floor
  für `security-review`/`review` in `config-validation-check.sh` erzwingen (aus
  `/security-review`).

### Empfehlung für nächste Features

- Jede künftige `.claude/settings.json`-Änderung: zuerst die neue Lesson
  „Permission-Regeln in `.claude/settings.json`" lesen, bevor ein neues Muster entworfen wird –
  spart die zweite Patch-Workflow-Runde, die in #224 für die Root-Anker-Korrektur nötig war.
- Der dreifache unabhängige Review-Fund (jq-Verfügbarkeitsprüfung) bestätigt, dass die
  Drei-Perspektiven-Review-Struktur bei diesem Repo-Umfang echten Mehrwert liefert (kein
  Grund, sie zu verkleinern) – als Bestätigung, nicht als Fehler-Muster, festgehalten.
