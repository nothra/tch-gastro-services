# Coverage-Report: Task 267

## Einordnung

Task 267 ist eine reine Prozess-Doku-Präzisierung – kein App-Code (TypeScript/React/Server
Actions/Data-Layer) wurde geändert. Die "Tests" für diese Task sind die Regressions-Guards in
`scripts/checks/tests/run-tests.sh`, nicht die Vitest-Suite. Die Vitest-Coverage ist daher nur
zur Regressions-Kontrolle relevant (kein App-Code geändert → keine Verschiebung erwartet), nicht
als AK-Nachweis.

## Vitest-Coverage (Regressions-Kontrolle, kein AK-Bezug)

`pnpm test:coverage` (exit 0):

```
Statements   : 89.27% ( 1140/1277 )
Branches     : 94.31% ( 664/704 )
Functions    : 78.63% ( 287/365 )
Lines        : 89.27% ( 1016/1138 )
```

Über der 80%-Mindest-Coverage aus `PROJECT-CONTEXT.md`. Die niedrige Funktions-/Statement-
Coverage im `db/`-Verzeichnis ist vorbestehender Zustand (kein Zusammenhang mit Task 267 – dort
wurde keine Zeile geändert) und liegt außerhalb des Scopes dieser Task.

## AK-Test-Mapping (`scripts/checks/tests/run-tests.sh`, Abschnitt "#267")

| AK/F | Assertions (inkl. Mutationsbeleg) | Fundstelle |
|------|-----------------------------------|------------|
| AK1  | 3 Positiv + 1 Mutation (4)        | Zeilen ~5623–5636 |
| AK2  | 3 Positiv + 1 Mutation (4)        | Zeilen ~5638–5648 |
| F3   | 1 Positiv                          | Zeilen ~5650–5652 |
| AK3  | 3 Positiv + 1 Mutation (4)        | Zeilen ~5655–5668 |
| AK4  | 2 Positiv + 1 Mutation (3)        | Zeilen ~5670–5677 |
| AK5  | 3 Positiv + 1 Mutation (4), läuft vor `TMP_SW`-Cleanup | Zeilen ~2289–2313 |
| AK7  | 2 (Testfixture scharf + Qualifikations-Sweep über alle Treffer) | Zeilen ~5679–5695 |
| AK6  | erfüllt durch Existenz/Struktur dieser Tabelle selbst (Meta-AK: "Guards existieren, je Guard mutationsbelegt") | – |

22 Assertions insgesamt für #267, alle mit Mutations-/Negativ-Kontrolle je Guard (AK1–AK5) bzw.
Diskriminierung (AK7: Testfixture-Schärfe-Check).

## Determinismus-Check

`scripts/checks/tests/run-tests.sh` zweimal unabhängig ausgeführt (kein gemeinsamer State
zwischen den Läufen, da jeder Lauf seine `mktemp -d`-Fixtures neu anlegt):

- Lauf 1: **1062 grün, 0 rot**
- Lauf 2: **1062 grün, 0 rot**

Identisches Ergebnis → kein Flakiness-Risiko (testing-standards.md, "Flaky Tests: Zero
Tolerance").

## Test-Qualität (Perspektive `/test`)

- Verhalten statt Implementierung: AK5 prüft den realen `start-work.sh`-Stdout-Output (nicht
  Quelltext-Grep), AK1–AK4/AK7 prüfen den tatsächlichen Doku-Inhalt über `flat_286` (nicht ein
  Zwischenformat).
- Kein Mocking von internem Code – die einzigen Stubs (`gh`, `cp`) sind externe Systeme
  (GitHub-CLI, Dateisystem-Fehlerfälle), bereits etablierter Fixture-Stil aus dem #74/#236-Block.
- Jeder Guard hat eine Mutations-/Negativ-Kontrolle (siehe Tabelle oben) – kein Guard wäre bei
  einem Rückfall auf die alte Formulierung lautlos grün geblieben.
- Namensgebung folgt dem Datei-Konvention (`_267`-Suffix auf allen lokalen Variablen, analog zu
  `_236`/`_291` in denselben Block-Nachbarschaften) – keine Kollisionsgefahr mit anderen Blöcken.

## Ergebnis

Keine fehlenden Tests identifiziert. Kein neuer Testcode nötig – die während `/implement`
geschriebenen Guards decken AK1–AK7 und F1–F3 aus der Spec bereits vollständig und
mutationsbelegt ab (F4 war ein einmaliger Doku-Drift-Grep vor `/review`, kein AK mit
Regressions-Guard-Pflicht laut Spec).
