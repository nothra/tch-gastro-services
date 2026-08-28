# Task 314: messung-real-betreiben

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
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
- [x] AK1 Messung läuft genau einmal bei jedem regulären Pipeline-Lauf
- [x] AK2 Messung läuft auch bei Abbruch (Interrupt/non-zero Exit); Exit-Code bleibt unverändert
- [x] AK3 Fail-open: fehlschlagende Messung färbt einen grünen Lauf nicht rot
- [x] AK4 Report wird an `$GITHUB_STEP_SUMMARY` angehängt, wenn gesetzt
- [x] AK5 Ohne `$GITHUB_STEP_SUMMARY` kein Schreibversuch, Lauf bleibt fehlerfrei
- [x] AK6 Kommentar an die Issue aus `FACTORY_METRICS_ISSUE`, wenn gesetzt und `gh` authentifiziert
- [x] AK7 Ohne `FACTORY_METRICS_ISSUE` kein `gh`-Aufruf und kein Ausweichen auf die Task-Issue
- [x] AK8 Nicht-numerischer `FACTORY_METRICS_ISSUE` wird fail-closed abgelehnt (kein `gh`-Aufruf)
- [x] AK9 `gh` fehlt/nicht authentifiziert → Kommentar übersprungen und ausgewiesen (local-first)
- [x] AK10 Manueller `metrics.sh`-Aufruf mit Veröffentlichungs-Schalter erfüllt AK4–AK9 identisch
- [x] AK11 `--dry-run` veröffentlicht nichts und weist die übersprungene Messung aus
- [~] AK12 Doku ohne Drift: `CLAUDE.md`, `.claude/commands/daily-metrics.md`, `OPERATING.md` –
      `CLAUDE.md`/`OPERATING.md` erledigt; `daily-metrics.md` als Patch geliefert, Mensch wendet
      an (siehe Blocker unten, `.claude/**` ist Agenten-hard-denied)
- [x] AK13 Verhaltenstests in `run-tests.sh` für AK2/AK3/AK7/AK8 (echte Läufe, kein Wiring-Grep)
- [x] AK14 `bash scripts/metrics.sh --quiet` endet mit Exit 0 (Vorbefund aus /architecture, ADR-045 §7)
- [x] AK15 `factory-poll.yml` gewährt `pull-requests: read` + `actions: read`, damit Lead-Time
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

## Blocker

