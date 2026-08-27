# Task 314: messung-real-betreiben

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung

Die Prozess-Mess-Ebene aus ADR-006 real betreiben: `scripts/metrics.sh` ist heute in **keinem**
Workflow-Job verdrahtet und läuft nur manuell über `/daily-metrics`. Diese Task macht die Messung
zum festen Bestandteil **jedes** `run-pipeline.sh`-Laufs (fail-open) und veröffentlicht den Report
über zwei Wege: GitHub-Job-Summary und Kommentar an eine dedizierte Tracking-Issue. Der manuelle
Aufruf bleibt erhalten und erreicht dieselben Wege.

Spec: [docs/specs/spec-314-metrics-je-pipeline-lauf.md](../docs/specs/spec-314-metrics-je-pipeline-lauf.md)

**Bewusst NICHT in dieser Task** (Scope-Entscheidung, siehe Spec → „Nicht inbegriffen"):
Kosten/Tokens pro Skill ernten. Der Aufruf in `run-pipeline.sh:290` nutzt kein
`--output-format json`, und die Ernte liegt auf der von ADR-006 gezogenen Grenze
(Option B abgelehnt) → eigene Issue + eigene ADR. #319 wartet auf jene Issue.

## Akzeptanzkriterien
- [ ] AK1 Messung läuft genau einmal bei jedem regulären Pipeline-Lauf
- [ ] AK2 Messung läuft auch bei Abbruch (Interrupt/non-zero Exit); Exit-Code bleibt unverändert
- [ ] AK3 Fail-open: fehlschlagende Messung färbt einen grünen Lauf nicht rot
- [ ] AK4 Report wird an `$GITHUB_STEP_SUMMARY` angehängt, wenn gesetzt
- [ ] AK5 Ohne `$GITHUB_STEP_SUMMARY` kein Schreibversuch, Lauf bleibt fehlerfrei
- [ ] AK6 Kommentar an die Issue aus `FACTORY_METRICS_ISSUE`, wenn gesetzt und `gh` authentifiziert
- [ ] AK7 Ohne `FACTORY_METRICS_ISSUE` kein `gh`-Aufruf und kein Ausweichen auf die Task-Issue
- [ ] AK8 Nicht-numerischer `FACTORY_METRICS_ISSUE` wird fail-closed abgelehnt (kein `gh`-Aufruf)
- [ ] AK9 `gh` fehlt/nicht authentifiziert → Kommentar übersprungen und ausgewiesen (local-first)
- [ ] AK10 Manueller `metrics.sh`-Aufruf mit Veröffentlichungs-Schalter erfüllt AK4–AK9 identisch
- [ ] AK11 `--dry-run` veröffentlicht nichts und weist die übersprungene Messung aus
- [ ] AK12 Doku ohne Drift: `CLAUDE.md`, `.claude/commands/daily-metrics.md`, `OPERATING.md`
- [ ] AK13 Verhaltenstests in `run-tests.sh` für AK2/AK3/AK7/AK8 (echte Läufe, kein Wiring-Grep)
- [ ] AK14 `bash scripts/metrics.sh --quiet` endet mit Exit 0 (Vorbefund aus /architecture, ADR-045 §7)
- [ ] AK15 `factory-poll.yml` gewährt `pull-requests: read` + `actions: read`, damit Lead-Time
      und CI-Quote in CI nicht dauerhaft „übersprungen" melden (ADR-045 §8)

## Technische Notizen

**ADR: [ADR-045 – Prozess-Messung je Pipeline-Lauf](../docs/adr/045-prozess-messung-je-pipeline-lauf.md)**
(Status `Proposed` → beim Implementieren auf `Accepted` flippen).

Entschiedene Architektur (Kurzfassung, Begründung + Alternativen A–E in der ADR):
1. Auslöser = `trap … EXIT` in `run-pipeline.sh`, registriert **nach** `preflight_checks`.
2. Fail-open und exit-code-neutral (`$?` als erste Anweisung sichern, alles `|| true`).
3. **Genau ein Aufrufort** – kein zusätzlicher expliziter Aufruf am regulären Ende, kein Flag.
4. Veröffentlichungs-Logik gehört in `metrics.sh` hinter `--publish`; die Pipeline ruft nur
   `metrics.sh --quiet --publish` und kennt weder `gh` noch `$GITHUB_STEP_SUMMARY`.
5. Ziel-Issue aus `FACTORY_METRICS_ISSUE` (Env/Repository-Variable), Integer-Guard fail-closed.
6. `--dry-run` misst und veröffentlicht nichts.
7. **Zusätzlicher Fix (Vorbefund, siehe unten):** Exit-Code von `metrics.sh --quiet`.
8. `factory-poll.yml` um `pull-requests: read` + `actions: read` ergänzen.

**Vorbefund aus /architecture (empirisch geprüft, gehört in diese Task):**
`bash scripts/metrics.sh --quiet` endet **heute mit Exit 1**, obwohl der Report korrekt
geschrieben wird – die letzte Skriptzeile ist `[ "$QUIET" = false ] && …`, und ohne `set -e`
wird deren Wahrheitswert zum Exit-Status. `/daily-metrics` empfiehlt genau `--quiet` für die
Automatisierung; ohne Fix wäre der fail-open-Zweig der Normalfall und könnte echte Fehler
nicht mehr von diesem Pseudo-Fehler unterscheiden. Fix braucht einen Test, der Exit **0**
bei `--quiet` festnagelt.

Geprüfter Ausgangszustand (für /implement):
- `scripts/metrics.sh` – kennt bereits `--no-api` und `--quiet`; schreibt
  `tasks/metrics-<datum>.md` (gitignored, `.gitignore:26`); degradiert ohne `gh`/`jq` sauber.
- `scripts/run-pipeline.sh` – `set -euo pipefail`, kein `trap` vorhanden; Abbruchpfade sind
  `stop_if_interrupted()` (→ `exit $?`) und die Endzustands-Verifikation (→ `exit 1`).
  Für AK2 („auch bei Abbruch, genau einmal") ist ein `trap … EXIT` der naheliegende Weg.
- `.claude/commands/daily-metrics.md` – nennt den Scheduled-Workflow bislang als Idee; der
  Abschnitt „Hinweis für Stage 3 / Automatisierung" muss auf die neue Mechanik zeigen.
- **Nicht verletzen:** `run-tests.sh:281–283` behauptet, OTEL sei nicht in `run-pipeline.sh`
  gesourct. Die Metrik-Verdrahtung darf `config/otel.env` nicht anfassen.
- `FACTORY_METRICS_ISSUE` als Env-/Repository-Variable (analog `FACTORY_HEALTHCHECK_URL`) –
  bewusst **kein** neuer Key in `factory.defaults.yml`, damit die Config-Validierung
  (ADR-041) unberührt bleibt.

## Offene Fragen
- [ ] Nummer der Tracking-Issue festlegen (dedizierte Sammel-Issue „Metrik-Verlauf der Factory"
      anlegen) und in `OPERATING.md` dokumentieren. Bis dahin: Kommentar-Weg inaktiv, Rest läuft.
- [ ] Soll `FACTORY_METRICS_ISSUE` als GitHub-Repository-Variable gesetzt werden (für CI-Läufe
      über `factory-poll`)?

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `chore/314-messung-real-betreiben`
Erstellt: 2026-08-27 19:03
