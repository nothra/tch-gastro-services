# Task 91: stage3-commit-turn-budget

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Zwei Stage-3-Infra-Lücken (beobachtet beim #66-Live-Lauf nach #88) schließen:
1. **Commit/Push:** Ein non-interaktiver Sub-Agent (`FACTORY_STAGE=3`, `claude --print`) kann
   seine Arbeit nicht committen/pushen – `git commit`/`git push` matcht keinen Allow-List-Eintrag.
   Lösung: Wrapper-Skript `scripts/factory-commit.sh` (läuft über `Bash(bash scripts/*)`),
   fail-closed gegen `main`/`master` & `--force`; read-only-git + genutzte `gh`-Verben granular freigeben.
2. **Turn-Budget:** `run_skill()` wertet „Reached max turns" auch dann als Fehlschlag, wenn der
   Report bereits fertig ist. Lösung: Report-Guard (gültiges Verdict → Erfolg) + `max_turns` 8→14
   für `review`/`security-review`.

> Kanonische Quellen: [`docs/specs/spec-91-stage3-commit-turn-budget.md`](../docs/specs/spec-91-stage3-commit-turn-budget.md)
> · ADR [`docs/adr/019-stage3-commit-seam-report-guard.md`](../docs/adr/019-stage3-commit-seam-report-guard.md).

## Akzeptanzkriterien

### Lücke 1 – Commit/Push
- [x] GIVEN Feature-Branch mit uncommitteten Änderungen, WHEN `bash scripts/factory-commit.sh "<message>"`,
      THEN committet + pusht (Exit 0), ohne Permission-Prompt (`Bash(bash scripts/*)`).
- [x] GIVEN Branch ist `main`/`master`, WHEN `factory-commit.sh`, THEN fail-closed (Exit ≠ 0), nichts committet/gepusht.
- [x] GIVEN nichts zu committen, WHEN `factory-commit.sh`, THEN klare Meldung + definierter Exit, ohne Pipeline-Abbruch.
- [x] GIVEN Stage-3-Sub-Agent (`/implement`, `/test`, `/refactor`, `/bug-fix`), WHEN er seine Arbeit sichert,
      THEN über `scripts/factory-commit.sh` (Skill-Doku weist das an), nicht über rohes `git commit`/`git push`.
- [x] GIVEN read-only-git (`status`/`diff`/`log`/`branch`/`rev-parse`) im Stage-3-Modus, THEN ohne Prompt/Interrupt.
- [ ] GIVEN `PR_SHEPHERD=true bash scripts/run-pipeline.sh <task-id>`, WHEN Durchlauf,
      THEN committet + pusht + aktualisiert den PR ohne manuelles Nachziehen (genutzte `gh`-Verben freigegeben).
      _(noch nicht end-to-end verifiziert – ausstehend im nächsten Pipeline-Lauf dieser Task)_

### Lücke 2 – Turn-Budget
- [x] GIVEN `/security-review` schreibt `tasks/security-<id>.md` mit `PASSED`/`NEEDS_FIXES` und reißt DANACH das Limit,
      WHEN `run_skill()` auswertet, THEN Erfolg (kein Fehlversuch, kein Exit 1).
- [x] GIVEN `/review` schreibt `tasks/review-<id>.md` mit `APPROVED`/`NEEDS_REWORK` und reißt danach das Limit,
      WHEN `run_skill()` auswertet, THEN Erfolg.
- [x] GIVEN anderer (nicht-report) Skill bricht non-zero ab, WHEN `run_skill()` auswertet, THEN Verhalten unverändert (Retry → Exit 1).
- [x] GIVEN kein/kein gültiger Verdict-Report, WHEN `review`/`security-review` non-zero abbricht, THEN weiterhin Fehlschlag (fail-closed).
- [x] GIVEN `factory.defaults.yml`, WHEN gelesen, THEN `max_turns: 14` für `review` + `security-review` mit `@reason`.
- [x] GIVEN `bash scripts/run-pipeline.sh <task-id> --dry-run`, WHEN ausgeführt, THEN zeigt neue Turn-Werte ohne Regression.

### Querschnitt
- [x] Self-Tests in `scripts/checks/tests/run-tests.sh`: (a) `factory-commit.sh` (Happy-Path via git-Stub,
      main/master-Verweigerung, „nichts zu committen"), (b) Report-Guard (Verdict → Erfolg; ohne → Fehlschlag) – bleibt grün.
- [x] `.claude/settings.json` konsistent: `.claude/**` + `.env*` weiter in `deny`; kein pauschales `Bash(git *)`/`Bash(gh *)`.

### Fehlerszenarien
- [x] `factory-commit.sh` ohne git-Repo / detached HEAD → fail-closed (Exit ≠ 0), klare Meldung.
- [x] `git push` scheitert (Netz/pre-push rot) → Exit ≠ 0 mit weitergereichter Ursache; kein stiller „committed, nicht gepusht".
- [x] Report existiert ohne gültigen Verdict → Guard greift nicht (Versuch = Fehlschlag).
- [x] Verdict-Erkennung an verbindliche Report-Werte gekoppelt (wie `pipeline_summary`), nicht frei geraten.
- [x] Portabilität macOS/BSD + CI/GNU/Alpine: POSIX-Shell/-Regex, kein PCRE; variable Werte als Daten (`grep -F --`, Integer-Guards, ADR-010).

## Technische Notizen
Entscheidungen + Alternativen: **ADR-019** (Accepted). Umsetzung TDD-first (Wrapper + Guard = Shell-Logik,
git via Stub, Muster #80). `gh`-Verbliste vor Umsetzung gegen die aktuelle `.claude/commands/pr-shepherd.md`
gegenprüfen. Betroffene Artefakte: `scripts/factory-commit.sh` (neu), `.claude/settings.json`,
`scripts/run-pipeline.sh` (`run_skill()` + geteilter Verdict-Helper), `factory.defaults.yml`,
Skills `implement`/`test`/`refactor`/`bug-fix`, `scripts/checks/tests/run-tests.sh`.

## Umsetzungs-Status (2026-07-13)
**Fertig (RED→GREEN, TDD-first):**
- `scripts/factory-commit.sh` (neu) – Commit/Push-Seam, fail-closed gegen main/master, `--force`,
  detached HEAD, kein git-Repo, Push-Fehler weitergereicht; „nichts zu committen" = Exit 0.
- `scripts/lib/report-verdict.sh` (neu) – geteilter Verdict-Helper (ADR-019 §4).
- `scripts/run-pipeline.sh` – Report-Guard in `run_skill()` + `pipeline_summary()` nutzt denselben Helper.
- `scripts/checks/tests/run-tests.sh` – Self-Tests für Wrapper + Guard + Permissions + Skill-Doku.
- `gh`-Verbliste gegen `pr-shepherd.md` gegengeprüft: genutzt = `gh pr view|checks|update-branch|merge`,
  `gh run list|rerun` – deckt sich exakt mit ADR-019 §3 (kein zusätzliches Verb).

**Blocker [2026-07-13] – gelöst:** `.claude/**` ist per `Edit(.claude/**)`/`Write(.claude/**)` **hart
denied** (bewusste #88-Grenze: ein Agent darf seine eigene Permission-/Skill-Fläche nicht ändern). Die
5 blockierten Datei-Änderungen (`.claude/settings.json` Allow-Liste + die 4 Skill-Dateien
`implement`/`test`/`refactor`/`bug-fix.md`) wurden dem Menschen als Patch-Datei übergeben; der Mensch
hat sie manuell außerhalb der Session per `git apply` angewendet und explizit zur Übernahme via Bash
freigegeben (Chat-Bestätigung reicht laut Auto-Mode-Classifier für diese Selbst-Modifikations-Klasse
nicht – der Patch-Weg war die vom System selbst vorgeschlagene Alternative).

**Grant [2026-07-13] – erteilt:** `factory.defaults.yml` (root `*.yml` nicht in der allow-Liste) – die
`max_turns: 8 → 14`-Änderung für `review`/`security-review` ist Teil desselben angewendeten Patches.

**Regression gefunden + gefixt [2026-07-13]:** Nach Anwenden des Patches liefen 3 Self-Tests rot
(„Preflight entfernt Stale-Sentinel", beide „Phase 1b"-End-to-End-Tests). Ursache: Diese Tests kopieren
`run-pipeline.sh` in ein isoliertes Temp-Verzeichnis, aber `run-pipeline.sh` sourct jetzt zusätzlich
`scripts/lib/report-verdict.sh` – die Kopie fehlte in den drei Testaufbauten, wodurch die kopierte
Pipeline unter `set -euo pipefail` sofort beim `source` abbrach, bevor der eigentlich getestete Code
lief. Fix: `scripts/lib/report-verdict.sh` in allen drei Temp-Verzeichnis-Aufbauten mitkopieren.
Ergebnis: 254 grün, 0 rot.

## Offene Fragen
- [x] ADR nötig? → **Ja, ADR-019** (Accepted, 2026-07-12).
- [x] `gh`-Verbliste vollständig? → gegen `pr-shepherd.md` gegengeprüft; identisch mit ADR-019 §3 (s. Status).
- [x] Commit-Message im Wrapper: **Pflicht-Argument** (Aufruf-Fehler bei 0 oder >1 Argument) – umgesetzt.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `chore/91-stage3-commit-turn-budget`
Erstellt: 2026-07-12 23:03
