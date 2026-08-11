# Task 284: factory-poll-schedule-stilllegen

## Status
- [ ] In Bearbeitung
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

- [ ] **AK1** GIVEN `factory-poll.yml` nach dem PR WHEN der `on:`-Block ausgewertet wird THEN enthält er keinen `schedule`-Trigger und keinen `cron`-Eintrag mehr.
- [ ] **AK2** GIVEN dieselbe Datei WHEN der `on:`-Block ausgewertet wird THEN ist `workflow_dispatch` weiterhin vorhanden (manuell auslösbar).
- [ ] **AK3** GIVEN dieselbe Datei WHEN Job, `permissions`, `concurrency` und beide Steps mit dem Vorzustand verglichen werden THEN sind sie inhaltlich unverändert und die Datei bleibt valides YAML (`yq`-Parse, wo verfügbar).
- [ ] **AK4** GIVEN `scripts/checks/tests/run-tests.sh` WHEN sie gegen den neuen Zustand läuft THEN ist die Assertion „factory-poll nur als Scheduled Workflow" entfernt und die Suite grün.
- [ ] **AK5** GIVEN der neue Regressionsguard WHEN wieder ein `schedule:`+`cron`-Trigger eingetragen wird THEN wird er rot; WHEN nur eine Kommentarzeile mit dem Wort `schedule` eingefügt wird THEN bleibt er grün (Anker = YAML-Struktur, nicht Prosa – Lesson #114).
- [ ] **AK6** GIVEN derselbe Guard WHEN `factory-poll.yml` nicht lesbar ist THEN schlägt er fehl (fail-closed, Lesson #214).
- [ ] **AK7** GIVEN `docs/adr/008-async-trigger-mechanism.md` WHEN der Kopf gelesen wird THEN nennt eine datierte Update-Notiz die Stilllegung; Status bleibt Accepted, Option A bleibt die Entscheidung.
- [ ] **AK8** GIVEN `docs/factory/OPERATING.md` §0.4 WHEN die Scharfschalt-Checkliste gelesen wird THEN enthält sie „`schedule` wieder eintragen" und „claude-CLI gepinnt/verifiziert installieren" (Verweis auf das Folge-Issue).
- [ ] **AK9** GIVEN `CLAUDE.md` und OPERATING.md §1.3 WHEN der Async-Start beschrieben wird THEN behauptet keine Stelle mehr einen laufenden Schedule („nur in Scheduled Pipelines").
- [ ] **AK10** GIVEN GitHub WHEN der PR fertig ist THEN existiert das Folge-Issue für M2 (`enhancement` + `security`, ohne `factory::run`), referenziert in OPERATING.md §0.4.
- [ ] **AK11** GIVEN der PR-Body WHEN er gelesen wird THEN enthält er `Closes #284`.

### Fehlerszenarien

- [ ] **F1** Reaktivierung bleibt in einem Schritt möglich (Job/Env/Guards nicht umgebaut).
- [ ] **F2** `workflow_dispatch` startet den Job unverändert (kein leerer/kaputter `on:`-Block).
- [ ] **F3** Ohne `yq` wird nur der YAML-strukturelle Teil übersprungen (`skip_yq`); der Kern-Guard aus AK5 greift auch dann.
- [ ] **F4** Ein späterer Schedule-Wiedereintrag ohne Doku-Nachzug macht den Selbsttest rot.

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

Betroffene Dateien (erwartet):
- `.github/workflows/factory-poll.yml` (`on.schedule` raus; Header `:1-17` und Kommentar `:50-52`)
- `scripts/checks/tests/run-tests.sh` (Assertion `:454` ersetzen)
- `docs/adr/008-async-trigger-mechanism.md`, `docs/factory/OPERATING.md`, `CLAUDE.md`

Kein ADR-Trigger: Die Entscheidung (Option A, Scheduled-Poll) wird nicht revidiert, nur ihr
Aktivierungszustand beschrieben – ADR-008 wird ergänzt, keine neue ADR nötig.

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
