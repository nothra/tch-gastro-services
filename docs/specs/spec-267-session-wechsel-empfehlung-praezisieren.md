# Spec: Session-Wechsel als Empfehlung präzisieren (Abgrenzung zur Worktree-Pflicht)

## Kontext

Die Factory-Doku vermengt an vier Stellen zwei sachlich unabhängige Maßnahmen:

1. **Worktree-Isolation** – strukturelle Git-Sicherheit. Verhindert, dass zwei *parallele*
   Prozesse im geteilten Arbeitsbaum gegenseitig `HEAD`/Index verschieben (Vorfall #71: ein
   Commit landete auf dem falschen Branch). Wirkt unabhängig davon, ob die Claude-Session
   gewechselt wird.
2. **Neue Claude-Session je Task** – Kontext-Hygiene. Begründet mit Fokus, kein Übersprechen
   aus vorherigen Tasks und geringerem Token-Verbrauch. Keine Git-Sicherheitsmaßnahme.

Faktencheck zum Ist-Stand (geprüft am Code, nicht nur am Issue-Text):

| Stelle | Formulierung heute | Verbindlichkeit |
|--------|--------------------|-----------------|
| `CLAUDE.md` → Guardrails | „Jede neue Task in einer neuen Claude-Session starten." | imperativ (Guardrail) |
| `docs/factory/guidelines/git-workflow.md` → „Eine Task = Eine Session" | „Jede neue Task in einer neuen Claude-Session starten." + Begründung Fokus/Token | imperativ |
| `docs/factory/OPERATING.md` (Abschnitt 1.1) | „eine *frische Claude-Session* für den Implement-Schritt ist **gut für** die Kontext-Hygiene" | Empfehlung (aus #78) |
| `docs/factory/OPERATING.md` (Abschnitt 2) | „**Eine Task = eine Claude-Session.**" | imperativ |
| `scripts/start-work.sh` (Hinweistext am Ende) | „⚡ Tipp: Starte … eine neue Claude-Session" – begründet mit „Eigener Arbeitsbaum = parallele Sessions kollidieren nicht (kein geteilter HEAD)." | Tipp, **falsch begründet** |

Zwei Befunde daraus:

