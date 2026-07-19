# Task 158: pr-shepherd-direct-merge-fallback

## Status
- [x] In Bearbeitung
- [x] Review bestanden (APPROVED, `tasks/review-158.md`)
- [x] Tests vollständig (`run-tests.sh`: 304 grün / 0 rot)
- [x] Security-Review bestanden (PASSED, `tasks/security-158.md`)
- [x] Refactoring abgeschlossen (line_before-Helper, N4)
- [x] Codify ausgeführt (`tasks/codify-158.md`)
- [ ] Fertig / PR erstellt

## Beschreibung
`/pr-shepherd` Schritt 6 aktiviert den Merge nur über `gh pr merge --auto --squash`.
GitHub lehnt `--auto` aber ab, wenn der PR **bereits mergebar** ist
(`mergeStateStatus: CLEAN`) – typisch bei schnellem CI (Docs-/ADR-PRs). Der Schritt
scheitert dann, obwohl der PR sauber mergebar ist (beobachtet an PR #157 / Task #155).

Fix: Schritt 6 den Zustand prüfen lassen (`gh pr view --json mergeStateStatus,mergeable`)
und bei bereits mergebarem PR auf einen **direkten** `gh pr merge --squash` zurückfallen;
sonst wie bisher `--auto --squash`. Reihenfolge-Guardrail (#114) bleibt gewahrt.
Umsetzung über Patch-Workflow (`.claude/**` hard-denied, #88/#94).

Spec: `docs/specs/spec-158-pr-shepherd-direct-merge-fallback.md`

## Akzeptanzkriterien
<!-- Von /requirements befüllt; Detail siehe Spec. Patch appliziert+committet (cce17d1). -->
- [x] AC1 – Schritt 6 liest den PR-Merge-Zustand (`gh pr view --json mergeStateStatus`)
- [x] AC2 – bereits mergebar (`CLEAN`) → direkter `gh pr merge --squash` (ohne `--auto`)
- [x] AC3 – Checks laufen noch (≠ `CLEAN`) → `gh pr merge --auto --squash` wie bisher
- [x] AC4 – Reihenfolge (#114): Abschlussnotiz via `factory-commit.sh` VOR beiden Merge-Aufrufen
- [x] AC5 – Konsistenz-Test in `run-tests.sh` (mergeStateStatus + Direct-Merge, Positiv+Negativ #94 belegt)
- [x] AC6 – Stolperstein `allow_auto_merge` in `PROJECT-CONTEXT.md` dokumentiert

## Fehlerszenarien
- [x] Fail-closed: roter direkter Merge wird vom Ruleset `protect-main` weiterhin blockiert (ADR-030)
- [x] Patch-Workflow: `tasks/patch-158.diff` programmatisch erzeugt (`difflib`), `git apply --check` grün (#94)
- [x] Order-Guard: Direct-Merge-Grep matcht nicht die `--auto --squash`-Zeile; #114-Reihenfolge bleibt grün

## Blocker
Blocker [2026-07-19]: `.claude/commands/pr-shepherd.md` ist für den Agenten hard-denied (#88) –
AC1–AC4 als `tasks/patch-158.diff` geliefert (programmatisch via `difflib` erzeugt, `git apply
--check` verifiziert, gegen Temp-Kopie Positiv+Negativ belegt).
**Erledigt [2026-07-19]:** Mensch hat den Patch appliziert und committet (`cce17d1`). Die 3
`#158`-Self-Tests sind grün (`run-tests.sh`: 303 grün / 0 rot). Checkboxen auf `[x]` gesetzt,
stale `tasks/patch-158.diff` entfernt (#145).

Blocker [2026-07-19]: Review-Rework (siehe `tasks/review-158.md`) enthält kosmetische
`.claude/commands/pr-shepherd.md`-Fixes (W1 Notiz-Template, N2 Output/Regel/Stage-3, N7
Encoding) – hard-denied (#88), erneut als `tasks/patch-158.diff` geliefert (programmatisch,
`git apply --check` grün, keine Verhaltensänderung, 303/303 Self-Tests bleiben grün).
**Erledigt [2026-07-19]:** Mensch hat den Review-Rework-Patch appliziert und committet
(`049bf7d`); W1/N2/N7 sind im Branch, 303/303 Self-Tests grün. Stale `tasks/patch-158.diff`
entfernt (#145). Fixes an editierbaren Dateien (`run-tests.sh`, Spec) waren bereits committet.

## Technische Notizen
**ADR:** [ADR-030](../docs/adr/030-pr-shepherd-direct-merge-fallback.md) – Accepted.

Entscheidung (Schritt 6, `.claude/commands/pr-shepherd.md`):
- `MERGE_STATE=$(gh pr view --json mergeStateStatus -q .mergeStateStatus)` **vor** dem Merge lesen.
- `CLEAN` → direkter `gh pr merge --squash` (ohne `--auto`).
- sonst (fail-closed, alles ≠ `CLEAN`) → `gh pr merge --auto --squash` wie bisher.
- Der commit+push der Abschlussnotiz (`factory-commit.sh`) bleibt **vor** beiden Merge-Zeilen (#114).

Konsistenz-Test (`scripts/checks/tests/run-tests.sh`), analog #114/#117-Guards:
- Positiv/Negativ auf (a) `mergeStateStatus` im Schritt-6-Abschnitt und (b) Direct-Merge-Zweig.
- `section_contains '### Schritt 6' … "$SHEPHERD"` nutzen; End-Header prüfen (Schritt 6 ist der
  letzte `### Schritt` → als Ende `## Regeln` verwenden).
- Direct-Merge-Grep gegen die **volle** `gh pr merge --squash`-Zeile prüfen und sicherstellen,
  dass er nicht die `--auto --squash`-Zeile matcht (Lehre #114: Kommando ≠ Teil-Match).
- Bestehende #114-Order-Assertion darf nicht brechen (Abschlussnotiz-Zeile < beide Merge-Zeilen).

Patch-Workflow (`.claude/**` hard-denied #88/#94):
- `tasks/patch-158.diff` **programmatisch** erzeugen (Original in Temp-Kopie, Änderung anwenden,
  `git diff --no-index`/`difflib`), Pfad-Header `a/.claude/… b/.claude/…`.
- `git apply --check tasks/patch-158.diff` read-only verifizieren + Temp-Kopie gegen AC-Assertions.
- Blocker in dieser Datei protokollieren (`Blocker [Datum]: … – git apply …`). Nach Apply durch den
  Menschen: `[~]`→`[x]`, Blocker als erledigt markieren, stale `tasks/patch-158.diff` entfernen (#145).

**Branch-Typ-Check (#120):** Scope = Skill-Verhaltensänderung (neuer Fallback) + Test + Doku.
Neues Verhalten im Tooling → `feature/` ist vertretbar; Label `enhancement`+`tech-debt` passt.
Branch/Label **nicht** umbenennen: Draft-PR #159 ist bereits offen, jede Rename-Variante würde ihn
schließen (#155) – der Präzisionsgewinn (`improvement/`) wiegt die PR-Ersatz-Kosten nicht auf.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
_Keine offen._ Die Zustands-Bedingung ist in ADR-030 auf `CLEAN`-only entschieden (sonst `--auto`).

## Test-Abdeckung (/test)
Kein neuer TypeScript-Code → vitest-Coverage-Baseline (Schwelle 80 %) unberührt; relevante
Abdeckung ist die Shell-Self-Test-Suite. AC-Mapping:
- AC1 `mergeStateStatus` gelesen · AC2 Direct-Merge `--squash` · **AC3 `--auto`-Fallback bleibt
  (im /test-Schritt ergänzt – vorher nur transitiv über den #114-Order-Guard)** · AC4 Reihenfolge
  → je eine dedizierte `#158`-Assertion (Section-begrenzt, #117-Prinzip, #94 Positiv+Negativ belegt).
- AC5 = die Assertions selbst. AC6 (Stolperstein) = Doku, keine Test-Präzedenz für PROJECT-CONTEXT-
  Prosa (kein Gold-Plating).
- Ergebnis: `run-tests.sh` 304 grün / 0 rot; `pnpm test` 376 grün.

## Refactor (/refactor)
- Reihenfolge-Check-Muster (3. Wiederholung, Review-Nitpick N4) in Helper `line_before <a> <b>
  <file>` extrahiert (Prädikat-Stil wie `section_contains`), an #114 **und** #158-AC4 genutzt.
- Entkoppelt die subtile Cross-Block-Abhängigkeit: #158-AC4 hing zuvor an `_shep_commit_line`
  aus dem #114-Block – beide sind jetzt eigenständig.
- Kein neues Verhalten: `run-tests.sh` 304 grün vor und nach dem Refactor.

## Review-Findings
Siehe `tasks/review-158.md` – **APPROVED**. Keine kritischen Findings. 2 wichtige (Notiz-Template
W1, Test-Namen/Dedup W2) + 5 Nitpicks adressiert; 2 Nitpicks bewusst deferiert (Order-Guard-
Präzision = pre-existing #114-Muster; Helper-Extraktion → `/refactor`). Editierbare Fixes
committet, `.claude/**`-Kosmetik als `patch-158.diff` (Mensch appliziert, siehe Blocker).

## Codify-Notizen
Siehe `tasks/codify-158.md`. Neue Regel in `PROJECT-CONTEXT.md` (#94/#145-Patch-Workflow-Sektion,
„aus #158"): (1) UTF-8 statt ASCII-Faltung in programmatischen Patch-Replacements; (2) Ganzdatei-
Sweep bei Semantik-/Header-Änderung einer Skill-Datei (Header/Output/Regeln/Templates), nicht nur
die geänderten Zeilen – sonst folgt ein vermeidbarer zweiter Apply-Zyklus. Übrige Findings bereits
durch bestehende Regeln (clean-code, #117, #51, #36) abgedeckt. Keine Folge-Issues.

---
Branch: `feature/158-pr-shepherd-direct-merge-fallback`
Erstellt: 2026-07-19 08:09
