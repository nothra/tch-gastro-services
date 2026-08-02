# Review: Task 262

**Review-Runde 2** (Runde 1 wurde nachgearbeitet – Nachprüfung der Vorrunden-Findings unten).
Diff-Scope: `git diff origin/main...HEAD` (11 Dateien) – `scripts/checks/commit-msg-check.sh` (neu),
`scripts/install-hooks.sh` (neu), `scripts/factory-commit.sh`, `scripts/init-factory.sh`,
`scripts/checks/tests/run-tests.sh`, `CLAUDE.md`, `docs/factory/guidelines/git-workflow.md`,
ADR-042, Spec, Task-Datei.
Drei Runden: (1) Korrektheit/Edge Cases, (2) Clean Code & Testqualität, (3) Architektur/ADR/Doku.

**Nachprüfung Runde 1 – alle fünf W-Findings sind real behoben** (nicht nur in der Task-Notiz
abgehakt): `core.hooksPath` fail-closed (`install-hooks.sh:39-49` + Gegenprobe-Test),
Leer-Message-Test für `factory-commit.sh` (`run-tests.sh:1920-1932`), Doku in CLAUDE.md +
`git-workflow.md`, Fail-open-Ausnahme `[ -f "$CHECK" ] || exit 0` inkl. Diskriminierungs-Gegenprobe,
Issue **#264** existiert (offen, `enhancement`/`test`/`tech-debt`). Nitpicks bis auf den Datei-Modus
umgesetzt.

## Kritische Findings (müssen behoben werden)

_Keine._ Das gelieferte Verhalten der Guards ist korrekt: exakter Trim-Vergleich statt Regex
(keine BSD/GNU-Falle), kein zu breites Matching, `set -e`-Semantik an allen neuen Grenzen sauber
(`git config --get` steht in einer `if`-Bedingung → kein Abbruch, wenn `core.hooksPath` nicht
gesetzt ist), Guard-Reihenfolge in `factory-commit.sh` korrekt (`$1` wird unter `set -u` nie
unbound ausgewertet, Guard liegt vor jedem `git`-Aufruf). AK1–AK8 und beide Fehlerszenarien sind
implementiert und getestet.

## Wichtige Findings (sollten behoben werden)

