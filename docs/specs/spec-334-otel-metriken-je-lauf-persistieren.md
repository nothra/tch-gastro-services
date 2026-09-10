# Spec: OTEL-Token-/Kosten-Metriken je Pipeline-Lauf persistieren

## Kontext

[ADR-006](../adr/006-measurement-architecture.md) trennt zwei Messebenen: **Prozess**
(Git/GitHub) und **Telemetrie** (Token/Kosten/Modell-Nutzung via OTEL). Die Prozess-Ebene
läuft seit #314 automatisch je Pipeline-Lauf ([ADR-045](../adr/045-prozess-messung-je-pipeline-lauf.md)).
Die Telemetrie-Ebene existiert dagegen nur als **Beispiel-Datei** (`config/otel.env.example`,
Default aus) – es entstehen keine persistierten Token-/Kosten-Daten.

Damit fehlt die Grundlage für eine Klasse von Entscheidungen, die die Factory laufend trifft:
**welches Modell für welchen Schritt.** [ADR-038](../adr/038-modell-tiers-groessenabhaengig.md)
vergibt Tiers größenabhängig (`tier_by_size`), [ADR-009](../adr/009-factory-configuration.md)
nennt als späteren Kalibrierungs-Input ausdrücklich „OTEL-Historie (ADR-006) → Pro-Skill-
Verteilung → kalibrierte Defaults". Diese Historie gibt es nicht. Auch
[ADR-047](../adr/047-import-kontext-guidelines-nach-erzwungenheit.md) musste ohne Kostenzahlen
entscheiden, weil OTEL per Default aus ist.

