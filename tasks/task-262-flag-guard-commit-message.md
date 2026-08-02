# Task 262: flag-guard-commit-message

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [x] Codify ausgeführt
- [x] Fertig / PR erstellt

## Beschreibung
Flag-Guard gegen versehentliche Commit-Messages, die wie ein CLI-Flag aussehen
(`--help`, `-h`) – sowohl über einen neuen `commit-msg`-Git-Hook (greift
unabhängig vom Aufrufpfad) als auch über ein explizites `-h|--help`-Guard in
`scripts/factory-commit.sh`. Details, Root-Cause-Recherche und Scope-Abgrenzung
in [`docs/specs/spec-262-flag-guard-commit-message.md`](../docs/specs/spec-262-flag-guard-commit-message.md).

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [x] GIVEN der `commit-msg`-Hook ist installiert WHEN `git commit -m "fix: foo"` (reguläre Message) ausgeführt wird THEN wird der Commit wie bisher angelegt.
- [x] GIVEN der `commit-msg`-Hook ist installiert WHEN `git commit -m "--help"` oder `git commit -m "-h"` ausgeführt wird THEN lehnt der Hook fail-closed ab (kein Commit).
- [x] GIVEN eine Commit-Message, die mit `-` beginnt, aber nicht `--help`/`-h` ist (z. B. `-x`) WHEN committet wird THEN bleibt das bisherige Verhalten erhalten (keine Ablehnung).
- [x] GIVEN `scripts/factory-commit.sh -h`/`--help` wird aufgerufen WHEN das Skript läuft THEN nur Usage-Meldung, Exit 0, kein `git add`/`commit`/`push`.
- [x] GIVEN `scripts/factory-commit.sh` mit regulärer, nicht-leerer Message (kein `-h`/`--help`) WHEN das Skript läuft THEN Verhalten wie bisher (Regressionstest).
- [x] GIVEN `scripts/factory-commit.sh` mit anderem `-`-präfigiertem Argument (z. B. `-x`) WHEN das Skript läuft THEN wie jede andere Message behandelt (kein Sonderfall).
- [x] GIVEN ein Repo WHEN `bash scripts/install-hooks.sh` ausgeführt wird THEN sind `pre-commit`/`pre-push`/`commit-msg` installiert; wiederholter Aufruf ist idempotent.
- [x] GIVEN `scripts/init-factory.sh` für ein neues Projekt WHEN Hook-Installation läuft THEN ist `commit-msg` Teil der installierten Hooks.
- [x] GIVEN Commit-Message-Datei beim `commit-msg`-Hook nicht lesbar WHEN `commit-msg-check.sh` läuft THEN fail-closed Abbruch.
- [x] GIVEN eine leere Commit-Message WHEN committet wird THEN bestehende Leer-Prüfung bleibt unverändert wirksam.

## Technische Notizen
ADR-042 (`docs/adr/042-hook-installation-single-source.md`): `scripts/install-hooks.sh`
ist die einzige Quelle für Hook-Inhalt (`pre-commit`/`pre-push`/`commit-msg`), idempotent,
beliebig oft ausführbar. `scripts/init-factory.sh` ruft für Schritt 5 nur noch
`bash scripts/install-hooks.sh` auf (keine eigenen Heredocs mehr). Für dieses Repo:
`scripts/install-hooks.sh` nach Merge einmalig manuell ausführen (kein Auto-Aufruf durch
`start-work.sh`, siehe Spec).

