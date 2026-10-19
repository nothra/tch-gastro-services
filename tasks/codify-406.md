## Codify-Report: Task 406

### Neue Regeln hinzugefügt
- `docs/project/lessons/frontend-react.md` + Index-Zeile (`PROJECT-CONTEXT.md`) – Rezidiv #369: Lauf-Sperre im
  `AktionsMenue` zuerst nur für den Erstatten-Eintrag, „Bearbeiten"/„Löschen" übersehen (Review-Iteration 2).
  Regel: Sperre für alle Interaktionsflächen im Baustein, Test `it.each`.
- `docs/factory/lessons/testing.md` + Ergänzung der bestehenden Index-Zeile (#403) – Rezidiv: Opt-in-E2E-Spec lief erst
  im Rework nach dem Review-Finding. Regel: Lauf im selben `/implement`-Schritt; Grenze (verzögerte Server-Ablehnung
  nur in jsdom belegbar) mitschreiben.

### Keine Änderungen nötig
- Wegwerf-Dateien (`*.tmp.*`) blieben liegen (`rm` nicht freigegeben): bereits abgedeckt durch die Lesson
  „Debug-/Lint-Artefakte" (#67/#324/#374/#372) – kein neuer Eintrag, offener Schritt für den Menschen.
- Farb-Gate-Gegenprobe „grün aus falschem Grund" und fehlende ADR-Rückverweise (ADR-052/059/060 → ADR-061): durch
  Lessons #371 bzw. #211/#55 abgedeckt und im Review in Iteration 1 behoben; kein neues Muster.
- Security-Review: keine Findings, Server-Grenze unverändert.

### Empfehlung für nächste Features
- Vor dem Merge (Mensch): Screenshot `docs/anleitung/veranstalter/bilder/09-auslagen.png` neu aufnehmen
  (`CAPTURE_ANLEITUNG=1`) und gitignorte Wegwerf-Dateien löschen (`scripts/e2e406.tmp.sh`, `scripts/cov406.tmp.sh`,
  `playwright-406.tmp.config.ts`, `e2e406-*.tmp.log`, `tasks/telemetry-raw-406-*.tmp.txt`).
- Neue Bausteine mit Zustandsvertrag (Sperre/Schließen/Fokus) von Anfang an gegen alle Konsumenten **und** alle
  Geschwister-Interaktionsflächen testen.
