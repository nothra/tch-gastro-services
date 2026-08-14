# Review: Task 236

> **Runde 2** (Backend/Logik · Code-Qualität · Architektur/Doku) gegen
> `git diff origin/main...HEAD`. Die acht wichtigen und die zwölf umgesetzten Nitpicks aus
> **Runde 1** sind stichprobenartig gegengeprüft und **substanziell** behoben (nicht nur
> abgehakt) – Details unter „Positives"; der Volltext von Runde 1 steht in der Git-History
> dieser Datei. Circuit Breaker: Iteration 2 von 3.
>
> Verifikationsbasis: `bash scripts/checks/tests/run-tests.sh` → **1014 grün / 0 rot**
> (eigenständig nachgefahren, exit 0), plus Gegenlesen des Alt-Stands über
> `git show origin/main:<datei>` und Nachzählen der Zeilenanker im HEAD-Stand.

## Kritische Findings (müssen behoben werden)

_Keine._ Der Produktionscode von `start-work.sh` ist funktional korrekt und unter
`set -euo pipefail` sauber abgesichert; kein Finding blockiert das Verhalten.

## Wichtige Findings (sollten behoben werden)

- [x] **`docs/factory/guidelines/git-workflow.md:315-317`, `docs/factory/lessons/factory-workflow.md:754`,
      `docs/specs/spec-236-…md:31` (+ AK1 `:57`, AK2 `:60`, AK5 `:71`) · Die Doku nennt als Quelle
      den „Haupt-Baum", der Code kopiert aus `$FACTORY_DIR` – Widerspruch innerhalb desselben PRs.**
      Das Rework hat die Erfolgsmeldung bewusst auf `.env.local kopiert (Quelle: ${FACTORY_DIR})`
      umgestellt und begründet das im Code-Kommentar `start-work.sh:234-236`: „nicht zwingend der
      Haupt-Baum". `start-work.sh:34` bestätigt es
      (`FACTORY_DIR="${FACTORY_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"`). Die drei
      Doku-Stellen – zwei davon **in diesem PR neu formuliert** – behaupten weiter das Gegenteil,
      AK1 sogar normativ im GIVEN. Fehlszenario (der von `CLAUDE.md`/`OPERATING.md` vorgeschriebene
      Normalfall „im Worktree arbeiten"): `start-work.sh` läuft aus Worktree A → `FACTORY_DIR` = A.
      Hat A keine `.env.local` (mit `FACTORY_WT_SKIP_ENV=1` angelegt oder vor diesem PR), wird
      **nichts** kopiert, obwohl der Haupt-Baum die Datei hat und die Doku sie verspricht → genau
      der `CredentialsSignin` aus #228, den die Task beseitigen soll. Umgekehrt propagiert eine in A
      lokal verbogene `.env.local` unbemerkt weiter. Kein Test diskriminiert das (alle Fixtures
      setzen `FACTORY_DIR="$REPO_SW"`, dort sind beide Bäume identisch). Lesson #253 + #211/#176.
      → Doku/Spec auf „der Baum, in dem `start-work.sh` liegt (`$FACTORY_DIR`) – üblicherweise,
      aber nicht zwingend der Haupt-Baum" ziehen (oder alternativ den Haupt-Baum wirklich
      auflösen; die Doku-Korrektur ist die kleinere, spec-konforme Variante).

