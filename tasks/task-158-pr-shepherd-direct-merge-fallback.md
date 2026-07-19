# Task 158: pr-shepherd-direct-merge-fallback

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
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
<!-- Von /requirements befüllt; Detail siehe Spec -->
- [ ] AC1 – Schritt 6 liest den PR-Merge-Zustand (`gh pr view --json mergeStateStatus[,mergeable]`)
- [ ] AC2 – bereits mergebar (`CLEAN`) → direkter `gh pr merge --squash` (ohne `--auto`)
- [ ] AC3 – Checks laufen noch (≠ `CLEAN`) → `gh pr merge --auto --squash` wie bisher
- [ ] AC4 – Reihenfolge-Guardrail (#114): Abschlussnotiz via `factory-commit.sh` VOR jedem Merge-Aufruf
- [ ] AC5 – Konsistenz-Test in `run-tests.sh` (Zustandsprüfung + Direct-Merge-Fallback, Positiv+Negativ)
- [ ] AC6 – Stolperstein `allow_auto_merge` in `PROJECT-CONTEXT.md` dokumentiert

## Fehlerszenarien
- [ ] Fail-closed: roter direkter Merge wird vom Ruleset `protect-main` weiterhin blockiert
- [ ] Patch-Workflow: `tasks/patch-158.diff` programmatisch erzeugt, `git apply --check` verifiziert (#91/#94)
- [ ] Order-Guard: Direct-Merge-Grep matcht nicht die `--auto --squash`-Zeile; #114-Reihenfolge bleibt grün

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

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/158-pr-shepherd-direct-merge-fallback`
Erstellt: 2026-07-19 08:09
