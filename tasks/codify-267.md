## Codify-Report: Task 267

### Neue Regeln hinzugefügt

- [`docs/factory/lessons/factory-workflow.md`](../docs/factory/lessons/factory-workflow.md)
  (+ Index-Zeile in `PROJECT-CONTEXT.md`) – Rezidiv des #298-Learnings „Fork-Subagent für eine
  Review-Runde kann in seinen Kontext bluten": der in #298 empfohlene Resume-mit-Korrektur
  verschlimmerte die Konfusion in dieser Task, statt sie zu beheben – der Fork erklärte die
  Korrektur zum Prompt-Injection-Versuch, hielt an einer falschen Selbstwahrnehmung fest (er sei
  die Haupt-Session) und fabrizierte einen falschen Fortschrittsstatus für Runden, die im echten
  Orchestrator-Kontext nie gestartet wurden. **Regel verschärft:** Resume ist ein **einmaliger**
  Versuch, kein Retry-Loop – bestätigt `TaskOutput` danach weiterhin keine echten Findings, die
  Runde ohne Fork-Delegation direkt im Orchestrator-Kontext durchführen. Wegen: wiederholter
  Fehler-Musters (2. dokumentiertes Vorkommnis) mit einer neuen, konkreten Verschärfung der
  bestehenden Handlungsanweisung.
- [`docs/factory/lessons/testing.md`](../docs/factory/lessons/testing.md) (+ Index-Zeile) –
  4. Vorkommnis des #240/#224/#251-Smells „gegen bereits vorhandene Struktur mit identischem
  Prüfausdruck abgleichen, bevor eine neue angelegt wird", diesmal auf Einzel-Assertion-Ebene
  statt auf Schleifen-/Capability-Check-Ebene: sechs neue Präsenz-/Abwesenheits-Checks in
  `run-tests.sh` reimplementierten inline den Rumpf der bereits vorhandenen Helfer
  `assert_contains_286`/`assert_absent`, statt sie aufzurufen – erst `/refactor` bemerkte die
  Duplikation, nicht `/implement`. Wegen: derselbe Fehler-Musters wie zuvor, nur auf einer neuen
  Sprachkonstrukt-Ebene (Einzelzeile statt Schleife) – die bestehende Lesson deckte diesen Fall
  wörtlich noch nicht ab.

### Keine Änderungen nötig

- Die zwei Review-Findings dieser Task (Grammatik-Fehler in `git-workflow.md`, ASCII- statt
  Unicode-Pfeil in `start-work.sh`) sind Instanzen einer bereits vorhandenen, generischen
  `code-style.md`-Lesson („Neue Schreibweise gegen bereits vorhandene im selben File abgleichen,
  statt eine dritte einzuführen", aus #224) – keine neue Regel nötig, nur normale
  Review-Sorgfalt, die funktioniert hat.
- Kein neuer automatisierbarer Check in `scripts/checks/` – beide Codify-Learnings sind
  Verhaltens-/Prozess-Learnings für Claude selbst (Fork-Delegation, Duplikat-Vermeidung beim
  Testschreiben), keine mit einem deterministischen Skript erzwingbare Regel.
- Kein Out-of-Scope-Finding oberhalb der ADR-018/043-Schwelle – nichts identifiziert, das einen
  Issue oder einen `kleinfunde.md`-Eintrag rechtfertigen würde.

### Empfehlung für nächste Features

- Bei Nutzung von Fork-Subagenten für Review-/Analyse-Runden: nach dem ersten
  Korrektur-Resume sofort per `TaskOutput` verifizieren; bleibt das Ergebnis unbrauchbar, die
  Aufgabe direkt im Orchestrator-Kontext erledigen, statt ein zweites Mal zu resumen.
- Vor dem Schreiben einer neuen `printf | grep -qF …`-Assertion (oder einer neuen
  `for entry in …`-Schleife) in `run-tests.sh`: kurzer Blick auf den Helfer-Block am Dateianfang
  (`assert_contains_286`, `assert_absent`, `flat_286`, `ls_mode_matches`), ob der Rumpf schon
  existiert.

### Validierung

Volle Suite nach den Codify-Edits erneut ausgeführt: **1062 grün, 0 rot** (keine Regression
durch die Lesson-/Index-Ergänzungen). `pre-commit.sh` grün.