- [x] **`scripts/checks/tests/run-tests.sh:2151-2153` + `2173-2175` · Der neue WHY-Kommentar
      behauptet eine empirische Tatsache, die für eine der beiden Stellen nachweislich falsch ist,
      und die zugehörige „Positiv-Kontrolle" arbeitet mit einem erfundenen Wortlaut.**
      Kommentar: „Der alte Wortlaut war **an beiden Stellen** über zwei Zeilen umbrochen".
      Gegen `origin/main` geprüft: die Lesson **war** umbrochen (`:2164` reproduziert sie
      wortgetreu, valide) – `PROJECT-CONTEXT.md:299` stand dagegen **einzeilig**
      (`… (aus #228, /implement-Selbstfund; Root-Cause-Fix ausgelagert: #236) …`). Die Fixture
      `:2173` erfindet den Umbruch **und** das Semikolon direkt hinter `#228`; dieser Text kam so
      nie in der Datei vor, die Assertion-Beschreibung „matcht den alten (umbrochenen) Wortlaut"
      ist unwahr. Damit ist der Runde-1-Nitpick nur im *Lesepfad* (jetzt `flat_286`) erledigt,
      nicht in der *Herkunft des Haystacks* – wäre der dort vorgeschlagene Weg
      (`git show origin/main:<datei>`) gegangen worden, wäre die Falschaussage sofort aufgefallen.
      Lessons #268/#264 („empirisch verifiziert" ohne Prüfung) und #284 (Positivkontrolle).
      → Kontrolle gegen `git show origin/main:<datei>` fahren (dann ist sie beweiskräftig) **oder**
      Kommentar + Assertion-Text auf „nur die Lesson war umbrochen" korrigieren und die
      PROJECT-CONTEXT-Kontrolle ehrlich als reinen Quoting-Beleg deklarieren.

- [x] **`scripts/checks/tests/run-tests.sh:2144` · Die AK9(d)-Header-Isolation ist fail-open.**
      `sw_header=$(awk '/^set -euo pipefail/{exit} {print}' "$SW")` liefert bei jeder Änderung des
      Sentinels (z. B. `set -Eeuo pipefail`) die **ganze Datei**. `FACTORY_WT_SKIP_ENV` steht dann
      als Produktionscode in `start-work.sh:225` – der Guard bleibt grün, obwohl der Kopf-Kommentar
      (`:25`), also der eigentliche Prüfgegenstand von AK9(d), gelöscht sein kann. Das ist das
      #255-Muster („`awk`-Block-Isolation muss zuverlässig abbrechen"), hier in Fail-open-Richtung –
      und der Nachbar-Guard `:2148` isoliert genau deshalb bewusst.
      → Extraktion belegen (`[ "$(printf '%s\n' "$sw_header" | wc -l)" -lt "$(wc -l < "$SW")" ]`)
      oder auf die Kommentarform ankern (`grep -q '^#   FACTORY_WT_SKIP_ENV=1'`).

