# Task 78: OPERATING.md §1.1 – Worktree gehört der Task, nicht der Session

## Status
- [x] In Bearbeitung
- [x] Review bestanden — Selbst-Review: klärt Session ↔ Worktree korrekt, fügt sich in den Lesefluss vor der Schritt-Liste ein
- [x] Tests vollständig — reine Doku; format:check/lint/unit + Self-Test grün
- [x] Security-Review bestanden — n/a (ein erklärender Halbsatz)
- [x] Refactoring abgeschlossen — n/a
- [x] Codify ausgeführt — kein neuer Regel-Bedarf
- [x] Fertig / PR erstellt

## Beschreibung
Klärender Halbsatz in `docs/factory/OPERATING.md` §1.1: Der Worktree gehört der **Task, nicht der
Session**. `/requirements` und das spätere `/implement` laufen im **selben** Worktree (die geschärfte
Spec liegt als Commit auf genau diesem Branch); eine frische Claude-Session je Schritt ist gut für
die Kontext-Hygiene, ein frischer Working Tree wäre falsch. Trennt die Achsen Session (Kontext) ↔
Worktree (Task/Branch), damit „Eine Task = Eine Session" nicht als „eigener Tree je Schritt"
missverstanden wird.

## Akzeptanzkriterien
- [x] GIVEN §1.1 WHEN ein Leser den start-work-Absatz liest THEN steht explizit, dass Requirements- und Implement-Schritt denselben Worktree teilen (Session frei, Tree nicht).

## Technische Notizen
Ein-Satz-Ergänzung, kein neuer Fakt; fügt sich vor der nummerierten Schritt-Liste ein.

## Offene Fragen
Keine.

## Review-Findings
Selbst-Review, keine Findings.

## Codify-Notizen
Kein neuer Stolperstein.

---
Branch: `docs/78-operating-11-worktree-gehoert-der-task-nicht-der-session-klarstellen`
Erstellt: 2026-07-12
</content>
