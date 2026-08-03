# Review: Task 268

**Runde 4** – Re-Review **nach** `/test` (`8c2fa9d`) und `/refactor` (`ebef830`); Runde 3 war
bereits APPROVED. Diff-Scope: `git diff origin/main...HEAD` (8 Dateien, +621/−12, Commits
`c039ad8`, `465ac54`, `29626fb`, `8c2fa9d`, `ebef830`).

Test-Stand, in dieser Session selbst ausgeführt: `bash scripts/checks/tests/run-tests.sh` →
**821 grün, 0 rot**.

Beide `→ /test`-Nitpicks aus Runde 3 sind erledigt (Fixture-Hermetik; Erreichbarkeit des
dritten `git config`-Exit-Zweigs geklärt statt wegtestet) – Details unter „Positives". Der
Refactor-Commit ist verhaltensneutral und die Ausgabe byte-identisch (per Codelesen
nachgerechnet, s. u.).

**Verifikationsgrenze dieser Runde (offengelegt):** Jede Probe, die `git config` schreibt oder
`git -c core.hooksPath=… rev-parse --git-path hooks` ausführt, war auch in dieser Session
permission-blockiert – exakt wie in Runde 1–3. Die zentrale git-Verhaltensannahme des PRs
(Leerstring löst den Hook-Pfad auf das Arbeitsverzeichnis auf) konnte ich daher **nicht**
selbst nachvollziehen; das ist der Kern von Finding W2 (und in #279 als Invariantentest
getrackt). Was ich verifizieren konnte: die `echo -e`-Escape-Semantik (s. Nitpick N2) und die
volle Testsuite.

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)

- [ ] `scripts/checks/hooks-installed-check.sh:70-73` — **Kommentar behauptet eine empirische
  Verifikation, die laut Task-Datei nicht stattfinden konnte.** Der im `/test`-Durchlauf neu
  geschriebene Kommentar sagt: der dritte Zweig sei unerreichbar, weil eine kaputte Config
  bereits `git rev-parse --git-common-dir` scheitern lässt – „(empirisch verifiziert, git
  2.50)". Die Task-Datei beschreibt denselben Punkt ausdrücklich anders: „in dieser Sandbox
  nicht reproduzierbar (git-Aufrufe in Wegwerf-Repos permission-blockiert, erneut geprüft in
  diesem `/test`-Durchlauf) … **Analytisch bestätigt**". Genau die Klasse, die Runde-2-Finding
  W3 an derselben Codestelle behoben hat (Kommentar behauptet mehr, als die Evidenz hergibt) –
  hier als Rezidiv wieder eingeführt. Die Aussage ist load-bearing: sie ist die Begründung
  dafür, dass für den Zweig **kein** Testfall existiert. **Fix (Textänderung):** „empirisch
  verifiziert" → „analytisch begründet (in dieser Umgebung nicht reproduzierbar: `git`-Aufrufe
  in Wegwerf-Repos permission-blockiert)" – oder die Verifikation belegen und dann die Formulierung
  behalten.
- [ ] `scripts/checks/hooks-installed-check.sh:26`, `scripts/checks/tests/run-tests.sh:4264`,
  `docs/specs/spec-268-hooks-installed-check-hookspath.md:106,127`,
  `docs/adr/042-hook-installation-single-source.md:164` (+ Task-Datei :48,:71) — **die
  Versionsangabe „empirisch mit git 2.51 verifiziert" ist an fünf Stellen im PR fast sicher
  falsch.** Auf dieser Maschine existiert nur ein git: `type -a git` → `/usr/bin/git`,
  `git --version` → **2.50.1** (Apple Git-155). Alle **vorbestehenden** empirischen Notizen des
  Repos nennen konsistent 2.50 (`ADR-042:77`, `run-tests.sh:3728`, `:3964`) – und die im selben
  PR neu geschriebene Zeile `hooks-installed-check.sh:73` nennt ebenfalls 2.50. Derselbe PR
  behauptet damit zwei verschiedene git-Versionen für zwei Proben aus derselben Umgebung; eine
  davon ist zwangsläufig falsch. Das ist keine Kosmetik: die Versionsangabe ist die **einzige
  Provenienz** für die bewusste Abweichung von `install-hooks.sh` (Leerstring = fail-closed) und
  gleichzeitig die Referenz, gegen die #279 den Invariantentest bauen soll. Wer dort auf einer
  anderen Version nicht reproduzieren kann, hat keinen Anhaltspunkt, ob die Annahme oder die
  Version das Problem ist. **Fix:** eine Version, in allen fünf Stellen dieselbe – und nur die,
  die tatsächlich benutzt wurde.