`spec-314` hat diese Arbeit bewusst vertagt und die Bedingungen benannt: die „Ernte" liegt
„genau auf der Grenze, die ADR-006 zieht (Option B: ‚Token/Kosten aus Logs oder API-Antworten
selbst parsen' – abgelehnt). Das braucht eine eigene ADR und eine eigene Issue." Diese Issue
ist #334; die ADR ist
[ADR-049](../adr/049-telemetrie-persistenz-je-pipeline-lauf.md), in dieser Task entstanden.

### Vorab gemessene Faktenlage (Task 334, Haiku-Proben, ~0,45 USD)

Damit spätere Runden diese Messung nicht wiederholen müssen – alles gegen die lokal
installierte `claude`-CLI 2.1.267 mit `OTEL_METRICS_EXPORTER=console` erhoben:

| Frage | Messergebnis |
|-------|--------------|
| Emittiert die CLI überhaupt? | Ja: `claude_code.token.usage`, `.cost.usage`, `.session.count`, `.active_time.total` |
| Token-Aufschlüsselung | nach `model` und `type` (`input`/`output`/`cacheRead`/`cacheCreation`) |
| `skill.name`-Attribut | **nur** bei echtem Slash-Command-Aufruf; beim Aufrufweg der Pipeline (Skill-Datei-Text als Prompt, `run-pipeline.sh:271`) **nie** |
| `agent.name`-Attribut | **ja**, bei Sub-Agenten (gemessen: `"Explore"`), an `cost.usage` **und** `token.usage` |
| Sub-Agenten-Kosten | erfasst und als **eigene Messreihe** ausgewiesen (Beispiel: Hauptsession 0,1078 USD / Sub-Agent 0,0223 USD) – disjunkt, also zu addieren |
| Zuordnung zum Pipeline-Schritt | möglich, weil `run-pipeline.sh` je Schritt einen **eigenen** `claude`-Prozess startet – nicht über `skill.name` |
| Störung der Pipeline-Logik | keine: `run_skill` wertet Exit-Code und Report-**Dateien** aus (`run-pipeline.sh:302–319`), nicht den Text-Output |
| Personenbezug in den Attributen | **ja**: `user.email`, `user.id`, `user.account_id`, `user.account_uuid`, `organization.id` |

## Scope

**Inbegriffen:**

- Token- und Kosten-Kennzahlen **je Pipeline-Lauf** persistieren, sodass sie über viele Läufe
  hinweg auswertbar bleiben (Historie für Modell-/Tier-Entscheidungen).
- Ausweisen des **Sub-Agenten-Anteils** – die Personas verursachen den Großteil der Last.
- Zuordnung der Kosten zu den **einzelnen Pipeline-Schritten** eines Laufs.
- Aktivierung bleibt eine **bewusste Entscheidung des Betreibers**; ein Lauf ohne aktivierte
  Telemetrie funktioniert unverändert weiter.

**Nicht inbegriffen:**

- **Kein Versand an ein zentrales Ziel.** Keine Gateway-/Collector-Anbindung, kein
  `OTEL_EXPORTER_OTLP_ENDPOINT` auf einen fremden Host, keine Secrets. Ausdrückliche
  Auftraggeber-Vorgabe: die Metriken sind für den lokalen Betreiber und verlassen den Rechner
  nicht. (Randbedingung, nicht Bequemlichkeit: die Attribute tragen `user.email` und
  Account-IDs – ein zentrales Ziel wäre eine eigene Datenschutz-Entscheidung.)
- **Keine CI-Aktivierung.** Claude Code läuft in CI ausschließlich in `factory-poll.yml`, und
  der ist seit #284 stillgelegt und ohne `ANTHROPIC_API_KEY`. Eine Aktivierung dort wäre
  heute inerte Konfiguration (vgl. #201).
- **Keine Änderung am Aufrufweg** der Skills in `run-pipeline.sh` (Prompt-Text statt
  Slash-Command). Das `skill.name`-Attribut bleibt damit unerreichbar; die Schritt-Zuordnung
  läuft über die Prozess-Grenze. Falls später gewünscht: eigenes Issue.
- **Keine neuen Kennzahlen auf der Prozess-Ebene.** `metrics.sh` schätzt weiterhin nichts
  selbst (ADR-006, verbindliche Scope-Grenze) – persistiert werden ausschließlich die von der
  CLI emittierten Ist-Werte.
- Keine Traces/Spans (`CLAUDE_CODE_ENHANCED_TELEMETRY_BETA`), keine Auswertungs-UI, kein
  Dashboard.

## Akzeptanzkriterien

- [ ] **AK1 (Persistenz je Lauf):** GIVEN Telemetrie ist aktiviert, WHEN ein
      `run-pipeline.sh`-Lauf endet, THEN existiert ein persistiertes Artefakt, das Token- und
      Kosten-Ist-Werte **dieses Laufs** enthält, und ein vorheriger Lauf wird dabei nicht
      überschrieben (Historie bleibt auswertbar).
- [ ] **AK2 (Sub-Agenten-Anteil):** GIVEN ein Lauf, in dem mindestens ein Sub-Agent lief,
      WHEN das Artefakt geschrieben ist, THEN weist es den auf Sub-Agenten entfallenden
      Anteil getrennt von der Hauptsession aus.
- [ ] **AK3 (Schritt-Zuordnung):** GIVEN ein Lauf über mehrere Pipeline-Schritte, WHEN das
      Artefakt geschrieben ist, THEN sind die Kosten den einzelnen Schritten zuzuordnen
      (welcher Schritt wie viel), nicht nur als Lauf-Summe.
- [ ] **AK4 (opt-in, kein Zwang):** GIVEN Telemetrie ist **nicht** aktiviert, WHEN ein Lauf
      stattfindet, THEN verhält er sich unverändert wie vor dieser Task – kein Fehler, kein
      leeres Artefakt, keine zusätzliche Ausgabe.
- [ ] **AK5 (kein zentraler Versand):** GIVEN die Umsetzung, WHEN ein Lauf mit aktivierter
      Telemetrie läuft, THEN geht kein Telemetrie-Datum an einen netzwerk-externen Empfänger,
      und insbesondere enthält der über `--publish` veröffentlichte Prozess-Report
      (GitHub-Issue-Kommentar / Step-Summary) **keine** Telemetrie-Daten.
- [ ] **AK6 (fail-open):** GIVEN die Erhebung oder Auswertung der Telemetrie schlägt fehl,
      WHEN der Lauf endet, THEN bleibt der ursprüngliche Exit-Code des Laufs unverändert und
      die Pipeline gilt nicht wegen der Messung als gescheitert (analog AK3 aus `spec-314`).
- [ ] **AK7 (kein dirty Arbeitsbaum):** GIVEN ein abgeschlossener Lauf, WHEN danach
      `git status` läuft, THEN ist der Arbeitsbaum unverändert sauber – das Artefakt ist von
      `.gitignore` gedeckt. (ADR-045-Invariante: ein getracktes Mess-Artefakt ließe die
      Endzustands-Verifikation des **nächsten** Laufs nach ADR-040 fehlschlagen.)
- [ ] **AK8 (Auswertbarkeit für Modellwahl):** GIVEN mehrere persistierte Läufe, WHEN der
      Betreiber die Kosten je Modell vergleichen will, THEN ist je Messwert erkennbar, welches
      **Modell** ihn verursacht hat – die Frage „lohnt Tier X für Schritt Y" ist ohne
      manuelles Nachrechnen aus den Artefakten beantwortbar.

## Fehlerszenarien

- [ ] Telemetrie aktiviert, aber die CLI emittiert nichts (z. B. Variable falsch gesetzt):
      Lauf läuft normal durch, das Fehlen wird **sichtbar gemeldet** statt still ein leeres
      oder irreführendes Artefakt zu schreiben.
- [ ] Lauf bricht vorzeitig ab (Interrupt-Sentinel, non-zero Exit eines Schritts): die bis
      dahin angefallenen Werte werden persistiert – ein Abbruch ist der teuerste Fall und
      damit der interessanteste (analog AK2 aus `spec-314`).
- [ ] Zwei Läufe am selben Tag / parallele Läufe aus verschiedenen Worktrees: kein Lauf
      überschreibt das Artefakt eines anderen.
- [ ] Der Roh-Output wächst unbegrenzt (die Probe erzeugte ~1300 Zeilen für **einen**
      Mini-Aufruf): die Ablage darf den Arbeitsbaum nicht unbegrenzt zumüllen.

## Offene Fragen – entschieden in ADR-049

Alle vier Fragen sind in
[ADR-049](../adr/049-telemetrie-persistenz-je-pipeline-lauf.md) beantwortet; die Formulierungen
bleiben als Entscheidungsgrundlage stehen. Kurzfassung:

- **Option B?** Nein (§E1) – kein Nachbau, nur CLI-Ist-Werte; verbindliche Grenze „nie selbst
  rechnen".
- **Erhebungsweg:** Console-Exporter + Format-Drift-Guard (§E2).
- **Verankerung:** eigener Wrapper-Einstiegspunkt; `run-pipeline.sh`, Gate `run-tests.sh:292`
  und ADR-045-Invariante bleiben unangetastet (§E3).
- **Ablage:** `tasks/telemetry-<task-id>-<zeitstempel>.csv`, gitignored – nicht in
  `tasks/metrics-<datum>.md` (§E4).

- [x] **Verhältnis zu ADR-006 Option B.** ADR-006 hat „Token/Kosten aus Logs oder
      API-Antworten selbst parsen" **abgelehnt**. Ist das Auslesen des OTEL-Console-Exporters
      die abgelehnte Option B – oder die legitime Telemetrie-Ebene, weil es Ist-Werte des
      offiziellen Telemetrie-Kanals liest und nichts schätzt? Die ADR muss das explizit
      beantworten, nicht implizit unterlaufen.
- [x] **Erhebungsweg.** Console-Exporter-Ausgabe auswerten (keine Infrastruktur, aber
      Text-Parsing) vs. lokaler OTLP-Empfänger auf `localhost` (strukturierte Daten, aber ein
      laufender Prozess als Voraussetzung – bei dem gemessenen Stand lauscht nichts auf
      4317/4318). Beide bleiben lokal und erfüllen AK5.
- [x] **Verankerungsort.** `run-pipeline.sh` bedingt erweitern vs. eigener Einstiegspunkt
      (Wrapper). Ersteres kollidiert mit dem fail-closed-Gate `run-tests.sh:292` („OTEL ist
      opt-in (nicht automatisch in run-pipeline.sh gesourct)") **und** mit der ausdrücklichen
      ADR-045-Invariante; beide müssten dann bewusst und dokumentiert geändert werden.
      Letzteres lässt Gate und Invariante unberührt, schafft aber einen zweiten Startbefehl.
- [x] **Ablageort und Format.** Eigenes Artefakt vs. Abschnitt im bestehenden
      `tasks/metrics-<datum>.md`. Letzteres vermischt die zwei Ebenen, die ADR-006 getrennt
      hält, und kollidiert mit AK5, weil diese Datei über `--publish` nach GitHub geht.
      Format maschinenauswertbar (Historie über viele Läufe) vs. lesbar.