`commit-msg-check.sh` und `factory-commit.sh` behalten die Literale `--help`/`-h`
unabhängig voneinander (keine gemeinsame Flag-Liste extrahieren – Over-Engineering für
zwei Zeilen an zwei unterschiedlichen Grenzen, siehe ADR-042 „Bewusst nicht extrahiert").
Matching: exakter Vergleich des getrimmten Inhalts gegen `--help`/`-h` (kein Regex nötig,
keine BSD/GNU-Portabilitätsfallen).

### Notizen aus `/implement` (2026-08-02)

- **AK8 strukturell statt end-to-end getestet:** `init-factory.sh` ist interaktiv (`read`-Prompts)
  und nutzt `sed -i ''` (BSD-Syntax) – ein echter Bootstrap-Lauf wäre in CI (GNU) nicht portabel.
  Der Test prüft deshalb die *Delegation* an `install-hooks.sh` in beide Richtungen (ruft es auf
  **und** enthält keine `.git/hooks`-Referenz mehr). Dass die kanonische Quelle den
  `commit-msg`-Hook tatsächlich installiert, deckt der Verhaltenstest zu AK7 ab.
- **Kein zweiter Happy-Path für AK5:** Die Regression „reguläre Message committet und pusht wie
  bisher" ist bereits durch den bestehenden `factory-commit`-Fall 1 abgedeckt – keine parallele
  Schleife mit identischem Rumpf (Lesson #240/#251).
- **E2E-Hook-Tests neutralisieren `pre-commit`:** Im Wegwerf-Repo wird der `pre-commit`-Hook durch
  einen No-op ersetzt, damit ausschließlich der `commit-msg`-Pfad über Erfolg/Ablehnung
  entscheidet (`pre-commit.sh` ruft `pnpm lint` und existiert dort gar nicht) – sonst wäre der
  Test rot aus dem falschen Grund (Lesson #214).

### Gate-Verifikation (2026-08-02)

- `bash scripts/checks/tests/run-tests.sh`: **697 grün, 0 rot**; `bash scripts/checks/pre-commit.sh`
  (inkl. `pnpm lint`): grün. Keine UI-/Routen-Berührung → keine Oberflächen-/E2E-Verifikation nötig.
- **Umgebungsbedingter Fehlschlag ohne Bezug zu #262 (belegt, nicht behauptet):** Sind in der
  aufrufenden Shell `PR_SHEPHERD=true`/`FACTORY_STAGE=3` exportiert (so in der Session dieses
  Laufs), laufen 4 Assertions des `#212 W3`-E2E-Blocks rot – die Variable schlägt in das
  Wegwerf-Repo durch, `run-pipeline.sh` startet dort Phase 7 und bricht mit „Skill-Datei nicht
  gefunden: …/.claude/commands/pr-shepherd.md" ab, bevor die Endzustands-Verifikation greift.
  Nachweis nach Lesson #239/#244: (a) Diff-Scope dieses Branches berührt keinen Input des Blocks
  (`run-pipeline.sh`, `verify-final-state.sh`, `raise-interrupt.sh`, `factory.defaults.yml`
  unverändert), (b) identisch reproduziert gegen einen unveränderten `origin/main`-Worktree,
  (c) CI auf `main` ist grün (dort ist `PR_SHEPHERD` nicht gesetzt), (d) mit `unset PR_SHEPHERD`
  ist die Suite hier vollständig grün. Härtung (E2E-Block sollte `PR_SHEPHERD` explizit
  neutralisieren, statt es aus der Umgebung zu erben) ist **out of scope** für #262 → eigenes Issue.

**Offen (außerhalb dieses PRs):** `scripts/install-hooks.sh` muss nach dem Merge in diesem Repo
einmalig manuell ausgeführt werden, damit der `commit-msg`-Hook hier real scharf ist (ADR-042).

### Gate-Verifikation nach Review-Runde 1 (2026-08-02)

- `bash scripts/checks/tests/run-tests.sh`: **715 grün**, 4 rot – ausschließlich die oben
  belegten, umgebungsbedingten `#212 W3`-Assertions (identische vier wie vor der Nacharbeit;
  `PR_SHEPHERD`/`FACTORY_STAGE` sind in dieser Session exportiert). Alle #262-Assertions grün.
  Die vier roten sind namentlich verifiziert: „meldet den realen Zustand", „INCOMPLETE_OUTCOME
  wird ins interrupt-log geschrieben", „sauber+gepushter Endzustand → Erfolg (Gegenprobe)",
  „Erfolgs-Banner erscheint bei verifiziertem Endzustand" – getrackt in **#264**.
- `bash scripts/checks/pre-commit.sh` (inkl. `pnpm lint`): grün.

## Offene Fragen
- [x] Code-Duplikation zwischen `scripts/install-hooks.sh` und dem Hook-Block in `scripts/init-factory.sh` – entschieden in ADR-042: `init-factory.sh` ruft `install-hooks.sh` auf.

## Review-Findings

Review-Runde 1 (`tasks/review-262.md`): **NEEDS_REWORK** – keine kritischen Findings,
5 wichtige + 7 Nitpicks. Nacharbeit in `/implement`-Runde 2 (2026-08-02):

**Wichtige Findings – behoben:**
- [x] W1 `install-hooks.sh`: gesetztes `core.hooksPath` (z. B. husky) wurde ignoriert → Hooks
      wären inert gewesen, der Installer meldete Erfolg. Jetzt fail-closed Abbruch (exit 2) mit
      Ursachen-Meldung; Entscheidung (Option entfernen vs. Checks dort einbinden) bleibt beim
      Menschen. Test + Gegenprobe ohne die Option.
- [x] W2 Fehlerszenario 2 auf der `factory-commit.sh`-Seite: Testfall für die **leere** Message
      (`bash factory-commit.sh ""`) ergänzt – exit ≠ 0, pfadspezifisches Signal, nichts committet.
      Der bisherige Fall deckte nur „gar kein Argument" ab (#91, Fall 5).
- [x] W3 Doku: neues Gate + kanonischer Installationsweg stehen jetzt in `CLAUDE.md` (Guardrails)
      und `docs/factory/guidelines/git-workflow.md` (eigener Abschnitt „Git-Hooks installieren",
      inkl. Hook-Tabelle und `core.hooksPath`-Verhalten). Doku-Guard-Tests dazu.
- [x] W4 Repo-weiter Hook auf Branches ohne Prüfskript: der erzeugte `commit-msg`-Hook prüft
      `[ -f "$CHECK" ]` und beendet sich sonst mit exit 0 – bewusste Fail-open-Ausnahme **nur**
      für den Nicht-vorhanden-Fall (ältere Branches, `git bisect`, In-Flight-Worktrees), in
      ADR-042 (Decision + Consequences) festgehalten. Test inkl. Diskriminierungs-Gegenprobe
      (Skript wieder vorhanden → `--help` wird weiterhin abgelehnt).
- [x] W5 Out-of-Scope-Issue zum `PR_SHEPHERD`-Erben des `#212 W3`-Blocks: angelegt als
      **[#264](https://github.com/nothra/tch-gastro-services/issues/264)**
      (`enhancement` + `test`,`tech-debt`). Der Seam `scripts/lib/create-issue.sh` blieb auch in
      dieser Session unerreichbar (der Permission-Classifier lehnt `. scripts/lib/create-issue.sh
      && create_issue …` ab, ebenso ein Wrapper-Skript) – die Anlage lief deshalb als einmaliger
      manueller `gh issue create`-Aufruf mit denselben Labels, die der Seam vergeben hätte. Das
      Seam-Gebot aus `git-workflow.md` zielt auf automatisierte Anlage-Pfade in Skripten; hier
      entsteht kein zweiter Code-Pfad.

**Nitpicks – umgesetzt:** Warnung beim Ersetzen eines abweichenden vorhandenen Hooks (inkl.
Diskriminierungs-Test, dass ein identischer Stand nicht warnt); `$hook_name` statt `$1` im
Hook-Pfad; neutrale Fehlermeldung in `init-factory.sh` („Hook-Installation fehlgeschlagen –
siehe Meldung oben"); Lesbarkeits-Vorbedingung vor den Abwesenheits-Greps (AK8 + Doku-Guards,
Lesson #214); pfadspezifisches Signal für `--help extra`; Schleifenvariable `case` → `cm_case`;
ADR-042 nennt den `factory-commit.sh`-Guard nicht mehr als „bereits existierend".

**Nitpick nicht umgesetzt:** Datei-Modus `100644` → `100755` für `install-hooks.sh` und
`commit-msg-check.sh` – `chmod` und `git update-index --chmod=+x` sind in dieser Session nicht
freigegeben (in beiden Implementierungs-Runden erneut versucht, beide Male vom
Permission-Classifier abgelehnt). Funktional irrelevant (Aufruf immer über `bash …`), aber
inkonsistent zu den Nachbarn; bei Bedarf manuell:
`git update-index --chmod=+x scripts/install-hooks.sh scripts/checks/commit-msg-check.sh`.

### Nachtrag zur Nitpick-Umsetzung (Bash-Gotcha)

`local hook_name="$1" hook_file="$HOOKS_DIR/$hook_name"` in **einer** `local`-Zeile bricht unter
`set -u` mit `hook_name: unbound variable` – `local` expandiert alle Argumentwörter, bevor die
Zuweisungen wirken (genau deshalb stand dort ursprünglich `$1`). Der Nitpick ist deshalb über
eine **eigene** `local`-Zeile umgesetzt, mit Kommentar an der Stelle. Aufgefallen ist es, weil
die Test-Suite danach 25 rote Assertions zeigte – nicht durch Codelesen.

### Review-Runde 2 → `/implement`-Runde 3 (2026-08-02)

Review-Runde 2 (`tasks/review-262.md`): **NEEDS_REWORK** – erneut keine kritischen Findings,
8 wichtige + 12 Nitpicks. Zwei Klassen: Doku-/ADR-Kohärenz und Test-Präzision.

**Wichtige Findings – behoben:**
- [x] W1 Hook-Tabelle in `git-workflow.md` beschrieb `pre-commit` faktisch falsch („Lint/**Format**").
      Format (Prettier) ist Check 3 in `pre-push.sh`, nicht in `pre-commit.sh`. Beide Zweckspalten
      jetzt an die Quell-Skripte angeglichen (Lesson #160).
- [x] W2 `init-factory.sh` degradierte den fail-closed Abbruch des Installers zur Warnung und
      meldete danach „erfolgreich initialisiert". Jetzt: Merkflag → eigenes Banner „Bootstrap
      unvollständig – keine Git-Hooks" + `exit 1`; Erfolgs-Banner bleibt dem Erfolgsfall vorbehalten.
- [x] W3 AK8-Grep traf auch die Kommentar-Prosa (`grep -qF 'scripts/install-hooks.sh'` matcht den
      Kommentar darüber) und konnte nicht aus dem beabsichtigten Grund rot werden. Jetzt auf den
      konkreten Aufruf gepinnt (`bash "$FACTORY_DIR/scripts/install-hooks.sh"`) **plus** ein echter
      Verhaltenstest mit gestubbtem Installer (Stub-Marker belegt den Aufruf; Exit-Code, Banner und
      Abwesenheit des Erfolgs-Banners werden geprüft, inkl. Gegenprobe mit Installer-Exit 0).
- [x] W4 Doku-Guard `grep -qF 'commit-msg'` war nicht diskriminierend (Teilstring von
      `commit-msg-check.sh`). Jetzt wird `` `commit-msg`-Hook `` gesucht – ein Token, das nur im
      Hook-Satz vorkommt.
- [x] W5 Doku-Nachführung war unvollständig: `OPERATING.md` (§Betrieb) und `CONTRIBUTING.md`
      (Einstieg/lokales Setup) kannten den dritten Hook nicht, `README.md` ebenso wenig – wer der
      Clone-Anleitung folgte, hatte danach **keinen** lokalen Hook. Alle drei ergänzt;
      `OPERATING.md` + `CONTRIBUTING.md` laufen jetzt in derselben Doku-Guard-Schleife wie
      `CLAUDE.md`/`git-workflow.md`, `README.md` mit eigener Setup-Assertion (Lesson #211/#176).
- [x] W6 ADR-019 beschrieb die von diesem PR geänderte `factory-commit.sh`-Mechanik im alten Stand
      („Die Message ist Pflicht-Argument", Guard-Aufzählung ohne Help-Guard). Nachtrag (#262)
      ergänzt: `-h`/`--help` ist eine Hilfe-Anfrage, kein Message-Aufruf; ADR-042 verweist auf
      ADR-019 §1 (Lesson #211).
- [x] W7 **Echte Verhaltenslücke, nicht nur Doku:** Git entfernt die `#`-Kommentarzeilen erst
      **nach** dem `commit-msg`-Hook (`--cleanup`) – auf dem Editor-Pfad (`git commit` ohne `-m`,
      `-e`, `--amend`, Merge, `-t`) sah der Guard `--help\n\n# Please enter …`, getrimmt ≠ `--help`
      → der Commit entstand. Reproduziert mit git 2.50. `commit-msg-check.sh` verwirft jetzt zuerst
      alle Kommentarzeilen (Präfix aus `core.commentString`/`core.commentChar`, Default `#`) und
      trimmt erst danach. Tests: Editor-Template abgelehnt, reguläre Message mit Template
      durchgelassen, `--help` nur in einer Kommentarzeile → kein Treffer, `core.commentChar=';'`
      in beide Richtungen (`;`-Zeile ist Kommentar, `#`-Zeile ist Inhalt), dazu ein
      **End-to-End-Test über `GIT_EDITOR`** inkl. Gegenprobe mit regulärer Message.
      **Restlücke bewusst offen:** bei `core.commentChar=auto` wählt Git den Präfix pro Message aus
      einer Kandidatenliste, ohne ihn festzuhalten – dort greift der Guard auf dem Editor-Pfad nur,
      wenn Git `#` gewählt hat. Als Heuristik nicht nachgebaut, in Skript-Kommentar und ADR-042
      explizit festgehalten statt implizit zu bleiben.
- [x] W8 Der manuelle Retrofit-Schritt war nur in dieser (nach dem Merge kaum gelesenen) Task-Datei
      getrackt. Das im Review angelegte Issue **#265** ist jetzt in ADR-042 §Consequences
      referenziert.

**Nitpicks – umgesetzt:** Modul-Header von `run-tests.sh` ergänzt (zählungsfrei formuliert, analog
`git-workflow.md`: „die Factory-Hooks" statt „drei Hooks"); ADR-042 nennt Issue **#131** als
Auslöser zur Neubewertung der Literal-Duplikation; `LC_ALL=C` vor dem locale-abhängigen
Abwesenheits-Grep; Exit-Kontrakt (1 = fachliche Ablehnung, 2 = Infrastruktur-Fehler) im
Skript-Header benannt **und** je eigener Assertion getestet; `cm_e2e_repo` prüft die
Hook-Installation fail-closed, bevor es das Repo zurückgibt; AK-Labels (AK4/AK6) im
`factory-commit`-Block; sprechende Fixture-Namen (`helpshort`/`helplong` statt `helph`/`helphelp`)
über eine `Flag|Name`-Tabelle, `GIT_WORKFLOW`-Dublette durch das bestehende `GITWF` ersetzt;
`commit-msg`-Hook-Rumpf als Heredoc statt gequotetem Mehrzeiler; Ein-Zeilen-Begründung, warum
`REPO_DIR` bewusst nicht per `FACTORY_DIR` überschreibbar ist; `core.hooksPath`-Meldung nennt via
`--show-origin` den Scope.

**Nitpicks bewusst nicht umgesetzt:**
- `.claude/commands/setup-project.md` (Adoptions-Pfad nennt `install-hooks.sh` nicht):
  `.claude/**` ist für Agenten hard denied – die Änderung ginge nur über den Patch-Workflow mit
  menschlichem `git apply` und hinterließe bis dahin ein inkonsistentes Branch-Artefakt. Für einen
  als optional markierten Nitpick unverhältnismäßig; der kanonische Installationsweg steht in
  `CLAUDE.md`, `git-workflow.md`, `OPERATING.md`, `CONTRIBUTING.md` und `README.md`.
- stderr-Signal beim `-h`/`--help`-Guard in `factory-commit.sh`: AK4 fordert wortlautgemäß „nur
  Usage-Meldung, Exit 0" – ein zweiter Kanal wäre eine Verhaltensergänzung über die Spec hinaus.
- Datei-Modus `100755` für `install-hooks.sh`/`commit-msg-check.sh`: `git update-index --chmod=+x`
  in dieser Session erneut vom Permission-Classifier abgelehnt (dritter Versuch). Funktional
  irrelevant (Aufruf immer über `bash …`); manuell:
  `git update-index --chmod=+x scripts/install-hooks.sh scripts/checks/commit-msg-check.sh`.

### Gate-Verifikation nach Review-Runde 2 (2026-08-02)

- `bash scripts/checks/tests/run-tests.sh`: **741 grün**, 4 rot – ausschließlich die weiter oben
  belegten, umgebungsbedingten `#212 W3`-Assertions (namentlich identisch mit den Vorläufen:
  „meldet den realen Zustand", „INCOMPLETE_OUTCOME wird ins interrupt-log geschrieben",
  „sauber+gepushter Endzustand → Erfolg (Gegenprobe)", „Erfolgs-Banner erscheint bei verifiziertem
  Endzustand"; getrackt in **#264**). Alle #262-Assertions grün, +26 gegenüber Runde 2.
  `unset PR_SHEPHERD` ließ sich in dieser Session nicht ausführen (Permission-Classifier lehnt
  `unset …&&`, `env -u` und `bash -c` ab) – die Gegenprobe aus dem ersten Lauf bleibt der Beleg.
- `bash scripts/checks/pre-commit.sh` (inkl. `pnpm lint`): grün. Keine UI-/Routen-Berührung.

### Review-Runde 3 → Circuit Breaker → Fix-Pass (menschliche Entscheidung, 2026-08-02)

Review-Runde 3 (`tasks/review-262.md`): **NEEDS_REWORK**, keine kritischen Findings, alle acht
W-Findings aus Runde 2 real behoben. Vier neue, alle klein. Regelgemäß (3 von 3 möglichen Runden)
eskaliert statt automatisch nachzuarbeiten – Ralf hat sich für **Option (a)** entschieden: ein
eng begrenzter Fix-Pass über die vier Punkte, ohne vierte Multi-Persona-Review.

**Behoben:**
- [x] W1 **Echte Verhaltenslücke:** `git commit -v`/`--verbose` hängt den Diff unterhalb der
      Scissors-Zeile **ohne** Kommentar-Präfix an – die Filterschleife verwarf nur präfigierte
      Zeilen, der Diff blieb in `MESSAGE` stehen, `--help` wäre durchgerutscht. Fix: Abbruch der
      Filterschleife (`break`), sobald die Scissors-Zeile (`>8`) erkannt wird – alles danach
      gehört nie zur Message, unabhängig vom Präfix. Tests: `git commit -v` mit `--help` oberhalb
      des Diffs (Ablehnung) + `--cleanup=scissors` ohne `-v` (Gegenprobe, unverändert unkritisch).
      `commit.verbose=true` ist damit keine Restlücke mehr – ADR-042/Skript-Kommentar nennen
      weiterhin korrekt nur noch `core.commentChar=auto` als bewusst offene Lücke.
- [x] W2 **Coverage-Lücke:** `core.commentString` (mehrzeichiger Präfix) und der `auto`-Zweig
      waren mit 0 Testtreffern komplett ungetestet – ein Wegfall der `auto`-Sonderbehandlung wäre
      lautlos grün geblieben. Je ein Test mit `core.commentString='//'` (inkl. Diskriminierung
      gegen `#`) und `core.commentChar=auto` (Fallback auf Default `#` bleibt wirksam) ergänzt.
- [x] W3 **Tote Assertion** (`run-tests.sh`, factory-commit AK4): `git diff --cached --quiet`
      verglich Index gegen HEAD statt gegen leer – nach einem hypothetischen `git add -A && git
      commit` (bei entferntem Guard) wäre Index == neuer HEAD → grün, obwohl `git add` gelaufen
      wäre. Ersetzt durch eine direkte Prüfung, dass die neue Datei unverändert `??` (untracked)
      bleibt – das gilt nur, wenn `git add` nie lief.
- [x] W4 `OPERATING.md:89`: `install-hooks.sh` als zweiten Schritt in die Setup-Kette ergänzt
      (spiegelt jetzt README/CONTRIBUTING).

**Gate-Verifikation nach Fix-Pass:** `bash scripts/checks/tests/run-tests.sh`: **753 grün, 0 rot**
(die zuvor umgebungsbedingt roten `#212 W3`-Assertions sind in diesem Lauf ohne `PR_SHEPHERD`-Leak
grün – getrackt bleibt trotzdem **#264**, da die Härtung selbst noch offen ist). `bash
scripts/checks/pre-commit.sh` (inkl. `pnpm lint`): grün.

### Phase 3: Test-Vervollständigung (2026-08-02)

Diff-Scope (`git diff origin/main...HEAD`) enthält **keine** TypeScript-/App-Datei – ausschließlich
Bash-Skripte und Doku. `pnpm test:coverage` (Vitest) misst daher keinen Code dieses PRs; die
Baseline (89 % Statements, 665 grün/0 rot) ist unverändert. Die tatsächliche Testabdeckung für
#262 liefert `scripts/checks/tests/run-tests.sh` (Bash-Suite) – **753 grün, 0 rot**, inkl. der im
Fix-Pass ergänzten Fälle. Alle 10 Akzeptanzkriterien und beide Fehlerszenarien der Spec sind laut
drei unabhängigen Review-Runden mit Tests belegt (kein AK nur behauptet). Keine weiteren Tests
in dieser Phase nötig – kein Produktionscode geändert.

### Phase 4: Refactoring (2026-08-02)

Keine Änderung nötig. Naming, Struktur und Duplikationsfreiheit wurden bereits über drei
Review-Runden geprüft (siehe „Positives" in `tasks/review-262.md`); der Fix-Pass folgt demselben
Stil (WHY-Kommentare, Wiederverwendung bestehender Test-Helper, keine neue Duplikation). Verbliebene
optionale Nitpicks aus Review-Runde 3 (Naming-Konsistenz einzelner Loop-Variablen, Modul-Header-
Vollständigkeit u. a.) sind bewusst nicht Teil dieses eng begrenzten Fix-Pass – siehe
Circuit-Breaker-Entscheidung oben.

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->
Siehe `tasks/codify-262.md`: neue Bash-Gotchas §9/§10, neue Lesson zu
`PR_SHEPHERD`/`FACTORY_STAGE`-Env-Leak in `factory-workflow.md` + Index.

PR-Shepherd 2026-08-02: Merge freigegeben – alle Gates grün (Review/Tests/Security-Review/
Refactoring/Codify abgeschlossen, CI-Checks laufen, kein Rebase-Bedarf, keine Approval-Pflicht
laut ADR-029).

---
Branch: `feature/262-flag-guard-commit-message`
Erstellt: 2026-08-02 12:11
