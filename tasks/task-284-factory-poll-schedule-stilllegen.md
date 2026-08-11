# Task 284: factory-poll-schedule-stilllegen

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung

`.github/workflows/factory-poll.yml` läuft per `on.schedule` (`cron: "*/30 * * * *"`) 48× pro
Tag und installiert dabei jedes Mal eine ungepinnte, nicht integritätsgeprüfte claude-CLI
(`npm install -g @anthropic-ai/claude-code`, `:55`) in einem Job mit `contents: write` +
`issues: write`. Der Poll kann derzeit gar nichts ausrichten: `ANTHROPIC_API_KEY` existiert im
Repo nicht (die Env-Var in `:45` ist leer), und es gab noch nie ein Issue mit `factory::run`.

**Maßnahme dieses Tasks (M1):** `on.schedule` entfernen, `workflow_dispatch` als einzigen
Trigger behalten – die Angriffsfläche verschwindet, statt gehärtet zu werden (48 → 0 Läufe/Tag),
die Funktion bleibt auf Knopfdruck erhalten. Dazu der Doku-/Kommentar-Nachzug (ADR-008,
OPERATING.md §0.4/§1.3, CLAUDE.md, irreführender Kommentar `factory-poll.yml:52`) und das
Umdrehen der Assertion in `scripts/checks/tests/run-tests.sh:454`, die den alten Zustand
festschreibt.

**Nicht in diesem Task (M2):** Pin + verifizierter Seam für die claude-CLI – wird ein eigenes
Folge-Issue und ist Vorbedingung des Scharfschaltens (Entscheidung Nutzer, 2026-08-12).

Spec: [`docs/specs/spec-284-factory-poll-schedule-stilllegen.md`](../docs/specs/spec-284-factory-poll-schedule-stilllegen.md)

## Akzeptanzkriterien

