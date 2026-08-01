## Codify-Report: Task 249

### Neue Regeln hinzugefügt

- [`docs/factory/lessons/factory-workflow.md`](../docs/factory/lessons/factory-workflow.md) –
  neuer Abschnitt „Divergiertes `origin/main` während laufender Pipeline: Rebase-Verantwortung
  bei `/pr-shepherd` belassen" – wegen: Im `/refactor`-Schritt hatte sich `origin/main`
  zwischenzeitlich weiterentwickelt (Task 240 parallel gemergt). Ein lokaler
  `git fetch && git rebase origin/main` auf dem bereits mehrfach gepushten Feature-Branch war
  konfliktfrei, machte aber einen `git push --force-with-lease` nötig – `factory-commit.sh`
  bietet Force-Push bewusst nicht an (ADR-019 §1), und eine nicht-interaktive Stage-3-Pipeline
  hätte hier ohne definierten Interrupt-Typ stecken bleiben können. Der sichere Mechanismus für
  genau diese Divergenz existiert bereits in `/pr-shepherd` (`gh pr update-branch`, kein
  lokaler Force-Push) – die neue Lesson hält fest, dass Zwischenschritte (`/review`, `/test`,
  `/refactor`, `/security-review`) diese Zuständigkeit nicht vorwegnehmen sollen.
  Index-Zeile in `docs/factory/PROJECT-CONTEXT.md` ergänzt (Trigger: `/review`, `/test`,
  `/refactor`, `/security-review` – bei divergiertem `origin/main` auf bereits gepushtem Branch).

- [`docs/factory/lessons/testing.md`](../docs/factory/lessons/testing.md) – bestehenden
  Abschnitt zum `grep -qF`-Fixed-String-Regressionstest gegen Markdown-Prosa (aus #240) um ein
  **drittes Vorkommnis mit umgekehrter Kausalrichtung** ergänzt – wegen: Im `/test`-Schritt
  schlug ein neu geschriebener `grep -qi 'nicht override-bar'`-Test beim ersten Lauf lautlos
  rot fehl, weil eine bereits in `/implement` geschriebene, naturgemäß umgebrochene Kommentar-
  Zeile in `factory.config.yml.example` die Testphrase über zwei Zeilen verteilte. Anders als
  die #240-Instanz (Umformulierung bricht bestehenden Test) lag hier der neue Test gegen
  bereits vorhandene, umgebrochene Prosa vor – dasselbe Grundmuster (`grep` matcht nur
  innerhalb einer Zeile), aber eine dritte, bislang nicht dokumentierte Variante. Titel und
  Index-Zeile entsprechend erweitert, statt eine duplizierende zweite Lesson anzulegen.

### Keine Änderungen nötig
- Review- und Security-Review-Findings dieser Task waren ausschließlich Nitpicks (Review) bzw.
  Out-of-Scope-Härtungen des bestehenden Gate-Skripts (Security-Review, → Issues
  [#254](https://github.com/nothra/tch-gastro-services/issues/254)/
  [#255](https://github.com/nothra/tch-gastro-services/issues/255)) – keine davon zeigt ein
  wiederkehrendes Fehler-Muster dieser Session, das eine neue Regel rechtfertigt (die
  Out-of-Scope-Auslagerung selbst folgt bereits der etablierten ADR-018-Konvention, keine
  neue Lesson nötig).
- Der ADR-Trigger-Check (Schritt 0 von `/implement`) und die „Kein neues ADR nötig"-Begründung
  liefen sauber und nachvollziehbar durch – kein Anpassungsbedarf an der Trigger-Checkliste.

### Empfehlung für nächste Features
- Bei mehrtägigen/parallelen Pipeline-Läufen (mehrere Tasks gleichzeitig in Arbeit) das
  Divergenz-Risiko gegen `origin/main` von vornherein einplanen: Zwischenschritte prüfen per
  `git fetch && git merge-base --is-ancestor origin/main HEAD`, ob der Branch den aktuellen
  `main`-Stand bereits enthält, rebasen aber nicht selbst – Divergenz wird an `/pr-shepherd`
  weitergereicht (neue Lesson oben).
- Beim Schreiben eines neuen `grep`-Fixed-String-Regressionstests gegen bereits vorhandenen
  Fließtext vorab kurz `grep -n '<Teil-Phrase>' <Zieldatei>` laufen lassen, um Zeilenumbrüche
  in der Zielphrase zu erkennen, bevor der Test geschrieben wird.
