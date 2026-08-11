# Review: Task 284

Diff-Scope: `git diff origin/main...HEAD` (7 Dateien, +416/−13). Drei Runden: Backend/Logik
(Korrektheit der AKs, Guard-Verhalten), Code-Qualität (Testqualität, Kommentare), Architektur
(ADR-Treue, Doku-Konsistenz).

> **Hinweis zur Verifikation:** Der Lauf der Bash-Selbsttest-Suite war in dieser Session
> nicht möglich (Ausführung ist per Berechtigung gesperrt). AK4 „Suite grün" stützt sich
> deshalb auf die `/implement`-Notiz (933 grün); die Findings unten sind statisch am Diff und
> an den Dateizuständen belegt (Zeilennummern verifiziert am 2026-08-12).

## Kritische Findings (müssen behoben werden)

- [x] `scripts/checks/tests/run-tests.sh:493-494` – Die beiden neuen AK3-Assertions
      (`grep -q 'contents: write'` / `grep -q 'issues: write'`, dateiweit) werden von dem
      **im selben PR neu eingefügten Kommentar** `.github/workflows/factory-poll.yml:57`
      erfüllt: dort steht die Zeichenfolge „`contents: write` + `issues: write`" als Prosa.
      **Fehlerszenario:** Wer den echten `permissions:`-Block (`factory-poll.yml:33-35`)
      löscht oder auf `contents: read` abschwächt, bekommt eine **grüne** Suite – der Guard
      bewacht nach dem Kommentar-Nachzug nicht mehr, was AK3 zusichert („permissions
      unverändert"). Genau die Klasse „Kommando ≠ Prosa-Erwähnung" aus Lesson #114
      (fünf dokumentierte Rezidive). **Fix:** auf die YAML-Zeile ankern statt auf ein
      Fragment, z. B. `grep -qx '  contents: write' "$POLL_YML"` – oder den bereits in dieser
      Datei vorhandenen kommentar-strippenden Helfer (`poll_on_block`-Muster) auf den
      `permissions:`-Block anwenden. Mutationsbeleg mitliefern (Block entfernen → rot),
      analog zu den AK5-Belegen; Lesson #286.

## Wichtige Findings (sollten behoben werden)

- [x] `scripts/factory-poll.sh:4` – „Läuft in einem GitHub Actions **Scheduled Workflow**."
      Der wortgleiche Satz in `factory-poll.yml:3` wurde in diesem PR korrigiert, die Kopie im
      Skript-Header nicht. Das Skript ist die Gegenstelle des Workflows; ein Agent, der es als
      kanonische Quelle liest, erhält die vom PR gerade beseitigte Falschaussage. Lesson
      `code-style.md` („Fix für falschen WHY-Kommentar per Grep auf kopierte Geschwister-Stellen
      im selben PR ausweiten") und Lesson #176 („Doku im Präsens, die die geänderte Mechanik
      beschreibt, im selben PR nachziehen"). Ein Satz.

- [x] `docs/adr/012-github-platform-migration.md:34` – Die Migrations-Tabelle nennt als
      GitHub-Umsetzung des Async-Triggers „`.github/workflows/factory-poll.yml`
      (`schedule` + `concurrency`)". Nach diesem PR gibt es kein `schedule` mehr. Dass die
      Tabelle als **Aussage über den heutigen Stand** gelesen wird, belegt der bestehende
      Eintrag in `docs/factory/kleinfunde.md:92`, der genau die Nachbarzeile (`ADR-012:36`)
      als Beschreibung des aktuellen Zustands zitiert. Lesson #211: „PR ändert die von einer
      ADR namentlich beschriebene Mechanik → ADR-Beschreibung im selben PR mitpflegen
      (triggert auch ohne ADR-Datei-Änderung)". Ein Klammerzusatz mit Verweis auf die
      ADR-008-Update-Notiz genügt.

- [x] `.github/workflows/factory-poll.yml:57-58` – Falsche Kausalkette im neuen WHY-Kommentar:
      „die Env-Var unten bleibt leer, **solange der Trigger nicht scharf ist**". Die Env-Var
      ist leer, weil das Secret `ANTHROPIC_API_KEY` im Repo nicht existiert – mit dem
      Trigger-Zustand hat sie nichts zu tun. Die Checkliste in `OPERATING.md` §0.4 plant den
      Zustand „Secret gesetzt, Schedule noch nicht eingetragen" sogar ausdrücklich ein (Secret
      zuerst, Schedule zuletzt); ab dann ist der Satz schlicht falsch, und zwar in einem
      Kommentar, dessen Korrektur ein erklärtes Ziel dieses PRs war. **Fix:** die zwei Gründe
      trennen – „ANTHROPIC_API_KEY ist im Repo nicht gesetzt; bis das geschieht, läuft der Job
      ohne dieses Secret (#284/#290)".

## Nitpicks (optional)

- [x] `scripts/checks/tests/run-tests.sh:468-470` – `poll_on_block` verwirft den Inhalt der
      `on:`-Zeile selbst (`/^on:/{f=1; next}`). Ein Wiedereintrag in Flow-Notation
      (`on: {schedule: [{cron: "*/30 * * * *"}]}`) oder mit gequotetem Key (`"schedule":`)
      passiert den Guard grün, obwohl der Trigger aktiv ist. Der dokumentierte
      Reaktivierungsweg (§0.4: „Block unten unter `on:` wieder eintragen") ist Block-Notation,
      das Restrisiko also klein – erwähnenswert bleibt, dass der Guard eine Zeile des Blocks
      nicht sieht, den er laut Assertion-Text auswertet.

- [x] `scripts/checks/tests/run-tests.sh:488` – Die AK2-Assertion (`workflow_dispatch` vorhanden)
      hat keinen Mutationsbeleg, während AK5/AK6 beide Richtungen belegen. Ein dritter
      awk-Mutant (`workflow_dispatch` entfernen → rot) kostet drei Zeilen und schließt die
      Asymmetrie; F2 („kein leerer `on:`-Block") wäre damit ebenfalls belegt statt nur
      behauptet.

- [x] `docs/adr/008-async-trigger-mechanism.md:17-24` / `docs/factory/OPERATING.md:143-145` –
      Nicht erwähnte Nebenfolge: Der Stale-Reaper (`FACTORY_RUN_TIMEOUT`, setzt verwaiste
      `factory::running`-Labels zurück) lebt in `factory-poll.sh` und läuft damit ebenfalls nur
      noch bei manuellem Dispatch. Heute ohne Wirkung (nie ein `factory::run`-Issue), aber die
      Update-Notiz listet auf, was unverändert bleibt – dieser Punkt gehört inhaltlich dazu.

- [x] `docs/factory/OPERATING.md:138-140` – „Dieser Punkt kommt **zuletzt**" steht als
      vorletzter Listenpunkt; danach folgt noch der Label-Punkt. Inhaltlich kein Widerspruch
      (der Label-Punkt ist keine Setup-Handlung), als Leseführung aber irritierend.

## Positives

- **Guard-Konstruktion trägt ihre Begründung.** `poll_on_block`/`poll_trigger_guard` sind an der
  YAML-Struktur verankert (Kommentare werden **vor** der Suche gestrippt), scheitern
  fail-closed bei unlesbarer Datei und bei leerem `on:`-Block, und die beiden bewussten
  Bash-Entscheidungen (eine awk-Passage statt `sed | awk`; Here-String statt Pipe, damit
  `grep -q` + Negation unter `pipefail` nicht ausgerechnet im Fund-Fall grün wird) sind im
  Kommentar mit dem echten Grund dokumentiert. Das ist die richtige Lehre aus Lesson #114/#214.
- **Mutationsbelege in beide Richtungen** (echter Trigger → rot, Kommentar mit
  `schedule`/`cron` → grün) führen denselben Guard-Ausdruck inklusive Negation aus – erfüllt
  Lesson #286 –, und die Mutation wird per awk **in** den bestehenden `on:`-Block eingefügt
  statt per `printf >>` angehängt (kein Duplicate-Key-Dokument, Lesson #255).
- **Alter Guard nicht nur entfernt, sondern umgedreht.** Der Vorzustand („`schedule:` muss da
  sein") wird durch einen gleichwertig scharfen Gegenguard ersetzt – F4 („kein stiller
  Rückfall") ist damit technisch und nicht nur per Prosa abgesichert.
- **Doku-Nachzug ist breit und konsistent:** ADR-008 erhält eine datierte Update-Notiz ohne
  Status-Änderung (Option A bleibt die Entscheidung – korrekt, es ändert sich nur der
  Aktivierungszustand), OPERATING.md §0.4 bekommt die zwei Aktivierungsschritte inkl.
  Reihenfolge-Hinweis, §1.3 und CLAUDE.md verlieren die Behauptung eines laufenden Schedules.
  Der Anker `#04-async-trigger-scharfschalten-unbeaufsichtigte-pipeline-in-ci` passt zur
  Überschrift `OPERATING.md:126` (geprüft).
- **AK3 im Sinne der Reaktivierbarkeit erfüllt:** Der Diff berührt außerhalb des `on:`-Blocks
  ausschließlich Kommentare – Job, `env`, `permissions`, `concurrency` und beide Steps sind
  byte-identisch. `install-yq.sh`-Aufruf und YAML-Validität deckt weiterhin der
  #258-Job-Block-Guard (`run-tests.sh:4465-4471`, `:4487` mit `skip_yq`) ab, F3 ist damit
  erfüllt, ohne dass der neue Guard `yq` braucht.
- **AK10/AK11 gegen GitHub verifiziert:** Issue #290 existiert (offen, Labels `enhancement` +
  `security`, kein `factory::run`) und ist in OPERATING.md §0.4 sowie im Workflow-Header
  referenziert; PR #289 trägt `Closes #284` im Body.

## Out-of-Scope-Funde (nicht in diesem PR)

- **Unterhalb der Schwelle (ADR-043 → Sammeldatei):** Der bereits in Spec/Task notierte
  verwaiste Issue-Body-Entwurf `.issue-npm-pin.md` (getrackt, aus `baf55e4`/#258) ist als
  Eintrag in `docs/factory/kleinfunde.md` ergänzt („Verwaister Issue-Body-Entwurf
  `.issue-npm-pin.md` im Repo-Wurzelverzeichnis", Fix: `git rm`, eine Zeile). Kein Issue: kein
  Sicherheitsrisiko, kein funktionaler Defekt, unter zehn Zeilen.
- Kein weiterer Fund oberhalb der Schwelle – die vier Findings oben liegen alle **im** Scope
  (drei davon in Dateien, die dieser PR anfasst; ADR-012 ist der von Lesson #211 geforderte
  Nachzug derselben Mechanik).

## Rework (2026-08-12, `/implement`)

Alle acht Findings behoben; Bash-Selbsttest-Suite **939 grün / 0 rot** (Baseline vor dem Rework:
933/0, danach sechs neue Assertions).

- **Kritisch (AK3-Guard prosa-erfüllbar):** `poll_on_block` ist zu `poll_yaml_block <datei> <key>`
  verallgemeinert; neuer `poll_permission_guard` liest den `permissions:`-Block (Kommentare
  vorher gestrippt) und prüft die Zeile mit `grep -qxF --`. Belegt per drei Mutanten, in denen
  der prosa-nennende WHY-Kommentar stehen bleibt: Block gelöscht → rot (beide Zeilen),
  `contents: read` → rot, unlesbare Datei → rot. Der zuerst geschriebene Mutationsbeleg war
  gegen den **alten** dateiweiten `grep` rot – die Regression ist also empirisch, nicht behauptet.
- **`factory-poll.sh:4`:** Header nennt jetzt `workflow_dispatch` + Stilllegung; Grep auf kopierte
  Geschwister-Stellen der Falschaussage lief leer (nur dieses Vorkommen).
- **ADR-012:34:** Tabellenzelle trägt den Klammerzusatz „`schedule` seit #284 stillgelegt" mit
  Link auf die ADR-008-Update-Notiz.
- **`factory-poll.yml`-Kommentar:** Kausalketten getrennt – das Secret existiert im Repo nicht,
  unabhängig vom Trigger-Zustand (#284/#290).
- **Nitpicks:** Flow-Notation/gequoteter Key werden erfasst (Inline-Inhalt der `on:`-Zeile bleibt
  im Block, Suche auf Wortgrenze statt `schedule:`), Mutationsbeleg dafür ergänzt; `poll_dispatch_guard`
  mit Mutant belegt F2; Stale-Reaper-Nebenfolge steht in der ADR-008-Notiz; der „kommt zuletzt"-Punkt
  in OPERATING.md §0.4 ist an das Listenende gerückt.

## Empfehlung

NEEDS_REWORK (Rework oben erledigt – Wiedervorlage für `/review` Runde 2)

Ein kritisches Finding (die AK3-Assertion ist nach dem Kommentar-Nachzug prosa-erfüllbar und
kann ihre Regression nicht mehr erkennen) plus drei wichtige Doku-/Kommentar-Nachzüge. Alle
vier sind kleine, lokal begrenzte Änderungen; die Substanz des PRs – Stilllegung, Gegenguard,
Doku-Kette, Folge-Issue – ist tragfähig.