- [x] **AK1** GIVEN `factory-poll.yml` nach dem PR WHEN der `on:`-Block ausgewertet wird THEN enthält er keinen `schedule`-Trigger und keinen `cron`-Eintrag mehr.
- [x] **AK2** GIVEN dieselbe Datei WHEN der `on:`-Block ausgewertet wird THEN ist `workflow_dispatch` weiterhin vorhanden (manuell auslösbar).
- [x] **AK3** GIVEN dieselbe Datei WHEN Job, `permissions`, `concurrency` und beide Steps mit dem Vorzustand verglichen werden THEN sind sie inhaltlich unverändert und die Datei bleibt valides YAML (`yq`-Parse, wo verfügbar).
- [x] **AK4** GIVEN `scripts/checks/tests/run-tests.sh` WHEN sie gegen den neuen Zustand läuft THEN ist die Assertion „factory-poll nur als Scheduled Workflow" entfernt und die Suite grün.
- [x] **AK5** GIVEN der neue Regressionsguard WHEN wieder ein `schedule:`+`cron`-Trigger eingetragen wird THEN wird er rot; WHEN nur eine Kommentarzeile mit dem Wort `schedule` eingefügt wird THEN bleibt er grün (Anker = YAML-Struktur, nicht Prosa – Lesson #114).
- [x] **AK6** GIVEN derselbe Guard WHEN `factory-poll.yml` nicht lesbar ist THEN schlägt er fehl (fail-closed, Lesson #214).
- [x] **AK7** GIVEN `docs/adr/008-async-trigger-mechanism.md` WHEN der Kopf gelesen wird THEN nennt eine datierte Update-Notiz die Stilllegung; Status bleibt Accepted, Option A bleibt die Entscheidung.
- [x] **AK8** GIVEN `docs/factory/OPERATING.md` §0.4 WHEN die Scharfschalt-Checkliste gelesen wird THEN enthält sie „`schedule` wieder eintragen" und „claude-CLI gepinnt/verifiziert installieren" (Verweis auf das Folge-Issue).
- [x] **AK9** GIVEN `CLAUDE.md` und OPERATING.md §1.3 WHEN der Async-Start beschrieben wird THEN behauptet keine Stelle mehr einen laufenden Schedule („nur in Scheduled Pipelines").
- [x] **AK10** GIVEN GitHub WHEN der PR fertig ist THEN existiert das Folge-Issue für M2 (`enhancement` + `security`, ohne `factory::run`), referenziert in OPERATING.md §0.4.
- [x] **AK11** GIVEN der PR-Body WHEN er gelesen wird THEN enthält er `Closes #284`.

### Fehlerszenarien

- [x] **F1** Reaktivierung bleibt in einem Schritt möglich (Job/Env/Guards nicht umgebaut).
- [x] **F2** `workflow_dispatch` startet den Job unverändert (kein leerer/kaputter `on:`-Block).
- [x] **F3** Ohne `yq` wird nur der YAML-strukturelle Teil übersprungen (`skip_yq`); der Kern-Guard aus AK5 greift auch dann.
- [x] **F4** Ein späterer Schedule-Wiedereintrag ohne Doku-Nachzug macht den Selbsttest rot.

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

Betroffene Dateien (erwartet):
- `.github/workflows/factory-poll.yml` (`on.schedule` raus; Header `:1-17` und Kommentar `:50-52`)
- `scripts/checks/tests/run-tests.sh` (Assertion `:454` ersetzen)
- `docs/adr/008-async-trigger-mechanism.md`, `docs/factory/OPERATING.md`, `CLAUDE.md`

Kein ADR-Trigger: Die Entscheidung (Option A, Scheduled-Poll) wird nicht revidiert, nur ihr
Aktivierungszustand beschrieben – ADR-008 wird ergänzt, keine neue ADR nötig.

### Notizen aus `/implement` (2026-08-12)

- **Folge-Issue (M2) ist #290** – „claude-CLI gepinnt und verifiziert installieren (Seam analog
  install-yq.sh)", Labels `enhancement` + `security`, kein `factory::run`. Angelegt per
  `gh issue create` statt über `scripts/lib/create-issue.sh` (der Seam ist in dieser Session
  nicht aufrufbar); Labels identisch zum Seam-Ergebnis. Referenziert in OPERATING.md §0.4 und
  im Header von `factory-poll.yml`.
- **Guard-Konstruktion (AK5/AK6):** Zwei Funktionen in `run-tests.sh` – `poll_on_block` extrahiert
  den `on:`-Block **nach** dem Entfernen der Kommentare, `poll_trigger_guard` sucht darin
  `schedule:`/`cron:`. Damit ist der Anker die YAML-Struktur, nicht eine Prosa-Erwähnung
  (Lesson #114). Mutationsbelege führen **denselben** Guard-Ausdruck inkl. Negation gegen zwei
  awk-mutierte Kopien aus (Lesson #286): echter Trigger → rot, Kommentar mit `schedule`/`cron`
  → grün. Unlesbare Datei → rot (fail-closed, Lesson #214).
- **Zwei bewusste Bash-Entscheidungen wegen `set -uo pipefail`:** (a) `poll_on_block` ist eine
  einzelne `awk`-Passage statt `sed | awk` – awk beendet am nächsten Top-Level-Key, das SIGPIPE
  eines Vorgängers hätte als Fehlschlag durchgeschlagen. (b) `poll_trigger_guard` liest per
  Here-String statt aus einer Pipe: bei einem Treffer beendet `grep -q` sofort, das SIGPIPE des
  Schreibers hätte zusammen mit der vorangestellten Negation ausgerechnet im **Fund**-Fall ein
  grünes Ergebnis geliefert – ein still versagender Guard.
- **Mutation per awk-Einfügung in den bestehenden `on:`-Block**, nicht per `printf >>`: ein
  angehängtes zweites `on:` wäre ein Duplicate-Key-Dokument und träfe nur zufällig (Lesson #255).
- **F3 (ohne `yq`):** Der neue Guard nutzt ausschließlich `awk`/`grep`/`mktemp` – kein `yq`.
  Die YAML-Validität von `factory-poll.yml` prüft weiterhin die bestehende #258-Assertion mit
  `skip_yq`-Zweig.
- **AK3-Abdeckung erweitert:** `contents: write`, `issues: write` und der
  `bash scripts/factory-poll.sh`-Step sind jetzt eigene Assertions – bisher deckten nur
  Job-Name und Concurrency-Group die Unverändertheit ab.
- **Kommentar `factory-poll.yml:50-52` korrigiert:** Die alte Begründung nannte den
  `ANTHROPIC_API_KEY` als Risiko-Asset; das Secret existiert im Repo nicht. Die #258-Begründung
  bleibt, gestützt auf die tatsächlich vorhandenen `contents: write` + `issues: write`.
- **Oberflächentests entfallen** – die Task berührt keine Route und keine UI (nur Workflow,
  Selbsttest-Suite und Doku). `docs/routes.md` ist nicht betroffen.
- **Gate-Verifikation (2026-08-12):** Bash-Selbsttest-Suite 933 grün / 0 rot (darin die neun
  neuen `#284`-Assertions), `pre-commit.sh` grün (Lint), `pre-push.sh` grün (678 Vitest-Tests,
  Typecheck, Prettier, Routen-Doku, Hooks). AK11 verifiziert an PR
  [#289](https://github.com/nothra/tch-gastro-services/pull/289) – Body trägt `Closes #284`;
  AK10 verifiziert an Issue #290 (Labels `enhancement` + `security`, kein `factory::run`).

## Offene Fragen

_Keine._ Scope geklärt am 2026-08-12: nur M1 + Doku-Nachzug; M2 als Folge-Issue mit Doku-Anker.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

### Angrenzende Funde (nicht in Scope)
- `.issue-npm-pin.md` im Repo-Wurzelverzeichnis ist ein getrackter Entwurf des Issue-Bodys von
  #284 – verwaistes Artefakt. Nach ADR-043 ein Kleinfund für `docs/factory/kleinfunde.md`.

---
Branch: `chore/284-factory-poll-schedule-stilllegen`
Erstellt: 2026-08-12 00:29
