## Codify-Report: Task 375

### Neue Regeln hinzugefügt
- `docs/factory/lessons/factory-workflow.md` + Index-Zeile in `PROJECT-CONTEXT.md` (Trigger `/implement`, `/review`):
  Bei einer normativen Regel mit Ist→Soll-Abweichungsliste das Kernmuster nach **jeder** Änderung am
  Regelwortlaut (auch im Rework) per Grep über den ganzen Baum prüfen; Review-Fundstellen vor dem Eintragen
  belegen – wegen: Iteration 1 (`LinkKopieren.tsx:45` fehlte) und Iteration 2 (drei `actions.ts`-Meldungen
  verletzten die im Rework verschärfte Doppelpunkt-Regel).

### Keine Änderungen nötig
- Keine Code-, CLAUDE.md- oder Guideline-Änderung: reiner Doku-Diff, Security-Review ohne Findings,
  Iteration 3 APPROVED. Die Rework-Disziplin (Commit + sauberes `git status`, Lesson #391) wurde eingehalten.
- Out-of-Scope-Folgearbeit liegt bereits kanonisch in Issue #401 (und #372); die beiden Nitpicks der Iteration 3
  (Soll-Text glätten, Auffangzeile „Sonstiger Fehler") sind optional und gehören zu #401 – kein neues Issue/Kleinfund.

### Empfehlung für nächste Features
- #372 und #401 setzen das Glossar um; dort erledigte Abweichungszeilen streichen. Offen bleibt die Frage, ob die
  leere Liste danach ganz entfällt (Task-Datei, nicht blockierend).
