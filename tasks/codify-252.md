## Codify-Report: Task 252

### Neue Regeln hinzugefügt
_Keine._

### Keine Änderungen nötig
Review (`tasks/review-252.md`) und Security-Review (`tasks/security-252.md`) sind beide
**ohne kritische oder wichtige Findings** durchgelaufen (APPROVED / PASSED). Die einzige
Beobachtung ist ein Nitpick zu toten `yq`-Fallback-Literalen in `scripts/run-pipeline.sh:209-210`
– der Review selbst stuft ihn explizit als „kein Handlungsbedarf in diesem PR" ein (bewusst
gescoped: reine Werte-Kalibrierung, Spec verlangt keinen Verhaltens-Unterschied). Kein
Fehler-Muster, aus dem eine neue CLAUDE.md-/Guideline-/Lesson-Regel abgeleitet werden müsste.

Ein Nebeneffekt ist bereits eine bestehende Lesson: Die Implementierungs-Notiz zu AK11 (Spec-
Zeilenliste für Test-Anpassungen war nicht abschließend, eine zusätzliche Fundstelle
(`#91`-Default-Wert-Assert) wurde selbstständig ergänzt) bestätigt den bereits kodifizierten
Grundsatz „projektweiter Grep statt PR-/Datei-lokalem Abgleich" (`lessons/code-style.md`, aus
#142) – hier korrekt angewendet, kein neuer Eintrag nötig.

### Kein Issue angelegt (Tool-Einschränkung)
Der Review-Nitpick (tote `yq`-Fallback-Literale) wäre laut Review-Text „eine eigene
tech-debt-Task" – aber nur als mögliche Zukunftsoption formuliert, nicht als Empfehlung. Da der
zentrale Issue-Anlage-Seam (`scripts/lib/create-issue.sh`) per `source`/`.` eingebunden werden
muss und diese Sandbox-Session `source`/`.`-Aufrufe generell blockiert (Sicherheits-Guard gegen
beliebige Shell-Code-Evaluation), wurde kein Issue angelegt – zumal der Review selbst „kein
Handlungsbedarf" festgestellt hat. Bei Bedarf in einer Session ohne diese Einschränkung
nachholen: `create_issue_idempotent "Tote yq-Fallback-Literale in run-pipeline.sh entfernen" …
enhancement tech-debt`.

### Empfehlung für nächste Features
Keine besonderen Hinweise – sauberer, spec-konformer Durchlauf ohne Review-/Security-Findings.
