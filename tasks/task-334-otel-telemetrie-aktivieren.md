# Task 334: otel-telemetrie-aktivieren

## Status
- [ ] In Bearbeitung
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

**Auftraggeber-Vorgabe:** rein lokal, kein Versand an ein zentrales Ziel.

Spec: [`docs/specs/spec-334-otel-metriken-je-lauf-persistieren.md`](../docs/specs/spec-334-otel-metriken-je-lauf-persistieren.md)

## Akzeptanzkriterien

- [ ] **AK1 (Persistenz je Lauf):** GIVEN Telemetrie aktiviert, WHEN ein Lauf endet, THEN
      existiert ein Artefakt mit Token-/Kosten-Ist-Werten dieses Laufs, ohne den vorherigen
      Lauf zu überschreiben.
- [ ] **AK2 (Sub-Agenten-Anteil):** GIVEN ein Lauf mit Sub-Agent, WHEN das Artefakt
      geschrieben ist, THEN ist der Sub-Agenten-Anteil getrennt von der Hauptsession
      ausgewiesen.
- [ ] **AK3 (Schritt-Zuordnung):** GIVEN ein Lauf über mehrere Schritte, WHEN das Artefakt
      geschrieben ist, THEN sind die Kosten den einzelnen Schritten zuzuordnen.
- [ ] **AK4 (opt-in, kein Zwang):** GIVEN Telemetrie nicht aktiviert, WHEN ein Lauf
      stattfindet, THEN verhält er sich unverändert wie vor dieser Task.
- [ ] **AK5 (kein zentraler Versand):** GIVEN aktivierte Telemetrie, WHEN ein Lauf läuft,
      THEN geht kein Telemetrie-Datum an einen netzwerk-externen Empfänger, und der via
      `--publish` veröffentlichte Prozess-Report enthält keine Telemetrie-Daten.
- [ ] **AK6 (fail-open):** GIVEN die Erhebung/Auswertung schlägt fehl, WHEN der Lauf endet,
      THEN bleibt der ursprüngliche Exit-Code unverändert.
- [ ] **AK7 (kein dirty Arbeitsbaum):** GIVEN ein abgeschlossener Lauf, WHEN `git status`
      läuft, THEN ist der Arbeitsbaum sauber (Artefakt von `.gitignore` gedeckt, ADR-040).
- [ ] **AK8 (Auswertbarkeit für Modellwahl):** GIVEN mehrere persistierte Läufe, WHEN Kosten
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
3. **Ablage im gemeinsamen git-Verzeichnis**, je Lauf eine CSV.
   **Kein `.gitignore`-Eintrag nötig** – die Datei liegt ausserhalb jedes Arbeitsbaums (gemessen:
   `git status` bleibt sauber, sie erscheint nicht einmal als ignoriert).
   **Falle:** `git rev-parse --git-common-dir` liefert im **Hauptbaum** einen *relativen* Pfad
   (`.git`), im Worktree einen absoluten. Immer auflösen (z. B. `cd "$(…)" && pwd`), sonst
   landet die Datei relativ zum jeweiligen cwd an wechselnden Orten.
4. **Assertion `run-tests.sh:292` ersetzen**, nicht löschen – die alte Zusicherung („OTEL nicht
   in run-pipeline.sh gesourct") ist durch E3 ungültig. Die neue muss bewachen: Default an
   **und** Abschalt-Parameter wirkt wirklich. Ein entfernter Guard hinterlässt eine unbewachte
   Zusicherung. Dazu **Format-Drift-Guard + anonymisierte Fixture** (kein `user.email` ins
   Repo!) – muss laut scheitern, wenn Console-Format oder Marker-Zeile nicht mehr erkannt
   werden. Kein stilles 0.
5. **ADR-045-Invariante** ist bereits korrigiert (Verweis auf ADR-049); beim Umsetzen
   gegenprüfen, dass die dortige Beschreibung zum gebauten Verhalten passt.
6. **Doku**: Default an, Abschalt-Parameter und Ablageort in `CLAUDE.md` bzw.
   `docs/factory/OPERATING.md` – der Ort in `.git/` ist ungewöhnlich und muss auffindbar sein.

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

**Nicht anfassen** (ausdrücklich, ADR-049 „Betroffene Stellen"): `scripts/run-pipeline.sh`,
`scripts/metrics.sh`, die Assertion `run-tests.sh:292`, `config/otel.env.example`, ADR-006,
ADR-045.

**Wegwerf-Proben dieser Session** liegen als `scripts/otel-*.tmp.{sh,txt}` im Worktree
(gitignored, per `git check-ignore -v` geprüft) und können als Fixture-Rohmaterial dienen –
enthalten aber `user.email`/Account-IDs, also **nicht** als Fixture ins Repo kopieren, sondern
anonymisierte Auszüge verwenden.

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
- [x] Ablageort/Format → **Unterverzeichnis des gemeinsamen git-Verzeichnisses**
      (`git rev-parse --git-common-dir`), je Lauf eine CSV (§E4, **revidiert am 2026-09-11**
      nach Messung; vorher: `tasks/telemetry-*.csv` gitignored). Grund: `git worktree remove`
      löscht gitignorete Dateien ohne `--force` und **ohne Warnung** mit – die Historie hätte
      das nach CLAUDE.md vorgeschriebene Aufräumen nicht überlebt. Weiterhin nicht in
      `tasks/metrics-<datum>.md` (geht via `--publish` nach GitHub → AK5-Verstoß).

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `chore/334-otel-telemetrie-aktivieren`
Erstellt: 2026-09-10 23:10
