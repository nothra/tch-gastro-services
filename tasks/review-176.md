# Review: Task 176

> Scope: `git diff origin/main...HEAD` (nach `git fetch origin`) – ausschließlich die vier
> `.claude/commands/*.md` (16 Zeilen) plus Spec/Task-Doku. Keine Fremd-PRs im Scope (die neue
> Regel dieses PRs greift bereits). Reine Agenten-Instruktions-Markdown, kein Runtime-Code.
> Drei Review-Runden inline durchgeführt (proportional zum Diff, Token-Effizienz-Guideline);
> keine drei separaten Sub-Agenten für 16 Zeilen Doku.

## Kritische Findings (müssen behoben werden)
- _Keine._

## Wichtige Findings (sollten behoben werden)
- [ ] [docs/factory/lessons/factory-workflow.md:307-308 + :323-325] Der Lesson-Block „Review-Diff-Scope"
      beschreibt die Skills im **Präsens** als `git diff main...HEAD` nutzend (307-308) und nennt die
      Skill-Umstellung als **offenen Follow-up (#176)** (323-325). Beides ist nach diesem PR stale/falsch.
      **Nicht in dieser /implement-Runde zu fixen** (Spec-Scope-Entscheidung, Offene Frage der Task) –
      aber im **`/codify`-Schritt dieses PRs** nachzuziehen: die Präsens-Aussage auf Vergangenheit/„vormals"
      umstellen und den Follow-up-Satz als erledigt markieren. Da `/codify` innerhalb desselben PRs läuft,
      ist das #211/#55-Prinzip („beschreibende Doku im selben PR mitpflegen") gewahrt. Der historische
      #161-Vorfall (314-317) bleibt bewusst unverändert.

## Nitpicks (optional)
- [ ] [docs/factory/PROJECT-CONTEXT.md:266] Index-Zeile trägt weiter den Titel „…`git diff main...HEAD`
      zeigt Fremd-PRs… (aus #161)". Als **Problem-Titel** (historisch) vertretbar; im `/codify`-Sweep
      mitbewerten, ob eine Ergänzung „(behoben in #176)" sinnvoll ist.
- [ ] [docs/factory/lessons/factory-workflow.md:136] Nutzt generisch `git diff main...HEAD` als
      „Branch-Diff" im **Patch-Workflow**-Kontext (nicht die #161-Scope-Mechanik). Anderer Kontext,
      daher kein Zwang – im `/codify`-Sweep auf Konsistenz prüfen.
- [ ] Phrasierungs-Asymmetrie: drei Dateien nutzen „`git fetch origin` (best-effort), dann
      `git diff origin/main...HEAD`", `pr-shepherd.md:12` nutzt die Komma-Listenform ohne „dann"
      (passt zur `git status`, …-Aufzählung). Bewusst kontextabhängig, kein Handlungsbedarf.

## Positives
- Alle 7 Akzeptanzkriterien am Endzustand der **Live-Dateien** verifiziert (0× `main...HEAD` ohne
  `origin/`, 5× `origin/main...HEAD`, `git fetch origin` best-effort je Datei) – nicht am Patch-Artefakt
  (Lesson #212 korrekt beachtet).
- Patch **programmatisch** erzeugt (difflib/UTF-8), `git apply --check` grün, Akzeptanz-Grep gegen
  Temp-Anwendung vor Übergabe – exakt der in #91/#94 vorgeschriebene Weg, keine korrupten Hunk-Header.
- Drei-Punkt-Semantik (`origin/main...HEAD`) korrekt beibehalten und konsistent mit der bereits
  richtigen Nutzung in ADR-038:91 – dieser PR beseitigt die Inkonsistenz, statt eine neue zu schaffen.
- `git fetch origin` sauber als best-effort formuliert (Code-Block-Kommentar in `pr-shepherd.md`
  erklärt „kein Abbruch bei Offline") → Fehlerszenario der Spec erfüllt.
- Scope diszipliniert eingehalten: kein neues Gate, keine `start-work.sh`-Änderung (bewusste YAGNI-
  Entscheidung), keine Routen berührt → `docs/routes.md` korrekt unangetastet.
- Task-Datei-Reconciliation nach Patch-Apply vorbildlich (`[~]`→`[x]`, Blocker als erledigt mit
  Historie, stale `tasks/patch-176.diff` entfernt) – #145-Lesson beachtet.

## Empfehlung
APPROVED

> Bedingung: Das eine Wichtige Finding (Lesson-Prosa-Drift) wird im `/codify`-Schritt **dieses PRs**
> abgearbeitet – nicht als NEEDS_REWORK an `/implement` zurück (die Spec hat die Prosa bewusst aus
> dem /implement-Scope genommen; der Fix landet dennoch im selben PR).
