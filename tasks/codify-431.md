## Codify-Report: Task 431

### Neue Regeln hinzugefügt
- `docs/factory/lessons/testing.md` + Index – **Rezidiv #348:** Quelle auf mehrere Konsumenten umgestellt (Hooks
  *und* Pipeline); nur die Hooks bekamen Verhaltenstests, die Pipeline blieb beim Grep (Review-Iteration 1). Regel: je
  Konsument ein eigener Verhaltenstest, Konsumenten-Liste aus der Spec abhaken.
- `docs/factory/lessons/testing.md` + Index – **Laufende Test-Suite nicht editieren:** Bash liest Skripte inkrementell;
  neue Tests in Scratch-Datei vorbereiten, nach dem Lauf einfügen.
- `docs/factory/lessons/factory-workflow.md` + Index – **Libs relativ zum Skript sourcen, nicht zu `FACTORY_DIR`**
  (Tests überschreiben es → ~60 Falsch-Rot am `source`); **vor dem Entfernen eines impliziten Defaults alle Fixtures
  zählen** (143 rote Assertions im ersten Lauf); `env -u`-Reihenfolge des #264-Guards.

### Keine Änderungen nötig
- Security-Review: PASSED ohne Findings, nur ein Kleinfund (`factory-sync`-Dateimodus 0600) – bereits in
  `docs/factory/kleinfunde.md` erfasst, kein Learning über das Kleinfund hinaus.
- CLAUDE.md/Guidelines: keine neue universelle Regel; `@import`-Kontext 1021/1100.
- Drei Nitpicks aus `/review` (yq-Meldung im Gate, globaler Env-Export der Suite, Exit-Code im Testblock – Letzteres in
  `/test` behoben) sind dokumentiert, kein Muster.

### Empfehlung für nächste Features
- T1a-3 (#432): bei jedem Verschieben eines Skripts zuerst Aufrufer/Tests/Doku per Grep zählen (Lesson #370) und die
  Libs weiter skript-relativ sourcen. Die Suite exportiert `FACTORY_{LINT,TEST,COVERAGE}_COMMAND=true` global bis zur
  Gruppe G – neue Gate-Tests dahinter oder mit `env -u` schreiben.
- AK-X1 (Baseline-Vergleich `bcba043` vs. HEAD), AK-X2/F-7 (Required Checks auf dem PR) und AK-X3 (Stage-2-Probelauf
  nach dem Merge) sind noch offen und erst mit CI bzw. nach dem Merge belegbar.
