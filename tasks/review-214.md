# Review: Task 214

Multi-Persona-Review des Contract-Drift-Guards (`scripts/checks/tests/run-tests.sh`, Block „#214").
Diff-Scope: `origin/main...HEAD` – nur `run-tests.sh` (+131), Spec- und Task-Datei. Drei Personas
(Korrektheit, Clean Code, Architektur/Portabilität), alle read-only.

## Kritische Findings (müssen behoben werden)
- keine

## Wichtige Findings (sollten behoben werden)
- [x] [run-tests.sh:1830-1833] **F2-Test ist nicht isoliert – grün aus dem falschen Grund** (Persona 1 W1 + Persona 2, unabhängig bestätigt). Das Fixture `prose-only.md` enthielt den Verdict-Anker nur im Fließtext, aber **keine** Findings-Sektionen → bereits die `count_section_items`-Prüfung erzwang `rc=1`; die #211-Regression (Verdict unankert) bliebe unentdeckt. **Behoben (Rework):** Fixture wird jetzt aus der echten `review.md` abgeleitet (nur die `## Empfehlung`-Überschriftszeile → Fließtext), alle Findings-Sektionen bleiben intakt; zwei neue Assertions belegen (a) Output nennt `report_verdict(review)` und (b) Output nennt **nicht** `count_section_items` → rot **nur** wegen Verdict-Exaktverankerung.
- [x] [run-tests.sh:1774-1783,1796-1801] **AC3-Selbstabdeckung: keine Zusicherung, dass alle drei Sektionen extrahiert wurden** (Persona 1 W2). **Behoben (Rework):** Kardinalitäts-Assertion `section_count214 == 3` gepinnt (Kommentar erklärt: schrumpft die Extraktion still, wäre die Guard-Abdeckung unvollständig).

## Nitpicks (optional)
- [x] [run-tests.sh:1820] Section-Drift-Negativtest hardcodete `## Kritische Findings`. **Behoben (Rework):** leitet den Anker aus `$first_section214` (erste extrahierte Sektion) ab – konsistent mit den Verdict-Drift-Tests.
- [x] [run-tests.sh:1800] Tote Variable `guard_out214`. **Behoben (Rework):** entfernt (`drift_guard … >/dev/null; guard_rc214=$?`).
- [x] [run-tests.sh:1827] Fehlerszenario „leere Command-Datei" nicht exerziert. **Behoben (Rework):** F1b-Assertion mit `: > empty.md` → Guard rot (fail-closed).
- [x] [run-tests.sh:1724] `head -n1` pipefail/SIGPIPE-Trap. **Behoben (Rework):** Kommentar dokumentiert die bewusst nicht ausgewertete Pipeline (folgenlos, kein `set -e`).

## Positives
- Beide Parser-Semantiken **faithful gespiegelt** statt neu erfunden: `report_verdict` exakt verankert (`^[[:space:]]*<header>[[:space:]]*$`, identisch zu `report-verdict.sh:41`), `count_section_items` unankert/Teilstring (identisch zu `run-pipeline.sh:321`). Von allen drei Personas bestätigt.
- **AC6 ohne Literal-Duplikat** gelöst: erwartete Konstanten werden zur Laufzeit aus den echten Parser-Skripten extrahiert → echte Zwei-Seiten-Drift-Erkennung (einseitiger Rename rot, konsistenter Rename grün). Keine Tautologie (Ist-Prüfung gegen die *andere* Quelle, die Command-`.md`).
- Durchgängig **fail-closed**: fehlende/leere Command-Datei, leere Verdict-/Section-Extraktion (Parser-Format geändert), `found_any`-Wächter.
- Here-doc statt Pipe für die `while`-Schleife → `rc`/`found_any` persistieren im Funktions-Kontext (bewusst korrekt gegen die Subshell-Falle).
- Portabel (BSD ↔ GNU/Alpine): nur POSIX-Klassen, `sed -E`/`grep -oE`, kein `\s`/`\d`/`grep -P`; `\$`-Anker in BRE/ERE identisch. Scope-treu (kein bidirektionaler Check → kein Gold-Plating), ADR-019 §4 gestützt, Read-Guard berührt den `.claude/**`-Hard-Deny nicht.

## Rework (Iteration 1)
Alle zwei „Wichtig"- und vier Nitpick-Findings in derselben Session behoben; #214-Block danach
16/16 Assertions grün, volle Suite 516 grün / 0 rot. Keine offenen Findings mehr → Re-Review APPROVED.

## Empfehlung
APPROVED
