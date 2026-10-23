# Review: Task 427

> **Iteration 3** · 2026-10-23 · Scope `git diff origin/main...HEAD` (10 Dateien), Schwerpunkt
> Rework-Commit `bb06494` · drei Runden (Logik, Code-Qualität, Architektur) als getrennte
> Sub-Agenten, alle drei **APPROVED**. Iteration 1 (7 Wichtig-Findings) und Iteration 2
> (1 Wichtig-Finding, 16 Nitpicks, Out-of-Scope → Issue #437) stehen in der Git-Historie dieser
> Datei (`efce6a8`/`9f4d091`, `8aba8a1`/`bb06494`).
>
> **Status Iteration 2:** W1 (`.gitignore` in den Technischen Notizen) behoben – keine Stelle in
> Spec, Task, ADR oder Werkzeug nennt `.gitignore` mehr als mitkommenden Altpfad. Alle umgesetzten
> Nitpicks per Repro bzw. Mutation bestätigt (`ls-files -z` mit `we"ird.md`, Trim in
> `list_entries`/`ignored_with_reasons`, `is_allowed` mit Musterliste, Bericht ohne „Liste unten"
> bei 0 Falsch-Positiven, Positivfall-Label, `FALSE_POSITIVES` ohne Reste, `FX_GITLEAKS_CMD`,
> Hash- und Farbcode-Wortlaut gegen die echte Regex). Die vier „bewusst offen"-Punkte aus
> Iteration 2 stimmen mit dem Code und gelten als akzeptiert. Drift-Check aller geänderten Doku
> ohne Widerspruch; Zahlen nachgemessen (202 grün, 184 Messages, 173 Zeilen/187 Treffer).

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)

_Keine._

## Nitpicks (optional)

- [x] [scripts/project/factory-extract.sh `cmd_qualify`] Fail-open seit `bb06494`: Scheitert `git ls-files -z` nach erfolgreichem `rev-parse` (z. B. kaputter Index), wertet die Prozess-Substitution den Exit-Code nicht aus – `qualify` endet mit Exit 0, ohne etwas umzuschreiben (vorher Exit 2). Exotischer Auslöser, kein Datenverlust; Fix: `ls-files -z` in eine Temp-Datei mit `|| die 2`, dann daraus lesen; Test mit kaputtem Index. _(R1 N1)_ — behoben in `/test` (Test mit kaputtem Index zuerst rot).
- [ ] [scripts/project/factory-extract.sh `ignored_with_reasons`] `#` gefolgt von mehreren Leerzeichen/Tab lässt Leerraum in der Begründung (kosmetisch). _(R1 N2)_
- [ ] [scripts/project/factory-extract.sh `list_entries` / `ignored_with_reasons`] Trim-Logik (sed) doppelt; kleiner `trim`-Helfer, dann ist „dieselbe Lesart" Code statt Prosa. _(R2 N1)_
- [x] [scripts/project/tests/factory-extract-tests.sh Idempotenz-Test] Exit-Code des zweiten `qualify`-Laufs nicht geprüft (Lesson #214); `assert_exit 0`. _(R2 N2)_
- [ ] [scripts/project/factory-extract.sh `print_scan_report`] „Liest:"-Liste ohne die Konfigurations-Globals (`GITLEAKS_IGNORE`, `GITLEAKS_CMD`, `FILTER_REPO_CMD`). _(R2 N3)_
- [ ] [scripts/project/factory-extract.sh `print_scan_report`] B1-Text in zwei fast gleichen Zweigen; Suffix-Variable. _(R2 N4)_
- [ ] [docs/factory/adr/063-…md, Nachtrag „Umschreibregel"] „… die Durchsicht im PR-Diff fängt sie ab" gilt nur für `qualify`; in den Commit-Messages (`run`) gibt es keinen PR-Diff (heute 0 Fälle). Halbsatz ergänzen. _(R3)_
- [ ] [tasks/task-427-…md T1b-2-Hinweise] Das Fixture `lessons-split-426.tsv` ist keine `qualify`-Grenze (`*.tsv` fasst `qualify` nicht an), sondern ein Hinweis für den C3-Rest-Grep. _(R3)_
- [ ] [tasks/task-427-…md:50-52] Zeilenumbruch nach „kommen" (kosmetisch). _(R3)_

## Out-of-Scope

- Aus Iteration 2: `scripts/checks/ownership-check.sh:48` liest Nicht-ASCII-Pfade gequotet → **Issue #437** (`bug`, `factory-pipeline`).
- Aus Iteration 1: Begründung zu `scripts/project/**` in `docs/factory/OWNERSHIP.md:130-131` passt nicht zu `factory-extract.*` – in T1b-2/T2 mitnehmen (X1 verbietet die Änderung hier).

## Positives

- Jeder Punkt aus Iteration 1 und 2 ist einzeln adressiert; Ausnahmen sind ausdrücklich begründet, nichts wurde still abgehakt.
- Jeder neue Test unterscheidet Verhalten (Mutationen belegt: `-z`, Trim am Musterende, eingerückte Begründung, 0-Falsch-Positive-Bericht); Labels behaupten nicht mehr als geprüft.
- `is_allowed` mit reiner Signatur, `fx_assert_ok`/`fx_assert_only` ohne parallele Schleife, `print_scan_report` mit dokumentierten Laufzeit-Globals.
- Doku und Code ohne Drift: Regelwortlaut im ADR 1:1 zur Regeldatei, Farbcode-Grenze gegen die echte Regex korrekt und in ADR und Task gleich beschrieben; Zahlen gemessen statt geschätzt.
- X1 erfüllt: einzige Factory-Datei im Diff ist ADR-063, ein reiner Anhang (0 entfernte Zeilen, ein Hunk am Dateiende); `docs/routes.md` zu Recht unberührt.

## Empfehlung

APPROVED
