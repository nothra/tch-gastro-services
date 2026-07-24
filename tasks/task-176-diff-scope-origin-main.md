# Task 176: diff-scope-origin-main

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Die Skills `/review`, `/security-review`, `/refactor` und `/pr-shepherd` bestimmen ihren
Diff-/Log-Scope per `git diff main...HEAD` bzw. `git log main...HEAD` gegen das **lokale**
`main`. Nach `start-work.sh` basiert der Worktree auf `origin/main`, das lokale `main` bleibt
zurück – liegt es hinter `origin/main`, enthält der Scope fremde, bereits gemergte PRs (#161:
PR #170 tauchte im Review-Scope auf). Alle **fünf Fundstellen** in **vier** Skill-Dateien auf
`origin/main` umstellen und `git fetch origin` voranstellen. Reine Doku-Umstellung, kein neues
Gate. Lieferung via Patch-Workflow (`tasks/patch-176.diff`), da `.claude/**` agent-hard-denied.

Spec: [`docs/specs/spec-176-diff-scope-origin-main.md`](../docs/specs/spec-176-diff-scope-origin-main.md)

## Akzeptanzkriterien
- [x] `/review`: `git diff origin/main...HEAD` – zeigt nur eigene Branch-Änderungen, keine Fremd-PRs (review.md:12)
- [x] `/security-review`: `git diff origin/main...HEAD` (security-review.md:9)
- [x] `/refactor`: `git diff origin/main...HEAD` (refactor.md:11)
- [x] `/pr-shepherd`: `git log origin/main...HEAD --oneline` an beiden Stellen (pr-shepherd.md:12 + :22)
- [x] Jede Fundstelle hat ein vorangestelltes `git fetch origin` (Aktualisierung des origin/main-Refs)
- [x] Kein `main...HEAD` ohne `origin/`-Präfix mehr in den vier Command-Dateien (grep-verifiziert)
- [x] Fehlerfall: `git fetch origin` ist best-effort formuliert (kein harter Abbruch bei Offline)

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
- **Patch-Workflow zwingend:** `.claude/**` ist agent-hard-denied → Änderung als `tasks/patch-176.diff`
  aufbereiten und über den etablierten Weg committen.
- **Verifikation am Endzustand der committeten Live-Datei**, nicht am Patch-Artefakt (Lesson #212).
- Kein automatisiertes Gate/Test (bewusste Scope-Entscheidung, YAGNI). Prüfung per grep (siehe Spec).

## Offene Fragen
- [ ] Prosa in `docs/factory/lessons/factory-workflow.md:308` (beschreibt Skills noch mit
      `git diff main...HEAD`) nachziehen? Vorschlag: im `/codify`-Schritt, nicht hier.

## Blocker
- Erledigt [2026-07-24]: Patch vom Menschen per `git apply tasks/patch-176.diff` angewendet;
  AC am Endzustand der Live-Dateien grün verifiziert, `[~]`→`[x]`, stale `tasks/patch-176.diff`
  entfernt. (Historie unten belassen.)
- Blocker [2026-07-24]: `.claude/commands/{review,security-review,refactor,pr-shepherd}.md` sind
  für den Agenten hard-denied (Edit/Write `.claude/**`). Die Umstellung liegt programmatisch
  erzeugt als `tasks/patch-176.diff` vor (difflib, UTF-8; `git apply --check` grün; Akzeptanz-Grep
  gegen Temp-Anwendung grün: 0 Treffer `main...HEAD` ohne `origin/`, 5 Treffer `origin/main...HEAD`,
  `git fetch origin` best-effort in jeder Datei). **Erforderliche Aktion (Mensch):** Patch anwenden:
  ```bash
  git apply tasks/patch-176.diff
  ```
  Danach schließt der Agent ab: AC am Endzustand der Live-Dateien verifizieren, `[~]`→`[x]`,
  diesen Blocker als erledigt markieren, stale `tasks/patch-176.diff` entfernen, via
  `factory-commit.sh` committen (Lesson aus #91/#145).

## Review-Findings
Ergebnis: **APPROVED** (Details: [`tasks/review-176.md`](review-176.md)). Keine kritischen Findings.
- Wichtig: Lesson-Prosa `docs/factory/lessons/factory-workflow.md:307-308,:323-325` ist nach diesem
  PR stale (Präsens-Aussage + „Follow-up #176") → **im `/codify`-Schritt dieses PRs** nachziehen
  (siehe Codify-Notizen). Bewusst kein NEEDS_REWORK (Spec-Scope).
- Nitpicks: PROJECT-CONTEXT.md:266 (Index-Titel), factory-workflow.md:136 (anderer Kontext),
  Phrasierungs-Asymmetrie pr-shepherd:12 – im Codify-Sweep mitbewerten.

## Test-Notizen (/test)
- PR-Scope enthält **keinen** Runtime-Code/kein Skript (nur `.claude/commands/*.md` + Doku),
  daher keine Vitest-/Playwright-Tests hinzuzufügen – bewusste YAGNI-Entscheidung der Spec
  („kein automatisiertes Gate/Test"). Kein Produktionscode → nichts, dessen Coverage sinken könnte.
- Deterministische Verifikation dieses Schritts = kanonische Spec-Greps gegen die **committeten
  Live-Dateien** (nicht das Patch-Artefakt, Lesson #212): 0 Treffer `main...HEAD` ohne `origin/`,
  genau 5 Treffer `origin/main...HEAD` – beide PASS [2026-07-24].
- Bestehende Suite unberührt grün (640 passed beim letzten `factory-commit.sh`-Push-Gate).

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->
- **TODO /codify (aus Review #176):** `docs/factory/lessons/factory-workflow.md:305-325` nachziehen –
  Präsens-Aussage (307-308) auf Vergangenheit/„vormals" umstellen, Follow-up-Satz (323-325) als
  erledigt markieren; historischen #161-Vorfall (314-317) belassen. Ergänzend prüfen:
  PROJECT-CONTEXT.md:266 (Index-Titel), factory-workflow.md:136 (generischer Branch-Diff-Kontext).

---
Branch: `feature/176-diff-scope-origin-main`
Erstellt: 2026-07-24 07:34
