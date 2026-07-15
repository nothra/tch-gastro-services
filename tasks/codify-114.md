## Codify-Report: Task 114

### Neue Regeln hinzugefügt
- `docs/factory/PROJECT-CONTEXT.md` → „Reihenfolge-Guards: Kommando ≠ Prosa-Erwähnung (aus #114)"
  – wegen: **Implement-Selbstfund.** Die erste Reihenfolge-Assertion prüfte gegen die kurze
  Form `gh pr merge --auto`, die in `pr-shepherd.md` Schritt 4 auch als **Prosa-Verweis**
  (Zeile 68) vorkommt → `grep … | head -1` traf die Erwähnung statt das Kommando → falsches
  FAIL. Aufgefallen erst bei der Verifikation gegen die **gepatchte Temp-Kopie**.
  Regel: gegen die distinktive Vollform greppen **und** den Guard grün gegen die gewünschte
  Fassung prüfen, nicht nur rot gegen den Ist-Stand.

### Bereits während der Task codifiziert (Feature selbst)
- `docs/factory/PROJECT-CONTEXT.md` → „Notiz-vor-Merge bei Squash-Strategie (aus #114)" – die
  eigentliche Task-Regel (Notiz schreiben → committen+pushen → erst dann Auto-Merge). Im
  `/implement`-Schritt ergänzt, hier nicht doppelt.

### Was gut funktioniert hat (bestehende Regeln bestätigt, keine Änderung nötig)
- **Patch-Workflow (#91/#94):** Programmatische Patch-Erzeugung (`difflib`), `git apply --check`
  + Temp-Kopie-Assertion lief reibungslos für die hard-denied `.claude/**`-Datei. Genau dieser
  Verifikationsschritt hat den Reihenfolge-Fehlmatch (oben) sichtbar gemacht – die Regel
  „auf Temp-Kopien anwenden und Assertions dagegen laufen lassen" hat sich bewährt.
- **Out-of-Scope-Disziplin (ADR-018):** Der Review-Nitpick (Schritt 2 nutzt `factory-commit.sh`
  noch nicht) wurde als **#117** ausgelagert statt scope-zu-creepen.
- **Scope-Disziplin bei Tests:** Für AC3 bewusst **kein** Guard ergänzt (Konsistenz mit ~10
  ungeguardeten Schwester-Regeln, AC4-Scope, „kein Gold-Plating").

### Keine neuen Issues aus Codify
Das einzige Out-of-Scope-Learning (#117) wurde bereits im Review angelegt. Kein weiterer
eigenständiger Folge-Aufwand identifiziert.

### Empfehlung für nächste Features
Beim Schreiben von Positions-/Reihenfolge-Guards über Skill-Docs: zuerst prüfen, ob die
gesuchte Zeichenkette im Dokument **mehrfach** (Kommando + Prosa) vorkommt (`grep -n`), dann
die distinktive Form wählen. Guards immer gegen Ist **und** Soll (Temp-Kopie) verifizieren.
