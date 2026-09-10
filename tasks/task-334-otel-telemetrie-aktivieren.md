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

**Zu bauen:**

1. **Wrapper-Einstiegspunkt** unter `scripts/` – setzt die OTEL-Variablen
   (`CLAUDE_CODE_ENABLE_TELEMETRY=1`, `OTEL_METRICS_EXPORTER=console`), ruft die
   **unveränderte** `run-pipeline.sh` auf, erntet danach. Zwei harte Pflichten:
   - Exit-Code der Pipeline **unverändert** durchreichen (AK6) – auch wenn die Ernte scheitert.
     Achtung `set -e`/`pipefail` in Kombination mit `tee`: `PIPESTATUS` bzw. explizites
     Einsammeln nutzen, sonst maskiert die Pipe den echten Code (vgl. das Muster in
     `run_skill`, `run-pipeline.sh:286–296`).
   - Roh-Output begrenzen, nicht unbegrenzt wachsen lassen (ein Mini-Aufruf ≈ 1300 Zeilen).
2. **Ernte-/Auswertungs-Seam** unter `scripts/lib/` – reine, testbare Funktionen (analog
   `scripts/lib/tier-select.sh`), damit die Auswertung ohne echten `claude`-Lauf gegen eine
   Fixture prüfbar ist.
3. **`.gitignore`-Muster** `tasks/telemetry-*` – **vor** dem ersten Lauf, sonst dirty
   Arbeitsbaum (AK7, ADR-040). Deckung mit `git check-ignore -v` belegen, nicht behaupten
   (Lesson aus #67/#324).
4. **Format-Drift-Guard + Fixture** in `scripts/checks/tests/run-tests.sh` – muss laut scheitern,
   wenn das Console-Format oder die Marker-Zeile nicht mehr erkannt wird. Kein stilles 0.

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
- [x] Verankerung → **eigener Wrapper-Einstiegspunkt** (§E3). `run-pipeline.sh` bleibt
      unangetastet, Gate `run-tests.sh:292` und ADR-045-Invariante bleiben gültig.
- [x] Ablageort/Format → **`tasks/telemetry-<task-id>-<zeitstempel>.csv`, gitignored** (§E4).
      Nicht in `tasks/metrics-<datum>.md` (geht via `--publish` nach GitHub → AK5-Verstoß).

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `chore/334-otel-telemetrie-aktivieren`
Erstellt: 2026-09-10 23:10
