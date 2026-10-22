# Task 431: factory-split-t1a-2-mischdateien-gates

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Teil-Task **T1a-2** von Epic #424 (Factory in eigenes Repo auslagern): die Mischdateien auflösen
und die Gates erweiterbar machen – **verhaltensneutral**. Nach dem Merge arbeitet die Pipeline wie
vorher, aber `CLAUDE.md`, `.claude/settings.json`, `.gitignore`, `factory-ci.yml`, `pre-commit.sh`/
`pre-push.sh`, die Gate-Kommandos und die Label-Liste trennen Factory- und Projekt-Anteil.

- **Spec:** [`docs/specs/spec-426-trennlinie-factory-projekt-ziehen.md`](../docs/specs/spec-426-trennlinie-factory-projekt-ziehen.md),
  Gruppen **D, E, F, G, H, I** + **AK-X1–X3** (Volltext dort; hier die Checkliste)
- **Architektur:** [Factory-ADR-063](../docs/factory/adr/063-factory-eigenes-repo-vendored-manifest.md) D3 + Nachtrag (Q2–Q6) – kein neues `/architecture` nötig
- **Vorgänger:** T1a-1 (#426) gemergt (#430). **Nachfolger:** T1a-3 (#432), danach T1b (#427)

## Akzeptanzkriterien
### D · `CLAUDE.md` und `FACTORY.md`
- [x] AK-D1 Generischer Teil der heutigen `CLAUDE.md` steht in `docs/factory/FACTORY.md`
- [x] AK-D2 Neue `CLAUDE.md` enthält nur `@docs/factory/FACTORY.md`, `@docs/factory/PROJECT-CONTEXT.md` + TCH-Regeln (mind. Routen-Doku #145)
- [x] AK-D3 Jede inhaltliche Zeile der alten `CLAUDE.md` in genau einer der beiden Dateien wiederzufinden (Test oder dokumentierte Rekonstruktion)
- [x] AK-D4 `import-context-limit-check.sh` zählt verschachtelte Imports vollständig, bleibt unter der Grenze; Negativtest: Import nur über `FACTORY.md` reißt die Grenze → rot
- [x] AK-D5 Dieselben Dateien im Dauerkontext wie vorher (Liste vorher/nachher hier in der Task-Datei)
### E · Zusammengesetzte Dateien
- [x] AK-E1 `.claude/settings.factory.json` + `.claude/settings.project.json` existieren; `.claude/settings.json` inhaltsgleich zu vorher (Hooks + Reihenfolge, Allow/Deny/Ask-Menge)
- [x] AK-E2 `docs/factory/gitignore.factory` + `.gitignore.project` existieren; ignorierte Pfade unverändert (feste Probenliste vorher/nachher)
- [x] AK-E3 Zusammensetz-Kommando (`scripts/factory-sync.sh --compose`, Q2) erzeugt byte-identisch die committete Datei, deterministisch; Test rot bei Abweichung
- [x] AK-E4 Doku: Projekt-Permission ergänzen = Projekt-Fragment ändern, neu zusammensetzen, beide committen
### F · CI-Workflows
- [x] AK-F1 `factory-ci.yml` enthält nur `pr-closes-issue`, `issue-sync`, `config-validation`, `factory-self-test`, `post-merge-verify`, keinen `pnpm`-Aufruf
- [x] AK-F2 Neues projekteigenes `ci.yml` führt `lint` + `test` mit unverändertem Job-Namen, Trigger und Inhalt aus (Repo-Variablen bleiben, Q7)
- [x] AK-F3 Required-Check-Namen in `protect-main` vorher = nachher, alle auf diesem PR gemeldet (heute: `lint`, `test`, `issue-sync`, `factory-self-test`, `pr-closes-issue`, `config-validation`)
- [x] AK-F4 `deploy-gate.yml`, `deploy-freeze-release.yml` (`project`), `factory-poll.yml` (`factory`) in `OWNERSHIP.md` zugeordnet, Skriptpfade stimmen
### G · Erweiterungspunkte in den Git-Gates
- [x] AK-G1 `pre-commit.sh`/`pre-push.sh` rufen ausführbare Skripte aus `scripts/project/checks/pre-commit.d/` bzw. `pre-push.d/` lexikalisch auf; Fehlschlag → Gate rot mit Skriptname
- [x] AK-G2 Verzeichnis fehlt oder leer → Gate läuft ohne Fehler weiter
- [x] AK-G3 Nicht ausführbare Datei im Verzeichnis → Gate rot mit Hinweis auf fehlendes Ausführbar-Bit
- [x] AK-G4 `routes-doc-check.sh` liegt in `scripts/project/checks/pre-push.d/`, `pre-push.sh` nennt ihn nicht mehr; Routen-Doku-Drift blockiert weiter den Push (Verhaltenstest)
### H · Gate-Kommandos aus der Konfiguration
- [x] AK-H1 `factory.config.yml` enthält `commands.lint|test|typecheck|format|coverage` mit den heutigen TCH-Werten
- [x] AK-H2 `factory.defaults.yml` enthält keinen pnpm-Default für `commands.*`
- [x] AK-H3 `pre-commit.sh`, `pre-push.sh`, `run-pipeline.sh` lesen aus der Konfiguration; Env-Overrides (`FACTORY_*_COMMAND`) haben Vorrang; „leerer Format-Wert = übersprungen" bleibt
- [x] AK-H4 Pflicht-Kommando fehlt in Konfiguration und Env → Gate bricht mit Nennung des Schlüssels ab (kein stiller pnpm-Fallback)
- [x] AK-H5 `config-validation-check.sh` lehnt ungültigen Typ in `commands.*` ab (Positiv- und Negativtest)
- [x] AK-H6 `start-work.sh`: Install-Schritt + Seed-Hinweis aus `commands.install` / `start_work.hint` (Q4); ohne Eintrag entfällt der Schritt still
### I · Labels aus der Konfiguration
- [x] AK-I1 `factory.defaults.yml` → `labels.kinds`, `labels.aspects`; `factory.config.yml` → `labels.aspects_extra` mit mind. `factory-pipeline`
- [x] AK-I2 `git-workflow.md` beschreibt Schema + generische Labels, verweist für projekteigene auf `PROJECT-CONTEXT.md`; Label-Drift-Guard prüft gegen die neue Quelle
- [x] AK-I3 `start-work.sh --labels` bzw. Issue-Seam verhalten sich wie vorher (fail-open, Q5)
### Epic-weit (für diesen PR)
- [ ] AK-X1 `run-tests.sh`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm format:check` vorher (`main` @ `bcba043`) und nachher grün; Ergebnisse hier eingetragen
- [ ] AK-X2 Alle Required Checks grün, Namen unverändert
- [ ] AK-X3 Stage-2-Probelauf nach dem Merge (`start-work.sh` ID-Modus, `pre-push.sh` auf Probe-Branch) verhält sich wie vorher
- [ ] `OWNERSHIP.md` führt alle neuen Dateien (u. a. `FACTORY.md`, Fragmente, `factory-sync.sh`, `ci.yml`, `scripts/project/**`), AK-A2-Test grün

## Fehlerszenarien
- [ ] F-4 Committete `.claude/settings.json`/`.gitignore` weicht von der Zusammensetzung ab → Test rot
- [x] F-5 Projekt-Check in `pre-push.d/` scheitert oder ist nicht ausführbar → Push blockiert, Skriptname in der Meldung
- [x] F-6 Pflicht-Gate-Kommando nicht konfiguriert → Gate bricht mit Schlüsselnamen ab
- [ ] F-7 Required Check verschwindet durch die Workflow-Teilung → erst fertig, wenn alle gemeldet und grün

## Technische Notizen
**Ablauf (Q8, 2026-10-20):** ein PR, Phase 2 **manuell in Etappen** – je Etappe eine frische
Session, kein `run-pipeline.sh` (26 AK > Turn-Limit-Schwelle, Lesson #369). Vorschlag für die
Reihenfolge der `/implement`-Etappen (Gruppen sind unabhängig voneinander verhaltensneutral):
1. **D** – `FACTORY.md`/`CLAUDE.md` + Import-Limit-Negativtest (Baseline-Liste für AK-D5 **vor** der Änderung festhalten)
2. **E** – Fragmente + `scripts/factory-sync.sh --compose`
3. **F** – `ci.yml` abspalten (Required-Check-Namen gegen `protect-main` prüfen)
4. **G + H** – `pre-commit.sh`/`pre-push.sh` (beide berühren dieselben Dateien → zusammen), `run-pipeline.sh`, `start-work.sh`, `config-validation-check.sh`
5. **I** – Labels in die Konfiguration, Drift-Guard umstellen

Danach `/review` → `/test` → `/refactor` → `/security-review` → `/codify` über den Gesamt-Diff,
in der Reihenfolge aus `CLAUDE.md` (Lesson #351). Jede Etappe endet mit sauberem `git status` + Commit.

**Hinweise aus der Bestandsaufnahme (2026-10-20):**
- `import-context-limit-check.sh` folgt Imports bereits rekursiv; Stand 969/1100 Zeilen. AK-D4 ist vor allem der neue Negativtest über die zweite Ebene.
- Hartkodierte pnpm-Defaults: `pre-commit.sh:64`, `pre-push.sh:31/54/78`, `run-pipeline.sh:703–705`, `start-work.sh:257–262/415`.
- CI `lint`/`test` lesen `vars.FACTORY_LINT_COMMAND`/`vars.FACTORY_TEST_COMMAND` – bleibt so (Q7), nur den Kommentar „kein Doppel-Pflegen" anpassen.
- `factory-integrity` (ADR-063 D3) kommt erst in T2 – **nicht** in `factory-ci.yml` aufnehmen.
- ADR-063 D3 nennt als TCH-`aspects_extra` `build-pipeline`; für T1a gilt laut AK-I1 `factory-pipeline` (Wechsel in T3).
- `scripts/project/**` existiert noch nicht; `routes-doc-check.sh` steht in `OWNERSHIP.md` heute unter `scripts/checks/` → Zeile mitziehen.
- **Telemetrie:** Durch den manuellen Stage-2-Ablauf gibt es für diese Task keine OTEL-Telemetrie-CSV (Lesson #346). Das ist gewollt, keine Lücke.

## Offene Fragen
_Keine._ Q2–Q6 im ADR-063-Nachtrag entschieden; Q7 (CI-Quelle) und Q8 (Schnitt) am 2026-10-20, siehe spec-426.

## Etappe 1 (D) – Notizen
**AK-D5 Dauerkontext vorher/nachher** (Zeilen, `import-context-limit-check.sh`):
- vorher (`bcba043`, 969): `CLAUDE.md` 245 · `PROJECT-CONTEXT.md` 444 · `clean-code.md` 131 · `tdd-principles.md` 54 · `testing-standards.md` 95
- nachher (984): `CLAUDE.md` 23 → `FACTORY.md` 238 → `clean-code`/`tdd-principles`/`testing-standards` (unverändert); `CLAUDE.md` → `PROJECT-CONTEXT.md` 444. Gleiche fünf Inhalte, +15 Zeilen Kopf/Trenner.
- Rekonstruktion AK-D3: Test in `run-tests.sh` vergleicht `git show bcba043:CLAUDE.md` zeilenweise gegen `FACTORY.md` + `CLAUDE.md` (Skip im flachen Klon).
- Bestehende Tests, die generische Inhalte aus `CLAUDE.md` lasen, zeigen auf `FACTORY.md`.
- `run-tests.sh` nach Etappe 1: 1709 grün, 0 rot.

## Etappe 2 (E) – Notizen
Blocker [2026-10-21] – erledigt [2026-10-22], Patch angewendet, `patch-431-e.diff` entfernt: `.claude/settings.json`, `.claude/settings.factory.json` und `.claude/settings.project.json` liegen unter dem gesperrten `Edit(.claude/**)` – Mensch muss `git apply tasks/patch-431-e.diff` ausführen (AK-E1 `[~]`). Bis dahin sind die E-Tests in `run-tests.sh` rot (14 Assertions: Fragmente fehlen). Danach: Patch-Datei entfernen, `[~]` → `[x]`, Blocker als erledigt markieren (Lesson #91).
- Nach dem Apply: `run-tests.sh` 1760 grün, 0 rot (inkl. Baseline-Tests gegen `bcba043`).
- Nachweis „grün nach Apply": Kopie des Baums + Patch → `run-tests.sh` 1751 grün; die 4 Roten dort sind Umgebung der Kopie (kein `pnpm`, keine Git-Historie), nicht E.
- Baseline-Gleichheit gegen `bcba043` per `jq`: Hooks + sortierte Allow/Deny-Menge gleich; Factory ∪ Projekt == alte Regelmenge, disjunkt.
- `.gitignore` byte-identisch zu vorher (`gitignore.factory` = Zeilen 1–31, `.gitignore.project` = Rest).
- Fund aus Etappe D: Links in `FACTORY.md` waren wurzelrelativ (tote ADR-Links, AK-B3) – jetzt relativ zu `docs/factory/`; AK-D3-Test normalisiert genau diese Präfix-Änderung.

## Etappe 3 (F) – Notizen
- `ci.yml` (Name `CI`) trägt `lint`/`test` unverändert aus `factory-ci.yml`; nur die Kommentare „kein Doppel-Pflegen" → „Werte müssen übereinstimmen" (Q7).
- Required Checks in `protect-main` (per `gh api` gelesen): `lint`, `test`, `issue-sync`, `factory-self-test`, `pr-closes-issue`, `config-validation` – alle Namen werden weiter von einem Job gemeldet (Test AK-F3). F-7/AK-F3 „auf diesem PR gemeldet" ist erst nach dem Push in CI belegbar.
- `deploy-gate.yml`/`deploy-freeze-release.yml` (project) und `factory-poll.yml` (factory) standen schon in `OWNERSHIP.md`; neu: `ci.yml` (project). Test prüft zusätzlich, dass alle in Workflows genannten `scripts/*.sh` existieren.
- `run-tests.sh` nach Etappe 3: 1781 grün, 0 rot.

## Etappe 4 (G + H) – Notizen
- Neue Lib `scripts/lib/gate-config.sh` (gesourct von `pre-commit.sh`, `pre-push.sh`, `run-pipeline.sh`, `start-work.sh`): `gate_command <key> required|optional` (Env `FACTORY_<KEY>_COMMAND` vor `commands.<key>`; Pflicht-Kommando fehlt → Meldung mit `commands.<key>`), `factory_cfg`, `run_project_checks`. Wegwerf-Repos der Tests müssen die Lib mitkopieren (`cp_pipeline_libs`, `mk_gate_root_431`).
- `factory.defaults.yml` trägt `commands.*`/`start_work.hint` nur als **leere Strings** (Oberfläche für Regel 2 der Config-Validierung, kein pnpm-Default); Werte in `factory.config.yml`. Neue Validierungsregel 7: `commands.*`/`start_work.hint` müssen Strings sein.
- Optional/Pflicht: lint, test, typecheck (Git-Gates) und lint, test, coverage (Pipeline) sind Pflicht; format ist optional (leer = übersprungen). `run-pipeline.sh` löst die Kommandos jetzt **vor** `/implement` auf (fail-fast statt erst nach dem Agentenschritt).
- `routes-doc-check.sh` nach `scripts/project/checks/pre-push.d/` verschoben (Default-Wurzel vier Ebenen), `OWNERSHIP.md`: `scripts/project/**` = project. Verweise in `CLAUDE.md`, `PROJECT-CONTEXT.md`, `docs/routes.md` nachgezogen (gleiche Zeilenzahl); AK-D3-Test normalisiert diese Pfadänderung.
- Test-Suite exportiert zu Beginn `FACTORY_{LINT,TEST,COVERAGE}_COMMAND=true` für die Pipeline-Läufe in Wegwerf-Repos und hebt das vor den G/H-Gruppen wieder auf.
- Doku: `OPERATING.md` §5.6.

## Etappe 5 (I) – Notizen
- `factory.defaults.yml`: `labels.kinds`, `labels.aspects` (generisch), `labels.aspects_extra: []`; `factory.config.yml`: `aspects_extra: [factory-pipeline]`. Nur die **Datenquelle** wandert (Q5) – `start-work.sh` und der Seam bleiben unverändert (fail-open); `.claude/**`-Skill-Dokus nennen `factory-pipeline` weiter (T1a-3/T3, kein Patch nötig).
- Config-Validierung: `leaf_paths` normalisiert Listen-Indizes zu `*`, eine leere Default-Liste erlaubt Override-Elemente; neue Regel 8 (Labels = Listen nichtleerer Strings ohne Komma/Leerraum, weil der Seam CSV nutzt).
- Doku: `git-workflow.md` hält Schema + generische Labels, verweist auf `PROJECT-CONTEXT.md` → „Projekt-Labels" (dort die `factory-pipeline`-Zeile und die #315-Zuordnungsregel mit TCH-Pfad-Ankern). `@import`-Kontext dadurch 1016/1100 Zeilen. Der #315-Guard liest die Fundstelle 1 jetzt aus `PROJECT-CONTEXT.md`; neuer Drift-Guard `label_drift_431` prüft Config ↔ Doku (3 Mutationen).
- `run-tests.sh` nach Etappe 5: 1875 grün, 0 rot.

## Review-Findings
**Iteration 1 (`tasks/review-431.md`):** 0 kritisch, 1 wichtig (fehlender Verhaltenstest für `run-pipeline.sh` – Config-Kommando angewendet, Abbruch vor `/implement` bei fehlendem Pflicht-Kommando), 2 Nitpicks. Wichtig-Finding behoben (Suite 1884 grün, 0 rot); Nitpicks bewusst offen (yq-Meldung im Gate, globaler Env-Export der Suite).
**Iteration 2:** APPROVED – 0 kritisch, 0 wichtig, 3 Nitpicks (die zwei offenen plus: Exit-Code im Pipeline-Testblock nicht mitassertiert).

## Test-Notizen (/test)
Coverage App 93,35 % Statements (Schwelle 80 %), Bericht `tasks/coverage-431.md`. Suite 1894 grün, 0 rot. Ergänzt: Pipeline-Exit-Codes, defektes `yq` fail-closed, fehlgeschlagener Install-Schritt.

## Security-Notizen (/security-review)
PASSED (`tasks/security-431.md`): 0 kritisch, 0 wichtig, Hinweise zu Vertrauensgrenze der `commands.*`/`*.d`-Ausführung (keine neue Fähigkeit), `factory-sync`-Dateimodus 0600 (Kleinfund in `docs/factory/kleinfunde.md`), Policy-Floors unberührt.

## Refactoring-Notizen (/refactor)
Kein neues Verhalten, Suite vorher/nachher identisch 1894 grün, 0 rot. Geändert: die zwei fast gleichen start-work-Fixtures der Gruppe H (Wegwerf-Repo, gh-Stub, Config) sind in die Helfer `mk_start_work_fixture_431` / `run_start_work_431` gezogen; Kopfkommentar von `gate-config.sh` nennt die erwarteten Farbvariablen. Bewusst nicht angefasst: die drei ähnlichen Gate-Blöcke in `pre-push.sh` (unterschiedliche Ausgabe-/Fehlersemantik, Extraktion würde Verhalten berühren).

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/431-factory-split-t1a-2-mischdateien-gates`
Erstellt: 2026-10-20 23:39
