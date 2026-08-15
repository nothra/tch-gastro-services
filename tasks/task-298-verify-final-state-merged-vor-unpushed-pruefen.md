# Task 298: verify-final-state-merged-vor-unpushed-pruefen

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
**Nur Doku (Lesson), kein Code-Fix.** Task 182 (`PR_SHEPHERD=true`-Pipeline-Lauf) endete trotz
sauber gemergtem PR #296 mit `exit 1` und `INTERRUPT-182.md`. Ursache: `evaluate_final_state()`
in `scripts/lib/verify-final-state.sh` prüft den Unpushed-/Upstream-Status **vor** dem
PR-MERGED-Kurzschluss – bei aktivem „Automatically delete head branches" existiert
`origin/<branch>` nach jedem Merge nicht mehr, der Unpushed-Check bricht fail-closed ab, bevor
der MERGED-Zustand (AK6) je geprüft wird. Details siehe Lesson-Eintrag.

Dieser Task liefert **nur** den Lesson-Eintrag (`lessons/factory-workflow.md` + Index-Zeile in
`PROJECT-CONTEXT.md`), damit das Muster nicht verloren geht. Der eigentliche Code-Fix in
`verify-final-state.sh` (PR-MERGED-Prüfung vor/unabhängig von der Unpushed-Prüfung) ist
**nicht** Teil dieser PR und bleibt unter Issue #298 offen – die PR schließt das Issue deshalb
bewusst nicht.

## Akzeptanzkriterien
- [x] Lesson-Eintrag in `docs/factory/lessons/factory-workflow.md` beschreibt Ursache, Smell und
      Regel korrekt gegen den aktuellen Stand von `scripts/lib/verify-final-state.sh`.
- [x] Index-Zeile in `docs/factory/PROJECT-CONTEXT.md` unter der `factory-workflow.md`-Gruppe
      ergänzt, mit „Laden bei"-Trigger.
- [x] Gates grün (lint/tests/typecheck/format/routes-doc).

## Technische Notizen
Reine Doku-Änderung, kein Produktionscode berührt. `factory-workflow.md`/`PROJECT-CONTEXT.md`
sind nicht `@import`-geladen bzw. nur als Index (ADR-037) – Änderung entsprechend dort platziert,
nicht im @import-Pfad selbst.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/298-verify-final-state-merged-vor-unpushed-pruefen`
Erstellt: 2026-08-15 10:43
