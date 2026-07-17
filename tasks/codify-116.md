## Codify-Report: Task 116

### Neue Regeln hinzugefügt

- **[docs/factory/PROJECT-CONTEXT.md]** Zod-Fehlermeldung: Ablehnungs-Test ≠ Meldungs-Test –
  wegen: Review-Runde 1 fand, dass `should_rejectCategory_when_notInEnum` den Meldungsinhalt
  (`"Kategorie muss Getränk, Kaffee oder Essen sein."`) nicht abdeckte. Eine generische
  Meldung hätte den Test genauso bestanden. Der Reflex im `/implement` ist, die Ablehnung zu
  testen und die Meldung als „mitgetestet" anzunehmen. Konkrete Regel mit Code-Pattern
  (`firstIssueMessage` + Literal) und Smell-Check ergänzt. Verwandt mit #117-Regel.

### Follow-up-Issue angelegt

- **#127** – „PROJECT-CONTEXT: veraltetes Essen-Modell an neues Katalog-Modell anpassen"
  (Review out-of-scope Finding: PROJECT-CONTEXT.md Zeile 36/38-39 nennt noch „Essenpreis"
  als Veranstaltungs-Property; seit ADR-023 §D4/§D7 ist Essen ein Katalogartikel).
  Label: `documentation` + `tech-debt`.

### Keine weiteren Regeländerungen nötig

- Security: keine Findings, bestehende Patterns (Zod fail-closed, RBAC, additives ALTER TYPE)
  korrekt angewendet.
- Review-Runde 2: APPROVED ohne Scope-Findings; Nitpicks bewusst nicht behoben (kein
  Merge-Blocker).
- Migrations-Pattern (additives `ADD VALUE`, kein Drop-and-recreate) war bereits in #48 kodifiziert
  und wurde korrekt angewendet – kein neuer Regelungsbedarf.

### Empfehlung für nächste Features

- Bei jedem Zod-Schema mit custom error message: vor dem Commit den Smell-Check laufen lassen
  („Ersetze ich die Meldung durch eine generische – schlägt ein Test fehl?"). Das verhindert
  eine weitere Review-Runde 2.
- Bidirektionaler Rename-Nachweis (Anwesenheit neuer Text + Abwesenheit alter Text) hat sich
  in `page.test.tsx` bewährt – als Muster bei UI-Umbenennungen übernehmen.
