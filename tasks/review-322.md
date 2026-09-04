# Review: Task 322

## Kritische Findings (müssen behoben werden)

Keine.

## Wichtige Findings (sollten behoben werden)

- [x] [scripts/checks/tests/run-tests.sh:2335] Der Gap-Check zwischen Schritt 2 (`/implement`) und
  der Session-Empfehlung erlaubte unbegründet 1–3 Zeilen Abstand, obwohl die Empfehlungszeile in
  `start-work.sh` immer genau eine Zeile nach Schritt 2 folgt. Die Toleranz schwächte die
  eigentliche Aussage des Tests ("unmittelbar bei Schritt 2") ab. **Behoben:** auf `-eq 1`
  verschärft, Kommentar mit Begründung ergänzt.
- [x] [docs/factory/guidelines/git-workflow.md:309] Der Merksatz „Neue Claude-Session **je Task**
  ist Empfehlung" widersprach der neu eingeführten Nuance direkt darunter (Regelfall: eine Session
  für start-work.sh+/requirements, separate Empfehlung nur für `/implement`) – „je Task" suggeriert
  eine Session pro Task, tatsächlich sind es potenziell zwei Phasen mit unterschiedlicher
  Session-Empfehlung. **Behoben:** „je Task" entfernt, Verweis auf Regelfall/Grenze ergänzt;
  zugehöriger Guard in `run-tests.sh` (AK1) und `CLAUDE.md`-Verweis „Kanonische Quelle für
  Ausnahmen und Grenzen" → „... für Regelfall und Grenze" (die Sektion kennt seit dieser Task keine
  „Ausnahme" mehr, nur noch Regelfall + Grenze) mitgezogen.

## Nitpicks (optional)

- [ ] [scripts/checks/tests/run-tests.sh:5758] `AK7_MUT_DOC_322=$(mktemp)` wird nicht per `rm -f`
  aufgeräumt (reine Test-Hygiene, kein Einfluss auf Korrektheit – entspricht bestehendem Stil
  mehrerer anderer `mktemp`-Aufrufe in derselben Datei, die ebenfalls nicht aufgeräumt werden).
- [ ] [scripts/checks/tests/run-tests.sh:2328-2332] Die vier Ordnungs-Bedingungen sind in einem
  gemeinsamen `assert_true` gebündelt; bei einem Fehlschlag ist nicht sofort ersichtlich, welche
  der vier Positionsvergleiche gerissen ist (entspricht aber einem bereits im File etablierten
  Muster, z. B. im #314-Block).

## Positives

- Alle Akzeptanzkriterien aus Task/Spec sind in `start-work.sh`, `CLAUDE.md`, `git-workflow.md`
  konsistent umgesetzt; `docs/factory/OPERATING.md` korrekt unverändert gelassen, da §1.1/§2
  bereits widerspruchsfrei zur neuen Formulierung waren (verifiziert, nicht nur behauptet).
- Die neuen #322-Ordnungs-Assertions in `run-tests.sh` (Zeilen-Reihenfolge Schritt1→Schritt2→
  Empfehlung→HEAD-Fakt, "keine Claude-Session vor Schritt 2") sind echte, kausale Vergleiche gegen
  den realen `start-work.sh`-Output samt Mutationskontrolle gegen die alte Reihenfolge.
- Die AK7-Neufassung (Absenz-Prüfung statt "wenn vorhanden, dann qualifiziert") nutzt bestehende
  Helfer (`assert_absent`/`flat_286`) statt eigener Schleifenlogik – reduziert Komplexität
  gegenüber der alten #267-Fassung, plus frische Positivkontroll-Fixture (Lesson #284: kein
  bereits vorhandener Mutant wiederverwendet).
- Worktree-Pflicht ("Parallele Sessions: eigener Worktree, nicht verhandelbar") nachweislich
  unangetastet (Diff berührt den Abschnitt nicht, F3-Guard bleibt grün).
- Fehlerszenarien der Spec (`FACTORY_NO_WORKTREE=1`, `PR_CREATED=0`) bleiben in `start-work.sh`
  sinnvoll: Schritt 0 bleibt an `WORKTREE_MODE=true` gebunden, die neue Empfehlung bei Schritt 2
  ist davon unabhängig.
- Alle Gates grün: `scripts/checks/tests/run-tests.sh` (1319/1319 nach den Fixes), `pre-commit.sh`,
  `pre-push.sh` (Unit-Tests, Typecheck, Format, Routen-Doku-Drift, Hooks).

## Empfehlung

APPROVED
