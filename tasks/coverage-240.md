# Test-Vollständigkeit & Coverage: Task 240

## Coverage-Analyse (Vitest)

`pnpm test:coverage`: 665 passed, 59 skipped (71 Testdateien). Gesamt-Coverage
**89.06 % Statements / 94.28 % Branches / 77.96 % Funktionen / 89.08 % Lines** – über der
80 %-Projektschwelle.

Task 240 ändert **keinen** TS/TSX-Produktionscode (nur `.claude/settings.json`,
`scripts/checks/tests/run-tests.sh` [Bash], `docs/factory/lessons/factory-workflow.md` und
Task-/Spec-Markdown). Die "100 % Coverage für neuen Code"-Vorgabe ist damit vakuos erfüllt –
es gibt keine neue instrumentierte Code-Zeile. Die Vitest-Coverage-Zahl ist unverändert
gegenüber dem Stand vor diesem Branch (keine Regression durch diesen PR).

Die eigentliche Test-Suite für diese Task ist die **Bash-Regressionssuite**
(`scripts/checks/tests/run-tests.sh`), nicht Vitest.

## Test-Vollständigkeit je Akzeptanzkriterium (spec-240)

| AK | Beschreibung | Abdeckung |
|----|--------------|-----------|
| AK1 | `Write(...)` aus `allow` entfernt (18 Einträge) | Vollständig: 7 Extension-Einträge (Zeile ~2116-2120) + **11 Verzeichnis-Glob-Einträge einzeln ergänzt** (Zeile ~2122-2129, neu in diesem Schritt) + pauschaler Blanket-Check (~2149) + Grep-Fallback (~2159) |
| AK2 | `Write(...)` aus `deny` entfernt (3 Einträge) | Vollständig: alle 3 einzeln (`pnpm-lock.yaml`, `.claude/**`, `.env*`) + Blanket-Check + Grep-Fallback |
| AK3 | Kein Funktionsverlust (Edit-Pendant je Pfad) | Manuell verifiziert (1:1-`jq`/`comm`-Abgleich vor Patch-Erzeugung, im Task-File dokumentiert). **Kein automatisierter Regressionstest** für das Fortbestehen der zugehörigen `Edit(...)`-Einträge – bewusst als Out-of-Scope-Finding in Issue [#251](https://github.com/nothra/tch-gastro-services/issues/251) ausgelagert (betrifft die vorbestehenden #88-Einträge, nicht diesen Diff) |
| AK4 | `settings.json` bleibt valides JSON | Vollständig: bestehender `#224`-AK8-Test (`jq -e '.hooks and .permissions.allow and .permissions.deny'`) |
| AK5 | Verhaltensprobe bestätigt Wirkungslosigkeit vor Entfernung | Nicht bash-testbar (Permission-Engine liegt in Claude Code, nicht im Repo) – einmalige `claude --print`-Probe, im Task-File mit MD5-Vorher/Nachher-Beleg dokumentiert (Präzedenz #88/#224) |
| AK6 | Kein neuer Prompt nach Entfernung | Ebenso: `claude --print`-Positiv-Probe nach dem Patch, 0 statt 21 Warnzeilen, im Task-File dokumentiert |
| AK7 | Regressionstest umgestellt, nicht nur ergänzt | Vollständig: alte "Vorhandensein"-Assertions ersetzt (nicht daneben stehen gelassen), RED (546/13) → GREEN (559/0, jetzt 570/0 nach dieser Ergänzung) belegt |
| AK8 | Stale Lesson-Prosa korrigiert | Vollständig: zwei Assertions (Abwesenheit der alten Präsens-Formulierung, Vorhandensein der neuen `#240 entfernt`-Formulierung) |

## Test-Qualität

- **Deterministisch:** reine `jq`/`grep`-Prüfungen gegen eine statische Datei, kein `sleep`,
  kein `new Date()`, keine Netzwerkabhängigkeit.
- **Unabhängig:** jede Assertion liest denselben `$SETTINGS`/`$WORKFLOW_LESSON`-Pfad frisch,
  keine geteilte mutable Zwischenstände zwischen Assertions.
- **Verhalten statt Implementierung:** Tests prüfen den geparsten/textuellen Endzustand der
  Konfigurationsdatei (das eigentliche Artefakt), nicht internen Testcode.
- **Je Eintrag eine eigene Assertion** (statt nur pauschal), damit ein einzelner
  wiedereingeführter Eintrag namentlich rot färbt – in diesem Schritt für die 11
  Verzeichnis-Glob-Einträge nachgezogen, war zuvor nur pauschal abgedeckt.
- **RED→GREEN für jede neue/geänderte Assertion belegt:** vor dem Patch (546/13), nach dem
  Patch (559/0), nach der Erweiterung um die 11 Einzelassertionen (570/0) – inkl. Simulation
  einer Regression (Eintrag testweise in eine Scratch-Kopie zurückgeschrieben → Assertion
  korrekt rot).

## Finale Testausführung

- `bash scripts/checks/tests/run-tests.sh`: **570 grün, 0 rot**
- `pnpm test` (Vitest): 665 passed, 59 skipped – grün
- `pnpm typecheck`, `pnpm format:check`, Routen-Doku-Drift-Check: alle grün (Teil des
  `factory-commit.sh`-Pre-Push-Gates)

## Ergebnis

Coverage-Schwelle erreicht (89.06 % > 80 %, keine Regression – kein neuer Produktionscode).
Alle Akzeptanzkriterien haben eine der Situation angemessene Testabdeckung: automatisiert wo
möglich (AK1, AK2, AK4, AK7, AK8), einmalige dokumentierte Verhaltensprobe wo die
Permission-Engine außerhalb des Repos liegt (AK5, AK6), und ein bewusst ausgelagerter
Out-of-Scope-Fund statt Scope-Sprengung (AK3-Automatisierung, Issue #251).