- [ ] [docs/factory/guidelines/git-workflow.md:67] **Die neu eingeführte Hook-Tabelle beschreibt
      `pre-commit` faktisch falsch: „Lint/**Format** vor dem Commit".** `pre-commit.sh` prüft
      Merge-Konflikte, Debug-Statements, TODO-ohne-Ticket, Secrets und Lint (Checks 1–5,
      `scripts/checks/pre-commit.sh:22-64`) – **kein** Format. Der Prettier-Check ist Check 3 in
      `pre-push.sh:69` (eingeführt wegen #149, weil ihn weder pre-commit noch CI prüften).
      Ausgerechnet die Tabelle, die künftig als kanonische Gate-Übersicht gelesen wird, ist an der
      Stelle ungenau – Fehlertyp aus Lesson #160 („Doku über ‚die Gates' … jede Ebene gegen ihre
      Quelle prüfen"). → Zweckspalte an die Quellen angleichen.

- [ ] [scripts/init-factory.sh:82-85] **Der fail-closed-Abbruch des Installers wird an der
      Aufrufstelle zur Warnung degradiert – der Bootstrap meldet trotzdem Erfolg.** Nach
      `if ! bash …/install-hooks.sh; then echo ⚠ …; fi` läuft `init-factory.sh` weiter bis zum
      Banner „Factory erfolgreich initialisiert" (`:98-100`) und „Nächste Schritte", ohne den
      fehlgeschlagenen Schritt erneut zu nennen. In einem Neuprojekt mit gesetztem `core.hooksPath`
      (husky – genau der Fall, für den Runde-1-W1 den Fail-closed-Pfad eingebaut hat) endet der
      Bootstrap **ganz ohne Factory-Hooks, aber mit Erfolgsmeldung**. Das hebt den Anspruch aus
      `install-hooks.sh:16-17` („damit ein fehlgeschlagenes Retrofit nicht als ‚Hooks aktiv'
      durchgeht") an der einzigen Aufrufstelle wieder auf. → Hart abbrechen oder ein Merkflag
      setzen und im Abschlussblock wiederholen.

- [ ] [scripts/checks/tests/run-tests.sh:3622] **Der AK8-Grep trifft auch die Kommentar-Prosa und
      kann damit nicht aus dem beabsichtigten Grund rot werden.** `grep -qF 'scripts/install-hooks.sh'`
      matcht bereits den Kommentar in `init-factory.sh:79-81` („Kanonische Quelle … ist
      scripts/install-hooks.sh"). Würde der eigentliche Aufruf (`:82`) entfernt und der Kommentar
      stehen bleiben, bliebe die Assertion grün – und der Negativ-Grep auf `.git/hooks` (`:3628`)
      ebenfalls, weil dann gar keine Hook-Installation mehr existiert. AK8 hat bewusst **keinen**
      Verhaltenstest als zweites Netz, hängt also vollständig an diesem einen Grep.
      → Auf den spezifischen Aufruf pinnen (`bash "$FACTORY_DIR/scripts/install-hooks.sh"`).

- [ ] [scripts/checks/tests/run-tests.sh:3643] **Gleiche Klasse im Doku-Guard: `grep -qF 'commit-msg'`
      ist nicht diskriminierend**, weil der Suchstring ein Teilstring von `commit-msg-check.sh` ist –
      und das kommt in beiden Doku-Dateien ohnehin vor. Streicht jemand künftig die Nennung des
      **Hooks** und lässt nur den Verweis auf das Prüfskript stehen, bleibt die Assertion „nennt den
      commit-msg-Hook" grün. → Auf ein nur im Hook-Satz vorkommendes Token prüfen (z. B.
      `` `commit-msg`-Hook `` bzw. die Tabellenzeile).

- [ ] [docs/factory/OPERATING.md:426,429,452 / CONTRIBUTING.md:15-30,61-65] **Die Doku-Nachführung
      aus Runde 1 ist unvollständig – die beiden Dateien, die Mensch und Betrieb tatsächlich lesen,
      kennen den dritten Hook nicht.** `OPERATING.md` beschreibt die lokale Gate-Landschaft
      abschließend („pre-push-Hook blockiert hart", „`pre-commit.sh` und `pre-push.sh` laufen
      sowieso") ohne `commit-msg` und ohne den kanonischen Installationsweg – §5.4 „Invarianten
      laufend grün halten" wäre der natürliche Ort. `CONTRIBUTING.md` listet unter „Einstieg &
      lokales Setup" die Schritte für einen frischen Clone (`pnpm install`, `.env.local`, `db:up`)
      **ohne** Hook-Installation; wer der Anleitung folgt, hat anschließend keinen einzigen lokalen
      Hook und erfährt das nirgends. Der neue Doku-Guard (`run-tests.sh:3636-3645`) prüft nur
      `CLAUDE.md` und `git-workflow.md` – beide Dateien fallen durch den Rost. Genau das Muster aus
      Lesson #211/#176. → Je eine Zeile ergänzen und beide Dateien in die Doku-Guard-Schleife
      aufnehmen.

- [ ] [docs/adr/019-stage3-commit-seam-report-guard.md:46,175] **ADR-019 beschreibt die von diesem
      PR geänderte `factory-commit.sh`-Mechanik weiterhin im alten Stand.** Die ADR sagt wörtlich
      „Die Message ist **Pflicht-Argument**" (`:46`) und im Nachtrag „Die bestehenden Guards
      (main/master, **Argumentanzahl**, kein `--force`) … laufen unverändert davor" (`:175`). Nach
      diesem PR stimmt beides nicht mehr: ein Argument ist nicht mehr zwingend eine Message, und
      **vor** der Argumentanzahl-Prüfung liegt jetzt ein Guard, der mit **exit 0** zurückkehrt, ohne
      zu committen (`factory-commit.sh:31-48`). ADR-042 referenziert ADR-019 an keiner Stelle. Das
      Repo hat für den Fall ein etabliertes Muster – ADR-019 trägt bereits zwei „Nachtrag"-Abschnitte
      (#239, #252). Lesson #211 (PR ändert die von einer ADR beschriebene Mechanik → im selben PR
      mitpflegen). → Kurzer „Nachtrag (#262)" in ADR-019 §1.

- [ ] [scripts/checks/commit-msg-check.sh:34-42] **Der Guard greift auf dem Editor-Pfad nicht – und
      Task/ADR behaupten mehr, als er leistet.** Git entfernt die `#`-Kommentarzeilen erst **nach**
      dem `commit-msg`-Hook (`--cleanup`), der Trim in `:39-40` entfernt nur umgebenden Whitespace.
      Bei jedem editor-basierten Commit (`git commit` ohne `-m`, `-e`, `--amend` mit Editor, Merge,
      `-t <template>`) enthält `COMMIT_EDITMSG` also `--help\n\n# Bitte gib eine Commit-Message …` –
      getrimmt ≠ `--help` → **exit 0, der Commit entsteht**. Die Task-Beschreibung sagt aber „greift
      unabhängig vom Aufrufpfad", und der Skript-Header sagt „Wird ausgeführt: git commit". Die Spec
      fordert wortlautgemäß nur den `-m`-Pfad (AK2), und kein Test deckt den Kommentar-Anhang ab
      (`run-tests.sh:3415-3444`, `3566-3591` fahren ausschließlich `git commit -m`).
      → Entweder Kommentarzeilen vor dem Trim verwerfen (unter Beachtung von `core.commentChar`)
      oder die Limitierung in Skript-Header + Task/ADR explizit festhalten – jeweils mit Test.
      Der WHY-Kommentar in `:36-38` nennt nur den angehängten `\n` und suggeriert Vollständigkeit.

- [ ] [tasks/task-262-…md:76-77 / docs/adr/042-…:139-141] **Der manuelle Retrofit-Schritt war nur in
      der Task-Datei getrackt** – einer Datei, die nach dem Merge nicht mehr gelesen wird. Solange
      niemand `bash scripts/install-hooks.sh` ausführt, ist das Gate in diesem Repo genau so inert
      wie vor dem PR, während CLAUDE.md und `git-workflow.md` es bereits als aktiv beschreiben.
      → Im Review-Lauf autonom angelegt: **[#265](https://github.com/nothra/tch-gastro-services/issues/265)**
      (`enhancement` + `tech-debt`), inkl. Vorschlag, den `pre-push`-Check die Hook-Präsenz
      fail-closed verifizieren zu lassen. In ADR-042 §Consequences referenzieren.

## Nitpicks (optional)

- [ ] [scripts/checks/tests/run-tests.sh:7-10] Der Modul-Header „Deckt ab:" listet weiterhin nur
      `branch-name-check.sh` und `check.sh`; dieser PR ergänzt mit `commit-msg-check.sh` und
      `install-hooks.sh` zwei neue Prüfobjekte (~308 Zeilen). Drift ist vorbestehend (auch der
      `factory-commit`-Block fehlt), der PR ist aber der von Lesson „Zähl-/Aufzählungs-nennender
      Modul-Header" beschriebene Auslöser. Analog `git-workflow.md:63` („Installiert werden **drei**
      Hooks") – zählungsfrei formulieren.
- [ ] [docs/adr/042-…:73-79] Die Rationale „zwei Literale in zwei Skripten wären Over-Engineering"
      ignoriert das offene Issue **#131** („start-work.sh: `--help`/`-h` behandeln") – damit wären es
      absehbar drei Stellen. Ein Satz („bei einer dritten Stelle – #131 – neu bewerten") hält die
      Entscheidung nachvollziehbar und macht das Muster für den #131-Implementierer auffindbar.
- [ ] [scripts/checks/tests/run-tests.sh:3601-3602] `grep -qF 'No such file or directory'` als
      Abwesenheits-Check ist locale-abhängig (unter `LC_ALL=de_DE.UTF-8` „Datei oder Verzeichnis
      nicht gefunden") und gegenüber der Zeile darüber (`assert_exit 0`) fast tautologisch.
      → `LC_ALL=C` erzwingen oder streichen.
- [ ] [scripts/checks/commit-msg-check.sh:26,31 vs. :46] Die bewusste Trennung „Infrastruktur-Fehler
      = exit 2" vs. „fachliche Ablehnung = exit 1" ist weder im Header als Kontrakt benannt noch
      getestet (alle Tests prüfen nur ≠ 0). Ein Vertauschen bliebe unbemerkt.
- [ ] [scripts/checks/tests/run-tests.sh:3555-3564] `cm_e2e_repo` verwirft Exit-Code und Ausgabe von
      `install-hooks.sh`. Schlüge die Installation im Wegwerf-Repo fehl, bliebe der AK1-Fall
      („reguläre Message wird committet", `:3566-3571`) grün – aus dem falschen Grund. Ein
      `[ -x "$wt/.git/hooks/commit-msg" ]` im Helper wäre eine Zeile.
- [ ] [scripts/checks/tests/run-tests.sh:1888-1943] Der `factory-commit`-Block trägt in keiner
      Beschriftung ein AK-Label, während der zweite Block konsequent AK1/AK2/AK3/AK7/AK8 beschriftet
      (Datei-Konvention kennt AK-Labels). AK4 und AK6 sind in der Testausgabe damit nicht zur Spec
      rückverfolgbar.
- [ ] [scripts/checks/tests/run-tests.sh:1894, 3423, 3573] Drei Namen für dasselbe Konzept in einem
      PR (`help_flag`, `cm_case`, `flag_case`); `fc_repo "help${help_flag//-/}"` erzeugt außerdem die
      kryptischen Fixture-Namen `helph`/`helphelp`, während die Nachbarn sprechende Literale nutzen
      (`happy`, `helpextra`, `emptymsg`, `dashx`). Analog: `TMP_CM` beherbergt auch die
      `install-hooks`- und E2E-Repos; `GIT_WORKFLOW` (`:3637`) dupliziert das bestehende `GITWF`
      (`:1010`).
- [ ] [scripts/install-hooks.sh:82-84] Der `commit-msg`-Rumpf ist ein 3-zeiliges Shell-Skript in
      einem einfach gequoteten Argument – anders als die beiden Einzeiler darüber weder shellcheck-bar
      noch gut erweiterbar. Ein Heredoc in eine Variable würde Code und die sechs Kommentarzeilen
      (`:76-81`) trennen.
- [ ] [scripts/install-hooks.sh:21] `REPO_DIR="$(cd "$(dirname …)/.." && pwd)"` weicht vom
      `${FACTORY_DIR:-…}`-Muster der Nachbarskripte ab (u. a. `start-work.sh:33`,
      `routes-doc-check.sh:15`). Für einen Hook-Installer ist die nicht überschreibbare Variante
      vermutlich die bessere Wahl (kein versehentliches Schreiben in ein fremdes `.git`) – dann
      gehört genau das als Ein-Zeilen-Kommentar dorthin.
- [ ] [scripts/install-hooks.sh:43-48] `git config --get core.hooksPath` liest alle Scopes; ein
      global gesetzter Wert blockiert die Installation in **jedem** Repo, und der Hinweis
      `git config --unset core.hooksPath` trifft dann den falschen Scope. `--show-origin` bzw. eine
      Scope-Nennung wäre präziser.
- [ ] [.claude/commands/setup-project.md:36,108-109] Der Adoptions-Pfad für bestehende Projekte
      nennt weiterhin nur zwei Check-Skripte – dort erfährt niemand vom `commit-msg`-Gate bzw. von
      `install-hooks.sh`.
- [ ] [scripts/factory-commit.sh:45-48] `-h`/`--help` beendet den Seam mit exit 0 und ohne Signal auf
      stderr. Ist spec-konform (AK4), aber ein automatisierter Aufrufer kann „Hilfe ausgegeben,
      nichts committet" nicht von „committet und gepusht" unterscheiden (der Leer-Fall liefert exit 2).
      Eine stderr-Zeile wäre spec-konform und machte den stillen Erfolg im Log sichtbar.
- [ ] [scripts/install-hooks.sh, scripts/checks/commit-msg-check.sh] Datei-Modus weiterhin `100644`
      statt `100755` wie die direkten Nachbarn – in `task-262:130-135` als in dieser Session nicht
      freigegeben dokumentiert (Permission-Classifier), funktional irrelevant (Aufruf immer über
      `bash …`). Bleibt als bekannte Inkonsistenz stehen.

## Positives

- **Alle fünf Findings der Vorrunde sind real behoben, nicht nur abgehakt** – jeweils mit Test und,
  wo sinnvoll, mit Diskriminierungs-Gegenprobe (identischer Hook-Stand warnt nicht; Prüfskript wieder
  vorhanden → `--help` wird weiterhin abgelehnt; `core.hooksPath` ungesetzt → Installation läuft).
- **Trim-Logik ist glob- und locale-sicher gebaut:** `${MESSAGE#"${MESSAGE%%[![:space:]]*}"}` mit
  quotiertem inneren Ausdruck – Sonderzeichen (`*`, `[`, `?`) können das Pattern nicht kapern, der
  Nur-Whitespace-Fall degradiert korrekt zu `""`. Exakter Vergleich statt Regex vermeidet die
  BSD/GNU-Falle (`clean-code.md` → „Portabilität in Gate-Skripten").
- **Single-Source-Anspruch hält der Prüfung stand:** repo-weiter Grep nach `.git/hooks`/`hooksPath`/
  `install-hooks` zeigt genau eine schreibende Stelle. `init-factory.sh` delegiert vollständig, der
  Abwesenheits-Test ist mit Lesbarkeits-Vorbedingung fail-closed abgesichert, und die
  Claude-Code-Hooks aus `.claude/settings.json` bleiben als getrennte Ebene unvermischt.
- **`set -e`-Semantik durchweg korrekt** (Zuweisungen in `if`-Bedingungen), relative vs. absolute
  `--git-common-dir`-Pfade explizit behandelt und der Worktree-Fall verifiziert statt behauptet.
- **E2E statt Wiring-Grep:** der `commit-msg`-Pfad läuft über echte `git commit`-Aufrufe im
  Wegwerf-Repo, mit pfadspezifischem Ablehnungssignal und begründeter `pre-commit`-Neutralisierung
  (Lesson #214), Idempotenz per Inhaltsvergleich vorher/nachher belegt.
- **Keine Duplikations-Rückfälle:** Helper werden wiederverwendet statt kopiert (`cm_e2e_repo` baut
  auf `ih_repo`, `fc_repo` unverändert genutzt), Tabellen statt Copy-Paste-Blöcken im Format der
  Nachbarn, und AK5 verzichtet begründet auf eine zweite Happy-Path-Schleife (Lesson #240/#251).
- **Aufräumen sauber:** alle Fixtures unter `mktemp -d`, `rm -rf` am Blockende, die `chmod 000`-Datei
  wird vor dem Löschen zurückgesetzt – kein Rückstand im Repo.
- **CI ist ohne Workflow-Änderung verdrahtet:** `factory-ci.yml:95` ruft `run-tests.sh` im Job
  `factory-self-test`, der ohne Path-Filter auf jedem `pull_request` läuft.
- **Keine Routen-Berührung** – der Diff enthält keine Datei unter `app/`, `docs/routes.md` und das
  #145-Drift-Gate sind korrekt nicht betroffen.
- **ADR-042 beschreibt exakt den gelieferten Code** (zeilenweise gegengelesen), hat Status
  `Accepted`, drei echte Alternativen mit Trade-offs und benennt die Negativfolge (manueller
  Retrofit) offen.

## Empfehlung

NEEDS_REWORK

Kein kritischer Defekt – das Verhalten der Guards stimmt, und die Nacharbeit aus Runde 1 ist
vollständig und belegt. Die verbleibenden Punkte sind zwei Sorten: **Doku-/ADR-Kohärenz**
(faktisch falsche Zweckbeschreibung in der neuen Hook-Tabelle, ADR-019-Nachtrag, `OPERATING.md` +
`CONTRIBUTING.md`) und **Test-Präzision** (zwei Greps, die aus dem falschen Grund grün bleiben
können, dazu die Editor-Pfad-Lücke des Hooks: fixen oder ehrlich dokumentieren). Dazu der
Fail-closed-Bruch an der `init-factory.sh`-Aufrufstelle. Alles sind Ein- bis Zeilenblock-Änderungen.

> **Circuit Breaker:** Das war Review-Runde 2 von maximal 3. Führt eine dritte Runde erneut zu
> NEEDS_REWORK, ist an den Menschen zu eskalieren statt weiter zu iterieren.
