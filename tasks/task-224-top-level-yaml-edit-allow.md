# Task 224: top-level-yaml-edit-allow

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [x] Tests vollständig
- [ ] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung

`.claude/settings.json` hat für Top-Level-Dateien ohne passende Extension keine Allow-Regel –
`*.yml`/`*.yaml` fehlt komplett. Ein Stage-3-Agent (`claude --print`, kein Mensch im Loop) läuft
dadurch auf einen unbeantwortbaren Permission-Prompt, sobald er z. B. `factory.defaults.yml`
ändern soll. Beobachtet in Task 201 / PR #222: drei Rework-Iterationen ohne Fortschritt, bis der
Circuit Breaker auslöste.

Behoben wird die **Dateiklasse**, nicht nur der Einzelfall: Top-Level-YAML wird für `Edit`
freigegeben, `pnpm-lock.yaml` bleibt per `deny` gesperrt, und die `Write`-Liste wird zur
`Edit`-Liste symmetrisch gemacht (Top-Level-Extensions fehlen dort bislang vollständig). Die
#88-Grenze (`.claude/**`, `.env*`) bleibt unangetastet.

Spec: [`docs/specs/spec-224-top-level-yaml-edit-allow.md`](../docs/specs/spec-224-top-level-yaml-edit-allow.md)

