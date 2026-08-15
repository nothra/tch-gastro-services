# Task 298: verify-final-state-merged-vor-unpushed

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
`evaluate_final_state()` in `scripts/lib/verify-final-state.sh` prüft ungepushte
Commits **vor** dem PR-Zustand. Bei `pr_shepherd=true` + `pr_state=MERGED` +
gelöschtem `origin/<branch>` (Branch-Auto-Delete nach Squash-Merge) bricht die
Funktion fälschlich mit „Push-Zustand nicht verifizierbar" ab, obwohl AK6 (MERGED =
Erfolg) eigentlich greifen sollte. Fix: MERGED muss unabhängig vom Unpushed-Status
sofort als Erfolg zählen (nur der Working-Tree-Check bleibt davor). Details siehe
[spec-298](../docs/specs/spec-298-verify-final-state-merged-vor-unpushed.md).

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [ ] GIVEN clean + PR_SHEPHERD=true + MERGED + unpushed=NO_UPSTREAM THEN verifiziert (exit 0)
- [ ] GIVEN clean + PR_SHEPHERD=true + MERGED + unpushed=3 THEN ebenfalls verifiziert (exit 0)
- [ ] GIVEN dirty + PR_SHEPHERD=true + MERGED THEN weiterhin "Working Tree nicht sauber" (Tree-Check bleibt vor dem Kurzschluss)
- [ ] GIVEN PR_SHEPHERD=true + pr_state≠MERGED + unpushed nicht-numerisch THEN weiterhin fail-closed "Push-Zustand nicht verifizierbar" (Regressions-Guard)
- [ ] GIVEN PR_SHEPHERD=false THEN unverändertes Verhalten (AK1/AK2/F2/F3 wie bisher)
- [ ] GIVEN bestehende Tests AK1–AK6/F1–F4 THEN bleiben unverändert grün
- [ ] GIVEN verify_final_state() I/O-Ebene mit echtem git-Repo (origin/<branch> gelöscht) + gestubbtem gh (MERGED) THEN verifiziert (exit 0)
- [ ] GIVEN ADR-040 THEN Punkt 1 beschreibt den MERGED-Kurzschluss (Prosa-Abgleich)

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

## Offene Fragen
- [ ] ADR-040: reine Prosa-Korrektur oder eigener /architecture-Trigger? (Empfehlung: Prosa-Korrektur, siehe Spec)
- [ ] Rückwirkende Metrik-Korrektur für Task #182/PR #296 – separates Issue oder kein Thema?

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `fix/298-verify-final-state-merged-vor-unpushed`
Erstellt: 2026-08-15 11:13
