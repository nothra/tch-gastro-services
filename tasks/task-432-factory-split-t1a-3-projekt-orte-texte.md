# Task 432: factory-split-t1a-3-projekt-orte-texte

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [x] Codify ausgeführt
- [x] Fertig / PR erstellt

## Beschreibung
Teil-Task **T1a-3** von Epic #424 (Factory in eigenes Repo auslagern). Die TCH-Spezifika ziehen an
projekteigene Orte, und die Factory-Texte werden generisch. Beides ist **verhaltensneutral**: Nach
dem Merge arbeitet die Pipeline wie vorher.

- **TCH-Skripte:** Sie ziehen nach `scripts/project/`. Ihre Tests ziehen aus `run-tests.sh` in eine
  projekteigene Suite unter `scripts/project/tests/`.
- **Factory-Texte:** Skill-, Agenten- und Guideline-Texte sowie `OPERATING.md` nennen pnpm, Neon,
  Vercel, `db:seed` und Drizzle nicht mehr. Die TCH-Details stehen danach in `docs/project/betrieb.md`.

Spec, Architektur und Abfolge:
- **Spec:** [`docs/specs/spec-426-trennlinie-factory-projekt-ziehen.md`](../docs/specs/spec-426-trennlinie-factory-projekt-ziehen.md),
  Gruppen **J, K** + **AK-X1–X3**. Der Volltext steht dort, hier nur die Checkliste. Die Entscheidungen aus diesem
  `/requirements`-Lauf stehen dort als **Q9–Q12**.
- **Architektur:** [Factory-ADR-063](../docs/factory/adr/063-factory-eigenes-repo-vendored-manifest.md) D3, D11.
  Q9–Q12 sind Detailentscheidungen innerhalb von D3 – kein neues `/architecture` nötig.
