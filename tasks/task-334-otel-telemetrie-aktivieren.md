# Task 334: otel-telemetrie-aktivieren

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung

OTEL-Token-/Kosten-Metriken **je Pipeline-Lauf persistieren**, damit die Modell-/Tier-Wahl
(ADR-038 `tier_by_size`, ADR-009-Kalibrierung) auf gemessenen Kosten statt auf Annahmen beruht.
Die Telemetrie-Ebene aus ADR-006 existiert bisher nur als Beispiel-Datei (Default aus) – es
entsteht keine Historie. #314 hat diese Arbeit ausdrücklich vertagt („braucht eine eigene ADR
und eine eigene Issue") – diese Issue ist #334.

**Auftraggeber-Vorgaben** (Stand 2026-09-11): Erzeugung in `run-pipeline.sh` integriert und
standardmäßig an, per Parameter abschaltbar; die Werte **personenfrei je Lauf in Git**,
mit Bezug zum Task. Kein Telemetrie-Backend/Gateway.
*(Die ursprüngliche Vorgabe „rein lokal, kein Versand an ein zentrales Ziel" ist damit
überholt – personenfreie Werte gehen per Git-Push mit; der Personenbezug bleibt
ausgeschlossen, AK5.)*

Spec: [`docs/specs/spec-334-otel-metriken-je-lauf-persistieren.md`](../docs/specs/spec-334-otel-metriken-je-lauf-persistieren.md)

## Akzeptanzkriterien

- [x] **AK1 (Persistenz je Lauf):** GIVEN Telemetrie aktiviert, WHEN ein Lauf endet, THEN
      existiert ein Artefakt mit Token-/Kosten-Ist-Werten dieses Laufs, ohne den vorherigen
      Lauf zu überschreiben.
- [x] **AK2 (Sub-Agenten-Anteil):** GIVEN ein Lauf mit Sub-Agent, WHEN das Artefakt
      geschrieben ist, THEN ist der Sub-Agenten-Anteil getrennt von der Hauptsession
      ausgewiesen.
- [x] **AK3 (Schritt-Zuordnung):** GIVEN ein Lauf über mehrere Schritte, WHEN das Artefakt
      geschrieben ist, THEN sind die Kosten den einzelnen Schritten zuzuordnen.
- [x] **AK4 (opt-in, kein Zwang):** GIVEN Telemetrie nicht aktiviert, WHEN ein Lauf
      stattfindet, THEN verhält er sich unverändert wie vor dieser Task.
- [x] **AK5 (keine Personendaten):** GIVEN eine Roh-Messung mit `user.email`, `user.id`,
      `user.account_id`, `user.account_uuid`, `organization.id` oder `session.id`, WHEN das
      Artefakt entsteht, THEN enthält es keines dieser Felder – Projektion als **Whitelist**.
      Roh-Output nie getrackt; `--publish`-Report weiterhin ohne Telemetrie-Daten.
- [x] **AK6 (fail-open):** GIVEN die Erhebung/Auswertung/der Commit schlägt fehl, WHEN der Lauf
      endet, THEN bleibt der ursprüngliche Exit-Code unverändert.
- [x] **AK7 (versioniert, ohne den Lauf zu gefährden):** GIVEN ein abgeschlossener Lauf, WHEN
      `git status` läuft, THEN ist der Arbeitsbaum sauber, **weil die CSV committet und gepusht
      ist**; und ein Folgelauf im selben Worktree scheitert nicht an der Telemetrie
      (`verify_final_state` prüft dirty Tree **und** ungepushte Commits).
- [x] **AK8 (Auswertbarkeit für Modellwahl):** GIVEN mehrere persistierte Läufe, WHEN Kosten
      je Modell verglichen werden, THEN ist je Messwert das verursachende Modell erkennbar.

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

**Gemessene Faktenlage** (Proben in Task 334, ~0,45 USD, `claude`-CLI 2.1.267 mit
`OTEL_METRICS_EXPORTER=console`) – Details in der Spec:

