# Review: Task 262

**Review-Runde 3** (Runden 1 und 2 wurden nachgearbeitet – Nachprüfung unten).
Diff-Scope: `git diff origin/main...HEAD` (15 Dateien), Nacharbeit der Vorrunde in `c032932`.
Drei Personas: (1) Korrektheit/Edge Cases, (2) Clean Code & Testqualität, (3) Architektur/ADR/Doku.

**Nachprüfung Runde 2 – alle acht W-Findings sind real behoben**, unabhängig von zwei Personas
zeilengenau gegen die Quellen geprüft (nicht nur in der Task-Datei abgehakt):
W1 Hook-Tabelle deckt sich jetzt Zeile für Zeile mit `pre-commit.sh:22-77` und `pre-push.sh:22-118`
(Format/Prettier steht korrekt bei `pre-push`) · W2 `init-factory.sh:82-87,99-111` Merkflag + eigenes
Banner + `exit 1` (`RED` ist auf `:13` definiert) · W3 AK8-Grep auf den konkreten Aufruf gepinnt
**und** durch einen echten Stub-Verhaltenstest ersetzt · W4 Doku-Guard sucht `` `commit-msg`-Hook ``
· W5 `OPERATING.md`/`CONTRIBUTING.md`/`README.md` ergänzt und in der Guard-Schleife · W6 ADR-019
Nachtrag (#262) mit Rückverweis aus ADR-042 · W7 Kommentarzeilen-Filter inkl. `GIT_EDITOR`-E2E ·
W8 Issue **#265** existiert (OPEN, `enhancement`+`tech-debt`) und ist in ADR-042 referenziert.
Nitpicks bis auf die drei explizit begründet abgelehnten umgesetzt.

## Kritische Findings (müssen behoben werden)

_Keine._ Die Guard-Logik ist korrekt: exakter Trim-Vergleich statt Regex (keine BSD/GNU-Falle),
kein zu breites Matching, `set -e`/`set -u`-Semantik an allen neuen Grenzen sauber, Guard-Reihenfolge
in `factory-commit.sh` vor jedem `git`-Aufruf. AK1–AK8 und beide Fehlerszenarien der Spec sind
implementiert und getestet; kein AK ist nur behauptet.

## Wichtige Findings (sollten behoben werden)

- [ ] [scripts/checks/commit-msg-check.sh:38-44 / docs/adr/042-…:73-83] **Bei `commit.verbose=true`
      (bzw. `git commit -v`) greift der Guard auf dem Editor-Pfad weiterhin nicht – ADR und
      Skript-Kommentar behaupten aber, dort sei nur noch `core.commentChar=auto` offen.**
      Git hängt den verbose-Diff **ohne** Kommentar-Präfix unter die Scissors-Zeile; die Filter-
      schleife `:56-65` verwirft nur präfigierte Zeilen, der Diff bleibt in `MESSAGE` stehen →
      `TRIMMED` ≠ `--help` → exit 0. Die Kürzung an der Cut-Line macht Git erst **nach** dem Hook.
      **Empirisch belegt (git 2.50.1, Wegwerf-Repo, Editor-Stub der die Message oben einfügt und
      das Template stehen lässt):** ohne verbose → Ablehnung, exit 1, kein Commit; mit
      `commit.verbose=true` → **exit 0, Commit `--help` entsteht**. Der Debug-Hook zeigt, was der
      Guard sieht: `--help`, Template, `# ---- >8 ----`, dann unpräfigierte `diff --git`/`@@`-Zeilen.
      `--cleanup=scissors` allein ist unkritisch (keine unpräfigierten Zeilen) – der Auslöser ist
      der verbose-Diff. `commit.verbose=true` ist eine verbreitete persönliche Git-Einstellung;
      für diese Nutzer ist die W7-Nacharbeit wirkungslos.
      Kein Spec-Verstoß (AK2 fordert wortlautgemäß nur den `-m`-Pfad) – aber die Zusage in ADR-042
      und im Skript-Header ist so nicht mehr wahr (Lesson #160/#211: Doku über ein Gate gegen die
      Quelle prüfen). → Entweder ab der ersten Zeile abschneiden, die den Präfix trägt und ` >8 `
      enthält (2 Zeilen + je ein Test für `-v` und `--cleanup=scissors`), **oder** die zweite
      Restlücke genauso ehrlich benennen, wie es für `auto` bereits gemacht wurde.

- [ ] [scripts/checks/commit-msg-check.sh:45-54] **Zwei der drei Zweige der neuen Präfix-Auflösung
      sind vollständig ungetestet – die in Runde 2 geschlossene Editor-Pfad-Lücke könnte lautlos
      zurückfallen.** `grep -c commentString scripts/checks/tests/run-tests.sh` → **0**, `auto` → **0**;
      getestet ist ausschließlich `core.commentChar` (`run-tests.sh:3473-3484`). Ungetestet bleiben
      damit (a) der erste Schleifendurchlauf über `core.commentString` inkl. `break`, (b) die
      Mehrzeichen-Präfix-Fähigkeit – der einzige Grund, `commentString` überhaupt zu unterstützen,
      und (c) der `auto`-Zweig `:51`, der eine bewusst getroffene und in ADR-042:80-83 dokumentierte
      Design-Entscheidung kodiert. Konkret: streicht jemand `[ "$configured_prefix" = "auto" ] ||`,
      wird bei `core.commentChar=auto` der Präfix wörtlich `auto`, die `#`-Template-Zeilen zählen
      als Inhalt, und der `--help`-Commit entsteht auf dem Editor-Pfad wieder – **kein einziger Test
      würde rot**. `testing-standards.md` fordert für neuen Code 100 %; gleiche Klasse wie Lesson
      #207 W3 („Umgebungs-Kontrakt-Tests auf die Nicht-Happy-Path-Zweige legen").
      → Je ein Wegwerf-Repo mit `core.commentString=';'` (bzw. mehrzeichig) und mit
      `core.commentChar=auto` (dort muss das `#`-Template weiterhin verworfen werden).

- [ ] [scripts/checks/tests/run-tests.sh:1912-1913] **Die Assertion „führt kein `git add` aus (Index
      bleibt leer)" prüft nicht, was ihr Label sagt, und kann im Regressionsfall nicht rot werden.**
      `git diff --cached --quiet` vergleicht **Index gegen HEAD**, nicht gegen leer. Entfernte jemand
      den `-h`/`--help`-Guard aus `factory-commit.sh`, liefe `git add -A` → `git commit`; danach ist
      Index == HEAD → exit 0 → Assertion **grün**, obwohl `git add` gelaufen ist. Die Absicherung
      leisten allein die Nachbarn „committet nichts" (HEAD unverändert) und „pusht nichts"; diese
      Zeile täuscht eine dritte, unabhängige Prüfung vor. Lesson #214.
      → `[ -z "$(git -C "$WT" diff --cached --name-only)" ]` bzw. `git status --porcelain` gegen den
      erwarteten Untracked-Zustand.

- [ ] [docs/factory/OPERATING.md:88-89] **Die Setup-Schrittkette in §0 „Einmal-Setup" wurde nicht
      mitgezogen – obwohl dieselbe Datei im PR an anderer Stelle angefasst wurde.** `:88-89` spiegelt
      die README-Kette verdichtet (`pnpm install` · `.env.local` · `pnpm db:up` · `db:migrate` ·
      `db:seed` · `pnpm dev`). README (`:49-56`) und CONTRIBUTING (`:21-27`) haben dort
      `bash scripts/install-hooks.sh` als zweiten Schritt eingefügt, OPERATING §0 nicht – die
      Ergänzung steht 340 Zeilen weiter unten in §5.4 (Betrieb). Wer die Betriebsanleitung
      sequentiell als Einrichtungs-Checkliste abarbeitet, hat nach „Einmal-Setup" keinen Hook.
      Der Doku-Guard (`run-tests.sh:3771-3774`) ist grün, weil er nur *Vorkommen in der Datei* prüft,
      nicht die Schrittkette. Exakt das Muster aus Lesson #211/#176, das schon W5 ausgelöst hat.
      → Ein Token in der Klammer auf `:89`.

## Nitpicks (optional)

- [ ] [scripts/checks/commit-msg-check.sh:33-36] Der `-r`-Guard trifft auch Verzeichnisse und bricht
      dort den dokumentierten Exit-Kontrakt. **Belegt:** `bash scripts/checks/commit-msg-check.sh
      scripts/checks` → `read error: 0: Is a directory` + `message_line: unbound variable`, **exit 1**
      („fachliche Ablehnung") statt der im Header `:14-16` zugesagten **2**. Über Git nicht erreichbar,
      aber `[ ! -f … ]` neben dem `-r` wäre eine Zeile – gerade in dem Skript, dessen Verkaufsargument
      der explizite Exit-Kontrakt ist.
- [ ] [scripts/checks/tests/run-tests.sh:3456-3471] Die Default-Präfix-Tests laufen mit dem cwd der
      Suite und erben damit `--global`/`--system`-Git-Config. Hat ein Entwickler `core.commentChar=";"`
      global gesetzt, zählt `# --help` (`:3469`) als Inhalt → Assertion rot **aus dem falschen Grund**.
      Der Nachbartest `:3475-3484` macht es richtig (eigenes Wegwerf-Repo). →
      `GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null` oder eigenes Repo.
- [ ] [scripts/checks/tests/run-tests.sh:3497-3498, 3505-3506] Derselbe Aufruf zweimal: die Prüfung
      „exit ≠ 0" ist strikt schwächer als das acht Zeilen darüber geprüfte „exit 2" und fügt nichts
      hinzu; ebenso schreibt `:3494` denselben `--help`-Inhalt wie `:3486`.
- [ ] [scripts/checks/tests/run-tests.sh:3622-3627 vs. 3663-3668] Zwei straight-line-Kopien mit
      identischem Rumpf (AK1 „reguläre Message" und AK3 „`-x`" unterscheiden sich nur in Repo-Name,
      Message-Literal, AK-Label). 200 Zeilen darüber nutzt `cm_pass_cases` genau die passende Tabelle.
      Lesson #240/#251.
- [ ] [scripts/checks/tests/run-tests.sh:3604-3620] `cm_e2e_repo` ist fail-closed, aber das Signal geht
      an der Aufrufstelle verloren: `return 1` verschwindet in der Kommandosubstitution, `WT` ist dann
      leer und die Folgezeile schreibt nach `/x.txt`. `WT=$(cm_e2e_repo x) || assert_true 1 "…"` machte
      den Grund im Protokoll sichtbar statt als Folgefehler.
- [ ] [scripts/checks/tests/run-tests.sh:3769-3770, 3780-3781] Die Lesbarkeits-Vorbedingung sitzt hier
      vor **Präsenz**-Greps und ist dort tautologisch (Lesson #214 verlangt sie vor *Abwesenheits*-
      Checks – korrekt umgesetzt bei `:3706-3709`). Kostet 5 aussagelose Assertions.
- [ ] [scripts/checks/tests/run-tests.sh:3630 vs. 1900] Die in Runde 2 eingeführte sprechende
      `Flag|Name`-Tabelle blieb auf den `factory-commit`-Block beschränkt; im E2E-Block wird der
      Fixture-Name weiterhin per `${flag_case//-/}` generiert – zwei Idiome für dasselbe im selben PR
      (`lessons/code-style.md`, aus #224). `TMP_CM` beherbergt weiterhin auch die `install-hooks`- und
      E2E-Repos.
- [ ] [scripts/checks/tests/run-tests.sh:3723] `dummy.sh` im Init-Fixture ist unerklärt – es existiert
      nur, damit `chmod +x "$FACTORY_DIR/scripts/checks/"*.sh` (`init-factory.sh:94`) nicht auf ein
      leeres Glob läuft. Ein Halbsatz genügt.
- [ ] [scripts/install-hooks.sh:32 vs. :55] Asymmetrie beim Exit-Kontrakt: der Installer nutzt zwei
      Codes (1 = kein git-Repo, 2 = `core.hooksPath`), der Header verspricht nur „exit ≠ 0", und beide
      Tests prüfen nur `≠ 0`. Im Nachbarskript wurde derselbe Punkt in dieser Runde dokumentiert **und**
      getestet – entweder gleichziehen oder bewusst einen Code verwenden.
- [ ] [scripts/install-hooks.sh:81-82] Die `pre-commit`/`pre-push`-Rümpfe reichen `"$@"` und stdin nicht
      weiter (Git übergibt `pre-push` Remote-Name/URL auf argv, Ref-Liste auf stdin). Keine Regression –
      identisch zum alten Heredoc, und `pre-push.sh` nutzt beides nicht –, aber jetzt in der
      *kanonischen* Quelle zementiert. Ein Ein-Zeilen-Kommentar entschärft die künftige Falle.
- [ ] [scripts/factory-commit.sh:10-22] Der aufzählende Modul-Header kennt den neuen Exit-0-Pfad nicht
      (er nennt „Ablauf", „Fail-closed Exit ≠ 0", „Robust Exit 0: nichts zu committen"); `-h`/`--help`
      ist eine dritte Klasse und steht nur in `usage()` und im Inline-Kommentar. Auslöser aus
      `lessons/code-style.md` (#207).
- [ ] [README.md:50 / CONTRIBUTING.md:22 / CLAUDE.md:151 / OPERATING.md:432] „einmalig pro Clone"
      widerspricht dem zweiten erklärten ADR-Ziel: ADR-042 §Kontext und `git-workflow.md:55-57` nennen
      **künftige Hook-Änderungen** ausdrücklich als dritten Anlass. „einmalig **und** nach jeder
      Hook-Änderung" wäre widerspruchsfrei.
- [ ] [docs/factory/guidelines/git-workflow.md:63,66-70] (a) „auch der **neue** `commit-msg`-Hook"
      altert. (b) Die Zweckspalte ist jetzt korrekt, aber **ungeguardet** – kein Test vergleicht die
      Tabelle gegen `pre-commit.sh`/`pre-push.sh`, obwohl genau diese Drift Runde-2-W1 war (Lesson #160).
      (c) Die Fail-open-Ausnahme („außer auf Branches ohne `commit-msg-check.sh`", `install-hooks.sh:93-95`)
      fehlt in der Tabelle, während der `core.hooksPath`-Sonderfall als Bullet darunter steht.
- [ ] [scripts/checks/commit-msg-check.sh:46,47,57] Namenskonvention uneinheitlich: Datei-Globals sind
      sonst durchgängig `UPPER_CASE`, die drei neuen (`config_key`, `configured_prefix`, `message_line`)
      lowercase, ohne `local` in einer Funktion zu sein.
- [ ] [scripts/checks/commit-msg-check.sh:46] Die feste Reihenfolge `commentString` → `commentChar` mit
      `break` bildet git's Präzedenz vermutlich nicht ab: Git behandelt beide Keys als dieselbe interne
      Variable, es gewinnt die **zuletzt gelesene** Zuweisung. Ein für alt+neu-git gemeintes Setup
      (`commentString = //` + `commentChar = #`) ließe git mit `#` und das Skript mit `//` arbeiten.
      *Nicht empirisch verifiziert* – mindestens gehört die Annahme als WHY-Kommentar an die Stelle.
- [ ] [scripts/install-hooks.sh:71] Der Idempotenz-Vergleich ist gegenüber trailing-newline-Unterschieden
      blind (`$(cat)` und `$(printf)` strippen beide). Für den Normalfall korrekt verifiziert; ein Hook,
      der sich nur in Leerzeilen am Ende unterscheidet, wird ohne die versprochene Warnung ersetzt.
- [ ] [scripts/] Zwei gitignorete Wegwerf-Sonden liegen im Worktree: `scripts/probe-262.tmp.sh`
      (vorbestehend) und `scripts/verify-review3.tmp.sh` (aus diesem Review – `rm` war in dieser Session
      nicht freigegeben). Beide sind über `*.tmp.sh` ignoriert, `git status` ist sauber, also **kein**
      PR-Artefakt – nur ein Aufräum-Hinweis.
- [ ] [scripts/install-hooks.sh, scripts/checks/commit-msg-check.sh] Datei-Modus `100644` statt `100755`
      bleibt offen (dokumentiert, Permission-Classifier). Anmerkung: `scripts/factory-commit.sh` ist
      ebenfalls `100644` – die Inkonsistenz ist teilweise vorbestehend, nicht von diesem PR eingeführt.
- [ ] [.claude/commands/setup-project.md:36,108-109] Weiterhin nur zwei Check-Skripte genannt. In Runde 2
      begründet abgelehnt (`.claude/**` nur über Patch-Workflow) – hier nur der Vollständigkeit halber.

## Positives

- **Alle acht W-Findings der Vorrunde sind real behoben, nicht nur abgehakt** – von zwei Personas
  unabhängig zeilengenau gegen die Quellen nachgeprüft, jeweils mit Test und, wo sinnvoll, mit
  Diskriminierungs-Gegenprobe.
- **W3 wurde über die Forderung hinaus ausgebaut:** statt den Grep nur zu pinnen, gibt es jetzt einen
  echten `init-factory.sh`-Lauf mit gestubbtem Installer – Stub-Marker belegt den tatsächlichen Aufruf,
  dazu Exit-Code, Banner-Präsenz, Abwesenheit des Erfolgs-Banners und Gegenprobe mit Installer-Exit 0.
  Genau der Sprung „Wiring-Grep → E2E" aus Lesson #212.
- **W7 ist eine echte Verhaltenskorrektur, keine Doku-Beruhigung**, auf beiden Ebenen abgesichert:
  vier Unit-Fälle **und** ein `GIT_EDITOR`-E2E mit Gegenprobe. Für `core.commentChar=';'` gibt es eine
  Diskriminierung pro Richtung (`;`-Zeile = Kommentar, `#`-Zeile = Inhalt).
- **Die Trim-/Filter-Logik hält allen empirisch gefahrenen Edge-Cases stand:** CRLF, CRLF-Template,
  Message ohne trailing Newline, leere Datei (keine `unbound variable`), nur Kommentarzeilen, `-h` mit
  umgebenden Leerzeilen. Der `case "$COMMENT_PREFIX"*`-Vergleich ist durch die Quotierung glob-sicher.
- **Single-Source-Anspruch (ADR-042) hält der Prüfung stand:** repo-weiter Grep über `scripts/`,
  `.github/`, `.claude/`, `docs/` und Root-`*.md` nach `.git/hooks`/`hooksPath`/`install-hooks`/
  `commit-msg` zeigt **genau eine** schreibende Stelle. `init-factory.sh` delegiert vollständig, der
  Abwesenheits-Test ist mit Lesbarkeits-Vorbedingung fail-closed abgesichert, und die Claude-Code-Hooks
  aus `.claude/settings.json` bleiben als getrennte Ebene unvermischt.
- **`init-factory.sh` verliert seinen stillen Schein-Erfolg**, ohne dass der Erfolgsfall lauter wird:
  Merkflag, eigenes Banner, `exit 1`, Erfolgs-Banner bleibt dem Erfolgsfall vorbehalten – vier einzeln
  assertierte Aussagen inkl. Gegenprobe.
- **Exit-Kontrakt (1 = fachlich, 2 = Infrastruktur) ist jetzt Vertrag *und* Test** – ein Vertauschen
  fiele auf.
- **Die in Runde 2 gemeldeten „grün aus dem falschen Grund"-Greps sind strukturell geschärft:** beide
  neuen Tokens (`bash "$FACTORY_DIR/scripts/install-hooks.sh"`, `` `commit-msg`-Hook ``) sind
  leerzeichenfrei, ein Prosa-Umbruch kann sie also nicht lautlos zerreißen (Lesson #240/#249 strukturell
  entschärft, nicht nur zufällig vermieden); `proseWrap` ist in `.prettierrc` nicht gesetzt.
- **ADR-019-Nachtrag löst den Wortlaut-Konflikt konzeptionell statt kosmetisch** („Pflicht-Argument
  bleibt die Message für jeden *Commit*-Aufruf; `-h`/`--help` ist eine Hilfe-Anfrage"), im etablierten
  Nachtrag-Muster der Datei (#239, #252) und bidirektional mit ADR-042 verlinkt.
- **ADR-042 beschreibt den Code zeilenweise korrekt**, hat Status `Accepted`, drei echte Alternativen
  mit Trade-offs, nennt #131 als Neubewertungs-Auslöser, #265 für den manuellen Retrofit und benennt
  die `auto`-Restlücke offen – einziger Vorbehalt ist die Vollständigkeit dieser Liste (W1 oben).
- **Assertion-Präzision durchweg gegen Literale**, nicht tautologisch gegen die Quelle, mit
  pfadspezifischem Signal je Ablehnungspfad. Isolation und Aufräumen sauber: alle Fixtures unter
  `mktemp -d`, `rm -rf` am Blockende, die `chmod 000`-Datei wird vor dem Löschen zurückgesetzt.
- **Keine Routen-Berührung** – der Diff enthält keine Datei unter `app/`; `docs/routes.md` und das
  #145-Drift-Gate sind korrekt nicht betroffen. **Kein Gold-Plating:** die drei Ergänzungen über den
  Spec-Wortlaut hinaus sind je ein Review-Finding, in ADR begründet und getestet.

## Empfehlung

NEEDS_REWORK

Kein kritischer Defekt, keine Architekturverletzung, kein Drift im Single-Source-Anspruch – und die
Nacharbeit aus Runde 2 ist vollständig und belegt. Vier Punkte bleiben, alle klein:
eine **reale, empirisch reproduzierte Verhaltenslücke** (`commit.verbose=true` umgeht den Guard auf dem
Editor-Pfad – 2 Zeilen Fix oder eine ehrliche zweite Restlücke in ADR-042 + Skript-Header), eine
**echte Coverage-Lücke** auf einem Zweig, dessen Wegfall genau die in Runde 2 geschlossene Lücke
zurückbrächte, eine **tote Test-Assertion**, und **ein Token in `OPERATING.md:89`**.

> **⚠ Circuit Breaker erreicht – das war Review-Runde 3 von maximal 3.**
> Regelgemäß wird hier **nicht** automatisch eine vierte `/implement`-Runde ausgelöst, sondern an den
> Menschen eskaliert. Es liegt **kein ungelöster Konflikt** vor: jede Runde hat genuin neue, reale
> Punkte gefunden, und jede Nacharbeit war korrekt – die Schwere nimmt monoton ab.
> Entscheidung liegt bei Ralf, sinnvoll sind zwei Optionen:
> **(a)** ein letzter, eng begrenzter Fix-Pass über die vier „Wichtig"-Punkte ohne erneutes
> Multi-Persona-Review, danach Gate-Lauf und weiter zu `/test`; oder
> **(b)** Merge wie er ist und die `commit.verbose`-Lücke als eigenes Issue nachziehen – vertretbar,
> weil die Spec (AK2) wortlautgemäß nur den `-m`-Pfad fordert und der reale Vorfall (`git commit -m
> "--help"`, Commit `2a27728`) davon abgedeckt ist. Dann muss aber im selben Zug die Zusage in
> ADR-042:73-83 und im Skript-Header entschärft werden – sie ist derzeit nachweislich zu weit gefasst.
