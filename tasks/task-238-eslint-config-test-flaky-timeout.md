# Task 238: eslint-config-test-flaky-timeout

## Status
- [x] In Bearbeitung
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
- [x] GIVEN die volle Test-Suite (`pnpm test`) WHEN sie mehrfach hintereinander lokal
      ausgeführt wird (mind. 5–10 Wiederholungen) THEN schlägt `eslint.config.test.ts` in
      keinem Durchlauf mit einem Timeout fehl.
- [x] GIVEN `eslint.config.test.ts` isoliert ausgeführt wird WHEN alle drei bestehenden
      Testfälle laufen THEN bleiben alle drei Assertions inhaltlich unverändert grün
      (test-results ignoriert, playwright-report ignoriert, `app/layout.tsx` nicht ignoriert).
- [x] GIVEN der Fix WHEN der Testcode inspiziert wird THEN enthält er kein `sleep()` und
      keine Test-Reihenfolge-Abhängigkeit.
- [x] GIVEN der Fix WHEN ein echter Hänger/Bug in der ESLint-Config-Resolution auftreten
      würde THEN schlägt der Test weiterhin nach endlicher Frist fehl (kein unbegrenztes
      Timeout, das echte Fehler maskiert).
- [x] GIVEN die bestehende Regression-Guard-Dokumentation (#172) im Test WHEN der Fix
      eingebracht wird THEN bleibt sie erhalten bzw. wird um die Stabilisierungs-Begründung
      ergänzt.

## Technische Notizen
Lösung: `beforeAll(async () => { await eslint.isPathIgnored("app/layout.tsx"); }, 30_000)`
vor den drei bestehenden Tests. Der erste `isPathIgnored`-Aufruf löst die teure
Flat-Config-Resolution aus – durch das Aufwärmen in `beforeAll` läuft sie unter einem eigenen,
großzügigeren (aber weiterhin endlichen) 30-s-Timeout statt unter dem 5000-ms-Default des
ersten Testfalls. Die drei Testkörper selbst bleiben unverändert (Default-Timeout), da
`isPathIgnored` danach bereits aufgelöst/gecacht ist.

Verifikation gemäß Spec-Vorgabe: `pnpm vitest run eslint.config.test.ts` isoliert grün (3/3),
zusätzlich `pnpm test` (volle Suite, 665 Tests) 7× hintereinander wiederholt ausgeführt –
in jedem Durchlauf durchgehend grün, kein Timeout-Fehlschlag. `bash
scripts/checks/pre-commit.sh` (Lint + Tests) bestanden.

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