**Blocker [2026-08-27]:** `.claude/commands/daily-metrics.md` ist für Agenten-Edits hard-denied
(`Edit(.claude/**)`, Lesson `factory-workflow.md` → „.claude/**-Änderungen erfordern
Patch-Workflow", aus #91). Die AK12-Doku-Anpassung an dieser Datei liegt als geprüfter Patch
unter [`tasks/patch-314-daily-metrics.diff`](patch-314-daily-metrics.diff) (`git apply --check`
bestanden; die zwei AK12-Assertions aus `run-tests.sh` gegen den gepatchten Dateiinhalt separat
nachgerechnet – beide matchen, kein voller Suite-Lauf gegen eine gepatchte Kopie).
**Aktion Mensch:** `git apply tasks/patch-314-daily-metrics.diff`, Ergebnis prüfen, dann committen
und `tasks/patch-314-daily-metrics.diff` entfernen (Lesson-Vorgabe: Patch-Datei ist nach dem
Anwenden ein totes Artefakt). Bis dahin bleiben zwei `run-tests.sh`-Assertions (AK12) und damit
der CI-Gate `factory-self-test` rot – alle anderen Änderungen (`scripts/metrics.sh`,
`scripts/run-pipeline.sh`, `.github/workflows/factory-poll.yml`, `CLAUDE.md`, `OPERATING.md`,
`ADR-045`) sind vollständig committet und lokal grün (siehe Ergebnis unten).

## Umsetzungs-Notizen

- `scripts/metrics.sh`: `--publish`-Schalter (Job-Summary + Issue-Kommentar,
  Integer-Guard fail-closed vor `gh`), Exit-Code-Fix für `--quiet` (AK14).
- `scripts/run-pipeline.sh`: `trap measure_process_metrics_on_exit EXIT`, registriert direkt
  nach `preflight_checks`; `$?` wird als erste Anweisung gesichert, jeder Trap-Befehl bleibt
  `|| true`-geschützt (ADR-045 Implementierungs-Hinweis, empirisch gegen `set -e`-Verhalten
  verifiziert).
- `.github/workflows/factory-poll.yml`: `pull-requests: read` + `actions: read` ergänzt (AK15).
- ADR-045: Status `Proposed` → `Accepted` geflippt.
- `run-tests.sh`: `_mk_pipe_repo` kopiert jetzt zusätzlich `metrics.sh` (echter Dependency von
  `run-pipeline.sh`); neue Testgruppe „Task 314 (ADR-045)" deckt AK1–AK11, AK14, AK15 über echte
  Läufe ab (kein Wiring-Grep), inkl. Mutationsbeleg für die Trap-Registrierung (AK2).
- Lokal verifiziert: `bash scripts/checks/tests/run-tests.sh` (1252 grün / 2 rot – beide rot nur
  wegen des offenen `.claude/**`-Patches oben), `pre-commit.sh` grün, `pre-push.sh` grün
  (Lint/Tests/Typecheck/Format/Routen-Doku/Hooks).

## Test-Vervollständigung (`/test`)

- Lücke gegen die Spec-314-Fehlerszenarien gefunden und geschlossen: „`gh issue comment`
  schlägt fehl (Netzwerk, fehlendes Recht, gelöschte Issue)" war ungetestet – bisher nur
  „gh fehlt komplett" (AK9) und „gh-Aufruf gelingt" (AK6) abgedeckt, nicht der Fall
  gh-verfügbar-aber-Kommentar-Aufruf-scheitert. Neuer Test in `run-tests.sh` (gh-Stub, der
  `auth status` mit 0, `issue comment` mit 1 beantwortet): Exit 0, Fehlschlag wird ausgewiesen,
  Report-Datei bleibt unverändert erhalten – 3 neue Assertionen, alle grün.
- `pnpm test:coverage` gegengeprüft: unverändert ggü. `main` (kein App-Code in diesem Diff),
  Gesamt-Statements 89.56 % (Schwelle 80 %) – keine Coverage-Regression.
- Finaler Lauf: `bash scripts/checks/tests/run-tests.sh` → 1252 grün / 2 rot (unverändert die
  zwei erwarteten AK12-Assertionen aus dem offenen `.claude/**`-Patch-Blocker).

## Refactoring (`/refactor`)

Kein neues Verhalten – nur interne Struktur/Klarheit, adressiert Nitpicks aus `review-314.md`:

- `scripts/metrics.sh`: `case "$issue" in ''|*[!0-9]*)` → `*[!0-9]*)` – die `''`-Alternative war
  unerreichbar (der vorangehende `[ -z "$issue" ]`-Guard fängt den leeren Wert bereits ab).
- `scripts/run-pipeline.sh`: WHY-Kommentar über der Trap-Funktion um einen Satz ergänzt, der
  klarstellt, dass die `return "$_exit_code"`-Zeilen defensiv sind (Absicherung gegen einen
  künftigen Branch ohne `|| true`-Schutz als letzten Befehl) und nicht der eigentliche
  Erhaltungsmechanismus – vermeidet die in Review-Runde 1 aufgetretene Fehleinschätzung.
- `scripts/checks/tests/run-tests.sh`: `scaffold_310()` legt jetzt einen fehlschlagenden
  `bin/gh`-Stub an (überschattet einen ambienten System-`gh` über den bereits bestehenden
  `PATH`-Vorrang in `run_310()`/`run_314()`). Entkoppelt alle echten, nicht-`--dry-run`
  Pipeline-Läufe (inkl. der neuen Task-314-E2E-Tests) von der lokalen `gh`-Installation/
  -Authentifizierung – vorher funktionierte das nur zufällig, weil ein ambienter `gh` gegen den
  Bare-Remote der Wegwerf-Repos ohnehin sofort scheitert.
- Bewusst NICHT geändert (siehe `review-314.md`-Nitpicks): `commit_314_pushed()` ist erst das
  dritte inline-Vorkommen des Bare-Origin-Push-Musters – Extraktion erst beim vierten
  Vorkommnis, wie in Review-Runde 2 empfohlen. AK9-Tests `PATH="/usr/bin:/bin"`-Isolation bleibt
  (verifiziert sicher, kein etabliertes Alternativmuster in der Suite vorhanden).
- Verifiziert: `bash scripts/checks/tests/run-tests.sh` vor und nach dem Refactoring identisch
  1252 grün / 2 rot (dieselben zwei erwarteten AK12-Assertionen) – kein Verhalten geändert.

## Security-Review (`/security-review`)

Siehe [`tasks/security-314.md`](security-314.md) – **PASSED**, keine kritischen/wichtigen
Findings. Sechs Hinweise dokumentiert (alle als Beleg, keine Korrektur nötig): Integer-Guard +
`--body-file` gegen Command-/Argument-Injection, ADR-045-„kein neuer Freitext-Kanal"-Invariante
empirisch gegen den Code verifiziert (nur `createdAt`/`mergedAt`/`conclusion` aus der
GitHub-API, keine PR-/Commit-Freitextfelder), Patch-Inhalt für `daily-metrics.md` auf
Prompt-Injection geprüft (unauffällig), Least-Privilege der zwei neuen
`factory-poll.yml`-Scopes bestätigt, keine Secrets/Stack-Traces in Fehlerpfaden, Fail-open-
Mechanik durch Mutationstest belegt.

## Review-Findings

Siehe [`tasks/review-314.md`](review-314.md) – **APPROVED**, 0 kritische/wichtige Findings,
5 optionale Nitpicks (u. a. eine widerlegte Verdachts-Findung zum `return`-Statement im
EXIT-Trap, empirisch in zwei Runden gegengeprüft). Iteration 1/2.

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `chore/314-messung-real-betreiben`
Erstellt: 2026-08-27 19:03
