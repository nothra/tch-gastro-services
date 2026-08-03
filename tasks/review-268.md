# Review: Task 268

**Runde 5** – Re-Review **nach** dem Runde-4-Fix (`b756cb8`) und dem Security-Review
(`c0f999a`). Runde 3 und 4 waren bereits APPROVED. Diff-Scope: `git diff origin/main...HEAD`
(9 Dateien, +801/−12, Commits `c039ad8`, `465ac54`, `29626fb`, `8c2fa9d`, `ebef830`,
`b756cb8`, `c0f999a`).

Test-Stand, in dieser Session selbst ausgeführt (`bash scripts/checks/tests/run-tests.sh`):
**821 grün, 0 rot**.

Beide wichtigen Findings aus Runde 4 sind erledigt und nachgeprüft (Details unter
„Positives"). Neu in dieser Runde ist ein Fall, den keine der vier Vorrunden betrachtet hat:
`core.hooksPath`, das auf **denselben** Pfad zeigt, den der Check prüft.

**Verifikationsgrenze dieser Runde (offengelegt):** Wie in Runde 1–4 war jede empirische
git-Probe blockiert – in dieser Session zusätzlich das Schreiben eines Wegwerf-Skripts
(`Write` auf `.coverage-tmp268/probe.sh` verweigert) und freie `git`-Kommandozeilen
(Sandbox-Classifier). Was ich verifizieren konnte: die volle Testsuite, `git --version`
(2.50.1), den Repo-weiten Grep auf Versionsangaben und den Zustand der Issues #278–#280 per
`gh`. Finding W1 unten ist aus der git-config-Dokumentation + Codelesen abgeleitet, **nicht**
empirisch belegt – das ist im Finding und im angelegten Issue ausdrücklich markiert.

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)

