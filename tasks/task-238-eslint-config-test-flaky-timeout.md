# Task 238: eslint-config-test-flaky-timeout

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Der Test `should_ignoreTestResultsDir_when_lintingAfterE2eRun` in `eslint.config.test.ts`
schlägt sporadisch mit einem Timeout fehl, wenn die volle Test-Suite parallel läuft (isoliert
immer grün). Ursache vermutlich: `new ESLint().isPathIgnored(...)` löst beim ersten Aufruf
die teure Flat-Config-Resolution aus, die unter Parallellast das Vitest-Default-Timeout von
5000 ms überschreitet. Fix soll die Suite deterministisch grün machen, ohne die
verhaltensbasierte Testaussage aus #172 zu verändern. Details: `docs/specs/spec-238-eslint-config-test-flaky-timeout.md`.

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [ ] GIVEN die volle Test-Suite (`pnpm test`) WHEN sie mehrfach hintereinander lokal
      ausgeführt wird (mind. 5–10 Wiederholungen) THEN schlägt `eslint.config.test.ts` in
      keinem Durchlauf mit einem Timeout fehl.
- [ ] GIVEN `eslint.config.test.ts` isoliert ausgeführt wird WHEN alle drei bestehenden
      Testfälle laufen THEN bleiben alle drei Assertions inhaltlich unverändert grün
      (test-results ignoriert, playwright-report ignoriert, `app/layout.tsx` nicht ignoriert).
- [ ] GIVEN der Fix WHEN der Testcode inspiziert wird THEN enthält er kein `sleep()` und
      keine Test-Reihenfolge-Abhängigkeit.
- [ ] GIVEN der Fix WHEN ein echter Hänger/Bug in der ESLint-Config-Resolution auftreten
      würde THEN schlägt der Test weiterhin nach endlicher Frist fehl (kein unbegrenztes
      Timeout, das echte Fehler maskiert).
- [ ] GIVEN die bestehende Regression-Guard-Dokumentation (#172) im Test WHEN der Fix
      eingebracht wird THEN bleibt sie erhalten bzw. wird um die Stabilisierungs-Begründung
      ergänzt.

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
Keine – Architektur/Implementierung entscheiden die konkrete technische Lösung
(Timeout-Wert, `beforeAll`-Aufwärmen o. ä.) innerhalb des in der Spec definierten Scopes.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `fix/238-eslint-config-test-flaky-timeout`
Erstellt: 2026-07-26 13:01