- **Vorgänger:** T1a-2 (#431), gemergt in #433. **Nachfolger:** T1b (#427).

## Akzeptanzkriterien
### J · TCH-Skripte und ihre Tests an projekteigene Orte
- [x] AK-J1 `neon-reset-int.sh`, `deploy-freeze.sh` und `deploy-freeze-notify.sh` liegen per `git mv` unter `scripts/project/`. Alle Aufrufer (Workflows, Doku, Skripte, `.env.example`, `README.md`) nutzen den neuen Pfad.
- [x] AK-J2 Die Projekt-Suite liegt unter `scripts/project/tests/`. In `run-tests.sh` findet ein Grep nach den TCH-Skript- und TCH-Workflow-Namen keinen Treffer mehr (Q9).
  Die Projekt-Suite umfasst:
  - die Tests von `routes-doc-check.sh` (#145) und Deploy-Freeze (#173);
  - die Workflow-Tests zu `deploy-gate.yml` und `deploy-freeze-release.yml` (#66, Deploy-Gate-Verdrahtung, #173/#66-Härtung);
  - die Prüfungen echter TCH-Dateien aus den Factory-Mechanik-Tests (#426/#431).
  Die Factory-Mechanik-Tests selbst nutzen danach neutrale Fixture-Namen.
- [x] AK-J2a Die gemeinsamen Prüf-Helfer liegen in einer Factory-Lib unter `scripts/checks/tests/lib/`. `run-tests.sh` und die Projekt-Suite sourcen beide diese Lib, es gibt keine Kopie (Q10).
- [x] AK-J3 Die Projekt-Suite läuft im Required Check `test` des projekteigenen `ci.yml` (Q10). Ein Fehlschlag macht den Check rot. Das ist per Negativprobe belegt, nicht nur per Wiring-Grep.
- [x] AK-J4 Testfall-Zählung: `Factory-Suite nachher + Projekt-Suite nachher = Suite vorher (main @ 1f36544)`. Neue T1a-3-Tests werden separat ausgewiesen. Die Zahlen stehen hier in der Task-Datei.
### K · Factory-Texte generisch
- [x] AK-K1 Ein Grep nach `pnpm|Neon|Vercel|db:seed|Drizzle` liefert in diesen Dateien keinen Treffer mehr:
  - `.claude/commands/implement.md` (5 Treffer, Patch-Weg)
  - `coding-agent.md` (2), `review-agent.md` (1)
  - `git-workflow.md` (1), `testing-standards.md` (1), `bash-gotchas.md` (11)
  - `OPERATING.md` (11)

  Wo nötig, verweisen die Texte auf `PROJECT-CONTEXT.md` → „Lokale Umgebung & Oberflächentests" bzw. auf `docs/project/betrieb.md`.
- [x] AK-K1a `PROJECT-CONTEXT.md` hat einen kurzen Abschnitt „Lokale Umgebung & Oberflächentests" (≤ 10 Zeilen, Verweis auf `docs/project/betrieb.md`). `import-context-limit-check.sh` bleibt grün (Q11).
- [x] AK-K2 Die TCH-Abschnitte von `OPERATING.md` stehen in `docs/project/betrieb.md`:
  - TCH-Zeilen aus §0.1
  - §0.2 Deploy-Gate-Secrets
  - §0.3 Vercel-Production-Branch
  - §4.3 destruktive Produktions-Migrationen
  - Deploy-Details aus §1.4

  `OPERATING.md` verweist an diesen Stellen auf die neue Datei. Kein Abschnitt geht verloren: Vorher/Nachher-Abgleich, Lesson #196.
- [x] AK-K3 Restliste der AK1.3-Begriffe (`Veranstaltung`, `Montagsrunde`, `Thekenwart`, `TCH`, `tch-gastro`, `Neon`, `Vercel`) über alle `factory`-Dateien laut `OWNERSHIP.md` (Datei, Anzahl) steht hier als Eingabe für T1b.
### Epic-weit (für diesen PR)
- [x] AK-X1 Diese Gates sind vorher (`main` @ `1f36544`) und nachher grün; die Ergebnisse stehen hier:
  - `run-tests.sh` + Projekt-Suite
  - `lint`, `typecheck`, `test`, `format:check`
- [ ] AK-X2 Alle Required Checks sind grün, ihre Namen unverändert: `lint`, `test`, `issue-sync`, `factory-self-test`, `pr-closes-issue`, `config-validation`.
- [ ] AK-X3 Ein Stage-2-Probelauf nach dem Merge verhält sich wie vorher: `start-work.sh` im ID-Modus und `pre-push.sh` auf einem Probe-Branch.
- [ ] `OWNERSHIP.md` führt die neuen und verschobenen Dateien:
  - `scripts/project/*.sh`, `scripts/project/tests/**`
  - `scripts/checks/tests/lib/**`
  - `docs/project/betrieb.md`

  Die Anmerkungen „wandern in #432" sind entfernt. Der AK-A2-Test ist grün.

## Fehlerszenarien
- [ ] F-J1 Ein Aufrufer nutzt noch den alten Skriptpfad (z. B. `deploy-gate.yml`) → ein Test der Projekt-Suite wird rot und nennt Datei und Pfad.
- [ ] F-J2 Ein Test geht beim Umzug verloren oder wird doppelt gezählt → die Zählung aus AK-J4 geht nicht auf, die Task ist nicht fertig.
- [ ] F-J3 Die Projekt-Suite scheitert, aber der Required Check `test` bleibt grün → per Negativprobe ausgeschlossen (AK-J3).
- [ ] F-K1 Ein Factory-Text verliert eine Anweisung ohne Ersatz-Verweis → Vorher/Nachher-Abgleich der Abschnitte (AK-K2), Review prüft die Verweise.

## Technische Notizen
**Ablauf (Q12, 2026-10-22):** ein PR, Phase 2 **manuell in zwei Etappen**, je Etappe eine frische
Session, kein `run-pipeline.sh`.
1. **Etappe J:** Lib extrahieren (AK-J2a), danach Skripte verschieben und Tests umziehen. Danach die Projekt-Suite in `ci.yml`
   verdrahten. Baseline-Zählung (AK-J4) und AK-X1-Vorher-Lauf **vor** der ersten Änderung festhalten.
2. **Etappe K:** Texte generisch machen, `docs/project/betrieb.md` anlegen, Abschnitt in `PROJECT-CONTEXT.md`, Restliste AK-K3.

Danach `/review` → `/test` → `/refactor` → `/security-review` → `/codify` über den Gesamt-Diff, in der
Reihenfolge aus `CLAUDE.md` (Lesson #351). Jede Etappe endet mit sauberem `git status` + Commit (Lesson #391).

**Hinweise aus der Bestandsaufnahme (2026-10-22):**
- **Testabschnitte zu Projekt-Dateien in `run-tests.sh`:**
  - Abschnitte: #66 (~Z. 2448), #145 (~Z. 3451), #173 (~Z. 3521), Deploy-Gate-Verdrahtung (~Z. 3698), #173/#66-Härtung (~Z. 3737).
  - Fixture-/Echtdatei-Bezüge: ~Z. 8738–8783 (#426 AK-A3), ~Z. 9094–9095 und 9278 (#431 AK-F4) sowie 9352 (#431 AK-G4).

  `neon-reset-int.sh` hat keinen eigenen Self-Test.
- **Grenzfall #431 AK-G4 (~Z. 9352):** Der Test prüft den Erweiterungspunkt `pre-push.d` (Factory-Mechanik) am echten `routes-doc-check.sh`.
  - Der Mechanik-Teil bleibt mit einem neutralen Fixture-Check in `run-tests.sh`.
  - Der Teil „Routen-Drift blockiert den Push" zieht in die Projekt-Suite.
- **`ci.yml` `test`-Job:** Er führt heute nur `eval "$FACTORY_TEST_COMMAND"` aus. Die Projekt-Suite kommt als eigener Schritt
  dazu. Prüfen, ob sie `yq` braucht; wenn ja, über `scripts/install-yq.sh` (Guardrail #258).
- **`.claude/commands/implement.md`:** Änderungen nur über den Patch-Weg (`tasks/patch-*.diff`, Lesson #91). Den Endzustand der Live-Datei testen,
  nicht den Patch (Lesson #212).
- **`bash-gotchas.md` (11 Treffer):** Die Treffer sind Beispiele (`pnpm test` vs. `pnpm test:coverage`, `${FACTORY_X-pnpm gate}`).
  Sie bekommen neutrale Kommandos (z. B. `make test`). Die Lehre bleibt unverändert.
- **`OPERATING.md` Z. 17:** verweist für die Betriebsumgebung auf `README.md` – diesen Verweis neutral formulieren bzw. auf
  `docs/project/betrieb.md` umstellen.
- **Dauerkontext:** Stand beim Branch-Start 1021/1100 Zeilen (pre-push-Ausgabe 2026-10-22). Nur noch 79 Zeilen Luft,
  daher muss AK-K1a knapp bleiben.
- **Telemetrie:** Durch den manuellen Stage-2-Ablauf gibt es keine OTEL-Telemetrie-CSV (Lesson #346). Das ist gewollt, keine Lücke.

## Offene Fragen
_Keine – Q9–Q12 entschieden am 2026-10-22 (siehe spec-426)._

## Etappe J – Ergebnisse (2026-10-23)
**Zählung (AK-J4):** Baseline `main` @ 1f36544: `run-tests.sh` **1894 grün, 0 rot**.
Nachher: Factory-Suite **1810** + Projekt-Suite **90** = 1900.
Herleitung: 1894 − 87 umgezogene Tests (68 Blöcke #66/#145/#173/Gate-Verdrahtung/Härtung, 9 TCH-Zuordnungen AK-A3,
2 Workflow-Zuordnungen AK-F4, 6 AK-G4-Echtdatei-Tests, 2 AK-D3) + 3 neue neutrale AK-G4-Tests = 1810.
Projekt-Suite = 87 umgezogen + 3 neue AK-J3-Wiring-Tests = 90. **Neue T1a-3-Tests (separat): 3 + 3 = 6**; 1894 + 6 = 1900 ✓.
**AK-J2:** `grep -E "neon-reset-int|deploy-freeze|deploy-gate|routes-doc-check" run-tests.sh` → kein Treffer.
**AK-J3 Negativprobe:** `exit 77` in `deploy-freeze.sh` → Projekt-Suite 73 grün / 14 rot, Exit 1 (Step ohne `||`) → Check `test` rot; Datei danach wiederhergestellt.
**Gates nachher:** `pre-push.sh` (lint, typecheck, test, format:check, Zuordnung 1250 Dateien, Dauerkontext 1021/1100) grün.
Offen aus Etappe J: AK-X1-Vorher-Lauf von lint/typecheck/test/format:check auf `main` nicht separat protokolliert (Baseline = Stand des Branch-Starts, nur Doku-Commits).

## Etappe K – Ergebnisse (2026-10-23)
**Blocker 2026-10-23:** `.claude/commands/implement.md` liegt unter `.claude/**` (Lesson #91) – die Änderung (5 pnpm-Treffer) liegt als
`tasks/patch-432.diff` vor (`git apply --check` ok). Der Mensch hat den Patch am 2026-10-23 angewendet; die Patch-Datei ist gelöscht, der AK-K1-Test prüft die Live-Datei direkt (Review-Rework).
**Zählung (AK-J4, Endstand):** Factory-Suite **1835** + Projekt-Suite **90** = 1925 = 1894 (Baseline) + **31 neue T1a-3-Tests**
(3 AK-G4 neutral, 3 AK-J3-Wiring, 25 Gruppe K). Alle grün, 0 rot.
**AK-K2-Abgleich:** Jede nicht-leere Zeile der Abschnitte 0.2, 0.3, 1.4, 4.3 aus `OPERATING.md` (Stand vorher) steht in `betrieb.md`;
einzige Abweichung: Überschriftsebene (`###` → `##`).
**AK-K3 – Restliste für T1b** (Datei, Zeilen mit AK1.3-Begriff `Veranstaltung|Montagsrunde|Thekenwart|TCH|tch-gastro|Neon|Vercel`, über alle `factory`-Dateien laut OWNERSHIP):

| Datei | Zeilen |
|---|---|
| `docs/factory/OPERATING.md` | 4 |
| `docs/factory/OWNERSHIP.md` | 6 |
| `docs/factory/adr/008-async-trigger-mechanism.md` | 1 |
| `docs/factory/adr/012-github-platform-migration.md` | 2 |
| `docs/factory/adr/029-branch-protection-main-ruleset.md` | 4 |
| `docs/factory/adr/030-pr-shepherd-direct-merge-fallback.md` | 1 |
| `docs/factory/adr/037-lessons-auslagern-aus-import-kontext.md` | 1 |
| `docs/factory/adr/041-config-validation-ci-required-check.md` | 1 |
| `docs/factory/adr/047-import-kontext-guidelines-nach-erzwungenheit.md` | 1 |
| `docs/factory/adr/063-factory-eigenes-repo-vendored-manifest.md` | 28 |
| `docs/factory/lessons/code-style.md` | 1 |
| `docs/factory/lessons/factory-workflow.md` | 8 |
| `docs/factory/lessons/testing.md` | 1 |
| `scripts/checks/completion-check.sh` | 1 |
| `scripts/checks/tests/fixtures/lessons-split-426.tsv` | 1 |
| `scripts/checks/tests/run-tests.sh` | 12 |
| `scripts/sync-issues.sh` | 1 |

**AK-X1:** `run-tests.sh` 1835 grün/0 rot, Projekt-Suite 90 grün/0 rot, `pre-push.sh` (lint, typecheck, test, format:check) grün (siehe Commit).
**Offen:** AK-X2 (Required Checks in der PR-CI) und AK-X3 (Stage-2-Probelauf nach dem Merge) – erst nach Push/Merge prüfbar.

## Review-Findings
Siehe `tasks/review-432.md`: Runde 1 NEEDS_REWORK (4 wichtige Findings, behoben) → APPROVED.

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/432-factory-split-t1a-3-projekt-orte-texte`
Erstellt: 2026-10-22 22:39

## /test-Ergebnis (2026-10-23)

- Reine Bash-/Doku-Änderung, kein App-Code: der Coverage-Lauf (`pnpm test:coverage`) entfällt; Maßstab ist die AK-Abdeckung der beiden Bash-Suiten.
- Factory-Suite 1835 grün / 0 rot, Projekt-Suite 90 grün / 0 rot (Summe 1925 = 1894 + 31 neue, AK-J4).
- AK-J1–J3 und AK-K1/K1a/K2 haben je eigene Assertions (Wiring, Negativprobe AK-J3, Stack-Begriffe je Datei, Abschnittslänge, Anker/Pointer); AK-K3 ist ein Dokument-Ergebnis (Residuenliste), AK-X2/X3 sind erst nach Push/Merge prüfbar.
- Keine Lücke gefunden, keine neuen Tests nötig, kein Produktionscode geändert.

## /refactor-Ergebnis (2026-10-23)

- `print_summary` in `scripts/checks/tests/lib/assert-helpers.sh`: die Ergebnis-Fußzeile steht nur noch einmal und wird von beiden Suiten aufgerufen (Review-Nitpick 1).
- `docs/project/betrieb.md`: der neu entstandene Block „Kurzreferenz der Kommandos" ist entfernt, weil er nur Kommandos aus dem Text darüber und aus `PROJECT-CONTEXT.md` wiederholte (Review-Nitpick 2). Er war nicht Teil von `OPERATING.md` auf `main`, also geht kein Originalinhalt verloren.
- Folge: der AK-K2-Anker `pnpm db:seed` traf nur diesen Block. Er ist jetzt `` `db:seed` `` und entspricht damit dem Wortlaut der übernommenen Setup-Zeile.
- Kein neues Verhalten. Beide Suiten danach unverändert grün: Factory 1835, Projekt 90, 0 rot.

PR-Shepherd 2026-10-23: Merge freigegeben (Auto-Merge, squash) – keine Review-Kommentare, Branch aktuell auf main; CI lief beim Freigeben noch (Required Checks entscheiden server-seitig). AK-X2/X3 nach dem Merge belegen.
