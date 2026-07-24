## Codify-Report: Task 212

### Muster erkannt

Alle blockierenden Findings kamen aus dem `/review` (drei unabhängige Runden, konvergent). Zwei
davon sind neue, wiederverwendbare Muster; eines ist eine Instanz einer bestehenden Regel-Familie:

1. **Test einer `.claude/**`-Patch-Lieferung war an das transiente Patch-Artefakt gekoppelt** →
   im auslieferbaren Endzustand (Patch angewandt + committet, `patch-<id>.diff` entfernt per #145)
   zwangsläufig rot. Kein grüner Merge-Zustand möglich. **Neu** – #145 sagt „Patch entfernen",
   aber nicht, dass der zugehörige **Test** dann den Endzustand der Live-Datei prüfen muss.
2. **Der neue deterministische Backstop im Orchestrator (`run-pipeline.sh`) war zunächst nur
   grep-verifiziert**, nie E2E ausgeführt → genau die #212-Kernsymptomatik ungetestet. **Neu** für
   Orchestrator-Gates; ergänzt die „Codelesen ≠ Coverage" (#187) / „Kommando ≠ Prosa" (#114)-Familie.
3. **Zwei neue Interrupt-Typen (`INCOMPLETE_OUTCOME`, `PUSH_GATE_BLOCKED`) fehlten in der
   kanonischen OPERATING.md-Tabelle** → Instanz der „kanonische Quellen mitpflegen"-Familie, aber
   ohne Gate (raise-interrupt akzeptiert Freitext) → als konkreter Trigger festgehalten.

### Neue Regeln hinzugefügt

- [docs/factory/lessons/factory-workflow.md] **Test einer `.claude/**`-Patch-Lieferung prüft den
  Endzustand der committeten Live-Datei, nicht das Patch-Artefakt** – wegen: rote CI-Suite im
  auslieferbaren Zustand (KRITISCH, alle 3 Runden). + Index-Zeile in PROJECT-CONTEXT.md mit Trigger
  `/implement`,`/review`,`/test` – bei `.claude/**`-Patch-Test.
- [docs/factory/lessons/testing.md] **Deterministisches Gate/Backstop im Orchestrator-Skript braucht
  E2E-Verhaltenstest, nicht nur Wiring-Grep** – wegen: Kern-Fix-Pfad nur grep-belegt (WICHTIG R2).
  + Index-Zeile in PROJECT-CONTEXT.md (Gruppe testing.md).
- [docs/factory/lessons/factory-workflow.md] **Neuer Interrupt-Typ → OPERATING.md-Interrupt-Tabelle
  mitpflegen** – wegen: zwei neue Typen fehlten (WICHTIG R3). + Index-Zeile mit Trigger
  `/implement`,`/review` – bei neuem `raise-interrupt.sh`-Typ.

### Bewusst KEINE Regel abgeleitet

- **Detached-HEAD-Guard / gh-TSV-Coverage-Loch / Erfolgs-Ausgabe-Stil:** im selben Zyklus behoben
  bzw. dokumentiert (NITPICKs); kein wiederkehrendes Muster, keine neue Regel nötig.
- **`.claude/**`-Patch-Workflow selbst** (hard-denied → Patch, programmatisch, `git apply --check`,
  stale Patch entfernen): bereits vollständig als #91/#94/#145 codifiziert und hier korrekt gelebt –
  nur die **Test-Kopplung** war die neue Lücke (Regel 1 oben).

### Was überraschend gut funktionierte

- Drei unabhängige Review-Runden fanden **denselben** Blocker unabhängig und führten ihn empirisch
  vor (Suite real rot) – der Multi-Persona-Ansatz zahlte sich aus.
- Die Pure-/I-O-Trennung (`evaluate_final_state`/`verify_final_state`) machte 12 der 14 AK/F ohne
  echtes Repo/GitHub testbar; die Fail-closed-Logik hatte keinerlei Findings.

### Empfehlung für nächste Features

- Wenn eine Task eine `.claude/**`-Datei ändert: den zugehörigen Test **von Anfang an** gegen den
  Endzustand der Live-Datei bauen, nicht gegen das Patch-Artefakt (spart eine Review-Runde).
- Prüfen, ob ein leichtgewichtiges Gate lohnt, das neue `raise-interrupt.sh`-Typen gegen die
  OPERATING.md-Tabelle abgleicht (analog zum routes-doc-check) – derzeit bewusst nur als Lesson,
  kein eigenes Issue (YAGNI, bis es erneut auffällt).