- [ ] `scripts/checks/hooks-installed-check.sh:17-19` — **der WHY-Kommentar behauptet
  kategorisch etwas Falsches, und genau diese Behauptung trägt die Meldungs-Entscheidung.**
  Der Satz „es gibt keinen Zustand, in dem Reste im Standardpfad tatsächlich greifen, solange
  `core.hooksPath` gesetzt bleibt" ist die Begründung dafür, dass die Fehlermeldung bewusst
  **keine** „Factory-Checks einbinden"-Alternative anbietet (Runde-1-Finding, seit `465ac54`
  so dokumentiert in Skript-Header, ADR-042 §Consequences und `git-workflow.md`). Es gibt aber
  einen solchen Zustand: zeigt `core.hooksPath` **absolut auf `$GIT_COMMON_DIR/hooks`**, führt
  Git die Factory-Hooks dort aus – der Guard (`:81`, „gesetzt = fail-closed", wertunabhängig)
  hält das Gate trotzdem dauerhaft rot. Das ist das Spiegelbild des False Negative, das dieser
  PR behebt, und es trifft realistisch genau die Entwickler, um die es geht: der übliche Weg,
  ein **global** gesetztes `core.hooksPath` pro Repo zu neutralisieren, ist
  `git config core.hooksPath <standardpfad>` – ein lokales `--unset` lässt den globalen Wert
  wieder greifen. Für sie gibt es damit keinen grünen Zustand ohne globalen Eingriff, und die
  Meldung schlägt genau diesen vor („ggf. mit `--global`/`--system`"). **Nuance:** ein
  *relativer* Wert (`.git/hooks`) ist **nicht** äquivalent – Git löst relative Werte gegen das
  Top-Level des jeweiligen Working Trees auf, und in einem verlinkten Worktree ist `.git` eine
  Datei; da dieses Projekt Worktrees vorschreibt, ist fail-closed für die relative Form
  richtig. **Disposition:** Die Verhaltensänderung (effektiven Hookpfad via
  `git rev-parse --git-path hooks` prüfen) ist eine Spec-Entscheidung gegen ADR-042
  §Consequences und liegt **außerhalb** dieses PRs → autonom angelegt als **#281**. **In
  diesem Branch zu erledigen ist nur die Textkorrektur:** die kategorische Aussage in `:17-19`
  auf das relativieren, was gilt („… solange `core.hooksPath` auf ein *anderes* Verzeichnis
  zeigt; der Sonderfall eines auf den Standardpfad gerichteten Werts ist bewusst
  mit-abgelehnt, s. #281"). Empirisch nicht nachgestellt (s. Verifikationsgrenze oben) –
  Grundlage ist die `git config`-Doku zu `core.hooksPath` (Wert „absolut oder relativ …
  relativ zum Ausführungsverzeichnis der Hooks") + der in diesem PR selbst dokumentierte
  Befund, dass `git rev-parse --git-path hooks` den effektiven Pfad liefert.
- [ ] `docs/adr/042-hook-installation-single-source.md:161-162,167-169` — **Runde-2/3/4-Nitpick,
  jetzt ein Widerspruch *innerhalb* des PRs:** beide Consequence-Bullets deferieren weiter ohne
  Nummer („bei Bedarf als eigenständiges Issue anzulegen" bzw. „außerhalb des Scopes von #268
  liegt"), während der in **diesem** PR neu committete Security-Report
  (`tasks/security-268.md:66,72-73`, Commit `c0f999a`) die Nummern ausdrücklich nennt: **#278**
  (Opt-out) und **#279** (Leerstring-Blindspot). Per `gh` verifiziert: beide Issues existieren
  und sind offen. Zwei Artefakte desselben PRs sagen damit Unterschiedliches über denselben
  Sachverhalt, und die dauerhafte Quelle (ADR) ist die ungenauere – nach dem Merge findet ein
  Leser dort keinen Weg zu den Follow-ups. Genau die Lesson aus #176 („Doku im Präsens nennt
  einen offenen Follow-up, den der PR erledigt → im selben PR nachziehen"); der Nachbar-Bullet
  macht es mit **#265** vorbildlich. **Fix:** zwei Nummern eintragen. Ich hebe das gegenüber
  Runde 4 von Nitpick auf „wichtig" an, weil erst `c0f999a` den Widerspruch in den PR gebracht
  hat – nicht, weil die Bewertung von Runde 4 falsch war.

> Beide Findings sind **reine Textkorrekturen** an committeten Artefakten (ein Kommentarsatz,
> zwei Issue-Nummern) – keine Verhaltens-, Guard- oder Teständerung. Der nächste
> Pipeline-Schritt (`/codify`) fasst die Doku ohnehin an; dort mitnehmen. Sie rechtfertigen
> **kein** NEEDS_REWORK (siehe „Empfehlung" + Circuit Breaker).

## Nitpicks (optional)

- [ ] `tasks/task-268-hooks-installed-check-hookspath-fp.md:181-188` — „kein neues Issue
  angelegt, stattdessen `security`-Aspekt-Label ergänzt:" gefolgt von drei Bullets (#280,
  #279, #278) liest sich so, als hätten alle drei das Label bekommen. Per `gh` geprüft: #280
  → `enhancement,security,tech-debt` ✓, #279 → `bug,security,tech-debt` ✓, **#278 →
  `enhancement,tech-debt`** (kein `security`). Der Security-Report selbst behauptet es für
  #278 korrekt **nicht** (`security-268.md:72-75` nennt nur die Verfolgung) – nur die
  Task-Notiz verallgemeinert. Dieselbe Genauigkeitsklasse wie Runde-4-Finding W1. Entweder den
  Satz auf zwei Issues einschränken oder das Label auf #278 nachziehen (der Hinweis dort –
  Gewöhnung an `--no-verify` umgeht *alle* pre-push-Gates – trägt es durchaus).
- [ ] `docs/specs/spec-268-hooks-installed-check-hookspath.md:79-97,101,117-121` —
  **Runde-3/4-Nitpick unverändert offen:** alle fünf AK-Checkboxen stehen auf `- [ ]`, während
  die Task-Datei sie auf `- [x]` führt; die entschiedene „Offene Frage" zum Exit-Code
  (`:117-121`, Antwort: Exit 1) ist dort nicht abgehakt. Kein Gate wertet das aus, aber die
  Dateien driften – und die Spec ist nach dem Merge die gelesene Quelle.
- [ ] `scripts/checks/hooks-installed-check.sh:85-96` — **Runde-4-Nitpick N1 unverändert
  offen:** der `/refactor`-Pass (`ebef830`) hat die Duplikation, die er in seiner Begründung
  nennt, nicht aufgelöst – „Beheben: git config --unset core.hooksPath (ggf. mit
  --global/--system)." steht weiterhin wortgleich in beiden Zweigen (`:88` und `:91`), und
  `HOOKS_PATH_HINT` trägt ein Satzfragment („core.hooksPath nicht grün werden – …") mit
  eingebackener Layout-Einrückung, das nur an das dangling „… und kann bei gesetztem" aus
  `:95` geklebt Sinn ergibt. Kleinerer Fix mit demselben Ziel: den pfadspezifischen Halbsatz in
  der Verzweigung lassen, den „Beheben:"-Satz als eigene unbedingte `echo`-Zeile hinter das
  `if` ziehen.
- [ ] `scripts/checks/tests/run-tests.sh:4092-4096,4163-4165` — **Runde-4-Nitpick N3
  unverändert offen:** `rc_hooks()` (`:4120`) isoliert korrekt gegen ambientes
  `core.hooksPath`, die **Fixture**-Kommandos aber nicht: `hi_repo()` setzt nur die lokale
  Identität, und der Commit in `#265 AK4` (`:4164`) läuft mit ambienter globaler Config – bei
  einem Entwickler mit `git config --global core.hooksPath ~/.githooks` (genau das Muster,
  gegen das die Härtung schützt) führt git dort die globalen Hooks aus; schlagen die fehl,
  entsteht kein Commit, `git worktree add` scheitert und `assert_exit 0` (`:4167`) wird rot.
  Fix: die zwei Fixture-Commits mit `-c core.hooksPath=` bzw. `--no-verify` fahren – nicht
  suite-weit exportieren.
- [ ] `scripts/checks/hooks-installed-check.sh:93-96` / `run-tests.sh:4205-4290` —
  **Runde-4-Nitpick N4 unverändert offen:** die Refactor-Zusage „Ausgabe bleibt
  byte-identisch" ist nicht gepinnt; die Assertions prüfen nur Teilstrings (`core.hooksPath`,
  `.husky`, `git config --unset core.hooksPath`, `file:`). Der mehrzeilige Umbruch inkl.
  Einrückung kann unbemerkt kippen. Optional: eine Assertion auf die zweite Meldungszeile.
- [ ] Runde-1-Nitpicks weiterhin offen und weiterhin gültig (beim nächsten Anfassen
  mitnehmen): der #268-Testblock (`run-tests.sh:4204-4283`) spaltet den #265-Abschnitt auf
  (dessen CI-Absicherung folgt erst ab `:4285`); Testfall 6 (`:4278-4281`) ist rezept-identisch
  zu #265 Testfall 1 (`:4122-4125`, Lesson #240); Magic String `'file:'` (`:4240`) ohne
  Herleitungskommentar; Traceability-Lücke `#268 AK1` (`:4281` labelt AK1 als „Gegenprobe,
  spec-265 AK1"); die Exit-1-statt-2-Entscheidung ist nur in der Task-Datei begründet, nicht im
  Skript-Header; die AK4-Fixture (`:4234-4236`) ist die dritte identische
  `install_all_hooks` + `config core.hooksPath .husky`-Wiederholung und die einzige Stelle ohne
  `; rc=$?`.

## Positives

- **Beide wichtigen Findings aus Runde 4 sind an der Ursache behoben, nicht abgehakt:**
  - **W1 (Evidenz-Überziehung):** `:70-77` sagt jetzt „analytisch begründet – in dieser
    Umgebung nicht reproduzierbar: `git`-Aufrufe in Wegwerf-Repos sind permission-blockiert"
    statt „empirisch verifiziert". Genau die geforderte Formulierung, und sie ist in dieser
    Session erneut zutreffend (meine eigenen Proben waren identisch blockiert). Der
    Fail-closed-Zweig bleibt stehen – richtige Reihenfolge: Zweig behalten, Nichterreichbarkeit
    erklären, keinen Alibi-Test bauen.
  - **W2 (falsche git-Version):** alle fünf Stellen korrigiert und **repo-weit nachgeprüft** –
    `grep -rn '2\.51'` findet nur noch die historischen Zitate in `review-268.md` und der
    Task-Datei `:163`, die das Finding selbst beschreiben (dort korrekt). Die fünf Sachstellen
    (`hooks-installed-check.sh:26`, `run-tests.sh:4264`, `spec-268:106,127`, `ADR-042:164`)
    nennen jetzt 2.50, deckungsgleich mit `git --version` → **2.50.1** auf dieser Maschine und
    mit den vorbestehenden Notizen (`ADR-042:77`, `run-tests.sh:3728`,`:3964`).
- **Suite selbst nachgeprüft: 821 grün, 0 rot** – identisch zur Angabe in Task-Datei und
  Refactoring-Notizen; der Runde-4-Fix hat keine Assertion berührt, wie behauptet.
- **Guard-Semantik und Fail-closed-Reihenfolge unverändert korrekt** (`:52-55` kein Git-Repo →
  `:64-101` `core.hooksPath` (alle drei `git config`-Exit-Klassen) → `:103-121` Präsenz) – die
  von spec-268 „Fehlerszenarien" geforderte Vorrang-Ordnung, umgesetzt als Guard Clause. Kein
  Fail-open-Pfad; `HOOKS_PATH_RC=$?` steht direkt hinter der Zuweisung (nichts überschreibt
  `$?`), alle Verwendungen des config-kontrollierten Werts sind quotierte Expansions.
- **Die diskriminierenden Assertions aus Runde 1/2 sind unangetastet:** AK3 mit
  Abwesenheits-Assertion der alten Präsenzmeldung (`:4228-4229`), AK5 mit `.husky`-Signal gegen
  den „`worktree add` gescheitert"-Fehlpfad (`:4260-4261`), Leerstring-Test mit
  `install_all_hooks` als Gegengewicht (`:4266-4275`), Gegenprobe „nicht gesetzt → exit 0"
  (`:4278-4281`). Kein Test kann aus dem falschen Grund grün werden.
- **Der Security-Report (`c0f999a`) ist substanziell, kein Rubber-Stamp:** er benennt drei
  echte Hinweise mit korrekter Nicht-Blocker-Einordnung (Exit-Code unberührt,
  `pre-push.sh:118` wertet nur den Exit-Code), trennt sauber „geprüft und nicht zutreffend"
  von „Hinweis", und seine überprüfbaren Behauptungen halten: #279/#280 tragen tatsächlich das
  `security`-Label (per `gh` geprüft), die Command-Injection-Analyse deckt sich mit meinem
  eigenen Codelesen. Die einzige Ungenauigkeit liegt in der Task-Notiz, nicht im Report (s.
  Nitpick 1).
- **Doku-Kette in der Sache widerspruchsfrei** (Skript-Header, spec-265-Strikethrough,
  spec-268, ADR-042 §Consequences, `git-workflow.md` Hook-Tabelle **und**
  `core.hooksPath`-Absatz): bei diesem Check ist `--unset` der einzige implementierte Ausweg.
  Die verbleibenden Defekte sind die zu starke Kategorik in `:17-19` (W1) und die fehlenden
  Issue-Nummern (W2) – keine Aussage, die dem Code widerspricht.
- `docs/routes.md` korrekt **nicht** betroffen (keine `app/**/page.tsx`, kein
  `app/api/**/route.ts` im Diff); die `pre-push.sh`-Verdrahtung bleibt seit #265 gepinnt
  (`run-tests.sh:4201-4202`), die CI-Vorbedingung (`install-hooks.sh` vor der Self-Test-Suite)
  ebenfalls (`:4285ff`).

## Empfehlung

APPROVED

**Begründung:** Kein kritisches Finding, keine Verhaltens-, Guard- oder Testlücke; die
Testsuite ist selbst nachgeprüft grün, und beide Runde-4-Findings sind sauber erledigt. Die
zwei wichtigen Findings dieser Runde sind **Textdefekte in committeten Artefakten** – eine zu
kategorische Kommentarbehauptung (W1) und zwei fehlende Issue-Nummern (W2). Der inhaltliche
Kern von W1 (Guard lehnt einen Wert ab, unter dem die Hooks tatsächlich laufen) ist eine
Spec-Entscheidung gegen ADR-042 §Consequences und damit ausdrücklich **out of scope** dieses
PRs → als **#281** angelegt. Beide Textkorrekturen sollten vor dem Merge in diesem Branch
landen (`/codify` fasst die Doku ohnehin an), weil Spec und ADR nach dem Merge die dauerhafte
Begründung für die bewusste Abweichung von `install-hooks.sh` bilden.

**Circuit Breaker:** Das Limit von 3 Review↔Implement-Iterationen war mit Runde 3 (APPROVED)
erschöpft. Runde 4 war ein Re-Review der `/test`- und `/refactor`-Commits, diese Runde 5 ein
Re-Review des Runde-4-Fixes (`b756cb8`) und des Security-Reports (`c0f999a`) – keine weitere
Iteration am selben Konflikt. **Grenze für den Folgeschritt:** Erfordert W1 oder W2 mehr als
die beschriebene Textkorrektur – insbesondere falls jemand den `:17-19`-Satz nicht
relativieren, sondern den Guard ändern will – ist das an den Menschen zu eskalieren, nicht in
diesem Branch zu lösen.

**Neues Out-of-Scope-Issue dieser Runde:** **#281** – `core.hooksPath`, das auf den
Standard-Hookpfad zeigt, wird fälschlich abgelehnt (`bug`, `tech-debt`; enthält die
Verifikationsgrenze und die Worktree-Nuance zur relativen Pfadform). Die Issues der Vorrunden
decken die übrigen Out-of-Scope-Themen weiter ab: **#278** (Opt-out), **#279**
(Leerstring-Blindspot in `install-hooks.sh`), **#280** (`echo -e` interpretiert den
config-kontrollierten Wert).
