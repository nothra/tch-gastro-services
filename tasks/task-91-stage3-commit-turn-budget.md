# Task 91: stage3-commit-turn-budget

## Status
- [ ] In Bearbeitung
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
- [ ] GIVEN Feature-Branch mit uncommitteten Änderungen, WHEN `bash scripts/factory-commit.sh "<message>"`,
      THEN committet + pusht (Exit 0), ohne Permission-Prompt (`Bash(bash scripts/*)`).
- [ ] GIVEN Branch ist `main`/`master`, WHEN `factory-commit.sh`, THEN fail-closed (Exit ≠ 0), nichts committet/gepusht.
- [ ] GIVEN nichts zu committen, WHEN `factory-commit.sh`, THEN klare Meldung + definierter Exit, ohne Pipeline-Abbruch.
- [ ] GIVEN Stage-3-Sub-Agent (`/implement`, `/test`, `/refactor`, `/bug-fix`), WHEN er seine Arbeit sichert,
      THEN über `scripts/factory-commit.sh` (Skill-Doku weist das an), nicht über rohes `git commit`/`git push`.
- [ ] GIVEN read-only-git (`status`/`diff`/`log`/`branch`/`rev-parse`) im Stage-3-Modus, THEN ohne Prompt/Interrupt.
- [ ] GIVEN `PR_SHEPHERD=true bash scripts/run-pipeline.sh <task-id>`, WHEN Durchlauf,
      THEN committet + pusht + aktualisiert den PR ohne manuelles Nachziehen (genutzte `gh`-Verben freigegeben).

### Lücke 2 – Turn-Budget
- [ ] GIVEN `/security-review` schreibt `tasks/security-<id>.md` mit `PASSED`/`NEEDS_FIXES` und reißt DANACH das Limit,
      WHEN `run_skill()` auswertet, THEN Erfolg (kein Fehlversuch, kein Exit 1).
- [ ] GIVEN `/review` schreibt `tasks/review-<id>.md` mit `APPROVED`/`NEEDS_REWORK` und reißt danach das Limit,
      WHEN `run_skill()` auswertet, THEN Erfolg.
- [ ] GIVEN anderer (nicht-report) Skill bricht non-zero ab, WHEN `run_skill()` auswertet, THEN Verhalten unverändert (Retry → Exit 1).
- [ ] GIVEN kein/kein gültiger Verdict-Report, WHEN `review`/`security-review` non-zero abbricht, THEN weiterhin Fehlschlag (fail-closed).
- [ ] GIVEN `factory.defaults.yml`, WHEN gelesen, THEN `max_turns: 14` für `review` + `security-review` mit `@reason`.
- [ ] GIVEN `bash scripts/run-pipeline.sh <task-id> --dry-run`, WHEN ausgeführt, THEN zeigt neue Turn-Werte ohne Regression.

### Querschnitt
- [ ] Self-Tests in `scripts/checks/tests/run-tests.sh`: (a) `factory-commit.sh` (Happy-Path via git-Stub,
      main/master-Verweigerung, „nichts zu committen"), (b) Report-Guard (Verdict → Erfolg; ohne → Fehlschlag) – bleibt grün.
- [ ] `.claude/settings.json` konsistent: `.claude/**` + `.env*` weiter in `deny`; kein pauschales `Bash(git *)`/`Bash(gh *)`.

### Fehlerszenarien
- [ ] `factory-commit.sh` ohne git-Repo / detached HEAD → fail-closed (Exit ≠ 0), klare Meldung.
- [ ] `git push` scheitert (Netz/pre-push rot) → Exit ≠ 0 mit weitergereichter Ursache; kein stiller „committed, nicht gepusht".
- [ ] Report existiert ohne gültigen Verdict → Guard greift nicht (Versuch = Fehlschlag).
- [ ] Verdict-Erkennung an verbindliche Report-Werte gekoppelt (wie `pipeline_summary`), nicht frei geraten.
- [ ] Portabilität macOS/BSD + CI/GNU/Alpine: POSIX-Shell/-Regex, kein PCRE; variable Werte als Daten (`grep -F --`, Integer-Guards, ADR-010).

## Technische Notizen
Entscheidungen + Alternativen: **ADR-019** (Accepted). Umsetzung TDD-first (Wrapper + Guard = Shell-Logik,
git via Stub, Muster #80). `gh`-Verbliste vor Umsetzung gegen die aktuelle `.claude/commands/pr-shepherd.md`
gegenprüfen. Betroffene Artefakte: `scripts/factory-commit.sh` (neu), `.claude/settings.json`,
`scripts/run-pipeline.sh` (`run_skill()` + geteilter Verdict-Helper), `factory.defaults.yml`,
Skills `implement`/`test`/`refactor`/`bug-fix`, `scripts/checks/tests/run-tests.sh`.

## Offene Fragen
- [x] ADR nötig? → **Ja, ADR-019** (Accepted, 2026-07-12).
- [ ] `gh`-Verbliste vollständig? → vor `/implement` gegen aktuelle `pr-shepherd.md` gegenprüfen, nur genutzte Verben.
- [ ] Commit-Message im Wrapper: Empfehlung **Pflicht-Argument** (Message-Verantwortung bleibt beim Skill).

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `chore/91-stage3-commit-turn-budget`
Erstellt: 2026-07-12 23:03
