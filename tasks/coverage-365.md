# Coverage-Report: Task 365

Kein Spec-Dokument vorhanden (`docs/specs/spec-365.md` existiert nicht) – dies ist ein
Bug-Fix ohne eigene Spec; Akzeptanzkriterien stehen kanonisch in
`tasks/task-365-veranstaltung-katalog-nach-wechsel-falsch.md`.

## Coverage-Analyse

Isolierter Coverage-Lauf gegen den einzigen geänderten Produktionscode
(`app/theke/[token]/page.tsx`), Reportverzeichnis `.coverage-tmp365/` (ADR-040, danach
gelöscht):

```
app/theke/[token]/page.tsx  Lines 100% (7/7) · Statements 100% (8/8) ·
                             Branches 100% (2/2) · Functions 100% (1/1)
```

100 % erreicht – über der Projekt-Schwelle (80 % Minimum, 100 % erwartet für neuen Code,
`testing-standards.md`).

## Akzeptanzkriterien-Abdeckung (aus der Task-Datei)

- [x] Öffentlicher Link zeigt den aktuell zugeordneten Katalog (nicht den ursprünglichen) –
      abgedeckt durch `should_loadCatalogFromVeranstaltung_when_catalogWasSwitchedAwayFromStandard`
      (`app/theke/[token]/page.test.tsx`), inkl. Gegenrichtung
      (`not.toHaveBeenCalledWith(STANDARD_CATALOG_ID)`).
- [x] Verzehr-Erfassung über den öffentlichen Link funktioniert für Artikel des aktuellen
      Katalogs – bereits vor diesem Fix durch `applyVerzehrAdjust`/`app/veranstaltung/actions.test.ts`
      abgedeckt (die Erfassungs-Action war nicht Teil des Bugs, siehe Root-Cause-Notiz in der
      Task-Datei); durch den Fix stimmen Anzeige und Erfassung jetzt auf denselben Katalog
      überein, kein zusätzlicher Test in der Action nötig, da sich ihr Verhalten nicht geändert
      hat.

## Test-Qualität

- Verhalten statt Implementierung getestet (Wiring-Assertion auf die tatsächlich geladene
  `catalogId`, nicht auf interne Zwischenwerte).
- Unabhängig und deterministisch: kein Zeit-/Zufalls-/Netzwerkbezug, `vi.resetAllMocks()` in
  `beforeEach`.
- Kein Mocking von internem Code – gemockt werden ausschließlich Data-Layer-Module
  (`@/db/veranstaltung`, `@/db/catalog`, `@/db/verzehr`) und die Server-Action, alles externe
  Infrastruktur im Sinne der Mocking-Regeln.
- Testname folgt `should_[Ergebnis]_when_[Bedingung]`.

## Finale Test-Ausführung

Unverändert seit dem letzten Security-Review-Schritt (keine Produktions- oder Testdatei in
diesem Schritt geändert): 971 Tests grün, 105 übersprungen (DB-Integrationstests ohne
`.env.local`-Kontext hier irrelevant), Typecheck sauber.

## Ergebnis

Coverage-Schwelle erreicht, keine fehlenden Tests identifiziert. Keine Produktionscode-Änderung
in diesem Schritt.
