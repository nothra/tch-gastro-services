# Spec: Prozess-Messung real betreiben – metrics.sh als fester Bestandteil jedes Pipeline-Laufs

> Issue: [#314](https://github.com/nothra/tch-gastro-services/issues/314) ·
> Mess-Ebene: **Prozess** (ADR-006) · Branch-Typ: `chore` ·
> Architektur: [ADR-045](../adr/045-prozess-messung-je-pipeline-lauf.md)

## Kontext

ADR-006 trennt zwei Messebenen – Prozess (Git/GitHub) und Telemetrie (OTEL). Beide existieren
als Artefakt, keine läuft:

- `scripts/metrics.sh` ist in **keinem** Workflow-Job verdrahtet (geprüft gegen alle vier
  Workflows: `factory-ci.yml`, `factory-poll.yml`, `deploy-gate.yml`,
  `deploy-freeze-release.yml`). Die einzigen Aufrufe stehen in der Testsuite und im manuellen
  Skill `/daily-metrics`. Die Prozess-KPIs existieren damit als Skript, nicht als Messung.
- OTEL ist bewusst opt-in (`config/otel.env.example`) und im Normalbetrieb dormant.
- Ein `schedule`-Trigger existiert nirgends; der halbstündliche cron in `factory-poll.yml` ist
  seit #284 stillgelegt (nur `workflow_dispatch`).

**Entscheidung des Auftraggebers (weicht bewusst von der Skizze im Issue ab):** Die Messung
hängt **nicht** an einem cron-Job, sondern läuft **bei jedem Pipeline-Lauf** – und bleibt
zusätzlich manuell aufrufbar. Damit entsteht die Messreihe dort, wo die Arbeit entsteht (ein
Datenpunkt je Lauf, lokal wie in CI), statt an einem Zeittakt, der von der
Scharfschalt-Checkliste (`OPERATING.md` §0.4) abhängt.

**Konsequenz, die benannt sein muss:** In CI misst die Pipeline nur, wenn dort ein Lauf
stattfindet (heute: `factory-poll` auf `workflow_dispatch`). Bis der Async-Trigger
scharfgeschaltet ist, entsteht die Messreihe aus den lokalen Läufen. Der Ausliefer-Weg
„Kommentar an eine Tracking-Issue" macht sie trotzdem auf GitHub sichtbar und maschinell
auswertbar – das ist der Grund, warum er Teil dieser Spec ist.

## Scope

**Inbegriffen:**

- `scripts/metrics.sh` läuft als fester Abschluss-Schritt **jedes** `run-pipeline.sh`-Laufs –
  auch wenn der Lauf abbricht (Interrupt, rotes Gate, nicht verifizierter Endzustand).
- Die Messung ist **fail-open**: sie verändert den Exit-Code der Pipeline nie und bricht sie
  nie ab. Eine Messung, die einen grünen Lauf rot färbt, wäre schlimmer als keine Messung.
- Zwei Ausliefer-Wege für den Report (die Datei `tasks/metrics-<datum>.md` bleibt gitignored):
  1. **Job-Summary:** Report an `$GITHUB_STEP_SUMMARY` anhängen, wenn die Variable gesetzt ist
     (also in GitHub Actions).
  2. **Tracking-Issue:** Report als Kommentar an eine dedizierte Issue posten, wenn
     `FACTORY_METRICS_ISSUE` gesetzt ist.
- Dieselben zwei Ausliefer-Wege sind **manuell** erreichbar (nicht nur aus der Pipeline).
- Doku nachziehen, wo die Mechanik beschrieben ist: `CLAUDE.md` (Abschnitt „Messen"),
  `.claude/commands/daily-metrics.md`, `docs/factory/OPERATING.md`.
- Verhaltenstests in `scripts/checks/tests/run-tests.sh` (echter Lauf gegen ein temporäres
  Repo, kein reiner Wiring-Grep).

**Nicht inbegriffen:**

- **Kosten/Tokens pro Skill ernten.** Bewusst abgespalten: `run-pipeline.sh:290` ruft
  `claude --print` heute **ohne** `--output-format json`; der im Issue erwähnte „JSON-Output des
  Agenten-Aufrufs" existiert nicht, und einen „typisierten Hand-Off" gibt es weder als Issue noch
  in der Doku. Zudem liegt die Ernte genau auf der Grenze, die ADR-006 zieht (Option B: „Token/
  Kosten aus Logs oder API-Antworten selbst parsen" – abgelehnt). Das braucht eine eigene ADR und
  eine eigene Issue; #319 wartet auf **jene**, nicht auf diese.
- Kein `schedule`-/cron-Workflow, kein Wiederbeleben des stillgelegten cron in
  `factory-poll.yml` (#284 bleibt stillgelegt).
- Keine OTEL-Pflicht, kein Telemetrie-Backend. Die bestehende Assertion, dass OTEL **nicht**
  in `run-pipeline.sh` gesourct wird (`run-tests.sh:281–283`), bleibt gültig und unangetastet.
- Keine neuen oder geänderten Kennzahlen in `metrics.sh`; die KPI-Liste bleibt wie sie ist.
- Kein Committen des Reports (`tasks/metrics-*.md` bleibt gitignored, `.gitignore:26`).

## Akzeptanzkriterien

- [ ] **AK1 (Messung je Lauf):** GIVEN ein `run-pipeline.sh`-Lauf, der die Pipeline regulär
      durchläuft, WHEN er endet, THEN wurde `scripts/metrics.sh` genau einmal aufgerufen und der
      Lauf gibt einen erkennbaren Messabschnitt aus (z. B. „Prozess-Metriken erhoben").
- [ ] **AK2 (Messung auch bei Abbruch):** GIVEN ein Lauf, der vor dem regulären Ende abbricht
      (Interrupt-Sentinel bzw. non-zero Exit eines Schritts), WHEN die Pipeline endet, THEN
      wurde `metrics.sh` trotzdem genau einmal aufgerufen – und der ursprüngliche Exit-Code
      bleibt unverändert erhalten.
- [ ] **AK3 (fail-open):** GIVEN `metrics.sh` schlägt fehl (non-zero Exit) oder ist nicht
      ausführbar, WHEN ein ansonsten grüner Pipeline-Lauf endet, THEN endet die Pipeline
      weiterhin mit Exit 0 und gibt einen Hinweis auf die übersprungene Messung aus.
- [ ] **AK4 (Job-Summary):** GIVEN `$GITHUB_STEP_SUMMARY` zeigt auf eine schreibbare Datei,
      WHEN die Messung läuft, THEN steht der vollständige Report-Inhalt danach in dieser Datei
      (angehängt, nicht überschrieben).
- [ ] **AK5 (kein Summary lokal):** GIVEN `$GITHUB_STEP_SUMMARY` ist nicht gesetzt (lokaler
      Lauf), WHEN die Messung läuft, THEN wird kein Summary-Schreibversuch unternommen und der
      Lauf bleibt fehlerfrei.
- [ ] **AK6 (Tracking-Issue-Kommentar):** GIVEN `FACTORY_METRICS_ISSUE` ist auf eine
      Issue-Nummer gesetzt und `gh` ist verfügbar und authentifiziert, WHEN die Messung läuft,
      THEN wird der Report als Kommentar an genau diese Issue gepostet.
- [ ] **AK7 (kein Ziel → kein Raten):** GIVEN `FACTORY_METRICS_ISSUE` ist nicht gesetzt, WHEN
      die Messung läuft, THEN wird kein Kommentar gepostet, kein `gh`-Aufruf gemacht und der
      übersprungene Schritt im Output benannt – insbesondere wird **nicht** auf die Task-Issue
      des laufenden Task ausgewichen.
- [ ] **AK8 (Wert als Daten, fail-closed):** GIVEN `FACTORY_METRICS_ISSUE` trägt einen
      nicht-numerischen Wert (z. B. `--repo` oder `12x`), WHEN die Messung läuft, THEN wird der
      Wert abgelehnt, **kein** `gh`-Aufruf mit diesem Wert ausgeführt und der Grund benannt
      (Integer-Absicherung nach `clean-code.md` → „Config-/nutzerkontrollierte Werte als Daten").
- [ ] **AK9 (gh nicht verfügbar):** GIVEN `FACTORY_METRICS_ISSUE` ist gesetzt, aber `gh` fehlt
      oder ist nicht authentifiziert, WHEN die Messung läuft, THEN wird der Kommentar
      übersprungen, das im Output als übersprungen ausgewiesen und der Exit-Code der Pipeline
      bleibt unverändert (local-first, ADR-006).
- [ ] **AK10 (manuell, gleiche Wege):** GIVEN ein Aufruf von `scripts/metrics.sh` von Hand mit
      dem Veröffentlichungs-Schalter, WHEN Summary-Ziel bzw. `FACTORY_METRICS_ISSUE` gesetzt
      sind, THEN gelten AK4–AK9 identisch – ohne den Schalter schreibt `metrics.sh` weiterhin
      nur die Report-Datei (heutiges Verhalten unverändert).
- [ ] **AK11 (dry-run):** GIVEN `run-pipeline.sh … --dry-run`, WHEN der Lauf endet, THEN wird
      **nichts** veröffentlicht (kein Kommentar, kein Summary-Eintrag) und der Lauf weist die
      übersprungene Messung analog zur Endzustands-Verifikation aus.
- [ ] **AK12 (Doku ohne Drift):** GIVEN diese Änderung ist umgesetzt, WHEN `CLAUDE.md`
      („Messen"), `.claude/commands/daily-metrics.md` und `docs/factory/OPERATING.md` gelesen
      werden, THEN beschreiben sie die Messung als Bestandteil jedes Pipeline-Laufs plus
      manuellen Weg – und nennen `metrics.sh` nicht länger als ausschließlich manuell.
- [ ] **AK13 (Verhaltenstests):** GIVEN die Testsuite `scripts/checks/tests/run-tests.sh`, WHEN
      sie läuft, THEN prüfen echte Läufe gegen ein temporäres Repo mindestens AK2, AK3, AK7 und
      AK8 – je Negativfall isoliert (nur der Ziel-Pfad darf greifen) und mit pfadspezifischem
      Signal, nicht per Wiring-Grep auf ein Kommando-Fragment.
- [ ] **AK14 (Exit-Code von `--quiet`):** GIVEN `bash scripts/metrics.sh --quiet`, WHEN der
      Report erfolgreich geschrieben wurde, THEN endet das Skript mit Exit **0** – festgenagelt
      durch einen eigenen Test. Heute endet es mit 1 (die letzte Zeile ist der `QUIET`-Test, und
      das Skript läuft ohne `set -e`); ohne diesen Fix wäre der fail-open-Zweig aus AK3 der
      Normalfall und damit blind für echte Fehler (ADR-045 §7).
- [ ] **AK15 (CI-Rechte für die API-Kennzahlen):** GIVEN ein Pipeline-Lauf in CI über
      `factory-poll.yml`, WHEN die Messung läuft, THEN gewährt der Job `pull-requests: read` und
      `actions: read`, damit Lead-Time (`gh pr list`) und CI-Quote (`gh run list`) dort nicht
      dauerhaft „übersprungen" melden (ADR-045 §8).

## Fehlerszenarien

- [ ] `metrics.sh` nicht vorhanden/nicht ausführbar → Hinweis, Pipeline-Ergebnis unverändert (AK3).
- [ ] `$GITHUB_STEP_SUMMARY` gesetzt, aber Pfad nicht schreibbar → Hinweis, kein Abbruch.
- [ ] `gh issue comment` schlägt fehl (Netzwerk, fehlendes Recht, gelöschte Issue) → Hinweis,
      kein Abbruch, Report-Datei bleibt erhalten.
- [ ] `FACTORY_METRICS_ISSUE` nicht-numerisch → fail-closed ablehnen, kein `gh`-Aufruf (AK8).
- [ ] Pipeline bricht bereits in Phase 1 ab → Messung läuft genau **einmal** (kein Doppel-Aufruf
      durch einen zusätzlichen expliziten Aufruf am regulären Ende).
- [ ] Zwei Pipeline-Läufe am selben Tag → beide schreiben dieselbe Report-Datei
      (`tasks/metrics-<datum>.md`, letzter gewinnt). Bewusst akzeptiert: die Datei ist ein
      regenerierbarer Snapshot; die Historie entsteht aus den Issue-Kommentaren.

## Offene Fragen

- [ ] **Nummer der Tracking-Issue.** `FACTORY_METRICS_ISSUE` hat bewusst keinen Default
      (AK7: nicht raten). Es braucht eine dedizierte Sammel-Issue („Metrik-Verlauf der
      Factory"), die noch angelegt und deren Nummer in `OPERATING.md` dokumentiert werden muss.
      Bis dahin läuft die Messung ohne Kommentar-Veröffentlichung – funktional korrekt, aber
      ohne die GitHub-sichtbare Messreihe.
- [ ] **Wer setzt die Variable?** Für lokale Läufe muss `FACTORY_METRICS_ISSUE` in der Shell-
      Umgebung des Entwicklers liegen, für CI als Repository-Variable (analog
      `FACTORY_HEALTHCHECK_URL`). Beides ist Doku-Arbeit in `OPERATING.md` – zu klären, ob eine
      Repository-Variable gesetzt werden soll.
