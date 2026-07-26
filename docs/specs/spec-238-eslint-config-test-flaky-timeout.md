# Spec: Flaky Test `eslint.config.test.ts` deterministisch stabilisieren

## Kontext

`docs/factory/guidelines/testing-standards.md` → „Flaky Tests: Zero Tolerance" fordert, dass
manchmal-grün/manchmal-rot-Tests sofort behoben oder gelöscht werden. `eslint.config.test.ts`
(Regression-Guard aus #172) schlägt sporadisch mit einem Timeout fehl, wenn die volle
Test-Suite parallel läuft (`pnpm test`), ist isoliert aber immer grün. Beobachtet am
2026-07-26 im pre-push-Gate von `scripts/factory-commit.sh` auf Branch
`fix/224-top-level-yaml-edit-allow`: 1 von 665 Tests failed, Fehlerbild = Code-Frame mit
Caret auf die `it(...)`-Zeile (typisches Timeout-Muster), nicht auf eine Assertion.

Vermutete Ursache: `new ESLint().isPathIgnored(...)` löst beim **ersten** Aufruf die
Flat-Config-Resolution aus (teuer); unter Parallellast überschreitet dieser erste Aufruf das
Vitest-Default-Timeout von 5000 ms. Die bereits in #172 eingeführte geteilte
`ESLint`-Instanz je `describe`-Block amortisiert nur die Konstruktionskosten, nicht die
lazy Config-Resolution beim ersten `isPathIgnored`-Aufruf.

Ein blockierter Push durch einen instabilen Test ohne echtes Produktionsproblem untergräbt
das Vertrauen in das Push-Gate und verzögert nicht-verwandte Arbeit.

## Scope

**Inbegriffen:**
- Stabilisierung von `eslint.config.test.ts`, sodass die Suite unter Parallellast
  (`pnpm test`, volle Suite) deterministisch grün bleibt – keine Timeout-Fehlschläge mehr.
- Die bestehende **verhaltensbasierte** Prüfung aus #172 bleibt inhaltlich unverändert
  erhalten: beide Ignore-Richtungen (`test-results/`, `playwright-report/`) **und** die
  Diskriminierungs-Kontrolle (normale Quelldatei wird NICHT ignoriert).
- Die konkrete technische Lösung (z. B. Config-Resolution vorab in `beforeAll` „aufwärmen",
  explizites Test-Timeout je Fall, o. ä.) entscheidet `/architecture` bzw. `/implement`.

**Nicht inbegriffen:**
- Keine Änderung an `eslint.config.mjs` selbst (Ignore-Regeln, Artefaktpfade) – die
  Konfiguration ist korrekt, nur der Test dazu ist instabil.
- Keine pauschale Erhöhung des globalen Vitest-Default-Timeouts für alle Tests im Projekt.
- Keine Suche/Behebung anderer, möglicherweise ähnlich gebauter Tests mit teurer
  Instanziierung – Scope ist ausschließlich `eslint.config.test.ts`.
- Kein `sleep()`, keine Test-Reihenfolge-Abhängigkeit (per `testing-standards.md`
  ausgeschlossen).

## Akzeptanzkriterien

- [ ] GIVEN die volle Test-Suite (`pnpm test`, aktuell 71 Test-Dateien) WHEN sie mehrfach
      hintereinander lokal ausgeführt wird (mind. 5–10 Wiederholungen) THEN schlägt
      `eslint.config.test.ts` in keinem Durchlauf mit einem Timeout fehl.
- [ ] GIVEN `eslint.config.test.ts` isoliert ausgeführt wird (`pnpm vitest run
      eslint.config.test.ts`) WHEN alle drei bestehenden Testfälle laufen THEN bleiben alle
      drei Assertions inhaltlich unverändert grün:
      - `test-results/some-run/trace.js` → `isPathIgnored` = `true`
      - `playwright-report/trace/assets/bundle.js` → `isPathIgnored` = `true`
      - `app/layout.tsx` → `isPathIgnored` = `false`
- [ ] GIVEN der Fix WHEN der Testcode inspiziert wird THEN enthält er kein `sleep()` und
      keine Abhängigkeit von der Ausführungsreihenfolge der Tests.
- [ ] GIVEN der Fix WHEN ein echter Hänger/Bug in der ESLint-Config-Resolution auftreten
      würde THEN schlägt der Test weiterhin (nach einer angemessenen, endlichen Frist) fehl,
      statt unbegrenzt zu warten – der Fix maskiert keine echten Fehler durch ein
      unbegrenztes Timeout.
- [ ] GIVEN die bestehende Kommentar-Dokumentation im Test (Regression-Guard-Erklärung zu
      #172) WHEN der Fix eingebracht wird THEN bleibt sie erhalten bzw. wird um die neue
      Stabilisierungs-Begründung ergänzt (WHY, nicht WHAT).

## Fehlerszenarien

- [ ] Volle Suite läuft parallel unter hoher Last (viele Worker/Threads) → Test darf nicht
      wegen Timeout fehlschlagen, solange die eigentliche `isPathIgnored`-Logik korrekt
      antwortet.
- [ ] ESLint-Config-Resolution schlägt tatsächlich fehl oder hängt real → Test soll dies
      weiterhin als Fehlschlag melden (kein falsches Grün durch zu hohes/unendliches
      Timeout).

## Offene Fragen

_Keine offenen Fragen – Architektur/Implementierung entscheiden die konkrete technische
Lösung (Timeout-Wert, `beforeAll`-Aufwärmen o. ä.) innerhalb des oben definierten Scopes._

## Verifikationsmethode (Notiz für `/implement`)

Laut Abstimmung mit dem Entwickler: Verifikation erfolgt durch **mehrfachen lokalen
Volllauf** von `pnpm test` (5–10 Wiederholungen) nach dem Fix, nicht nur durch einen
isolierten Lauf der einzelnen Testdatei. Ein einzelner grüner Lauf beweist nichts, da das
Problem per Definition lastabhängig/sporadisch ist.