> **Achtung – Patch-Workflow:** Die Änderung betrifft `.claude/settings.json` und ist für den
> Agenten hard denied. Lieferung als `tasks/patch-224.diff` (programmatisch erzeugt, per
> `git apply --check` verifiziert), Blocker in dieser Datei protokollieren; nach dem Anwenden
> Checkboxen und Patch-Artefakt aufräumen (aus #91/#94/#145).

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [x] **AK1** GIVEN einen Stage-3-Agenten WHEN er eine getrackte Top-Level-YAML-Datei
      (`factory.defaults.yml`, `factory.config.yml`, `pnpm-workspace.yaml`, `docker-compose.yml`)
      per `Edit` ändern will THEN kein Permission-Prompt, kein Interrupt. Behavioral belegt (siehe
      Blocker-Abschnitt: `claude --print`-Positiv-Probe gegen `factory.defaults.yml`).
- [x] **AK2** GIVEN denselben Agenten WHEN er per `Write` eine neue Root-Datei mit freigegebener
      Extension (`*.yml`, `*.yaml`, `*.ts`, `*.tsx`, `*.mjs`, `*.json`, `*.md`) anlegt THEN kein
      Prompt – `Write` ist für Top-Level-Extensions symmetrisch zu `Edit`. Einträge gesetzt wie
      spezifiziert; **wichtiger Fund** beim Probe-Lauf: die aktuelle Claude-Code-Permission-Engine
      wertet `Write(path)`-Regeln gar nicht aus (nur `Edit(path)` – deckt laut CLI-Warnung „alle
      file-editing tools" ab, also Edit **und** Write). Die neuen `Write(*.yml)` etc. sind damit
      funktional redundant zu `Edit(*.yml)` – aber genau wie alle **bereits vorhandenen**
      `Write(app/**)`/`Write(*.ts)`/… Einträge (kein neues Problem, s. u.).
- [x] **AK3** GIVEN die generische YAML-Freigabe WHEN `pnpm-lock.yaml` per `Edit`/`Write` geändert
      werden soll THEN abgelehnt (steht in `deny`; deny hat Vorrang vor allow). Behavioral belegt
      (Negativ-Probe: `pnpm-lock.yaml` nach dem Claude-Aufruf byteidentisch, MD5 unverändert).
- [x] **AK4** GIVEN die erweiterten Listen WHEN `.claude/**` oder `.env*` geschrieben werden soll
      THEN weiterhin gesperrt – #88-Deny-Einträge unverändert vorhanden (per Test + Datei-Diff
      geprüft).
- [x] **AK5** GIVEN `bash scripts/checks/tests/run-tests.sh` WHEN die Permissions-Konsistenz-Tests
      laufen THEN prüfen sie die **geparsten** `allow`/`deny`-Listen (kein bloßer Text-Treffer) in
      beide Richtungen; Wegfall genau eines Eintrags → genau die zugehörige Assertion rot. Neuer
      Abschnitt „#224 Top-Level-YAML-Freigabe" in `run-tests.sh`, `jq`-basiert, RED vor dem Patch
      (11 Assertions rot) → GREEN danach (542 grün, 0 rot, voller Lauf).
- [x] **AK6** GIVEN die Patch-Lieferung WHEN der Test aus AK5 läuft THEN liest er die committete
      Live-Datei `.claude/settings.json`, nicht `tasks/patch-224.diff` (aus #212). `$SETTINGS`
      zeigt auf `$FACTORY_ROOT/.claude/settings.json`, das Patch-Artefakt wird nirgends gelesen.
- [x] **AK7** GIVEN die stale Präsens-Aussage in `docs/factory/lessons/factory-workflow.md`
      („`factory.defaults.yml` … nicht in der Allow-Liste … löst einen Interrupt aus") WHEN dieser
      PR die Regel ergänzt THEN ist die Aussage im selben PR korrigiert; Patch-Workflow-Regel und
      historische Vorfall-Schilderung bleiben erhalten.
- [x] **AK8** GIVEN den angewendeten Patch WHEN `.claude/settings.json` geparst wird THEN valides
      JSON mit unveränderter Struktur (`hooks`, `permissions.allow`, `permissions.deny`). Per
      `jq -e '.hooks and .permissions.allow and .permissions.deny'` verifiziert (Test + manuell).

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

Kein ADR-Trigger: rein deklarative Tooling-Konfiguration innerhalb der bereits durch ADR-019/#88
gesetzten Permissions-Grenze – kein neues Architekturprinzip, keine der vier Trigger-Kategorien.
Die #88-Grenze selbst wird nicht verschoben, sondern nur eine Dateiklassen-Lücke *innerhalb* der
erlaubten Seite geschlossen.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

- [x] Sind Top-Level-Extension-Muster (`Edit(*.yml)`) pfad-verankert (nur Root) oder matchen sie
      auch verschachtelte Pfade? Geklärt in `/implement`: Ein slash-freies Muster wie `*.yml`
      folgt gitignore-Semantik und matcht auf **jeder** Tiefe (Claude-Code-Doku, Abschnitt
      „Wildcard patterns": „Bare filenames follow gitignore semantics and match at any depth").
      Root-only wäre `Edit(/*.yml)` (mit führendem Slash) gewesen – bewusst nicht gewählt, da
      unkritisch (betroffene Unterverzeichnisse ohnehin freigegeben, `.claude/**` bleibt per
      `deny` gesperrt, `pnpm-lock.yaml` als literaler Dateiname in `deny` matcht unabhängig von
      der Tiefe, weil die Datei nur im Root existiert).
- [x] Belastbarer Beleg für AK1/AK2: Die Permission-Auswertung liegt in Claude Code, nicht im Repo
      – aus der Shell-Testsuite nicht verhaltensbasiert prüfbar. Präzedenz Task #88: einmalige,
      im Task-File dokumentierte `claude --print`-Probe (Positiv + Negativ). **Durchgeführt** nach
      Anwenden des Patches (siehe Blocker-Abschnitt) – lieferte zugleich den wichtigen Fund zu
      `Write(...)`-Regeln (siehe AK2).

## Blocker

Blocker [2026-07-26] (**erledigt**): Die eigentliche Fachänderung lag in `.claude/settings.json`,
das für den Agenten hard denied ist (`Edit(.claude/**)`/`Write(.claude/**)`, #88-Grenze).
Lieferung als `tasks/patch-224.diff` – programmatisch per `jq` erzeugt (nicht von Hand getippt,
aus #94), Pfad-Header über `git diff --no-index --no-prefix` korrekt gesetzt, read-only mit
`git apply --check tasks/patch-224.diff` verifiziert (Ergebnis: „APPLY-CHECK OK"). Der Mensch hat
`git apply tasks/patch-224.diff` im Worktree freigegeben/ausgeführt; `tasks/patch-224.diff` wird
vor dem Merge entfernt (aus #145 – kein totes Patch-Artefakt).

Offene Frage zur Pfad-Verankerung von `Edit(*.yml)` ist geklärt (siehe Task-Abschnitt „Offene
Fragen").

**`claude --print`-Verhaltensprobe (Positiv + Negativ), durchgeführt 2026-07-26 nach Anwenden des
Patches**, analog Präzedenz #88:

- *Positiv* (AK1): `FACTORY_STAGE=3 claude --print "… hänge an factory.defaults.yml … an …" --max-turns 3`
  im Worktree. Ergebnis: Die Zeile `# probe-224-positive` wurde tatsächlich ans Dateiende
  angehängt (MD5 vorher `3fac65e…`, nachher `ec3da9b…`) – **kein** Permission-Prompt, **kein**
  Interrupt. Änderung danach mit `git checkout -- factory.defaults.yml` zurückgesetzt.
- *Negativ* (AK3): derselbe Aufruf gegen `pnpm-lock.yaml`. Ergebnis: Datei nach dem Lauf
  byteidentisch (MD5 unverändert `4319ec1…`) – die `deny`-Regel griff, keine Änderung durchgerutscht.
- Beide Läufe endeten technisch mit `Error: Reached max turns (3)` (Edit war jeweils bereits
  vor dem Turn-Limit erledigt/verweigert; das Turn-Limit selbst ist für die Probe irrelevant,
  ausschlaggebend ist der Datei-Diff vorher/nachher).

**Wichtiger Nebenfund (kein Blocker, aber dokumentationswürdig):** Beide `claude --print`-Aufrufe
gaben je 21 Zeilen der Form
`Permission allow/deny rule (.claude/settings.json): Write(<pfad>) is not matched by file
permission checks — only Edit(path) rules are. Use Edit(<pfad>) instead (Edit rules cover all
file-editing tools).` aus (stderr). D. h. die aktuell installierte Claude-Code-Version
(2.1.218) wertet **keine** `Write(...)`-Permission-Regeln aus – weder in `allow` noch in `deny`;
ein `Edit(pfad)`-Eintrag deckt bereits Edit **und** Write für diesen Pfad ab. Das betrifft nicht
nur die in dieser Task neu ergänzten `Write(*.yml)` usw., sondern **alle bereits vor #224
vorhandenen** `Write(app/**)`, `Write(*.ts)` usw. Einträge (vgl. #88) – ein vorbestehender
Zustand, den diese Task nicht verursacht, aber durch die AK2-Symmetrie-Ergänzung um 9 weitere
(harmlose, aber genauso wirkungslose) Einträge vergrößert. Funktional unkritisch (Edit-Regeln
gewähren bereits das gewünschte Verhalten; AK1–AK3 sind alle behavioral bestätigt), aber jeder
künftige Stage-3-Lauf bekommt dadurch mehr Warnzeilen auf stderr. Als Cleanup-Kandidat
(„`Write(...)`-Regeln repo-weit entfernen, da wirkungslos") **absichtlich außerhalb des Scopes
dieser Task** belassen (Spec-Scope: nur Top-Level-YAML + die AK2-Symmetrie wie mit dem
Entwickler abgestimmt) – als separates Issue vorgeschlagen (Follow-up-Chip).

## Review-Findings
<!-- Wird durch /review befüllt -->

Siehe [`tasks/review-224.md`](review-224.md) (Runde 1). Verdict: **NEEDS_REWORK** – keine
kritischen Findings; zwei „Wichtige" Findings (Test-Duplikation `#91` vs. `#224` in
`scripts/checks/tests/run-tests.sh`, uneinheitliche `jq`-Verfügbarkeitsprüfung) wurden
unabhängig von allen drei Review-Perspektiven aufgegriffen. Out-of-Scope-Fund (wirkungslose
`Write(...)`-Regeln) als GitHub-Issue [#240](https://github.com/nothra/tch-gastro-services/issues/240)
ausgelagert.

**Rework (2026-07-26), beide Wichtige Findings behoben – reiner Testcode, kein Verhalten
geändert:**
- `scripts/checks/tests/run-tests.sh`, alter `#91`-Deny-Check (jetzt „jq-unabhängiger
  Fallback"): Kommentar ergänzt, der die Koexistenz mit dem neuen `#224`-AK4-Block explizit
  begründet (der alte Check läuft immer, auch ohne `jq`; der neue wird ohne `jq` übersprungen),
  und den fehlenden `Edit(.env*)`-Eintrag ergänzt, damit beide dieselbe Menge prüfen.
- `scripts/checks/tests/run-tests.sh:2036`: dritte jq-Verfügbarkeitsprüfung durch
  Wiederverwendung des bereits im File etablierten `$HAS_JQ` ersetzt (`if [ "$HAS_JQ" -eq 1 ]`
  statt eigener `command -v jq`-Subshell).
- Voller Testlauf danach erneut grün: 542 grün, 0 rot.
- Der dritte Punkt (Lesson-Codifizierung des Write-Funds) war kein Blocker für diesen PR und
  bleibt Aufgabe des `/codify`-Schritts.

## Test-Vollständigkeit (`/test`, 2026-07-26)

- **Coverage-Analyse:** `pnpm test:coverage` (Vitest) wurde bewusst **nicht** erneut ausgeführt –
  diese Task ändert keine TypeScript/JS-Produktionsdateien (nur `.claude/settings.json`, Docs,
  Task-Dateien und `scripts/checks/tests/run-tests.sh`, ein Bash-Skript ohne Vitest-Coverage-
  Instrumentierung). Die Vitest-Coverage-Schwelle ist für diese Task nicht aussagekräftig; die
  relevante Test-Suite ist `scripts/checks/tests/run-tests.sh` (voller Lauf: 545 grün, 0 rot).
- **Lücke gefunden (AK7):** Die stale-Prosa-Korrektur in `docs/factory/lessons/factory-workflow.md`
  hatte bislang **keine** Regressionsabsicherung – kein Test in `run-tests.sh` referenzierte diese
  Datei überhaupt. Ergänzt: drei neue Assertions (alte Aussage entfernt, neue Aussage vorhanden,
  Patch-Workflow-Regel #94 bleibt erhalten). Gegenprobe gegen `origin/main` (Vor-#224-Stand)
  bestätigt: dort wäre die Negativ-Assertion rot und die Positiv-Assertion ebenfalls rot – kein
  tautologischer Test.
- Alle übrigen Akzeptanzkriterien (AK1–AK6, AK8) waren bereits aus `/implement` durch die
  `#224`-jq-Assertions sowie die zwei `claude --print`-Verhaltensproben abgedeckt (Happy Path +
  Negativfall `pnpm-lock.yaml`); keine weitere Lücke gefunden.
- Voller Testlauf: 545 grün, 0 rot (zuvor 542, +3 neue AK7-Assertions).

## Refactor-Notizen (`/refactor`, 2026-07-26)

Kein neues Verhalten. Zwei kleine Struktur-Verbesserungen in
`scripts/checks/tests/run-tests.sh` (adressiert die verbliebenen Nitpicks aus
`tasks/review-224.md`):
- AK1 (Edit) und AK2 (Write) hatten eine gemeinsame `for`-Schleife unter einem
  „AK1/AK2"-Sammelkommentar – jetzt zwei Schleifen mit je eigenem, spezifischem Kommentar
  (1:1-Zuordnung Kommentar→Assertion).
- Der Write-Loop referenziert jetzt direkt im Testkommentar den Nebenfund („Claude Code wertet
  Write(pfad) nicht aus") samt Verweis auf Issue #240 – vorher nur im Task-File dokumentiert,
  jetzt auch am Ort des Codes sichtbar.
- Rest des Diffs (deklaratives JSON in `.claude/settings.json`, Prosa in Lesson/Spec/Task-Datei)
  bietet keinen Refactoring-Ansatzpunkt im Sinne der Clean-Code-Checkliste (keine Funktionen,
  keine Duplikation, keine Magic Numbers).
- Verifiziert: `bash scripts/checks/tests/run-tests.sh` vor und nach dem Refactoring identisch
  545 grün, 0 rot – exakt dieselben 20 `#224`-Assertions, nur anders gruppiert.

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `fix/224-top-level-yaml-edit-allow`
Erstellt: 2026-07-26 10:25
