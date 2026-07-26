# Task 224: top-level-yaml-edit-allow

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
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
- [ ] **AK1** GIVEN einen Stage-3-Agenten WHEN er eine getrackte Top-Level-YAML-Datei
      (`factory.defaults.yml`, `factory.config.yml`, `pnpm-workspace.yaml`, `docker-compose.yml`)
      per `Edit` ändern will THEN kein Permission-Prompt, kein Interrupt.
- [ ] **AK2** GIVEN denselben Agenten WHEN er per `Write` eine neue Root-Datei mit freigegebener
      Extension (`*.yml`, `*.yaml`, `*.ts`, `*.tsx`, `*.mjs`, `*.json`, `*.md`) anlegt THEN kein
      Prompt – `Write` ist für Top-Level-Extensions symmetrisch zu `Edit`.
- [ ] **AK3** GIVEN die generische YAML-Freigabe WHEN `pnpm-lock.yaml` per `Edit`/`Write` geändert
      werden soll THEN abgelehnt (steht in `deny`; deny hat Vorrang vor allow).
- [ ] **AK4** GIVEN die erweiterten Listen WHEN `.claude/**` oder `.env*` geschrieben werden soll
      THEN weiterhin gesperrt – #88-Deny-Einträge unverändert vorhanden.
- [ ] **AK5** GIVEN `bash scripts/checks/tests/run-tests.sh` WHEN die Permissions-Konsistenz-Tests
      laufen THEN prüfen sie die **geparsten** `allow`/`deny`-Listen (kein bloßer Text-Treffer) in
      beide Richtungen; Wegfall genau eines Eintrags → genau die zugehörige Assertion rot.
- [ ] **AK6** GIVEN die Patch-Lieferung WHEN der Test aus AK5 läuft THEN liest er die committete
      Live-Datei `.claude/settings.json`, nicht `tasks/patch-224.diff` (aus #212).
- [x] **AK7** GIVEN die stale Präsens-Aussage in `docs/factory/lessons/factory-workflow.md`
      („`factory.defaults.yml` … nicht in der Allow-Liste … löst einen Interrupt aus") WHEN dieser
      PR die Regel ergänzt THEN ist die Aussage im selben PR korrigiert; Patch-Workflow-Regel und
      historische Vorfall-Schilderung bleiben erhalten.
- [ ] **AK8** GIVEN den angewendeten Patch WHEN `.claude/settings.json` geparst wird THEN valides
      JSON mit unveränderter Struktur (`hooks`, `permissions.allow`, `permissions.deny`).

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
- [ ] Belastbarer Beleg für AK1/AK2: Die Permission-Auswertung liegt in Claude Code, nicht im Repo
      – aus der Shell-Testsuite nicht verhaltensbasiert prüfbar. Präzedenz Task #88: einmalige,
      im Task-File dokumentierte `claude --print`-Probe (Positiv + Negativ). Nicht durchführbar →
      als Blocker protokollieren, nicht still überspringen.

## Blocker

Blocker [2026-07-26]: Die eigentliche Fachänderung liegt in `.claude/settings.json`, das für den
Agenten hard denied ist (`Edit(.claude/**)`/`Write(.claude/**)`, #88-Grenze). Lieferung als
`tasks/patch-224.diff` – programmatisch per `jq` erzeugt (nicht von Hand getippt, aus #94),
Pfad-Header über `git diff --no-index --no-prefix` korrekt gesetzt, read-only mit
`git apply --check tasks/patch-224.diff` verifiziert (Ergebnis: „APPLY-CHECK OK"). **Der Mensch
muss** `git apply tasks/patch-224.diff` im Worktree ausführen, danach den Test-Lauf
(`bash scripts/checks/tests/run-tests.sh`, Abschnitt „#224 Top-Level-YAML-Freigabe") auf grün
verifizieren und `tasks/patch-224.diff` löschen (aus #145 – kein totes Patch-Artefakt vor dem
Merge).

Offene Frage zur Pfad-Verankerung von `Edit(*.yml)` ist geklärt (siehe Task-Abschnitt „Offene
Fragen") – kein Blocker mehr.

Nicht durchgeführt: die in der Spec unter „Offene Fragen" vorgeschlagene `claude --print`-Probe
(Positiv-/Negativfall) zur Verhaltensbestätigung des Permission-Prompts. Diese Session läuft
interaktiv, nicht als isolierter Stage-3-Prozess mit unabhängigen Settings – eine `claude
--print`-Probe hier würde dieselbe (aktuell noch ungepatchte) `settings.json` desselben
Arbeitsbaums verwenden und liefert daher kein von den Datei-Assertions unabhängiges Signal.
Protokolliert als offener Nachtest statt still übersprungen (aus #224/Spec „Offene Fragen").

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `fix/224-top-level-yaml-edit-allow`
Erstellt: 2026-07-26 10:25
