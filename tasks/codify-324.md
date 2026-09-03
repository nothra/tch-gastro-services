## Codify-Report: Task 324

### Neue Regeln hinzugefügt

- `docs/factory/lessons/factory-workflow.md` (Nachtrag zu „Turn-Limit-Exhaustion", aus #185/#264)
  – drittes Vorkommnis, diesmal bei `/implement` statt `/refactor`: bestätigt, dass der Defekt
  (Orchestrator prüft zwischen Retries nicht auf `git status`, retryt blind) **nicht**
  skill-spezifisch ist, sondern in `run_skill()` selbst sitzt. Index-Zeile in
  `PROJECT-CONTEXT.md` entsprechend generalisiert (Trigger jetzt „jeder code-schreibende
  Skill" statt nur `/refactor`). Kommentar auf dem bestehenden Härtungs-Issue #275 ergänzt,
  damit dessen Fix generisch für alle Skills greift, nicht nur für `/refactor`. – wegen:
  `PR_SHEPHERD=true bash scripts/run-pipeline.sh 324` brach nach 3 gescheiterten
  `/implement`-Versuchen ab, obwohl im Arbeitsbaum bereits ein funktional fast fertiger,
  committierbarer Diff lag (alle 6 laut ADR-046 betroffenen Module geändert, Lint + Ziel-Tests
  grün) – ein Mensch musste den Zustand manuell finden und fertigstellen.
- `.gitignore` um `*.tmp.spec.ts`, `*.tmp.spec.tsx` und `.verify-*/` ergänzt (verifiziert via
  `git check-ignore -v`). `docs/factory/lessons/build-tooling.md` (Nachtrag zu „Debug-/
  Lint-Artefakte nicht durch .gitignore gedeckt", aus #67) + Index-Zeile in
  `PROJECT-CONTEXT.md` ergänzt. – wegen: derselbe `/implement`-Lauf legte eine Wegwerf-E2E-
  Verifikation (`e2e/verify-324.tmp.spec.ts`) und einen Screenshot-Ordner (`.verify-324/`) an;
  der Datei-Kommentar behauptete „`*.tmp.*` ist gitignoret" – das stimmte nicht (`.gitignore`
  deckte nur `*.tmp.txt`/`.sh`/`.py`), beide Pfade standen als `Untracked` in `git status` und
  mussten manuell entfernt werden, bevor committet werden konnte.

### Keine Änderungen nötig

- **Review-Findings:** Das einzige Wichtig-Finding (4-Parameter-Verstoß in
  `berichtDateiname`) ist ein Fall, in dem die **bestehende** Clean-Code-Regel (max. 3
  Parameter) genau wie vorgesehen funktioniert hat – Review-Runde 2 hat es gefunden, es wurde
  sofort behoben. Kein Regel-/Prozess-Defekt, kein Lesson-Eintrag nötig.
- **Security-Review:** PASSED, 0 kritische/wichtige Findings. Kein Muster erkennbar, das eine
  neue Regel rechtfertigt.
- **Test-Duplikation-Nitpick** (dieselbe kleine Konstante + 3-Zeilen-Helfer in
  `berichtXlsx.test.ts`/`berichtPdf.test.ts`): bereits als Nitpick klassifiziert
  („Developer entscheidet"), bewusst nicht behoben (kein etablierter Shared-Test-Helper-
  Pfad in diesem Verzeichnis, Umfang zu klein für eine neue Abstraktion). Kein neues
  Fehler-Muster – die bestehenden Duplikations-Lessons (#240/#267/#310) drehen sich um
  strukturelle Duplikation in Skripten/Tests deutlich größeren Umfangs; dieser Fall bleibt
  unterhalb der Schwelle, an der eine neue Regel etwas verhindern würde.
- **Architektur (Runde 3):** APPROVED, ADR-046 exakt umgesetzt, Doku-Drift-frei. Kein Learning.

### Empfehlung für nächste Features

- Bei Tasks mit vielen Akzeptanzkriterien (hier 15) und entsprechend großem Implementierungs-
  Scope: `/implement` läuft im automatisierten Pipeline-Modus real Gefahr, das Turn-Limit zu
  reißen. Bis Issue #275 den generischen Retry-Guard liefert, nach einem Pipeline-Abbruch in
  Phase 1 zuerst `git status`/`git diff` im Ziel-Worktree prüfen, bevor der Lauf als „von
  vorn beginnen" behandelt wird – der bereits geleistete Fortschritt ist oft groß.
- Wird während `/implement` eine Wegwerf-Verifikation angelegt (E2E-Spec, Screenshot o. Ä.):
  den geplanten Pfad vorher per `git check-ignore -v <pfad>` gegen `.gitignore` prüfen, statt
  im Code-Kommentar eine Abdeckung zu behaupten.
