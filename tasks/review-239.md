# Review: Task 239

## Kritische Findings (müssen behoben werden)
- _Keine._

## Wichtige Findings (sollten behoben werden)
- _Keine._

## Nitpicks (optional)
- [ ] [scripts/factory-commit.sh:78-85] Der Nachhol-Zweig gibt seine Meldung („kein Upstream,
      hole Push nach." / „hole ausstehenden Push nach.") **vor** `push_branch` aus, aber – anders
      als der Commit-Pfad – **keine** Erfolgs-Bestätigung nach erfolgreichem Push. Im Log endet
      der Nachhol-Fall mit einer im-Verb-formulierten „hole … nach"-Zeile ohne „…erfolgreich"-
      Abschluss; nur der Exit-Code 0 signalisiert den Erfolg. AC5 (Meldung ≠ Happy-Path) ist
      dadurch erfüllt, aber eine abschließende Bestätigungszeile (z. B. „ausstehenden Push
      nachgeholt auf '$BRANCH'.") würde die Log-Symmetrie zum Commit-Pfad herstellen.
- [ ] [scripts/checks/tests/run-tests.sh:1626-1632] Fall 9 prüft die AC5-Differenzierung nur
      **negativ** (Output enthält *nicht* „committet und gepusht"). Der Regressionsfall 11
      assertiert die „übersprungen"-Meldung *positiv*; symmetrisch dazu könnte Fall 9 zusätzlich
      die tatsächliche Nachhol-Meldung („hole ausstehenden Push nach") positiv assertieren, damit
      der Test nicht schon durch beliebigen anderen Text grün wird.
- [ ] [scripts/checks/tests/run-tests.sh:1665-1673] Fall 12 (Nachhol-Push scheitert) assertiert
      nur „exit ≠ 0". Da im Setup nur der Push als Fehlerpfad erreichbar ist, ist der Test
      hinreichend isoliert; ein push-spezifisches Signal (z. B. Grep auf die Fehlerausgabe) würde
      aber – im Sinne von Lesson #214 – absichern, dass der Non-Zero-Exit wirklich aus dem Push
      und nicht aus einem anderen Grund stammt.
- [ ] [scripts/factory-commit.sh:77-80] Der No-Upstream-Zweig hat `git rev-parse … '@{u}'` bereits
      negativ ausgewertet; `push_branch` prüft dieselbe Bedingung erneut (führt dann `push -u
      origin HEAD` aus). Die Doppelprüfung ist harmlos und der Preis für den DRY-Helper – bewusst
      so belassen, nur als Beobachtung notiert.

## Positives
- **DRY sauber umgesetzt:** Die Push-Logik (Upstream-Erkennung + `git push` / `git push -u origin
  HEAD`) ist wie in den technischen Notizen gefordert in `push_branch()` extrahiert und wird von
  Commit- **und** leerem Zweig genutzt – keine Duplikation.
- **Alle 6 Akzeptanzkriterien der Spec belegt:** ahead-Push, No-Upstream-`-u`-Push, In-Sync-Skip
  (Regression), Nachhol-Push-Fehlschlag → Exit ≠ 0, Meldungs-Differenzierung (AC5), Guards
  unverändert. Vier neue Testfälle (#239-Block) decken je ein Szenario mit echtem Bare-Remote +
  Klon (`fc_repo`) ab – konsistent zum bestehenden Fixture-Muster.
- **Fail-closed-Semantik gewahrt:** Der Nachhol-Push nutzt denselben Pfad wie der reguläre Push;
  ein Fehlschlag wird über `set -e` unverändert weitergereicht (kein stiller „übersprungen"-
  Erfolg). Kein `--force`, kein neues Error-Handling, das den Fehler verschluckt.
- **Guards unberührt:** Argumentanzahl, kein Arbeitsbaum, detached HEAD, main/master laufen
  unverändert vor `git add -A` und damit vor der neuen Logik (AC6 / Fehlerszenario 1 erfüllt).
- **ADR-019 mitgepflegt:** Die geänderte Mechanik ist als „Nachtrag (#239)" in ADR-019
  dokumentiert – konsistent mit der Regel „PR ändert die von einer ADR beschriebene Mechanik →
  ADR im selben PR mitpflegen". Kommentare im Skript begründen das WHY (#239-Referenz).
- Keine Routen-Änderung → `docs/routes.md` zu Recht nicht berührt.

## Hinweis: pre-existing Test-Rot außerhalb des Scopes (kein Blocker für diese Task)
Der Bash-Suite-Lauf endet mit **549 grün, 4 rot**. Die 4 roten Fälle liegen ausschließlich im
Block „#212 W3: Verifikations-Interrupt end-to-end" (run-tests.sh ~Zeile 3009 ff.) und wurden
**verifiziert als nicht durch diese Task verursacht:**
- Der Diff an `run-tests.sh` besteht aus **genau einem** Hunk (`@@ -1615,+1615 @@`, der neue
  #239-Block); die #212-W3-Zeilen sind im Diff nicht enthalten.
- `factory-commit.sh` wird vom #212-W3-E2E-Datei-Satz nicht referenziert.
- Symptomatik deutet auf ein **Umgebungsproblem** hin: sowohl der Interrupt-Fall als auch die
  Positiv-Gegenprobe schlagen fehl (Pipeline bricht in der Sandbox vor der Endzustands-Prüfung ab,
  `run-pipeline.sh` liefert exit 1 statt der erwarteten Interrupt-/Erfolgs-Semantik) – d. h. der
  Fehlschlag stammt nicht aus dem Endzustands-Check, den #212 testet.

`pnpm test` / `pnpm typecheck` / `pnpm format:check` (pre-push-Gate) sind unabhängig grün. Ein
eigenes Tracking-Issue wurde **noch nicht** angelegt: da der Fehlschlag pre-existing und
wahrscheinlich sandbox-/umgebungsbedingt ist (kein Code-Defekt dieses PRs), braucht es eine
menschliche „real vs. environmental"-Einordnung. Empfehlung: separat auf `main` reproduzieren
(bzw. in CI beobachten) und bei Bestätigung als eigenständiges Issue führen – außerhalb dieses PRs.

## Empfehlung
APPROVED
