## Codify-Report: Task 298

### Neue Regeln hinzugefügt
- [`docs/factory/lessons/factory-workflow.md`](../docs/factory/lessons/factory-workflow.md)
  („Fork-Subagent für eine Review-Runde: eigene Turns nach dem Spawn können in seinen Kontext
  bluten") + Index-Zeile in [`PROJECT-CONTEXT.md`](../docs/factory/PROJECT-CONTEXT.md) – wegen:
  Ein für Review-Runde 1 gespawnter Fork-Agent lieferte nach eigenen `ScheduleWakeup`-Wartetexten
  des Orchestrators nur eine Paraphrase dieses Wartetexts zurück statt echter Findings (der Fork
  erbt den Kontext zum Ausführungs-, nicht zum Spawn-Zeitpunkt). Aufgefallen nur, weil die
  `<result>`-Kurzfassung verdächtig nach Statusmeldung klang; erst durch `TaskOutput` bestätigt.
- [`docs/factory/kleinfunde.md`](../docs/factory/kleinfunde.md) (neuer Eintrag: „`/review`-Skilltext
  und `review-agent.md`-Persona widersprechen sich zur Agenten-Anzahl") – wegen: `.claude/commands/
  review.md:3` verlangt drei separat gespawnte Sub-Agenten, `docs/factory/agents/review-agent.md:5`
  beschreibt einen einzelnen Reviewer mit drei Perspektiven (Singular). Führte in dieser Task zu
  unnötiger Nacharbeit beim Orchestrieren (Resume + Klarstellung nötig, weil der Fork nach dem
  ersten Fehlschlag eigenständig alle drei Perspektiven kombinierte). Reine Prosa-Änderung an
  `.claude/**`-Dateien, daher nicht direkt gepatcht (Patch-Workflow, #91), sondern hier vermerkt.

### Keine Änderungen nötig
- Review (`tasks/review-298.md`) und Security-Review (`tasks/security-298.md`) fanden keine
  kritischen oder wichtigen Findings am Produktcode – nur zwei Test-Coverage-Nitpicks, die im
  `/test`-Schritt bereits behoben wurden (keine wiederkehrende Fehlerklasse, kein Regel-Bedarf).
- Der Bug selbst (Reihenfolge-Fehler: ein später hinzugefügter Erfolgs-Kurzschluss stand hinter
  einem bereits bestehenden fail-closed-Check) ist bereits in der Task-Datei als Codify-Hinweis
  festgehalten; er betrifft Guard-Clause-Design allgemein und ist zu generisch/einmalig für eine
  eigene Lesson-Regel in diesem Umfang.

### Empfehlung für nächste Features
- Beim Einsatz von Fork-Subagenten für mehrstufige Skill-Prozesse (Review-Runden,
  Security-Runden) den neuen Smell aus der Lesson beachten: eine `<result>`-Zusammenfassung, die
  wie eine Fortsetzungs-/Wartemeldung liest statt wie ein Arbeitsergebnis, ist ein Warnsignal.
- Die Ambiguität zwischen `.claude/commands/review.md` und `docs/factory/agents/review-agent.md`
  sollte bei Gelegenheit über den Patch-Workflow aufgelöst werden (siehe kleinfunde.md-Eintrag) –
  spart künftig eine unnötige Resume-Runde.
