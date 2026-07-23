# Task 212: pipeline-offene-freigabe-blockiert

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung

Ein unbeaufsichtigter Pipeline-Lauf (`run-pipeline.sh`, `FACTORY_STAGE=3`) meldete
„Pipeline erfolgreich abgeschlossen", obwohl `/pr-shepherd` in Phase 7 auf ein den
Push-Gate blockierendes getracktes Artefakt traf und **interaktiv nach Freigabe fragte**
(statt zu eskalieren) – die Frage blieb unbeantwortet, der PR blieb Draft/ungemergt,
Commits ungepusht. Zwei Bruchstellen: (1) der Agent fragte statt `raise-interrupt.sh`
aufzurufen; (2) die Pipeline verifiziert den realen Endzustand nie, sondern spiegelt nur
Report-Dateitext.

Fix (defense in depth, mit dem Entwickler geklärt):
- **Pipeline-Seite:** `run-pipeline.sh` verifiziert vor der Erfolgs-Ausgabe den realen
  Endzustand (keine ungepushten Commits/uncommitteten Änderungen; bei `PR_SHEPHERD=true`
  zusätzlich: PR nicht Draft und gemergt ODER Auto-Merge scharf). Sonst fail-closed
  BLOCKED (Non-Zero-Exit).
- **Agenten-Seite:** `/pr-shepherd` fragt unter `FACTORY_STAGE=3` nie interaktiv, sondern
  eskaliert Blocker per `raise-interrupt.sh`.
- **Nebenbefund:** `.gitignore` deckt Coverage-Temp-Verzeichnisse generisch ab.

Spec: `docs/specs/spec-212-pipeline-endzustand-verifizieren.md`
Verwandt: #211 (gleiche Symptomfamilie „Erfolg trotz Draft-PR"), ADR-004 (Interrupt).

## Akzeptanzkriterien
<!-- Quelle: docs/specs/spec-212-pipeline-endzustand-verifizieren.md -->
- [ ] AK1 – Ungepushte Commits am Ende → kein Erfolg, Non-Zero-Exit
- [ ] AK2 – Sauber + gepusht (PR_SHEPHERD=false) → Erfolg (Exit 0)
- [ ] AK3 – Draft-PR (PR_SHEPHERD=true) → kein Erfolg, Non-Zero-Exit
- [ ] AK4 – Weder gemergt noch Auto-Merge scharf (PR_SHEPHERD=true) → kein Erfolg
- [ ] AK5 – Merge-ready / Auto-Merge scharf (PR_SHEPHERD=true) → Erfolg (Exit 0)
- [ ] AK6 – PR bereits MERGED (PR_SHEPHERD=true) → Erfolg (Exit 0)
- [ ] AK7 – pr-shepherd eskaliert per raise-interrupt.sh statt interaktiver Frage (Stage 3)
- [ ] AK8 – Interrupt-Sentinel stoppt Pipeline vor der Erfolgs-Ausgabe (Regressions-Guard)
- [ ] AK9 – `.gitignore` deckt `.coverage-tmp<id>/` generisch ab (mit Test)
- [ ] AK10 – Kein Factory-Pfad schreibt Coverage in einen getrackten Ort
- [ ] F1 – `gh`/`git`-Verifikation schlägt fehl → fail-closed (kein Erfolg)
- [ ] F2 – Kein Upstream/Tracking → fail-closed „nicht gepusht"
- [ ] F3 – Uncommittete Änderungen am Ende → kein Erfolg
- [ ] F4 – `--dry-run` bleibt grün (Verifikation übersprungen/markiert)

## Technische Notizen
<!-- Von /architecture befüllt: ADR-040 -->

**Architektur:** [ADR-040](../docs/adr/040-pipeline-endzustands-verifikation.md) –
Deterministische Endzustands-Verifikation als agenten-signal-unabhängiger Backstop.
Ergänzt ADR-004 (stoppt *auf Signal*) → 040 stoppt *auf beobachteten Zustand ohne Signal*.
Defense in depth: Pipeline-Verifikation (deterministisch) + pr-shepherd-Interrupt (Best-Effort).

Kernstellen:
- `scripts/run-pipeline.sh`: neue Verifikation **vor** dem Erfolgs-Banner (:485–494), nach
  `pipeline_summary()` (:319). `run_skill()`-„✓ abgeschlossen" (:250) bleibt informativ –
  autoritativ ist die Endzustands-Verifikation. Phase 7 pr-shepherd (:474–479).
- **Verifikation als sourcebare Funktion auslagern** (analog `scripts/lib/report-verdict.sh`,
  `tier-select.sh`) → im Test-Harness ohne echtes Repo/GitHub prüfbar; `git`/`gh` injizierbar
  (PATH-Shim/Parameter).
- `.claude/commands/pr-shepherd.md`: Blocker unter FACTORY_STAGE=3 → `raise-interrupt.sh`
  statt interaktiver Frage; kein autonomes `git rm --cached` (Schritt 2/6, „Regeln").
- Interrupt-Mechanik (unverändert, nur nutzen): `scripts/raise-interrupt.sh`,
  `scripts/checks/interrupt-check.sh`.
- Verifikations-Verletzung → `raise-interrupt.sh <id> INCOMPLETE_OUTCOME "<realer Zustand>"`
  (deterministischer Stopp + `interrupt-log.jsonl` → Autonomie-Rate ehrlich, ADR-006), dann
  Non-Zero-Exit.
- Tests: `scripts/checks/tests/run-tests.sh` (Dry-Run-Integrationstests dort).
- `.gitignore`: Zeile `.coverage-tmp*/` (aus #210) – Regressionstest ergänzen.

**Verifikations-Contract (ADR-040):**
- Beide Modi: Working Tree sauber + `git rev-list origin/<branch>..HEAD` leer.
- `PR_SHEPHERD=true` zusätzlich: PR nicht Draft + (MERGED oder `autoMergeRequest` gesetzt).
- Fail-closed: nicht verwertbarer `git`/`gh`-Aufruf oder kein Upstream → „nicht verifiziert".
- `--dry-run`: Verifikation überspringen/markieren, nicht abbrechen.

**Entschieden (war offen):** BLOCKED-Abschluss wird über `raise-interrupt.sh` geloggt
(Typ `INCOMPLETE_OUTCOME`), damit `/daily-metrics` (ADR-006) korrekt zählt.

**Latenter Nebenfund (nicht Teil des Fixes, ggf. eigenes Issue):** `pipeline_summary()` liest
`task-${id}.md` ohne `-<name>`-Suffix (:322) → findet reale Task-Datei nicht (Anzeigefehler).

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `fix/212-pipeline-offene-freigabe-blockiert`
Erstellt: 2026-07-23 21:54
