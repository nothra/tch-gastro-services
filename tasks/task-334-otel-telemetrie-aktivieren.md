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

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

Alle vier sind ADR-Trigger → `/architecture` (Details je Frage in der Spec):

- [ ] Ist das Auslesen des Console-Exporters die von ADR-006 **abgelehnte** Option B
      („Token/Kosten aus Logs selbst parsen") oder die legitime Telemetrie-Ebene?
- [ ] Erhebungsweg: Console-Output parsen vs. lokaler OTLP-Empfänger auf `localhost`.
- [ ] Verankerung: `run-pipeline.sh` bedingt erweitern (kollidiert mit dem fail-closed-Gate
      `run-tests.sh:292` **und** der ADR-045-Invariante) vs. eigener Wrapper-Einstiegspunkt.
- [ ] Ablageort/Format: eigenes Artefakt vs. Abschnitt in `tasks/metrics-<datum>.md`
      (Letzteres kollidiert mit AK5, weil diese Datei via `--publish` nach GitHub geht).

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `chore/334-otel-telemetrie-aktivieren`
Erstellt: 2026-09-10 23:10