> Beide Findings sind **reine Textkorrekturen** an committeten Artefakten (Code-Kommentar,
> Spec, ADR) und lassen sich ohne vierte `/implement`-Runde erledigen – z. B. im
> unmittelbar folgenden Schritt, der die Doku ohnehin anfasst. Sie rechtfertigen kein
> NEEDS_REWORK (siehe „Empfehlung" + Circuit Breaker).

## Nitpicks (optional)

- [ ] `scripts/checks/hooks-installed-check.sh:84-95` — **der Refactor `ebef830` löst die
  Duplikation nicht auf, die er in seiner Begründung nennt.** Commit-Message und
  Refactoring-Notizen führen als Problem an, dass der Satz „Beheben: git config --unset
  core.hooksPath (ggf. mit --global/--system)." „wortgleich in beiden Zweigen stand" –
  er steht weiterhin wortgleich in beiden Zweigen (`:87` und `:90`). Zusammengeführt wurde
  nur das zweite `if`. Zusätzlich hält `HOOKS_PATH_HINT` jetzt ein **Satzfragment**: der Wert
  beginnt mit „core.hooksPath nicht grün werden" und ist nur sinnvoll, geklebt an das
  dangling „… und kann bei gesetztem" aus `:94`; die Layout-Einrückung der Folgezeile ist in
  den String eingebacken (`:87` beginnt mit fünf Leerzeichen), während `:95` die erste Zeile
  einrückt – asymmetrisch und beim Umformulieren/Neu-Umbrechen brüchig. **Kleinerer Fix mit
  demselben Ziel:** den pfadspezifischen Halbsatz in der Verzweigung lassen und den
  „Beheben:"-Satz als eigene, unbedingte `echo`-Zeile hinter das `if` ziehen – dann ist die
  Duplikation wirklich weg und keine Variable trägt ein Fragment.
- [ ] `scripts/checks/hooks-installed-check.sh:92` — `echo -e` interpretiert Backslash-Escapes
  aus dem **config-kontrollierten** `core.hooksPath`-Wert. In dieser Session verifiziert:
  `echo -e 'auf .husky\n\033[0;32m FAKE gesetzt'` liefert zwei Zeilen, die zweite grün
  gefärbt – Parameter-Expansion passiert vor `echo`, ein Config-Wert wird also identisch
  behandelt. Kein Gate-Bypass (Exit 1 bleibt, `pre-push.sh` blockiert weiter), aber die
  Fehlermeldung wird bei Pfaden mit Backslash-Segment (`C:\bin\hooks` bei Windows-/WSL-
  Beitragenden) verstümmelt und kann bei bewusst gesetztem Wert eine gefälschte Zeile inkl.
  ANSI-Farbe unter das ✗-Banner schmuggeln (`pre-push.sh:122` rückt sie brav ein). Die
  Geschwister-Stelle `scripts/install-hooks.sh:51` hat dasselbe Muster (Vorbild), liegt aber
  laut spec-268 „Nicht inbegriffen" außerhalb dieses PRs – **daher als eigenes Issue angelegt:
  #280** (beide Stellen zusammen, Regel „Config-/nutzerkontrollierte Werte als Daten
  behandeln", `clean-code.md`/ADR-010).
- [ ] `scripts/checks/tests/run-tests.sh:4163-4166` — **die Hermetik-Härtung deckt den Check-
  Aufruf ab, nicht die Fixture-Kommandos.** `rc_hooks()` (`:4120`) isoliert jetzt korrekt gegen
  ambientes `core.hooksPath`; die git-Aufrufe der Fixtures laufen aber weiter ohne Isolation.
  Konkret: der Commit in `#265 AK4` (`:4164`) läuft in einem Repo **ohne** lokales
  `core.hooksPath` – bei einem Entwickler mit `git config --global core.hooksPath ~/.githooks`
  (genau das Muster, gegen das die Härtung schützen soll) führt git dort die **globalen** Hooks
  aus; schlagen die fehl, entsteht kein Commit, `git worktree add` (`:4165`) scheitert, und
  `assert_exit 0` (`:4167`) wird rot – wieder aus ambientem Grund. `#268 AK5` (`:4251-4254`) ist
  davor nur zufällig geschützt, weil dort vorher ein lokales `core.hooksPath=.husky` auf ein
  nicht existierendes Verzeichnis zeigt. **Fix:** die zwei Fixture-Commits mit
  `-c core.hooksPath=` bzw. `--no-verify` fahren – **nicht** suite-weit exportieren, andere
  Fixture-Helfer verlassen sich möglicherweise auf ambiente globale Config.
- [ ] `scripts/checks/hooks-installed-check.sh:92-95` / `run-tests.sh:4205-4290` — die
  Refactor-Zusage „Ausgabe bleibt byte-identisch" ist **nicht gepinnt**: die Assertions prüfen
  nur Teilstrings (`core.hooksPath`, `.husky`, `git config --unset core.hooksPath`). Der
  mehrzeilige Umbruch inkl. Einrückung kann also unbemerkt kippen. Ich habe die Byte-Identität
  für diese Runde per Codelesen nachgerechnet (s. „Positives") – nur eben nicht die Suite.
  Optional: eine Assertion auf die zweite Meldungszeile.
- [ ] `docs/adr/042-hook-installation-single-source.md:161-162,167-169` — **Runde-2/3-Nitpick
  unverändert offen:** beide neuen Consequence-Bullets deferieren weiter ohne Nummer („bei
  Bedarf als eigenständiges Issue anzulegen", „außerhalb des Scopes von #268"), obwohl **#278**
  (Opt-out) und **#279** (Leerstring-Blindspot) existieren. Lesson #176; der Nachbar-Bullet
  macht es mit #265 vorbildlich. Zwei Nummern eintragen.
- [ ] `docs/specs/spec-268-hooks-installed-check-hookspath.md:80-97,101,117` — **Runde-3-Nitpick
  unverändert offen:** AK-Checkboxen stehen auf `- [ ]`, während die Task-Datei sie auf `- [x]`
  führt; die entschiedene „Offene Frage" zum Exit-Code (`:117-121`, Antwort: Exit 1) ist dort
  nicht abgehakt. Kein Gate wertet das aus, aber die Dateien driften.
- [ ] Runde-1-Nitpicks weiterhin offen und weiterhin gültig (beim nächsten Anfassen mitnehmen):
  der #268-Testblock (`run-tests.sh:4204-4283`) spaltet den #265-Abschnitt auf (dessen
  CI-Absicherung folgt erst ab `:4285`); Testfall 6 (`:4278-4281`) ist rezept-identisch zu #265
  Testfall 1 (`:4122-4125`, Lesson #240); Magic String `'file:'` (`:4240`) ohne
  Herleitungskommentar; Traceability-Lücke `#268 AK1` (`:4281` labelt AK1 als „Gegenprobe,
  spec-265 AK1"); die Exit-1-statt-2-Entscheidung ist nur in der Task-Datei begründet, nicht im
  Skript-Header; die AK4-Fixture (`:4234-4236`) ist die dritte identische
  `install_all_hooks` + `config core.hooksPath .husky`-Wiederholung und die einzige Stelle ohne
  `; rc=$?`.

## Positives

- **Beide `→ /test`-Aufträge aus Runde 3 sind an der Ursache erledigt, nicht abgehakt:**
  - **Fixture-Hermetik:** `rc_hooks()` (`:4120`) isoliert mit
    `GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null`, und – genau wie in Runde 3
    gefordert – wurden die **zwei direkten** `FACTORY_DIR=… bash "$HI_CHECK"`-Aufrufe der
    Worktree-Tests (`:4166`, `:4254`) auf `rc_hooks(...)` umgestellt, statt die Isolation zu
    duplizieren. Der Kommentar (`:4113-4119`) benennt die Fehlerklasse (#262/#264: ambiente
    Umgebung leckt in die Fixture) statt nur die Zeile zu erklären. Der verbleibende Rest
    (Fixture-Commits, Nitpick N3) ist eine echte Verkleinerung des Problems, keine Verschiebung.
  - **Dritter `git config`-Exit-Zweig:** Statt einen Test zu erfinden, der den Zweig künstlich
    trifft, ist die **Erreichbarkeitsfrage** beantwortet (`:69-76`): kaputte Config scheitert
    schon am vorgelagerten `rev-parse`, mehrfach gesetzter Key liefert bei `--get` exit 0 mit
    dem letzten Wert (deckungsgleich mit der git-Doku). Der Kommentar nennt keine unbelegte
    Fehlercode-Zahl mehr und begründet das Stehenbleiben mit dem Fail-closed-Grundsatz aus
    `clean-code.md`. Genau die richtige Reihenfolge – Zweig behalten, Coverage-Lücke erklären,
    keinen Alibi-Test bauen. (Die Formulierung „empirisch" darin ist Finding W1 – die
    Sachentscheidung bleibt richtig.)
- **Der Refactor ist verhaltensneutral, die Ausgabe wirklich byte-identisch** – nachgerechnet:
  `HOOKS_PATH_HINT` enthält im gesetzten Zweig den eingebetteten Newline **plus** die fünf
  Leerzeichen (`:86-87`), sodass `echo "     $HOOKS_PATH_HINT"` (`:95`) exakt die beiden
  vorherigen `echo`-Zeilen reproduziert; der Wechsel von `$HOOKS_PATH_DISPLAY` auf
  `$HOOKS_PATH_CONFIG` in der zweiten Zeile ist in diesem Zweig wertgleich. Der Leerstring-Zweig
  bleibt einzeilig wie vorher. Keine Verhaltensänderung, wie vom Skill für `/refactor` gefordert.
- **Suite selbst nachgeprüft: 821 grün, 0 rot** – die Angabe in Task-Datei und
  Refactoring-Notizen („unverändert, keine Assertion berührt") stimmt.
- **Guard-Semantik und Fail-closed-Reihenfolge unverändert korrekt** (`:52-55` kein Git-Repo →
  `:64-100` `core.hooksPath` → `:102-121` Präsenz) – die von spec-268 „Fehlerszenarien"
  geforderte Vorrang-Ordnung, umgesetzt als Guard Clause.
- **Die diskriminierenden Assertions aus Runde 1/2 sind unangetastet:** AK3 mit
  Abwesenheits-Assertion der alten Präsenzmeldung (`:4228-4229`), AK5 mit `.husky`-Signal gegen
  den „`worktree add` gescheitert"-Fehlpfad (`:4260-4261`), Leerstring-Test mit
  `install_all_hooks` als Gegengewicht (`:4268-4275`). Kein Test kann aus dem falschen Grund
  grün werden.
- **Doku-Kette weiterhin widerspruchsfrei** (Skript-Header, spec-265-Strikethrough, spec-268,
  ADR-042 §Consequences, `git-workflow.md` Hook-Tabelle **und** `core.hooksPath`-Absatz): bei
  diesem Check ist `--unset` der einzige Ausweg. Einzige verbleibende Doku-Defekte sind die
  Versionsangabe (W2) und die fehlenden Issue-Nummern (Nitpick).
- **Ehrliche Verifikationsgrenzen** in Task-Datei und Kommentaren statt Behauptungen – die
  Sandbox-Blocks sind benannt, nicht überspielt. (Dass eine Formulierung diese Linie überschreitet,
  ist W1.)
- `docs/routes.md` korrekt **nicht** betroffen (keine `app/**/page.tsx`, kein
  `app/api/**/route.ts` im Diff); die `pre-push.sh`-Verdrahtung bleibt seit #265 gepinnt
  (`:4201-4202`).

## Empfehlung

APPROVED

**Begründung:** Kein kritisches Finding, keine Verhaltens-, Guard- oder Testlücke. Die beiden
Runde-3-Aufträge an `/test` sind an der Ursache erledigt, der `/refactor`-Pass ist
verhaltensneutral und byte-identisch. Die zwei wichtigen Findings sind **Genauigkeitsdefekte in
Text** (eine zu starke „empirisch verifiziert"-Formulierung; eine falsche git-Versionsangabe an
fünf Stellen) – beide ohne Codeänderung behebbar und daher kein Anlass für eine vierte
Review↔Implement-Iteration. Sie sollten aber **vor dem Merge** in diesem Branch korrigiert
werden, weil Spec und ADR den dauerhaften Beleg für eine bewusste Abweichung von
`install-hooks.sh` bilden und #279 darauf aufbaut.

**Circuit Breaker:** Das Limit von 3 Review↔Implement-Iterationen ist erschöpft (Runde 3 =
APPROVED). Diese Runde 4 ist ein Re-Review der **danach** entstandenen Commits (`/test`,
`/refactor`), keine vierte Iteration am selben Konflikt. Findet ein Folge-Schritt an W1/W2 mehr
als eine Textkorrektur, ist das an den Menschen zu eskalieren.

**Neues Out-of-Scope-Issue dieser Runde:** **#280** – `echo -e` interpretiert den
config-kontrollierten `core.hooksPath`-Wert (betrifft `hooks-installed-check.sh:92` **und** die
Vorbildstelle `install-hooks.sh:51`, die spec-268 ausdrücklich ausschließt). Die Issues aus
Runde 2 (**#278** Escape-Hatch, **#279** Leerstring-Blindspot + Invariantentest) decken die
übrigen Out-of-Scope-Themen weiter ab.