- `agent.name` **funktioniert** (gemessen `"Explore"`), hängt an `cost.usage` und
  `token.usage`; Sub-Agent ist eine eigene, disjunkte Messreihe → addieren.
- `skill.name` erscheint **nur** beim echten Slash-Command, nie beim Pipeline-Aufrufweg
  (Skill-Datei-Text als Prompt, `run-pipeline.sh:271`).
- Schritt-Zuordnung ist trotzdem möglich: je Schritt ein eigener `claude`-Prozess.
- Console-Output stört die Pipeline-Logik **nicht** (`run_skill` wertet Exit-Code und
  Report-Dateien aus, nicht den Text-Output).
- Attribute enthalten `user.email` + Account-IDs → Grund für die strikte Lokal-Vorgabe (AK5).

### Implementierungs-Hinweise (aus ADR-049)

Architektur-Entscheidung: [ADR-049](../docs/adr/049-telemetrie-persistenz-je-pipeline-lauf.md).
**Status dort auf `Accepted` flippen, sobald die Umsetzung beginnt** (Lesson aus #197).

**Zu bauen** (Stand nach der E3/E4-Revision vom 2026-09-11):

1. **Integration in `scripts/run-pipeline.sh`** – aktiviert selbst
   (`CLAUDE_CODE_ENABLE_TELEMETRY=1`, `OTEL_METRICS_EXPORTER=console`), erntet am Ende.
   **Default an**, Abschaltung per Parameter im Muster von `--dry-run`
   (Argument-Parsing `run-pipeline.sh:53–60`). Harte Pflichten:
   - Exit-Code **unverändert** durchreichen (AK6, fail-open). Bei Default an ist das kritisch,
     weil jeder Lauf betroffen ist. Achtung `set -euo pipefail` in Kombination mit `tee`:
     `PIPESTATUS` bzw. explizites Einsammeln nutzen, sonst maskiert die Pipe den echten Code
     (Muster in `run_skill`, `run-pipeline.sh:286–296`).
   - Der bestehende EXIT-Trap für die Prozess-Metriken (`run-pipeline.sh:506–521`) ist das
     Vorbild für „läuft auch bei Abbruch, fail-open" – darf aber **nicht** verdrängt werden:
     ein zweiter `trap … EXIT` **ersetzt** den ersten, er kommt nicht hinzu. Verifiziert am
     2026-09-11: `bash -c 'trap "echo A" EXIT; trap "echo B" EXIT; true'` gibt **nur** `B` aus.
     Also die Telemetrie-Ernte in den vorhandenen Handler einhängen, statt einen zweiten
     EXIT-Trap zu registrieren – sonst fällt die Prozess-Messung aus #314 lautlos weg.
     Ergänzend `bash-gotchas.md` §12 (Exit-Code im Handler; das Ersetzungs-Verhalten steht
     dort noch nicht → Kandidat für `/codify`).
   - Roh-Output begrenzen (ein Mini-Aufruf ≈ 1300 Zeilen).
2. **Ernte-/Auswertungs-Seam** unter `scripts/lib/` – reine, testbare Funktionen (analog
   `scripts/lib/tier-select.sh`), damit die Auswertung ohne echten `claude`-Lauf gegen eine
   Fixture prüfbar ist. Der Orchestrator ruft, er rechnet nicht.
3. **Getrackte CSV je Lauf** unter `tasks/telemetry-<task-id>-<zeitstempel>.csv` (geprüft: von
   keinem `.gitignore`-Muster erfasst, also trackbar). Der Lauf **committet und pusht sie
   selbst** – beides nötig, weil `verify_final_state` dirty Tree **und** ungepushte Commits
   prüft (`verify-final-state.sh:52–59`).
   - **Ort im Ablauf: nach `run_skill "codify"` (`:602`), vor Phase 7 `/pr-shepherd` (`:605`).**
     Danach ist der PR bei `PR_SHEPHERD=true` gemergt, ein Commit hätte kein Ziel, und
     Direkt-Commits auf `main` sind verboten. Konsequenz: die Kosten von `/pr-shepherd` selbst
     fehlen in der Reihe – bewusst, dokumentiert in ADR-049.
   - **Nicht `scripts/factory-commit.sh` verwenden!** Es macht `git add -A`
     (`factory-commit.sh:89`) und würde bei einem Abbruch halbfertige Agenten-Änderungen
     mitcommitten. Gezielt nur die CSV stagen.
4. **Whitelist-Projektion (AK5)** im Seam: nur benannte Felder aufnehmen
   (Zeitstempel, Task-ID, Schritt, `model`, `agent.name`, Metrik, Werttyp, Wert). **Nie**
   `user.email`, `user.id`, `user.account_id`, `user.account_uuid`, `organization.id`,
   `session.id`. Keine Blacklist – ein neues Attribut in einer künftigen CLI-Version würde
   sonst lautlos in ein getracktes, gepushtes Artefakt wandern, und die Git-Historie
   konserviert den Fehler.
5. **Guards in `scripts/checks/tests/run-tests.sh`:**
   - Assertion `:292` **ersetzen**, nicht löschen – die alte Zusicherung („OTEL nicht in
     run-pipeline.sh gesourct") ist durch E3 ungültig. Die neue bewacht: Default an **und**
     Abschalt-Parameter wirkt wirklich.
   - **Personendaten-Guard** (die tragende Sicherung, seit die Werte ins Repo gehen): Roh-Eingabe
     **mit** Personenfeldern hineingeben, assertieren, dass die CSV keines davon enthält.
   - **Format-Drift-Guard** samt **anonymisierter** Fixture (kein `user.email` ins Repo) – muss
     laut scheitern, wenn Console-Format oder Marker-Zeile nicht mehr erkannt werden. Kein
     stilles 0.
6. **ADR-045-Invariante** ist bereits korrigiert (Verweis auf ADR-049); beim Umsetzen
   gegenprüfen, dass die dortige Beschreibung zum gebauten Verhalten passt.
7. **Doku**: Default an, Abschalt-Parameter und Ablageort in `CLAUDE.md` bzw.
   `docs/factory/OPERATING.md`. Dabei erwähnen, dass jeder Task-PR ab jetzt eine
   Telemetrie-CSV mitführt – das taucht in jedem Diff auf und sollte niemanden überraschen.

**Parsing-Anker (gemessen, gegen Fixture zu testen):**

- Metrik-Block: `{ descriptor: { name: "claude_code.cost.usage", … }, dataPoints: [ … ] }`;
  Blockgrenze ist `^{` … `^}` auf Spalte 0. Ein Fenster über `attributes: {` … `value:` ist
  fehleranfällig – bei der Messung in dieser Task hat genau das zunächst falsch gezählt.
- Werttypen stehen als `type: "input"|"output"|"cacheRead"|"cacheCreation"` **innerhalb** des
  Attribut-Blocks; `model` und optional `"agent.name"` daneben.
- Counter sind **kumulativ**: je Attributkombination den letzten/höchsten Wert nehmen, nicht
  über Export-Zyklen summieren (sonst Mehrfachzählung – die 3-Sekunden-Intervalle der Proben
  lieferten denselben Wert zweimal).
- Hauptsession und Sub-Agent sind **disjunkte** Messreihen → für die Lauf-Summe addieren.
- Schritt-Zuordnung über die Marker-Zeile `→ Starte: /<skill> <id>` (`run-pipeline.sh:250`).

**Nicht anfassen** (ausdrücklich, ADR-049 „Betroffene Stellen"): `scripts/metrics.sh`,
`config/otel.env.example`, ADR-006 (Ebenen-Trennung und Option-B-Ablehnung gelten weiter).

> **Korrektur am 2026-09-11 (während `/implement`):** Diese Zeile führte bis dahin zusätzlich
> `scripts/run-pipeline.sh`, die Assertion `run-tests.sh:292` und ADR-045 als „nicht anfassen"
> auf – ein Überbleibsel der **Wrapper**-Fassung von ADR-049 §E3, das den Punkten 1 und 5
> derselben Task direkt widersprach. Kanonisch ist ADR-049 → „Betroffene Stellen": genau diese
> drei sind zu **ändern**. (Muster der Lesson „bei Widerspruch zwischen Spec und Lesson gilt
> der Lesson-Text", hier: ADR schlägt die abgeleitete Notiz.)

**Wegwerf-Proben:** Die Proben der Requirements-/Architektur-Session lagen nicht mehr im
Worktree; die Messung wurde am 2026-09-11 in der Implementierungs-Session **neu erhoben**
(`claude`-CLI 2.1.267, drei Proben à Haiku) – eine Fixture, die man nicht selbst gesehen hat,
taugt als Drift-Guard nicht. Die anonymisierte Fixture liegt jetzt getrackt unter
`scripts/checks/tests/fixtures/otel-console-sample.txt`; die personenbehafteten Roh-Proben
sind gelöscht.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

Alle vier waren ADR-Trigger und sind in
[ADR-049](../docs/adr/049-telemetrie-persistenz-je-pipeline-lauf.md) entschieden:

- [x] ADR-006 Option B? → **Nein** (ADR-049 §E1). Beide Ablehnungsgründe greifen nicht: es wird
      nichts nachgebaut (nur CLI-Ist-Werte übernommen), und OTEL ist laut ADR-006 selbst
      backend-unabhängig. Verbindliche Grenze: **nie selbst rechnen/schätzen/interpolieren** –
      fehlt ein Wert, bleibt er leer.
- [x] Erhebungsweg → **Console-Exporter + Format-Drift-Guard** (§E2). Der lokale Collector
      verlöre Daten still, wenn er nicht läuft; Prometheus scheitert an der Prozess-Lebensdauer.
- [x] Verankerung → **in `run-pipeline.sh` integriert, Default an, per Parameter abschaltbar**
      (§E3, **revidiert am 2026-09-11** auf Auftraggeber-Entscheidung; vorher: Wrapper).
      Folge: Assertion `run-tests.sh:292` **ersetzen** und ADR-045-Invariante korrigieren
      (letzteres erledigt).
- [x] Ablageort/Format → **getrackt in Git**: `tasks/telemetry-<task-id>-<zeitstempel>.csv`,
      im Lauf committet und gepusht (§E4, **zweimal revidiert am 2026-09-11**).
      Weg dorthin: (1) zuerst gitignoret unter `tasks/` – verworfen, weil
      `git worktree remove` gitignorete Dateien ohne `--force` und **ohne Warnung** mitlöscht;
      (2) dann gitignoret im gemeinsamen git-Verzeichnis – überlebte das, blieb aber auf einem
      Rechner (nicht versioniert, nicht teilbar); (3) jetzt getrackt in Git auf
      Auftraggeber-Entscheidung. Weiterhin nicht in `tasks/metrics-<datum>.md` (geht via
      `--publish` nach GitHub und bleibt der Prozess-Ebene).
- [x] Personenbezug → **Whitelist + Guard** (§E5, neu). Nötig, weil mit „getrackt in Git" die
      frühere strukturelle Sicherung entfällt.

## Umsetzungs-Notizen (`/implement`, 2026-09-11)

**Gebaut:**

| Datei | Rolle |
|-------|-------|
| `scripts/lib/telemetry-harvest.sh` | Ernte-Seam: `harvest_telemetry_csv <roh-log> <zeitstempel> <task-id>` → CSV auf stdout. Reine Datei-in/stdout-Funktion, ohne claude-Lauf prüfbar. |
| `scripts/run-pipeline.sh` | Aktivierung (Default an, `--no-telemetry`), Marker-Zeile + Roh-Log-Sink in `run_skill`, `persist_telemetry()`, Aufruf zwischen `/codify` und `/pr-shepherd` sowie im bestehenden EXIT-Trap |
| `scripts/checks/tests/fixtures/otel-console-sample.txt` | anonymisierte Console-Exporter-Fixture (echt gemessen, Personen**werte** ersetzt, Personen**felder** bewusst erhalten) |
| `scripts/checks/tests/run-tests.sh` | #334-Block: Seam-Verhalten, Personendaten-Guard, Format-Drift-Guard, E2E gegen den echten Orchestrator; ersetzte Assertion; neuer Helfer `cp_pipeline_libs` |

**CSV-Spalten (Whitelist, AK5):**
`run_timestamp, task_id, step_seq, step, metric, model, query_source, agent_name, value_type, value`

**Belege je AK** (alle in `scripts/checks/tests/run-tests.sh`, Suite grün: 1510/1510):

- **AK1** – E2E-Lauf legt `tasks/telemetry-905-<zeitstempel>.csv` an; der Zeitstempel im
  Dateinamen trennt mehrere Läufe. Seam-Test: genau 10 Datenzeilen für die 10 Datenpunkte der
  Fixture (keine erfunden, keine verloren).
- **AK2** – `query_source` (`main`/`subagent`) + `agent_name`; Sub-Agent ist eine eigene Zeile,
  nicht in die Hauptsession eingerechnet. E2E: `,subagent,Explore,` steht in der Datei.
- **AK3** – Schritt-Zuordnung über die farbfreie Marker-Zeile, die `run_skill` in den Roh-Log
  schreibt. `step_seq` unterscheidet **Aufrufe** desselben Skills: die Rework-Schleife ruft
  `/implement` mehrfach auf, jeder Aufruf ist ein eigener Prozess mit eigenem, bei 0
  startendem Counter – ohne die laufende Nummer verschmölzen beide zu einer Zeile und der
  zweite Betrag verschwände.
- **AK4** – Default an (`TELEMETRY=true`), `--no-telemetry` schaltet ab. E2E-Beleg über einen
  claude-Stub, der die geerbten Variablen protokolliert: ohne Parameter `telemetry=1
  exporter=console`, mit Parameter `telemetry=unset exporter=unset`.
- **AK5** – Whitelist im awk-Programm (nur `model`, `query_source`, `agent.name`, `type`
  werden überhaupt gelesen). Guard mit **Positivkontrolle**: die Fixture trägt alle fünf
  Personenfelder als Roh-Eingabe, die erzeugte CSV keines davon – und auch keinen der Werte.
- **AK6** – fail-open an vier Stellen: Format-Drift, leerer/gescheiterter Commit, gescheiterter
  Push, nicht anlegbarer Roh-Log. E2E-Beleg für den Exit-Code als **Vergleich** desselben
  Laufs mit und ohne Telemetrie – „unverändert" ist nur relativ zu einem Referenzlauf prüfbar.
- **AK7** – die CSV wird committet **und** gepusht; scheitert der Push, wird der Commit
  zurückgenommen und die Datei gelöscht (entweder beides oder nichts). Sonst ließe ein
  liegengebliebener Commit `verify_final_state` jedes Folgelaufs im selben Worktree scheitern.
  Vorbedingung leerer Index, damit der Rollback nie fremde Staging-Arbeit verwirft.
- **AK8** – Spalte `model` je Messwert.

**Nicht-offensichtliche Entscheidungen:**

1. **Kein `OTEL_METRIC_EXPORT_INTERVAL`.** Gemessen: ohne Intervall flusht die CLI beim
   Prozess-Ende genau einmal vollständig; mit Intervall entstehen zusätzliche Zyklen mit
   **identischen** kumulativen Werten. Der Seam entdoppelt sie (Maximum je Schlüssel), aber
   der Roh-Log wächst unnötig.
2. **Metriknamen-Whitelist:** nur `claude_code.token.usage` und `claude_code.cost.usage`.
   `active_time.total` und `session.count` tragen ein `type`-Attribut mit ganz anderer
   Bedeutung (`"cli"`, `start_type`) – sie mit demselben Parser aufzunehmen hätte
   Werttyp-Spalten mit Scheinbedeutung erzeugt.
3. **`PIPESTATUS[0]` statt `$?`** beim claude-Aufruf, seit `telemetry_capture` als Sink
   dahinterhängt: unter `pipefail` färbt ein gescheitertes `tee` sonst den Skill rot. Auf
   bash 3.2 (macOS-Default) gegengeprüft – Producer-Fehler → 7, Sink-Fehler → 0, beide ok → 0.
4. **Kein zweiter `trap … EXIT`.** Ein zweiter EXIT-Trap *ersetzt* den ersten; die Ernte hängt
   deshalb im bestehenden `measure_process_metrics_on_exit`, sonst wäre die Prozess-Messung
   aus #314 lautlos weggefallen.
5. **`cp_pipeline_libs` als neuer Test-Helfer.** Die cp-Gruppe der von `run-pipeline.sh`
   gesourcten Libs lag **achtmal** kopiert in `run-tests.sh`; eine neunte Kopie hätte die
   Lesson-Serie #197/#240/#267/#310 ein weiteres Mal wiederholt. Jetzt ein Ort.

**Umgebungsartefakt (für spätere Runden):** `CLAUDE_CODE_ENABLE_TELEMETRY=1` ist in einer
interaktiven Claude-Code-Sitzung **ambient gesetzt**. Der E2E-Test knipst es (und
`OTEL_METRICS_EXPORTER`) per `env -u` aus – ohne das wäre der `--no-telemetry`-Test lokal
falschrot **und** der Default-an-Test falschgrün (er belegte die ambiente Variable statt der
Aktivierung durch die Pipeline). Dieselbe Klasse wie das `PR_SHEPHERD`-Durchschlagen aus #262.

## Blocker (erledigt)

**Blocker 2026-09-11, behoben 2026-09-11:** `.claude/commands/daily-metrics.md` ist für
Agenten gesperrt (`Edit(.claude/**)`, Lesson #91). Der Mensch hat `tasks/patch-334.diff`
angewendet; der Doku-Guard dagegen (gegen die Live-Datei, nicht das Patch-Artefakt –
Lesson #212) ist ergänzt. Patch-Datei entfernt, sie war nur das Transportmittel.

## Rework-Runde 1 (`/implement`, nach `/review` NEEDS_REWORK, 2026-09-11)

Beide Kritisch-Findings aus `tasks/review-334.md` behoben (Details dort unter
„Rework-Notiz"): leckende CSV in zwei Fail-Open-Zweigen von `telemetry_persist()`
(vormals `persist_telemetry`) sowie Kosten-Unterzählung bei Retry-mit-Backoff
(`telemetry_note_step` jetzt je Versuch, nicht je `run_skill()`-Aufruf). Dazu die
Wichtig-/Nitpick-Findings (Namenskonsistenz, `--dry-run` legt keine Roh-Log-Datei mehr an).
Je RED-Test vor dem Fix. Bash-Suite 1528/1528 grün.

## Rework-Runde 2 (`/implement`, nach `/review` NEEDS_REWORK, 2026-09-12)

CI (`factory-self-test`, required Check) meldete 3 rote Tests, obwohl lokal alles grün war –
Ursache: `telemetry_persist()`s Commit verließ sich auf ambiente Git-Identität, die auf einem
frischen `ubuntu-latest`-Runner fehlt (macOS synthetisiert dort klaglos eine Fallback-Identität
und verdeckt den Fall). Fix: expliziter `-c user.email=…`/`-c user.name=…` am Commit. RED→GREEN
empirisch in einem `ubuntu:24.04`-Container gegen die reale Commit-Zeile belegt, da lokal auf
macOS nicht reproduzierbar. Details: `tasks/review-334.md`. Bash-Suite 1530/1530 grün.

## Offene Nachtests

- **Keine UI-Berührung** – diese Task ändert ausschließlich Shell-/Doku-Ebene. Oberflächentests
  (Playwright, Dev-Server) entfallen; `pnpm lint`/`pnpm test` bleiben als Gates.
- **Erster echter Pipeline-Lauf mit Telemetrie** steht noch aus: die E2E-Tests fahren den
  echten Orchestrator, aber mit gestubbter CLI. Der erste Lauf gegen die echte CLI ist der
  Nachweis, dass Console-Format und Marker-Zuordnung auch in freier Wildbahn greifen – der
  Drift-Guard meldet ein Abweichen laut.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `chore/334-otel-telemetrie-aktivieren`
Erstellt: 2026-09-10 23:10
