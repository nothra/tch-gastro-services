# Review: Task 444

Diff-Scope: `git diff origin/main...HEAD` (5 Dateien: `package.json`, `pnpm-lock.yaml`,
`scripts/checks/tests/run-tests.sh`, Spec, Task-Datei). Keine Routen-, ADR- oder App-Code-Änderung.

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)

_Keine._

## Nitpicks (optional)
- [ ] [tasks/task-444-vitest-vite-heben.md:41] Die Notiz zur Streuung sagt „nur der vitest/vite-Teilbaum“. Das stimmt nicht ganz: `picomatch` wurde von 4.0.5 auf 4.0.7 gehoben, und das ist die einzige 4.x-Kopie im Baum. Sie hängt über `fdir`/`tinyglobby` (`pnpm-lock.yaml:5818`, `:7144`) auch an Paketen außerhalb von vitest/vite. Der Sprung ist ein harmloser Patch, aber der Satz sollte ihn nennen, statt „nur“ zu behaupten.
- [ ] [scripts/checks/tests/run-tests.sh:5350] Die Fixture `mut_vite_444` enthält auch die `@vitest/mocker`-Zeile. Ein Name wie `mut_lock_444` würde ihren Inhalt treffender beschreiben.
- [ ] [scripts/checks/tests/run-tests.sh:5219-5220] Für die Fälle `vitest` und `@vitest/coverage-v8` gibt es keinen eigenen Mutationsbeleg. Die Extraktionskette ist aber für scoped Pakete (`@vitest/mocker`) und unscoped Pakete (`vite`) belegt. Die beiden Fälle unterscheiden sich davon nur in den Daten, darum ist das kein Mangel, nur ein Hinweis.

## Positives
- **Alle AKs erfüllt und nachvollziehbar belegt.** AK1: `package.json` trägt `^4.1.12` für beide Pakete im Gleichschritt, und der Specifier steht in der Task-Notiz (Lesson #448). AK2: Das Lockfile hat genau `vite@8.3.5` und `@vitest/mocker@4.1.12` (Zeilen 3681, 1503), ohne Altkopie. AK3 ist sauber als entfallen begründet, inklusive Frisch-Auflösung ohne Override.
- **Saubere Peer-Analyse.** `vite` liegt nur als Peer im Baum, deshalb wirken weder `overrides` noch `pnpm update vite`. Die Lösung über ein temporäres `pnpm add -D` und `remove` lässt die `importers` im Lockfile konsistent mit `package.json`: Es gibt keinen `vite`-Specifier unter `importers`. CI (`lint`, `factory-self-test`) installiert damit grün.
- **Die Lockfile-Streuung ist eng.** Laut Diff-Sichtung ändern sich nur vitest/vite und deren Abhängigkeiten (rolldown, lightningcss, oxc, babel-parser, tinyexec usw.). Runtime-Deps wie `pg`, `drizzle-orm` oder `next` bleiben unberührt. Die neuen Kopien `postcss@8.5.32` und `nanoid@3.3.20` liegen über ihren Floors (8.5.23 bzw. 3.3.17).
- **Floor-Guard dauerhaft erweitert.** `vite` (8.1.6) und `@vitest/coverage-v8` sind neue Fälle, `vitest`/`@vitest/mocker` sind angehoben. Der Mutationsbeleg folgt der Lesson #447: Die Fixture liegt direkt unter dem neuen Floor, die Gegenprobe läuft gegen den alten. Die Behauptung im Kommentar („erwartet vitest versionsgleich als Peer“) ist am Lockfile belegt (`pnpm-lock.yaml:1495` `vitest: 4.1.12`).
- **AK1 hat einen eigenen Regressions-Check** (Caret plus Gleichschritt). Er nutzt den bestehenden Helfer `pkg_pin_291`, statt eine Parallel-Implementierung anzulegen.
- **AK6 nutzt den Ersatzweg aus Lesson #228/#390.** Das ist die Bulk-Advisory-API über den ganzen Lockfile-Baum, mit Gegenprobe gegen die Altversionen. Die Gegenprobe liefert genau die sieben erwarteten GHSA.
- **Der Nach-Merge-Teil ist korrekt abgetrennt** (Dependabot-Alerts, Lesson #390).

## Empfehlung
APPROVED
