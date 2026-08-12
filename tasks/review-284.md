# Review: Task 284

**Runde 2 (2026-08-12)** – Wiedervorlage nach dem Rework aus Runde 1. Diff-Scope:
`git diff origin/main...HEAD` (11 Dateien, +681/−15). Drei Runden: Backend/Logik (AK-Abdeckung,
Guard-Verhalten), Code-Qualität (Testqualität, Kommentare, Namen), Architektur (ADR-Treue,
Doku-Konsistenz, Reaktivierbarkeit).

> **Hinweis zur Verifikation:** Das Ausführen von Shell-Skripten ist in dieser Session per
> Berechtigung gesperrt – die Bash-Selbsttest-Suite konnte auch in Runde 2 nicht laufen. AK4
> („Suite grün") stützt sich auf die `/implement`-Notiz (939 grün / 0 rot, Baseline 933) samt
> dem dort dokumentierten RED-vor-GREEN-Beleg. Alle Findings unten sind statisch am Diff und am
> Dateizustand belegt; Zeilennummern verifiziert am 2026-08-12. Gegen GitHub verifiziert:
> PR #289 (`Closes #284` im Body), Issue #290 (offen, Labels `enhancement`,`security`, kein
> `factory::run`), `.issue-npm-pin.md` getrackt und aus `baf55e4`.

## Kritische Findings (müssen behoben werden)

_Keine._ Das kritische Finding aus Runde 1 (AK3-Assertion war nach dem Kommentar-Nachzug durch
Prosa erfüllbar) ist substanziell behoben: `poll_permission_guard` liest den `permissions:`-Block
über den kommentar-strippenden `poll_yaml_block` und vergleicht mit `grep -qxF --` auf die
ganze Zeile. Drei Mutanten, in denen der prosa-nennende WHY-Kommentar stehen bleibt, belegen die
Trennschärfe (Block gelöscht → rot für beide Zeilen, `contents: read` → rot, unlesbar → rot).
Nachgeprüft: Kein Kommentar in `factory-poll.yml` enthält die Zeichenfolge `  contents: write`
zeilengleich, der Guard ist also nicht mehr prosa-erfüllbar.

## Wichtige Findings (sollten behoben werden)

_Keine._ Die drei wichtigen Findings aus Runde 1 sind erledigt und nachgeprüft:
`scripts/factory-poll.sh:4-6` nennt jetzt `workflow_dispatch` + Stilllegung (repo-weiter Grep auf
„Scheduled Workflow/Pipeline" zeigt nur noch ADR-008/012-Historie, s. Nitpick 4),
`docs/adr/012:34` trägt den Klammerzusatz mit funktionierendem Anker (`#status` passt zu
`## Status` in ADR-008), und der WHY-Kommentar `factory-poll.yml:57-59` trennt die zwei Gründe
(Secret fehlt im Repo ≠ Trigger-Zustand) statt eine falsche Kausalkette zu behaupten.

Funktional gegengeprüft, kein Finding: Weder `scripts/factory-poll.sh` noch ein anderer Workflow
verzweigt auf `github.event_name`/`GITHUB_EVENT_NAME` – der Wegfall des `schedule`-Events kann
den Poll-Pfad nicht stillegen (F2). `bash scripts/install-yq.sh` und die YAML-Validität von
`factory-poll.yml` deckt weiterhin der #258-Block (`run-tests.sh:4524-4529` Job-Schleife mit
`factory-poll|$POLL_YML`, `:4545` YAML-Parse hinter `HAS_YQ`) – F3 ohne neuen `yq`-Bedarf erfüllt.

## Nitpicks (optional)

- [ ] `scripts/checks/tests/run-tests.sh:452-453` – Die zwei AK3-Bausteine `factory-poll:` und
      `group: factory-runtime` bleiben **dateiweite Fragment-Greps**, während `permissions` in
      Runde 1 auf den Block umgestellt wurde. Heute kein Defekt (kein Kommentar in
      `factory-poll.yml` enthält diese Zeichenfolgen – geprüft), aber die Konstellation, die in
      Runde 1 kritisch wurde, entstand genau so: durch einen Kommentar-Nachzug im selben PR. Da
      `poll_yaml_block` jetzt existiert, kostet das Angleichen eine Zeile
      (`poll_yaml_block "$POLL_YML" concurrency | grep -qxF -- '  group: factory-runtime'`).
      Lesson #114, sechstes Rezidiv wäre vermeidbar.
