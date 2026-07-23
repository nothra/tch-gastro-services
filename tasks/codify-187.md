## Codify-Report: Task 187

### Neue Regeln hinzugefügt

- `docs/factory/lessons/testing.md` – **Callback-Prop nur durch Codelesen belegt ist keine
  Testabdeckung** (aus #187, /test-Selbstfund): drei Review-Runden bewerteten das AC „F7 merkt Ziel
  weiterhin geräte-lokal" als erfüllt, weil die Verkabelung (`onFokusWechsel={(id) =>
  writeZielId(token, id)}`) beim Codelesen plausibel aussah. Erst `pnpm vitest run --coverage`
  zeigte, dass die Zeile nie **ausgeführt** wurde – kein Test hatte in der Fokus-Ansicht auf einen
  anderen Chip getippt. Neue Regel: jede inline verkabelte Callback-Prop, die ein AC über
  Verkabelung erfüllt, braucht einen Testfall, der den Callback tatsächlich auslöst und seine
  Wirkung prüft; Coverage-Report vor `/test`-Abschluss gezielt gegen jedes Review-Positiv
  gegenprüfen. Index-Zeile in `PROJECT-CONTEXT.md` ergänzt.
- `docs/factory/lessons/frontend-react.md` – **Verschieben eines route-neutralen Moduls: alte
  Datei löschen ist Teil des Moves, nicht optional** (aus #187, Review-Eskalation Runde 1–4): der
  Auftrag „`FokusListe` nach `app/_verzehr/` verschieben" legte die neue Datei korrekt an, ließ aber
  die alte `app/theke/[token]/FokusListe.tsx` (+ Test + Byte-Duplikat-`raf-stub.ts`, erneut #194)
  drei Review-Runden lang unbemerkt als toten, aber lauffähigen Code stehen. Neue Regel: nach jedem
  „X nach Y verschieben"-Auftrag `git status`/`git diff --stat` gegenprüfen – die alte Datei muss als
  `D` erscheinen; wo möglich `git mv` statt Neu-Schreiben+separatem Löschen nutzen. Index-Zeile in
  `PROJECT-CONTEXT.md` ergänzt.
- `docs/factory/lessons/frontend-react.md` – Nachtrag zur bestehenden #188-Regel („Fremd-Layout-
  Offset vom Konsumenten via `className` steuern"): dieselbe Kopplungsart tauchte erneut auf (Rand-
  Bleed der Chip-Leiste, `-mx-6 … px-6`, setzt Eltern-`p-6` voraus). Als Nitpick eingestuft (keine
  Regression, beide Konsumenten nutzen `p-6`), aber noch nicht behoben – Folge-Issue
  [#205](https://github.com/nothra/tch-gastro-services/issues/205) angelegt
  (`enhancement` + `tech-debt`).

### Keine Änderungen nötig

- Security-Review fand keine Findings (PASSED, nur ein positiv verifizierter Defense-in-Depth-
  Hinweis) – kein neues Learning ableitbar.
- Die übrigen Review-Nitpicks (Regex-Helfer in Tests, fehlende negative Assertion für „kein Gate
  auf F5") wurden als niedrigwertig/bewusst-weggelassen bewertet – kein Muster, das eine neue Regel
  rechtfertigt.
- Bereits bestehende Lessons (#52 Route-Neutralität, #183 reine Updater, #188 Scroll-Timing, #194
  Stub-Wiederverwendung, Mock-Mapping-Lesson) wurden laut Review **korrekt angewandt** – keine
  Wiederholung des jeweiligen Fehlers, also keine Verschärfung nötig.

### Hinweis zu diesem Codify-Lauf

Die beiden neuen Lesson-Texte sowie das Anlage-Skript für Issue #205 lagen bereits unvollständig
committet/uncommitted im Arbeitsbaum vor (ein vorheriger `/codify`-Lauf wurde offenbar
unterbrochen, bevor Issue-Anlage, Index-Einträge und dieser Report abgeschlossen waren). Dieser
Lauf hat: das Anlage-Skript ausgeführt (→ Issue #205), die beiden fehlenden Index-Zeilen in
`PROJECT-CONTEXT.md` ergänzt und diesen Report geschrieben. Das Einweg-Skript
`scripts/tmp-codify-187-issue.sh` konnte nicht automatisiert gelöscht werden (Berechtigungs-
Prompt für `rm` in dieser Session nicht verfügbar) – bitte manuell entfernen.

### Empfehlung für nächste Features

- Bei route-neutralen Umbauten mit injizierten Callbacks (Pattern aus ADR-025 D5 / ADR-039 D1)
  von Anfang an einen Testfall einplanen, der den Callback über ein echtes User-Event auslöst –
  nicht erst in der Coverage-Analyse nachträglich auffangen.
- Issue #205 (Chip-Leiste `className`-Umstellung) bei nächster Gelegenheit im selben Rutsch wie
  eine weitere `app/_verzehr/`-Änderung mitnehmen, um die Fremd-Layout-Kopplung endgültig
  aufzulösen.
