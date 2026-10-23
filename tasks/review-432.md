# Review: Task 432

Scope: `git diff origin/main...HEAD` (Commits a853e08, bb09bd1) + der vom Menschen angewendete, noch unkommittete
Patch an `.claude/commands/implement.md`. Alle drei Runden (Logik, Code-Qualität, Architektur) in einem Durchgang.

## Kritische Findings (müssen behoben werden)
_Keine._

## Wichtige Findings (sollten behoben werden)
- [x] `docs/adr/032-deploy-freeze-bei-rotem-gate.md:92` – Die ADR beschreibt den Simulations-Test im Präsens als „in `scripts/checks/tests/run-tests.sh`". Er liegt seit diesem PR in `scripts/project/tests/run-project-tests.sh`. Die ADR wurde im PR nur für den Skriptpfad angefasst, nicht für den Testort (Lesson #211: ADR-Beschreibung bei geänderter Mechanik im selben PR nachziehen).
- [x] `docs/project/lessons/factory-workflow.md:27` – „Route-Group-/`_private`-Fall in `run-tests.sh`": die #145-Tests (`routes-doc-check.sh`) sind in die Projekt-Suite umgezogen. Verweis läuft ins Leere (Lesson #176: Kontext-Doku im Präsens mitziehen).
- [x] `scripts/checks/tests/run-tests.sh` (Gruppe K, Block „implement.md liegt unter .claude/**") – Der Patch-Zweig (`tasks/patch-432.diff` anwenden auf Temp-Kopie, inkl. `rm -rf`) ist nach dem Anwenden des Patches toter Code und wird mit dem Löschen der Patch-Datei nie mehr betreten. Auf den direkten `grep` gegen die Live-Datei reduzieren (Lesson #212: Endzustand der Live-Datei testen). `tasks/patch-432.diff` gehört nach dem Anwenden gelöscht (so im Blocker der Task-Datei vermerkt), ebenso der Blocker-Hinweis „Mensch muss anwenden" in der Task-Datei als erledigt markieren.
- [x] `.claude/commands/implement.md` – die angewendete Änderung ist unkommittet; sie gehört mit dem Rework in einen Commit (Lesson #391: Rework-Ende = sauberes `git status`).

## Nitpicks (optional)
- [ ] `scripts/project/tests/run-project-tests.sh` (Fußzeile) und `scripts/checks/tests/run-tests.sh` (Fußzeile) – dieselben vier Zeilen „Ergebnis: … / `[[ $FAIL -eq 0 ]]`" stehen zweimal; ein `print_summary` in `assert-helpers.sh` würde die Kopie vermeiden (Q10: „keine Kopie").
- [ ] `docs/project/betrieb.md` – der Kurz-Kommandoblock „Kurzreferenz der Kommandos" wiederholt Kommandos, die schon im Text darüber und in `PROJECT-CONTEXT.md` stehen; bei Drift gibt es drei Stellen zu pflegen.

## Positives
- Zählung geht auf: Factory-Suite 1835 + Projekt-Suite 90 = 1925 = 1894 (Baseline) + 31 neue Tests; alle Zahlen und die Herleitung stehen in der Task-Datei (AK-J4, F-J2).
- AK-J3 per echter Negativprobe belegt (kaputtes Skript → Suite rot, Exit 1), zusätzlich Wiring-Test gegen `continue-on-error`/`||`.
- Echter Verlustabgleich für `OPERATING.md` → `betrieb.md` (Zeilenabgleich, nur Überschriftsebenen weichen ab); Anker 0.2/0.3/1.4/4.3 in `OPERATING.md` bleiben als Verweis-Abschnitte bestehen.
- AK-G4 sauber getrennt: Mechanik neutral in der Factory-Suite, Routen-Drift am echten Check in der Projekt-Suite.
- `run-tests.sh` hat keinen Treffer mehr auf TCH-Skript-/Workflow-Namen (AK-J2); Dauerkontext bleibt 1031/1100.
- Patch-Weg für `.claude/**` eingehalten (Lesson #91), Blocker dokumentiert.

## Rework-Runde 1 (2026-10-23)
Alle vier wichtigen Findings behoben (ADR-032 und Projekt-Lesson zeigen auf die Projekt-Suite; toter Patch-Zweig im
AK-K1-Test entfernt, Patch-Datei gelöscht; `implement.md`-Änderung mit committet). Beide Suiten danach grün
(Factory 1835, Projekt 90, 0 rot). Nitpicks bleiben für `/refactor`.

## Empfehlung
APPROVED