- [ ] `scripts/checks/tests/run-tests.sh:535,547,556,562,564,569` – Die Mutationsbelege der Form
      `! poll_*_guard "$TMP_POLL_GUARD/<mutant>.yml"` teilen ihren Fail-Pfad mit AK6: „Datei nicht
      lesbar" liefert dasselbe non-zero wie „Mutation erkannt". Bliebe die Mutanten-Datei aus
      (`mktemp -d` fehlgeschlagen, Redirect nach `/` als Nicht-Root), wären sie grün, ohne etwas
      geprüft zu haben – Lesson #214 („Negativ-Test auf den Ziel-Pfad isolieren, nur er darf
      greifen"). Abgefedert ist das heute nur indirekt: der eine positiv erwartete Mutant
      (`nur-kommentar.yml`, `:540`) würde in diesem Szenario rot und die Suite damit insgesamt
      auch. Sauber wäre je Mutant eine positive Kontrolle, die Existenz und Parsbarkeit belegt –
      je eine Zeile, z. B. `poll_dispatch_guard "$TMP_POLL_GUARD/mit-schedule.yml"` grün oder
      `poll_permission_guard "$TMP_POLL_GUARD/contents-read.yml" 'issues: write'` grün.
- [ ] `scripts/checks/tests/run-tests.sh:506-510` – `poll_permission_guard` hängt die Einrückung
      selbst an (`grep -qxF -- "  $2"`), der Aufrufer übergibt `'contents: write'`. Die
      Zwei-Spaces-Konvention steckt damit unsichtbar in der Funktion: wer intuitiv
      `'  contents: write'` übergibt, bekommt ein falsches Rot, und der Signaturkommentar („0, wenn
      die Zeile wörtlich im `permissions:`-Block steht") beschreibt nicht ganz, was passiert.
      Entweder die volle Zeile als Parameter nehmen oder den Zusatz im Kommentar benennen.
      Nebenbei: `poll_trigger_guard` hat einen `[ -n "$on_block" ]`-Guard, die zwei
      Geschwister-Funktionen nicht – verhaltensgleich (`grep` auf Leerstring scheitert), aber der
      Leser muss sich das erst herleiten.
- [ ] `docs/adr/008-async-trigger-mechanism.md:9-14` – Die Update-Notiz vom 2026-07-08 sagt im
      Präsens weiter „die Umsetzung nutzt jetzt einen GitHub Actions **Scheduled Workflow**".
      Korrigiert wird das erst von der neuen Notiz direkt darunter. Chronologisch gestapelte,
      datierte Notizen sind vertretbar (die ADR erklärt Text weiter unten ausdrücklich als
      historisch), ein „(überholt, s. Update 2026-08-12)" spart dem Leser den Widerspruch.
- [ ] `docs/factory/kleinfunde.md:94-95` – Der Fix-Hinweis sagt „Vorher kurz gegenprüfen, dass
      nichts auf sie verweist (`grep -rn 'issue-npm-pin'`) – heute keine Referenz." Genau dieser
      PR erzeugt fünf Nennungen der Datei (Spec, Task, dieser Bericht, der kleinfunde-Eintrag
      selbst). Wer dem Hinweis folgt, sieht Treffer und stutzt – „keine Referenz **aus Code oder
      Workflow**" wäre präzise.
- [ ] `.github/workflows/factory-poll.yml:19-20` – Die Einrichtungs-Checkliste im Header führt
      „`schedule`-Trigger wieder eintragen" als 3. von 5 Punkten. `OPERATING.md` §0.4 betont für
      denselben Schritt „Dieser Punkt kommt **zuletzt**: er schaltet die Automatik scharf". Die
      Reihenfolge-Aussage steht nur an einer der beiden Stellen; ein „(zuletzt)" im Header hält
      die zwei Checklisten deckungsgleich.

## Positives

- **Der kritische Fix ist empirisch belegt, nicht behauptet.** Die Task-Notiz dokumentiert, dass
  der AK3-Mutant zuerst gegen den **alten** dateiweiten `grep` lief (933 grün / **1 rot**) und
  erst danach der Guard-Umbau folgte (939/0). Das ist RED-vor-GREEN auf einen Testfehler
  angewandt – genau die Beweisführung, die Lesson #286 verlangt.
- **Der Block-Extraktor wurde verallgemeinert statt kopiert.** `poll_on_block` → `poll_yaml_block
  <datei> <key>` bedient jetzt `on:` und `permissions:`; kein zweiter awk-Ausdruck daneben
  (Lesson #240-Klasse vermieden). Dass dabei der Inline-Inhalt der Key-Zeile erhalten bleibt,
  schließt zugleich die Flow-Notations-Lücke aus Runde 1 – ein Fix, zwei Findings.
- **Die Trigger-Suche ist auf Wortgrenze statt auf `schedule:` umgestellt** und deckt damit
  Block-Notation, Flow-Notation und gequotete Keys ab, ohne `schedule_override` o. ä. zu treffen
  (Unterstrich ist aus der Randklasse ausgenommen). Der Mutationsbeleg für die Flow-Notation ist
  mitgeliefert – der Guard bewacht nicht mehr nur die Schreibweise, die er erwartet.
- **Fail-closed durchgezogen und in beide Richtungen belegt.** Unlesbare Datei → rot (Trigger-
  *und* Permissions-Guard), leerer `on:`-Block → rot, entferntes `workflow_dispatch` → rot (F2 ist
  damit belegt statt behauptet). Nachgeprüft: Ein Umbenennen des `on:`-Keys (z. B. auf `"on":`)
  läuft nicht in ein stilles Grün, sondern macht AK1 rot – die Guards sind hier nicht umgehbar.
- **Die zwei Bash-Entscheidungen tragen ihren echten Grund im Kommentar** (eine awk-Passage statt
  `sed | awk`; Here-String statt Pipe, damit `grep -q` + Negation unter `pipefail` nicht
  ausgerechnet im Fund-Fall grün wird). Ebenso korrekt: `local on_block` steht getrennt von der
  Zuweisung, sonst hätte `local` den Exit-Code der Kommandosubstitution verschluckt.
- **Doku-Kette ist vollständig und konsistent.** ADR-008 datierte Update-Notiz ohne
  Status-Änderung (Option A bleibt Entscheidung – richtig, es ändert sich nur der
  Aktivierungszustand) inkl. der Stale-Reaper-Nebenfolge, ADR-012-Tabelle nachgezogen (Lesson
  #211), OPERATING §0.4 mit beiden Aktivierungsschritten und „zuletzt"-Punkt jetzt am Listenende,
  §1.3 + CLAUDE.md ohne Schedule-Behauptung, `factory-poll.sh`-Header nachgezogen. Beide
  Markdown-Anker (`#04-async-trigger-…`, `#status`) gegen die Zielüberschriften geprüft.
- **Scope-Disziplin:** Kein Pin, kein Installations-Seam, keine Poll-Logik angefasst – M2 lebt
  vollständig in #290 und ist an drei Stellen als Vorbedingung verankert (Workflow-Header,
  OPERATING §0.4, ADR-008-Notiz). `docs/routes.md` ist korrekt nicht betroffen (keine Route, keine
  UI).

## Out-of-Scope-Funde (nicht in diesem PR)

- **Unterhalb der Schwelle (ADR-043 → Sammeldatei):** `.issue-npm-pin.md` (getrackter, verwaister
  Issue-Body-Entwurf aus `baf55e4`/#258) ist im Rework als Eintrag in
  `docs/factory/kleinfunde.md:85-96` erfasst – Fix `git rm`, eine Zeile. Kein Issue: kein
  Sicherheitsrisiko, kein funktionaler Defekt. Verifiziert: Datei ist in `git ls-files`, 42
  Zeilen, keine Referenz aus Code oder Workflow.
- Kein weiterer Fund oberhalb der Schwelle. Die sechs Nitpicks oben liegen alle **im** Scope
  (Dateien, die dieser PR anfasst).

## Historie: Runde 1 (2026-08-12) – NEEDS_REWORK

1 kritisch, 3 wichtig, 5 Nitpicks – alle behoben; Belege in den Abschnitten oben.

### Kritisch (behoben)

- [x] `run-tests.sh:493-494` – Die neuen AK3-Assertions (`grep -q 'contents: write'` /
      `grep -q 'issues: write'`, dateiweit) wurden vom **im selben PR eingefügten** Kommentar
      `factory-poll.yml:57` erfüllt: dort stand „`contents: write` + `issues: write`" als Prosa.
      Wer den echten `permissions:`-Block gelöscht oder auf `contents: read` abgeschwächt hätte,
      hätte eine **grüne** Suite bekommen – der Guard bewachte nicht mehr, was AK3 zusichert.
      Lesson #114 („Kommando ≠ Prosa-Erwähnung"), ausgelöst durch den eigenen Doku-Nachzug.
      → Fix: `poll_permission_guard` auf dem gestrippten Block + drei Mutationsbelege.

### Wichtig (behoben)

- [x] `scripts/factory-poll.sh:4` – „Läuft in einem GitHub Actions **Scheduled Workflow**": der
      wortgleiche Satz in `factory-poll.yml:3` war korrigiert, die Kopie im Skript-Header nicht.
      Lesson `code-style.md` (Fix auf kopierte Geschwister-Stellen ausweiten) + Lesson #176.
- [x] `docs/adr/012-github-platform-migration.md:34` – Migrations-Tabelle nannte
      „`factory-poll.yml` (`schedule` + `concurrency`)" als heutigen Stand. Lesson #211: ADR-
      Beschreibung derselben Mechanik im selben PR mitpflegen.
- [x] `.github/workflows/factory-poll.yml:57-58` – Falsche Kausalkette im neuen WHY-Kommentar
      („Env-Var bleibt leer, solange der Trigger nicht scharf ist"). Sie ist leer, weil das Secret
      fehlt; §0.4 plant „Secret gesetzt, Schedule noch nicht" ausdrücklich ein.

### Nitpicks (behoben)

- [x] `run-tests.sh:468-470` – `poll_on_block` verwarf die `on:`-Zeile selbst → Flow-Notation und
      gequoteter Key passierten grün.
- [x] `run-tests.sh:488` – AK2 ohne Mutationsbeleg, während AK5/AK6 beide Richtungen belegten;
      F2 war nur behauptet.
- [x] `docs/adr/008:17-24` / `OPERATING.md:143-145` – Stale-Reaper-Nebenfolge (läuft ebenfalls nur
      noch bei manuellem Dispatch) nicht erwähnt.
- [x] `OPERATING.md:138-140` – „Dieser Punkt kommt **zuletzt**" stand als vorletzter Listenpunkt.
- [x] `.issue-npm-pin.md` – als Kleinfund nach ADR-043 abgelegt statt als Issue.

## Empfehlung

APPROVED

Alle acht Findings aus Runde 1 sind behoben, und die Fixes gehen über das Gemeldete hinaus, wo es
richtig war (Block-Extraktor verallgemeinert statt zweimal geschrieben; sechs zusätzliche
Assertions inkl. positivem RED-Beleg für die Regression). Die verbleibenden sechs Nitpicks sind
Robustheits- und Leseführungspunkte ohne heutigen Defekt – keiner blockiert den Merge, und keiner
rechtfertigt eine dritte Review-Runde. Sinnvoll mitzunehmen, falls `/test` oder `/refactor` die
Stellen ohnehin anfasst: Nitpick 1 (concurrency-Guard an den Block ankern) und Nitpick 2
(positive Kontrolle je Mutant) – beide je eine Zeile und in derselben Lesson-Familie, die diesen
PR schon einmal in die Nacharbeit geschickt hat.
