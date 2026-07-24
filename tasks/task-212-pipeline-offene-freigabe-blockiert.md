# Task 212: pipeline-offene-freigabe-blockiert

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [ ] Security-Review bestanden
- [x] Refactoring abgeschlossen
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
- [x] AK1 – Ungepushte Commits am Ende → kein Erfolg, Non-Zero-Exit
- [x] AK2 – Sauber + gepusht (PR_SHEPHERD=false) → Erfolg (Exit 0)
- [x] AK3 – Draft-PR (PR_SHEPHERD=true) → kein Erfolg, Non-Zero-Exit
- [x] AK4 – Weder gemergt noch Auto-Merge scharf (PR_SHEPHERD=true) → kein Erfolg
- [x] AK5 – Merge-ready / Auto-Merge scharf (PR_SHEPHERD=true) → Erfolg (Exit 0)
- [x] AK6 – PR bereits MERGED (PR_SHEPHERD=true) → Erfolg (Exit 0)
- [x] AK7 – pr-shepherd eskaliert per raise-interrupt.sh statt interaktiver Frage (Stage 3) — via `tasks/patch-212.diff` (`.claude/**` hard-denied), Test gegen Temp-Kopie belegt „green nach apply"
- [x] AK8 – Interrupt-Sentinel stoppt Pipeline vor der Erfolgs-Ausgabe (Regressions-Guard)
- [x] AK9 – `.gitignore` deckt `.coverage-tmp<id>/` generisch ab (mit Test)
- [x] AK10 – Kein Factory-Pfad schreibt Coverage in einen getrackten Ort (Konvention in `testing-standards.md`)
- [x] F1 – `gh`/`git`-Verifikation schlägt fehl → fail-closed (kein Erfolg)
- [x] F2 – Kein Upstream/Tracking → fail-closed „nicht gepusht"
- [x] F3 – Uncommittete Änderungen am Ende → kein Erfolg
- [x] F4 – `--dry-run` bleibt grün (Verifikation übersprungen/markiert)

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

## Implementierungs-Notizen (/implement, 2026-07-23)

- **Neue sourcebare Lib `scripts/lib/verify-final-state.sh`** (ADR-040 §5, Muster
  `tier-select.sh`): `evaluate_final_state` (reine Entscheidung über erhobene Fakten) +
  `verify_final_state` (I/O-Wrapper, erhebt Fakten via `git`/`gh`). Trennung macht die
  Entscheidungslogik ohne echtes Repo/GitHub testbar; `git` über `-C`, `gh` über einen
  atomaren `gh pr view --json … -q '…|@tsv'`-Aufruf (kein externes `jq`).
- **`scripts/run-pipeline.sh`:** sourct die Lib (bei den anderen `source`-Zeilen) und ruft
  die Verifikation **unmittelbar vor** dem Erfolgs-Banner auf (nach `pipeline_summary`).
  Verletzung → `raise-interrupt.sh 212 INCOMPLETE_OUTCOME "<realer Zustand>"` + `exit 1`
  (fail-closed, ehrliche Autonomie-Rate ADR-006). `--dry-run` überspringt die Verifikation.
- **AK9/AK10:** `.gitignore`-Muster `.coverage-tmp*/` war bereits vorhanden (aus #210) →
  nur Regressionstest (`git check-ignore`) ergänzt. Kein Factory-Pfad schreibt Coverage in
  einen getrackten Ort (Vitest-Default `coverage/`, ignoriert); die Konvention ist jetzt in
  `docs/factory/guidelines/testing-standards.md` dokumentiert.
- **Tests:** 42 neue Fälle in `scripts/checks/tests/run-tests.sh` (evaluate_final_state
  rein, verify_final_state I/O mit echtem Temp-Repo + gestubbtem `gh`, Pipeline-Wiring inkl.
  Reihenfolge-Guard, AK8-Verhaltenstest mit Mock-`claude`+Sentinel, AK9/AK10, AK7 gegen
  Temp-Kopie). `verify-final-state.sh` in **allen 5** run-pipeline-Scaffoldings mitkopiert
  (Lesson #197). Suite grün: 446/446.

Blocker 2026-07-23: `.claude/commands/pr-shepherd.md` (AK7) ist für den Agenten hard-denied
(`Write(.claude/**)`) – als **Patch** `tasks/patch-212.diff` geliefert (programmatisch erzeugt).
**Erledigt 2026-07-23:** Mensch hat `git apply tasks/patch-212.diff` angewandt; die Änderung ist
committet, `tasks/patch-212.diff` entfernt (Lesson #145). Der AK7-Test in `run-tests.sh` prüft
jetzt den **Endzustand** der committeten Live-`pr-shepherd.md` direkt (nicht mehr das transiente
Patch-Artefakt) – das war ein Review-Finding (#212, Runde 1/3, siehe `tasks/review-212.md`).

**Review-Rework 2026-07-23 (nach Runde 1):** AK7-Test entkoppelt vom Patch-Artefakt; E2E-Test des
Verifikations-Interrupt-Pfads ergänzt (`INCOMPLETE_OUTCOME`); `OPERATING.md`-Interrupt-Tabelle um
`INCOMPLETE_OUTCOME`+`PUSH_GATE_BLOCKED` ergänzt; gh-TSV-Contract-Kommentar; AK8-Typ-Assertion;
detached-HEAD-Guard. Suite: 450 grün.

## Refactoring (/refactor, 2026-07-24)

**Ergebnis: kein Refactoring nötig** (kein neues Verhalten; bewusste Entscheidung, kein No-Op-Zwang).
Der geänderte Code wurde in drei Review-Runden als sauber bestätigt. Geprüfte Kandidaten:
- **Funktionslänge** `evaluate_final_state` (45) / `verify_final_state` (40): über der ~20-Zeilen-
  Orientierung, aber beide sind **lineare Guard-Clause-Sequenzen ohne Verschachtelung**, großteils
  WHY-Kommentare. Ein Split (z. B. `_evaluate_pr_state`) würde eine kohärente Checklisten-Logik
  fragmentieren und Indirektion ohne Komplexitätsgewinn schaffen → bewusst unterlassen
  (clean-code.md „Kein Over-Engineering").
- **Domänen-Token** (`clean`/`dirty`, `NO_UPSTREAM`, `set`/`none`, `MERGED`): klein, lokal, per
  Kommentar selbsterklärend – keine Magic-String-Extraktion nötig.
- **Test-Scaffolding-Duplikation** (TMP_INT/AK8 ↔ TMP_E2E/W3): realer, aber die beiden Aufbauten
  unterscheiden sich substanziell (Sentinel-`claude` + nur implement.md vs. no-op-`claude` + alle 6
  Command-Dateien + origin-Remote). Eine gemeinsame Hilfsfunktion brächte mehr Kopplung als Nutzen;
  konsistent mit den bestehenden Einzel-Scaffoldings der Suite. Belassen.

Tests vor == nach: `run-tests.sh` **454 grün / 0 rot** (kein Code-Change in dieser Phase).

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `fix/212-pipeline-offene-freigabe-blockiert`
Erstellt: 2026-07-23 21:54
