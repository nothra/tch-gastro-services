# Task 267: session-wechsel-doku-praezisieren

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung

Faktencheck aus #267: Die Factory-Doku vermengt **Worktree-Isolation** (technische
Git-Sicherheit, unverhandelbar) und **neue Claude-Session je Task** (Kontext-Hygiene,
kein technisches Gate). Die vier betroffenen Stellen widersprechen sich zudem untereinander,
und `scripts/start-work.sh` begründet die Session-Empfehlung falsch mit dem Nutzen des
Worktrees („kein geteilter HEAD").

**Entscheidung (Ralf, 2026-08-17):** „Neue Session" wird zur dringend empfohlenen Best Practice
**mit benannten Ausnahmen**; die Worktree-Pflicht bleibt unverändert. Die Doku-Umsetzung erfolgt
in diesem PR, inklusive Korrektur des `start-work.sh`-Hinweistexts.

Spec: [`docs/specs/spec-267-session-wechsel-empfehlung-praezisieren.md`](../docs/specs/spec-267-session-wechsel-empfehlung-praezisieren.md)

## Akzeptanzkriterien

- [ ] **AK1** – GIVEN Abschnitt „Eine Task = Eine Session" in `git-workflow.md` WHEN gelesen
      THEN trennt er Pflicht (Worktree/Git-Sicherheit) von Empfehlung (Session/Kontext-Hygiene)
      und benennt, dass für die Session-Empfehlung kein technisches Gate existiert.
- [ ] **AK2** – GIVEN derselbe Abschnitt WHEN nach Abweichungen gesucht wird THEN nennt er die
      legitime Ausnahme (`start-work.sh` → `/requirements` in derselben, noch task-freien Session)
      und die Grenze (nach Task-Abschluss nicht die nächste Task in derselben Session).
- [ ] **AK3** – GIVEN Guardrail-Liste in `CLAUDE.md` WHEN die Session-Zeile gelesen wird
      THEN ist sie Empfehlung statt Pflicht und verweist auf `git-workflow.md` als kanonische Quelle.
- [ ] **AK4** – GIVEN `docs/factory/OPERATING.md` WHEN „Eine Task = eine Claude-Session."
      (Abschnitt 2) gelesen wird THEN steht sie widerspruchsfrei zu `git-workflow.md` und zur
      Empfehlungs-Formulierung in Abschnitt 1.1.
- [ ] **AK5** – GIVEN ein `start-work.sh`-Aufruf WHEN der Hinweistext ausgegeben wird
      THEN sind Worktree-Isolation und Session-Empfehlung zwei getrennte Aussagen, und die
      Session-Empfehlung wird nicht mehr mit „kein geteilter HEAD" begründet.
- [ ] **AK6** – GIVEN `scripts/checks/tests/run-tests.sh` WHEN sie läuft THEN prüft sie AK1–AK5
      als Regressions-Guard, je Guard per Mutation als wirksam belegt.
- [ ] **AK7** – GIVEN die vier angepassten Dateien WHEN nach der alten imperativen Formulierung
      gesucht wird THEN weist keine Fundstelle sie mehr als unbedingte Pflicht aus
      (`tasks/**` und historische Vorfall-Narrative ausgenommen).

## Technische Notizen

- **Kein ADR-Trigger** – keine der vier Kategorien aus `OPERATING.md` §4.1 feuert
  (reine Prozess-Doku, trivial reversibel). `/implement` läuft in Schritt 0 durch.
- Betroffene Dateien: `docs/factory/guidelines/git-workflow.md` (kanonische Quelle),
  `CLAUDE.md`, `docs/factory/OPERATING.md`, `scripts/start-work.sh` (nur `echo`-Texte),
  `scripts/checks/tests/run-tests.sh`.
- **Guard-Bauweise (F1):** zeilenumbruch-toleranter Lese-Helper (Whitespace-Normalisierung)
  statt zeilenweisem `grep -qF` auf Markdown-Prosa – ab zwei Mehrwort-Checks gegen dieselbe
  Datei lohnt der Helper (Lesson #240/#249/#286).
- **Guard-Bauweise (F2):** AK5 gegen den realen Skript-Output prüfen (Wegwerf-Repo-Muster in
  `run-tests.sh` ab Zeile ~1837), nicht per Fragment-Grep.
- Vor `/review`: Grep über `docs/factory/lessons/` und `docs/adr/` auf die Session-Regel
  (Doku-Drift, F4).

## Offene Fragen

_Keine – alle drei Entscheidungsfragen des Issues sind beantwortet (siehe Spec, Abschnitt Kontext)._

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `docs/267-session-wechsel-doku-praezisieren`
Erstellt: 2026-08-17 05:36