- [x] **`tasks/task-236-env-local-in-worktree-kopieren.md:81, 83, 117` (+ `run-tests.sh:2016`) ·
      Vier veraltete Behauptungen in der Task-Datei – dieselbe Klasse, die Runde 1 unter `:55`
      bereits als WICHTIG gemeldet hat.**
      (a) `:117` (und der Test-Kommentar `run-tests.sh:2016`) ankern den Out-of-Scope-Fund auf
      `scripts/start-work.sh:206` – dort steht eine **leere Zeile**; der exakte String-Vergleich
      liegt auf `:208`, der Nachbar-Zweig auf `:210`. Auch gegen `origin/main` stimmt `:206` nicht;
      der Anker war nie korrekt. Da dieser Anker die **Nutzlast der Übergabe** ist (er wandert in
      `kleinfunde.md`), wäre der Fund dort später als abgedriftet verworfen worden – Lesson #291.
      (b) `:83` beschreibt die Rechte-Prüfung als „`ls -l | cut -c2-10`"; der Code nutzt seit dem
      Rework `ls_mode_matches` mit Präfix-Match (`run-tests.sh:67-72`), `cut -c2-10` existiert nicht
      mehr. (c) `:81` nennt „21 AK-/3 Fehlerfall-Assertions"; der `#236`-Block hat jetzt ~45.
      (d) `:75-76` trägt weiterhin die verengte Kausalkette „weil der **In-Place-Zweig** den
      Kopier-Block nicht durchläuft", die das Rework im Code-Kommentar (`start-work.sh:119-122`)
      bewusst verallgemeinert hat – die Rework-Notiz `:103-105` dokumentiert die Korrektur, hebt
      den Widerspruch oben aber nicht auf (Geschwister-Stellen-Muster, `lessons/code-style.md`).
      → Alle vier nachziehen. **(a) ist bereits in `docs/factory/kleinfunde.md` mit dem korrigierten
      Anker `:208` abgelegt** (siehe „Out-of-Scope-Findings"); die Task-Notiz muss nur noch auf die
      getroffene Klassifikation umgestellt werden statt „gehört in den nächsten `/review`-Lauf".

- [x] **`scripts/start-work.sh:238-240` · Ein fehlgeschlagenes `cp -p` kann eine unvollständige
      oder widersprüchlich gemeldete Zieldatei hinterlassen, die der AK3-Guard danach **dauerhaft**
      konserviert.** Zwei Varianten, die der getestete Fall („Quelle unlesbar" – dort scheitert `cp`
      beim `open()` der Quelle, das Ziel entsteht nie) nicht abdeckt: (a) Abbruch **nach** dem
      Anlegen des Ziels (ENOSPC, EIO auf der Quelle) → abgeschnittene `.env.local`; (b) Datenkopie
      vollständig, nur das `-p` (chmod/utimes) scheitert – typisch auf exFAT/SMB-Zielen: `cp` liefert
      exit ≠ 0, das Skript warnt „konnte nicht kopiert werden", obwohl die Datei da ist, und
      `ENV_COPIED` bleibt `false` (kein `db:seed`-Hinweis). In beiden Fällen greift bei **jedem**
      Folgelauf „existiert bereits – wird nicht überschrieben"; der kaputte Zustand ist permanent,
      Symptom wieder `CredentialsSignin`. Die Warnung nennt den Rest nicht.
      → Im `else`-Zweig den selbst erzeugten Rest gezielt entfernen (`rm -f "$WORKDIR/.env.local"` –
      sicher, weil der `-e`/`-L`-Guard eine vorbestehende Datei bereits ausgeschlossen hat) oder
      nach `…/.env.local.tmp$$` kopieren und atomar `mv`en. Eine Zeile plus Test.

## Nitpicks (optional)

- [ ] `run-tests.sh:50-58` · `flat_286`/`assert_contains_286` sind durch diesen PR von
      block-lokalen zu **globalen** Kopf-Helpern geworden, tragen aber weiter den issue-gebundenen
      Suffix; die Kommentarzeilen `:56-57` rechtfertigen den Namen, statt ihn zu korrigieren
      (clean-code.md: ein Name, den ein Kommentar erklären muss, ist der Rename-Smell). Sichtbar
      in `assert_contains_286 "$lesson_flat_236" …` (`:2157`) – zwei unzusammenhängende
      Issue-Nummern in einer Zeile. Risiko: der nächste Block legt `flat_301` daneben an.
      Gegen den Rename spricht der Scope (25 Aufrufstellen im #286-Block, CLAUDE.md-Regel 5) –
      deshalb Nitpick, nicht Rework-Pflicht.
- [x] `run-tests.sh:58` · Der dokumentierte Vertrag „zeilenumbruch-tolerant" gilt nur für
      **unindentierte** Umbrüche: `tr '\n' ' '` ersetzt den Umbruch, lässt die Einrückung der
      Folgezeile aber stehen → mehrere Leerzeichen, `grep -qF` mit einem Leerzeichen matcht nicht.
      Die 2-Space-Continuation ist genau der dominante Stil in `git-workflow.md` (die
      Env-Schalter-Liste, die dieser PR anfasst) und `PROJECT-CONTEXT.md`, und `$GITWF` wird bei
      `:5137` bereits über `flat_286` gelesen. Aktuell latent (alle Zielphrasen stehen einzeilig).
      → `tr '\n' ' ' < "$1" | tr -s ' '` oder den Kommentar einschränken.
- [x] `run-tests.sh:1999-2004` · Die AK5-Diskriminierung ist umask-abhängig: `cp` ohne `-p` legt
      das Ziel mit Quellmodus **& ~umask** an. Unter umask 002/000 liefert auch die `-p`-lose
      Variante 664 → der Test bliebe grün, obwohl `cp -p` entfernt wurde, und der Assertion-Text
      „wird nicht umask-reduziert" trifft nicht zu. Unter der real genutzten umask 022 (macOS,
      GitHub-Runner) diskriminiert er korrekt. → `umask 022` im Test setzen, eine 666er-Quelle
      wählen, oder auf die umask-unabhängige **mtime**-Erhaltung prüfen (`touch -t` + Vergleich).
- [x] `docs/factory/lessons/factory-workflow.md:737-744` · Der Rework hat die von Runde 1
      beanstandete Klausel „nach dem **manuellen** `.env.local`-Kopieren" ersatzlos gestrichen –
      sie war aber die kausale Brücke des Absatzes. Jetzt steht „`.env.local` … wurde damals dabei
      **nicht** mitkopiert" direkt neben „für die **aus der `.env.local` geladenen**
      `SEED_ADMIN_*`-Zugangsdaten". Keine Falschaussage, aber eine Lücke, die ein `/implement`-Agent
      beim ersten E2E-Lauf auflösen muss. → Brücke wiederherstellen statt streichen, z. B.
      „für die (damals von Hand nachkopierten, heute automatisch gespiegelten) …".
- [x] `docs/factory/lessons/factory-workflow.md:754` · Die Regel nennt nur noch **einen** Schritt
      (`db:seed`), verweist danach aber auf „**Der erste Schritt** – das Kopieren der `.env.local`".
      Ohne die frühere `(1)/(2)`-Liste hängt die Ordinalzahl in der Luft.
- [x] `docs/specs/spec-236-…md:19` · „… und **hält bis heute** die **manuelle** Regel fest, mit dem
      ausdrücklichen Vermerk ‚Root-Cause-Fix … ist als eigener Task ausgelagert: #236'". Nach diesem
      PR ist beides nicht mehr wahr. Kontext-Abschnitte dürfen den Vorzustand beschreiben, „bis
      heute" ist aber eine Gegenwartsaussage (Lesson #253/#176). → „hielt bis zu diesem PR".
      **Beim Umformulieren aufpassen:** nicht versehentlich `als eigener Task ausgelagert: [#236]`
      in die Lesson-Datei zurücktragen – `run-tests.sh:2162` prüft dessen Abwesenheit (Lesson #284).
- [x] `docs/specs/spec-236-…md:97, 113-115, 119` und `tasks/task-236-…md:52, 65-66, 68` · Stale
      Zeilenanker, durch diesen PR selbst verschoben: `start-work.sh:219` → `:249`, `:200-211` →
      `:208-218`, `:214-221` → `:244-251`, `run-tests.sh:1799+` → `:1823+` (#74) bzw. `:1947+`
      (#236). Geringe Priorität (Technische Hinweise sind „nicht normativ") – aber `:219` steht in
      einem abgehakten **Fehlerszenario**.
- [x] `scripts/start-work.sh:226-227` · „… so ist er auch sichtbar, wenn der Kopier-Schritt gar
      nicht greift" – die Zeile steht **innerhalb** von
      `if [ "${FACTORY_WT_SKIP_ENV:-0}" != "1" ] && [ -f … ]`. Von vier „greift nicht"-Pfaden ist
      sie in zweien sichtbar (Zieldatei vorhanden, `cp`-Fehler) und in zweien nicht (Opt-out
      gesetzt; **Quelle fehlt** – der Frisch-Clone-Fall, in dem der Nutzer weder Mechanismus noch
      Schalter je sieht). → auf „…wenn der Kopiervorgang selbst übersprungen wird (vorhandene
      Zieldatei / `cp`-Fehler)" präzisieren.
- [x] `run-tests.sh:2148` · AK9(c) greppt file-weit nach dem Einzelwort `FACTORY_WT_SKIP_ENV` –
      eine Erwähnung an beliebiger Stelle erfüllt den Guard, AK9(c) fordert aber die
      Env-Schalter-**Liste**. Asymmetrisch zum direkt darüberstehenden AK9(d), das bewusst
      isoliert. Zusätzlich wird der Literalpfad ausgeschrieben, obwohl `$GITWF` (`:1195`) bereits
      darauf zeigt.
- [x] `run-tests.sh:2039` und `2089` · Der Sentinel `$TMP_SW/existiert-nicht` wird von zwei
      unabhängigen Tests geteilt (Ziel-Symlink 787, Quell-Symlink 789). Regressiert der erste und
      `cp` legt genau diese Datei an, prüft der zweite in Wahrheit einen **intakten** Symlink. Er
      wird rot, aber mit irreführender Ursache. → zwei Pfade, oder `[ ! -e … ]` als fail-closed
      Vorbedingung.
- [ ] `run-tests.sh:1980-2098` · `$REPO_SW/.env.local` wird sieben Mal umgebaut (600 → 664 → 600 →
      Verzeichnis → Symlink → defekter Symlink → 000 → 600) mit manuellem `mv`-Save/Restore und
      ohne `trap`. Heute unkritisch (alles unter `mktemp -d`, kein `set -e`), aber ein Abbruch
      lässt die Quelle mit Modus 000 zurück und kippt alle Folge-Assertions ohne erkennbare
      Ursache. Ein Setter (`set_env_source none|file600|file664|dir|symlink|deadlink`) löste die
      Reihenfolge-Kopplung auf, ohne die von der Spec geforderte Fixture-Wiederverwendung
      (Repo/gh-Stub) anzutasten.
- [ ] `run-tests.sh:1899-1906` vs. `1957-1962` vs. `2120-2122` · Die Runde-1-Duplikation ist
      umbenannt, nicht aufgelöst: drei Kopien desselben Env-Prologs, zwei mit getauschter
      Argumentreihenfolge. Der AK8-Block ruft `run_start_work` nur deshalb nicht, weil Repo und
      Worktree-Basis dort hartcodiert sind – ein zweiter Parameter vereinte alle drei.
- [x] `run-tests.sh:1977, 2025, 2031, 2060, 2113, 2128, 2130, 2163, 2172` · 9× das kryptische
      `assert_true "$([ $? -ne 0 ]; echo $?)"`. Korrekt (`$?` wird beim Expandieren aus dem
      Elternkontext geerbt), aber schwer lesbar – und die Datei kennt daneben zwei weitere
      Negations-Idiome (`:5066`, `:5104`). Der PR erweitert den Helper-Kopf ohnehin; ein
      `assert_absent <haystack> <phrase> <desc>` kapselte die `$?`-Subtilität.
- [x] `run-tests.sh:2011` · `[ "$(cat "$WT_ENV")" = "LOKAL_ANGEPASST=1" ]` – die Command
      Substitution schluckt den Trailing-Newline, „unverändert" ist also nicht byte-genau belegt.
      `cmp -s` gegen eine Referenzdatei (wie AK1 in `:1985`) wäre exakt.
- [ ] `run-tests.sh:2136-2139` · Der Reihenfolge-Guard vergleicht **Textpositionen**, nicht
      Ausführungsreihenfolge: eine Auslagerung des Kopierens in eine oben definierte Funktion mit
      Aufruf **nach** dem Install bliebe grün. Für den heutigen Aufbau ausreichend und fail-closed.
- [x] `run-tests.sh:1958` · `env ${4:-}` unquoted: unter `set -u` korrekt und das Word-Splitting
      ist gewollt, der Wert durchläuft aber zusätzlich **Pathname-Expansion**. `env "${@:4}"` wäre
      robust. Dasselbe Muster steht schon in `run_create_label` (`:1901`) – konsistent, beides latent.

## Positives

- **Alle acht wichtigen Findings aus Runde 1 sind substanziell behoben, nicht kosmetisch
  abgehakt** – von allen drei Runden unabhängig bestätigt: `-L`-Ziel-Symlink-Zweig jetzt per
  echt diskriminierendem Verhaltenstest gedeckt (`:2036-2044`; ohne die `-L`-Alternative kippen
  beide Assertions), Existenz-Anker vor **jeder** Pfad-Abwesenheitsprüfung (`:1972`, `:2055`,
  `:2069`, `:2093`), „Lauf ist durchgelaufen"-Anker `Bereit!` in AK4/AK8, Abwesenheits-Anker um
  `#236` verankert (`:2162`), AK6-Begründung separat assertiert (`:1996`),
  `grep -qF 'pnpm db:seed'` statt `db:seed`, Lesson-Restdrift „manuelles Kopieren" entfernt.
- **Der AK3-Umbau ist die methodisch beste Änderung des Reworks:** statt sich an einen
  nachweislich fragilen Zweig-String zu nageln, prüft der Test das Spec-Szenario selbst
  (`wird wiederverwendet` + Abwesenheit von `Worktree + Branch angelegt`) und legt **zwei**
  Diskriminierungs-Assertions gegen den ersten Lauf daneben (`:2028-2031`). Die zugrundeliegende
  #74-Fragilität ist korrekt als Out-of-Scope-Fund erkannt und im Kommentar belegt statt behauptet.
- **`set -euo pipefail`: kein neuer Pfad kann wortlos enden.** `cp -p` steht in der
  `elif`-*Bedingung* (von `set -e` ausgenommen), alle Datei-Tests stehen in Bedingungen, keine
  Pipe im Block, `ENV_COPIED=false` vor der Modus-Verzweigung (`:123` vs. Nutzung `:395`).
  `git worktree add` steht bewusst *nicht* in einer Bedingung → nie Kopie in ein nicht
  existierendes Ziel.
- **Edge Cases sauber:** `$WORKDIR == $FACTORY_DIR` ist unschädlich (der `-e`-Guard greift, das
  selbstzerstörerische `cp x x` findet nie statt); Verzeichnis/FIFO/Socket/defekter Symlink fallen
  durch `-f`; ein nicht beschreibbares Ziel landet im getesteten `cp`-Fehlerpfad.
- **`cut -c2-10` ist restlos verschwunden**, ersetzt durch `ls_mode_matches` – benannt, portabel
  (BSD/GNU), fail-closed bei fehlender Datei, ACL-/xattr-tolerant über den Präfix-Match, korrekt
  gequotetes `case`-Pattern. Keine neuen Magic Numbers; `-rw-------`/`-rw-rw-r--` sind
  selbsterklärend.
- **Der Reihenfolge-Test (`:2136-2139`) ist lehrbuchmäßig:** Anker auf den *exakten* Aufrufzeilen
  statt Fragmenten, Positionsvergleich statt zweier isolierter Präsenz-Checks, fail-closed bei
  fehlendem Anker – adressiert das fünfte Rezidiv der „Reihenfolge-/Präsenz-Guards"-Lesson direkt.
- **Symlink-Semantik ist jetzt in beide Richtungen gepinnt** (Quelle-auf-Datei = gewollte
  Materialisierung, defekte Quelle = wie „Quelle fehlt"), Spec- und Task-Wortlaut entsprechend
  präzisiert.
- **Helper-Verschiebung ist eine echte Verschiebung:** `flat_286`/`assert_contains_286` sind im
  #286-Block gelöscht, der dortige Verweis (`:5089-5091`) wurde mitgezogen – keine
  Doppeldefinition, kein Verhaltenswechsel. Im gesamten `#236`-Block läuft kein Mehrwort-`grep -qF`
  gegen Markdown mehr an `flat_286` vorbei; die verbliebenen Roh-Greps (`:2145`, `:2148`) sind
  einwortig, die Output-Greps zielen auf `echo`-Zeilen.
- **Die Abwesenheits-Anker treffen den echten `origin/main`-Wortlaut** (gegengelesen): sowohl
  `als eigener Task ausgelagert: [#236]` (dort über zwei Zeilen – nur mit `flat_286` treffbar) als
  auch `Root-Cause-Fix ausgelagert: #236` waren im Alt-Text vorhanden. Die Guards wären scharf
  gewesen.
- **AK9-Repo-Sweep bestätigt** (`.env.local`, `236`, `FACTORY_WT_`, `FACTORY_NO_WORKTREE`,
  `worktree`): keine weitere echte Drift. `README.md`/`CONTRIBUTING.md`/`OPERATING.md` betreffen
  das Frisch-Clone-Setup (`cp .env.example .env.local`), `.claude/commands/implement.md:90` und
  `agents/coding-agent.md:42` nennen `.env.local` korrekt als Voraussetzung, ältere Task-Protokolle
  sind historisch, `docs/CHANGELOG.md` ist ein Release-Eintrag.
- **Keine ADR driftet** – kein ADR beschreibt den Worktree-/Env-Mechanismus; ADR-042 betrifft nur
  die geteilten `.git/hooks`. Die Einordnung „kein ADR-Trigger" ist tragfähig (lokale
  Tooling-Ergonomie, reversibel).
- **Routen-Doku nicht betroffen (#145) – belegt:** der Diff listet acht Dateien, keine unter
  `app/`; kein `page.tsx`, kein `route.ts`, kein `layout/template/loading/error`.
- **Schichtung gewahrt:** `start-work.sh` bleibt reine Arbeitsbaum-Vorbereitung
  (Worktree → Env-Datei → `pnpm install`), `db:seed` bleibt Hinweis ohne DB-Seiteneffekt. Die
  einzige Änderung außerhalb des `#236`-Blocks (Helper an den Dateikopf) war eine explizite
  Runde-1-Empfehlung.

## Out-of-Scope-Findings

- **`start-work.sh` erkennt einen wiederverwendeten Worktree nicht hinter einem Pfad-Symlink** –
  als Eintrag in [`docs/factory/kleinfunde.md`](../docs/factory/kleinfunde.md) abgelegt
  (kein Duplikat vorhanden; Anker auf `scripts/start-work.sh:208` korrigiert und am 2026-08-14
  verifiziert). Klassifikation nach der Schwellen-Tabelle in `git-workflow.md` → „Zentraler
  Anlage-Weg (ADR-018)": kein Merge-Blocker (vorbestehend aus #74, von diesem Diff nicht berührt),
  kein Sicherheitsrisiko (kein Auth-/Secret-/Zahlungs-Pfad), **kein funktionaler Defekt** – `:209`
  und `:211` sind beide reine `echo`-Zweige ohne Folgeaktion, der Ablauf fällt in beiden Fällen
  identisch weiter; der Schaden ist ausschließlich eine irreführende Meldung. Damit „alles andere"
  → Sammeldatei. Die Zweifelsregel „im Zweifel Issue" greift nicht, weil kein Verhalten, sondern
  nur eine Ausgabe betroffen ist. Kein Issue angelegt.

## Rework-Status (/implement, Runde 3, 2026-08-14)

Alle fünf wichtigen Findings behoben, dazu elf der fünfzehn Nitpicks. Offen geblieben – bewusst,
mit Begründung in den Rework-Notizen der Task-Datei:

- `run-tests.sh:50-58` (Rename `flat_286`/`assert_contains_286`): 25 Aufrufstellen im Fremdblock
  #286, reiner Namens-Smell ohne Verhaltensbezug → Scope (CLAUDE.md Regel 5), `/refactor`.
- `run-tests.sh:1980-2098` (`set_env_source`-Setter) und `run-tests.sh:1899-1906` vs. `1957-1962`
  vs. `2120-2122` (drei Env-Prologe): dieselbe Einordnung – Test-Hygiene, kein Verhalten.
- `run-tests.sh:2136-2139` (Reihenfolge-Guard vergleicht Textpositionen): vom Review selbst als
  „für den heutigen Aufbau ausreichend und fail-closed" bewertet → kein Handlungsbedarf.

Verifikation nach dem Rework: `bash scripts/checks/tests/run-tests.sh` → **1020 grün / 0 rot**.

## Empfehlung

NEEDS_REWORK (Runde 2) – Rework durchgeführt, Re-Review offen (Iteration 3 von 3).
