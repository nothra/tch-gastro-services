# Review: Task 212

_Multi-Persona-Review (3 unabhängige Runden: Logik, Code-/Testqualität, Architektur).
Alle drei Runden konvergierten unabhängig auf denselben blockierenden Befund._

## Kritische Findings (müssen behoben werden)
- [x] [scripts/checks/tests/run-tests.sh:2468–2486] AK7-Test an das transiente `tasks/patch-212.diff` gekoppelt → Suite aktuell **rot (444 grün / 2 rot)**. Der Patch ist bereits (uncommittet) auf `pr-shepherd.md` angewandt, der Test setzt aber die ungepatchte Datei voraus (`git apply --check` scheitert). Zugleich verlangt die Task-Notiz, `patch-212.diff` vor dem Merge zu entfernen → es gibt **keinen** auslieferbaren Endzustand, in dem der Fix committet **und** die Suite grün ist. **Fix:** AK7-Test prüft den Endzustand der committeten Live-`pr-shepherd.md` direkt (grep der 4 Marker), Patch-Abhängigkeit entfernt; `patch-212.diff` gelöscht; `pr-shepherd.md`-Änderung committet. (R1 KRITISCH-1/WICHTIG-1, R2 KRITISCH 1/2, R3 KRITISCH)

## Wichtige Findings (sollten behoben werden)
- [x] [scripts/checks/tests/run-tests.sh] Der neue Kern-Pfad (Endzustand verletzt → `raise-interrupt INCOMPLETE_OUTCOME` → `exit 1`) war nur grep-verifiziert, nie E2E ausgeführt – also genau die #212-Symptomatik ungetestet. **Fix:** E2E-Test (mock `claude`, alle Gates grün, kein Sentinel, aber ungepushter Endzustand → `exit≠0`, kein Erfolgs-Banner, `INCOMPLETE_OUTCOME` im `interrupt-log.jsonl`). (R2 WICHTIG 3)
- [x] [scripts/lib/verify-final-state.sh:106] gh-TSV-Stub in den Tests verdeckt die echte `-q '…|@tsv'`-Extraktion (Feldreihenfolge/`--json`-Namen ungetestet). **Fix:** Contract-Kommentar an der Lib-Zeile und am Test-Stub, der das bewusste Coverage-Loch benennt (kein echtes `gh` im Harness verfügbar). (R2 WICHTIG 4)
- [x] [docs/factory/OPERATING.md:312–320] Doku-Drift: die zwei neuen Interrupt-Typen `INCOMPLETE_OUTCOME` (run-pipeline.sh) und `PUSH_GATE_BLOCKED` (pr-shepherd.md) fehlen in der kanonischen Interrupt-Typen-Tabelle (Präzedenz: ADR-007 → `POST_MERGE_FAIL`). **Fix:** beide Zeilen ergänzt. (R3 WICHTIG)

## Nitpicks (optional)
- [x] [scripts/checks/tests/run-tests.sh AK8] Stopp-Grund nicht geprüft (nur exit≠0 + Banner-Abwesenheit) → `INCOMPLETE`/Typ-Assertion ergänzt. (R2 NITPICK 5)
- [x] [scripts/run-pipeline.sh:509] Erfolgs-Ausgabe mit `$([ … ] && printf …)` spröde → als klarer Ausdruck ersetzt. (R1 NITPICK-2)
- [x] [scripts/lib/verify-final-state.sh] Detached HEAD (`branch == "HEAD"`) → explizit fail-closed behandelt + Kommentar. (R1 NITPICK-1)
- [ ] [tasks/task-212…md:60] historische Zeilen-Referenzen leicht verschoben – nicht normativ, belassen. (R3 NITPICK)

## Positives
- Kernlogik `verify-final-state.sh` sauber nach dem `tier-select.sh`-Muster (reine Entscheidung + I/O-Wrapper), durchgehend **fail-closed** – kein Pfad liefert fälschlich exit 0 (alle 3 Runden unabhängig bestätigt).
- `set -e`-Handhabung korrekt (Aufruf in `if !`-Kondition, Exit sauber propagiert); gh-TSV atomar ohne externes `jq`.
- Interrupt-Mechanik nur **genutzt**, nicht geändert (ADR-040 §3); `INCOMPLETE_OUTCOME` zählt korrekt gegen die Autonomie-Rate (ADR-006).
- Reihenfolge-Guard (Verifikation vor Erfolgs-Banner) als Kommando geprüft, nicht als Prosa.
- Lesson #197 erfüllt: `verify-final-state.sh` in **allen** run-pipeline-Scaffoldings mitkopiert.
- ADR-040 konsistent mit der Implementierung (keine ADR-Drift).

## Empfehlung
APPROVED

<!--
Verdict-Historie: Runde 1 = NEEDS_REWORK (blockierende Findings s. o.).
Nach Rework (2026-07-23) alle KRITISCH/WICHTIG behoben, Suite grün (siehe Rework-Nachtrag
unten) → APPROVED. Die Anker-Zeile oben spiegelt den aktuellen Endzustand.
-->

## Rework-Nachtrag (2026-07-23, nach Runde 1)
- **KRITISCH:** AK7-Test auf Endzustands-Prüfung der Live-`pr-shepherd.md` umgestellt; `tasks/patch-212.diff` entfernt (Lesson #145); `pr-shepherd.md` committet.
- **WICHTIG:** E2E-Test des Verifikations-Interrupt-Pfads ergänzt (ungepushter Endzustand → `INCOMPLETE_OUTCOME`, kein Banner, exit≠0); gh-TSV-Contract-Kommentar; `OPERATING.md`-Tabelle um beide Interrupt-Typen ergänzt.
- **NITPICK:** AK8-Typ-Assertion, Erfolgs-Ausgabe-Stil, detached-HEAD-Guard.
- Gate nach Rework: `scripts/checks/tests/run-tests.sh` grün; `pre-push.sh` grün.