- **Die Stellen widersprechen sich bereits untereinander** (Guardrail vs. „gut für" vs. „Tipp).
  Eine Präzisierung nur in `git-workflow.md` würde den Widerspruch nicht auflösen.
- **Der Hinweistext in `start-work.sh` begründet die Session-Empfehlung mit dem Nutzen des
  Worktrees** („kein geteilter HEAD") – genau die Vermengung, um die es geht, steht wörtlich im
  Skript-Output.

Für die Session-Regel existiert **kein** technisches Durchsetzungsmittel: kein Hook, kein Gate in
`scripts/checks/`, kein Test. Die Skills sind laut `CLAUDE.md` und `OPERATING.md` (Abschnitt 2.1)
bewusst so gebaut, dass sie **kein Gesprächsgedächtnis** brauchen („Output in Dateien"); `/implement`
liest seinen Kontext aus Task-Datei und Spec. Eine Fortsetzung in derselben Session funktioniert
technisch – sie kostet Kontext-Hygiene, nicht Korrektheit.

**Getroffene Entscheidung (Ralf, 2026-08-17):** „Neue Session" wird zur **dringend empfohlenen
Best Practice mit benannten Ausnahmen**; die Worktree-Pflicht bleibt unverhandelbar. Die
Doku-Umsetzung erfolgt in diesem PR (nicht als Folge-Issue), und der Hinweistext in
`start-work.sh` wird mit korrigiert.

**Kein ADR-Trigger:** Keine der vier Kategorien aus `OPERATING.md` §4.1 feuert (keine
Technologiewahl, kein Architekturmuster, kein Schnittstellen-Vertrag, trivial reversibel).
`/implement` darf in Schritt 0 durchlaufen.

## Scope

**Inbegriffen:**

- Präzisierung des Abschnitts „Eine Task = Eine Session" in
  `docs/factory/guidelines/git-workflow.md` (kanonische Quelle der Regel).
- Angleichung der Guardrail-Zeile in `CLAUDE.md`.
- Angleichung der imperativen Stelle in `docs/factory/OPERATING.md` (Abschnitt 2).
- Korrektur der Begründung im Hinweistext von `scripts/start-work.sh` (reine `echo`-Texte).
- Regressionstest in `scripts/checks/tests/run-tests.sh`, der die Trennung absichert.

**Nicht inbegriffen:**

- **Keine Abschwächung der Worktree-Pflicht.** Der Abschnitt „Parallele Sessions: eigener
  Worktree (nicht verhandelbar)" bleibt inhaltlich unverändert.
- **Kein Hook, Gate oder Check** für die Session-Empfehlung – sie bleibt bewusst
  nicht-erzwungen (technisch auch nicht erzwingbar: ein Repo-Hook kann den Session-Zustand
  eines externen Prozesses nicht sehen).
- **Keine Logikänderung an `scripts/start-work.sh`** – ausschließlich Ausgabetext.
- Keine Änderung an `docs/routes.md` (keine App-Route betroffen).

## Akzeptanzkriterien

- [ ] **AK1** – GIVEN der Abschnitt „Eine Task = Eine Session" in `git-workflow.md`
      WHEN ein Entwickler ihn liest
      THEN trennt er explizit **Pflicht** (eigener Worktree = Git-Sicherheit, strukturell
      erzwungen) von **Empfehlung** (neue Claude-Session = Kontext-Hygiene/Token-Effizienz) und
      benennt, dass für die Session-Empfehlung **kein technisches Gate** existiert.

- [ ] **AK2** – GIVEN derselbe Abschnitt
      WHEN nach den zulässigen Abweichungen gesucht wird
      THEN nennt er mindestens die Ausnahme „`start-work.sh` und `/requirements` in derselben,
      noch task-freien Session" als legitim **und** die Grenze „nach Abschluss einer Task nicht
      die nächste in derselben Session beginnen" als weiterhin unerwünscht.

- [ ] **AK3** – GIVEN die Guardrail-Liste in `CLAUDE.md`
      WHEN die Zeile zur Claude-Session gelesen wird
      THEN ist sie als Empfehlung (nicht als Pflicht) formuliert und verweist auf
      `docs/factory/guidelines/git-workflow.md` als kanonische Quelle der Ausnahmen.

- [ ] **AK4** – GIVEN `docs/factory/OPERATING.md`
      WHEN die Stelle „Eine Task = eine Claude-Session." (Abschnitt 2) gelesen wird
      THEN steht sie widerspruchsfrei zu `git-workflow.md` und zur bereits vorhandenen
      Empfehlungs-Formulierung in Abschnitt 1.1 („gut für die Kontext-Hygiene").

- [ ] **AK5** – GIVEN ein Aufruf von `bash scripts/start-work.sh …`
      WHEN der abschließende Hinweistext ausgegeben wird
      THEN erscheinen Worktree-Isolation und Session-Empfehlung als **zwei getrennte Aussagen**,
      und die Session-Empfehlung wird **nicht** mehr mit „kein geteilter HEAD" begründet.

- [ ] **AK6** – GIVEN die Bash-Testsuite `scripts/checks/tests/run-tests.sh`
      WHEN sie ausgeführt wird
      THEN prüft sie AK1–AK5 als Regressions-Guard, und für jeden Guard ist per **Mutation**
      belegt, dass er bei entfernter/zurückgedrehter Formulierung rot wird.

- [ ] **AK7** – GIVEN die vier angepassten Dateien
      WHEN nach der alten, imperativen Formulierung „Jede neue Task in einer neuen
      Claude-Session starten" gesucht wird
      THEN existiert keine Fundstelle mehr, die sie als unbedingte Pflicht ausweist
      (historische Vorfall-Narrative und Task-Dateien unter `tasks/` bleiben unberührt).

## Fehlerszenarien

- [ ] **F1 – Zeilenumbruch-Falle bei Prosa-Guards.** Mehrwort-Prüfphrasen in Markdown werden beim
      Umbrechen lautlos rot bzw. wirkungslos (Lesson aus #240/#249/#286, viertes Vorkommnis).
      Da AK1–AK4 **mehrere** Mehrwort-Checks gegen dieselben Dateien fahren, ist ein
      zeilenumbruch-toleranter Lese-Helper (Whitespace-Normalisierung vor dem Vergleich)
      zu verwenden – kein zeilenweises `grep -qF` auf umbrechbare Prosa.

- [ ] **F2 – Guard prüft Prosa statt Verhalten (AK5).** Ein Präsenz-Grep auf ein
      Kommando-Fragment belegt die Ausgabe nicht. Der Guard für AK5 muss den realen
      `start-work.sh`-Output prüfen (bestehendes Wegwerf-Repo-Muster in `run-tests.sh` nutzen)
      oder am exakten `echo`-Konstrukt ankern – Lesson „Kommando ≠ Prosa-Erwähnung".

- [ ] **F3 – Abschwächung greift zu weit.** Wird die Formulierung so weich, dass sie auch die
      Worktree-Pflicht relativiert, entsteht ein Rückfall in den Vorfall #71. Der Guard aus AK6
      muss deshalb auch die **Unverhandelbarkeit des Worktrees** mit prüfen (Negativ-Richtung).

- [ ] **F4 – Doku-Drift zur Lesson-/ADR-Prosa.** Beschreibt eine Lesson oder ADR die geänderte
      Mechanik im Präsens, ist sie im selben PR nachzuziehen (Lesson aus #211/#176). Vor dem
      Review ist ein Grep über `docs/factory/lessons/` und `docs/adr/` auf die Session-Regel
      durchzuführen.

## Offene Fragen

_Keine._ Die drei Entscheidungsfragen des Issues (Verbindlichkeitsgrad, Umfang des PR,
`start-work.sh` anfassen) sind unter „Kontext → Getroffene Entscheidung" beantwortet.
