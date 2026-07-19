## Codify-Report: Task 158

### Muster-Analyse
Die Review-Findings W1/N2/N7 hatten **eine gemeinsame Ursache**: der programmatische
`.claude/**`-Patch (Patch-Workflow #94). Zwei wiederkehrende, verallgemeinerbare Fehler:
1. **ASCII-Faltung** der Umlaute in den difflib-Replacement-Strings (`waehlen`/`wuerde`) –
   unnötig, wurde zum Review-Nitpick (N7).
2. **Kein Ganzdatei-Sweep** nach der Schritt-6-Semantik-/Header-Änderung → veraltete
   „Auto-Merge freigegeben"-Formulierungen blieben in Notiz-Template, Output-, Stage-3- und
   Regel-Abschnitt stehen (W1/N2). Das committete Template hätte falschen Text auf `main`
   gebracht. Kostete einen **zweiten** Human-Apply-Zyklus.

Die übrigen Findings waren bereits durch bestehende Regeln abgedeckt → kein neuer Bedarf.

### Neue Regeln hinzugefügt
- **`docs/factory/PROJECT-CONTEXT.md`** (Zusatz zur #94/#145-Patch-Workflow-Sektion, „aus #158"):
  - **UTF-8 statt ASCII-Faltung** in programmatisch erzeugten Patch-Replacement-Strings.
  - **Ganzdatei-Sweep bei Semantik-/Header-Änderung** einer Skill-Datei (nicht nur die
    geänderten Zeilen): Header, Zusammenfassungs-/Output-Abschnitte, Regeln und committete
    Templates nach nun veralteten Beschreibungen desselben Schritts durchsuchen
    (`git grep -n <alter-Begriff> <skill-datei>`). Verwandt mit #144, aber Auslöser ist eine
    Verhaltensänderung, nicht ein Term-Rename.

### Keine Änderung nötig (bereits abgedeckt)
- **W2** (`_ln` statt `_line`, Doppelberechnung): clean-code.md Naming + „keine Duplikation".
- **AC3 nur transitiv getestet**: #117 („je separierbares AC-Kriterium eine eigene Assertion")
  + #51 („entferne ich den Guard, schlägt ein Test fehl?") decken das ab; im `/test`-Schritt
  bereits durch eine dedizierte Assertion behoben.
- **N4** (3. Wiederholung Order-Check): clean-code.md „keine Code-Duplikation"; im `/refactor`
  via `line_before`-Helper behoben.
- **Security-Hinweis** (`first_match_line` ohne `--`): pre-existing, null Vektor (Repo-Literale),
  #36-Regel zielt auf *nutzerkontrollierte* Werte – kein Issue, kein neuer Guard.

### Was gut funktioniert hat
- Der Patch-Workflow (#94) + #94-Temp-Verifikation (Positiv/Negativ vor Human-Apply) hat
  gehalten: die 3 #158-Self-Tests waren nach jedem Apply exakt wie vorhergesagt grün.
- ADR-030 (`CLEAN`-only, sonst fail-closed `--auto`) trug durch alle drei Review-Runden und
  die Security-Prüfung ohne inhaltlichen Einwand.

### Empfehlung für nächste Features
- Bei jedem `.claude/**`-Patch, der **Verhalten/Terminologie** ändert: vor dem Erzeugen des
  Patches einmal `git grep -n <betroffener-Begriff>` über die Skill-Datei laufen lassen und
  alle abhängigen Stellen in **einen** Patch bündeln – spart den zweiten Apply-Zyklus.

### Folge-Issues
Keine – alle Learnings als Regeln codifiziert; kein eigenständiger Aufwand offen.
