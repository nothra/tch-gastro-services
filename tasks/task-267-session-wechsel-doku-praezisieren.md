# Task 267: session-wechsel-doku-praezisieren

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [x] Codify ausgeführt
- [x] Fertig / PR erstellt

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

- [x] **AK1** – GIVEN Abschnitt „Eine Task = Eine Session" in `git-workflow.md` WHEN gelesen
      THEN trennt er Pflicht (Worktree/Git-Sicherheit) von Empfehlung (Session/Kontext-Hygiene)
      und benennt, dass für die Session-Empfehlung kein technisches Gate existiert.
- [x] **AK2** – GIVEN derselbe Abschnitt WHEN nach Abweichungen gesucht wird THEN nennt er die
      legitime Ausnahme (`start-work.sh` → `/requirements` in derselben, noch task-freien Session)
      und die Grenze (nach Task-Abschluss nicht die nächste Task in derselben Session).
- [x] **AK3** – GIVEN Guardrail-Liste in `CLAUDE.md` WHEN die Session-Zeile gelesen wird
      THEN ist sie Empfehlung statt Pflicht und verweist auf `git-workflow.md` als kanonische Quelle.
- [x] **AK4** – GIVEN `docs/factory/OPERATING.md` WHEN „Eine Task = eine Claude-Session."
      (Abschnitt 2) gelesen wird THEN steht sie widerspruchsfrei zu `git-workflow.md` und zur
      Empfehlungs-Formulierung in Abschnitt 1.1.
- [x] **AK5** – GIVEN ein `start-work.sh`-Aufruf WHEN der Hinweistext ausgegeben wird
      THEN sind Worktree-Isolation und Session-Empfehlung zwei getrennte Aussagen, und die
      Session-Empfehlung wird nicht mehr mit „kein geteilter HEAD" begründet.
- [x] **AK6** – GIVEN `scripts/checks/tests/run-tests.sh` WHEN sie läuft THEN prüft sie AK1–AK5
      als Regressions-Guard, je Guard per Mutation als wirksam belegt.
- [x] **AK7** – GIVEN die vier angepassten Dateien WHEN nach der alten imperativen Formulierung
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

## Implementierungs-Notizen

- F4-Grep vor Abgabe: `docs/factory/lessons/` und `docs/adr/` durchsucht – einziger Treffer war
  ADR-008 (`Ein async-getriggerter Lauf = 6+ Claude-Sessions`, Kostenaussage zur Pipeline-Automatik,
  keine Aussage zur Ein-Task-eine-Session-Regel) → kein Drift, keine Änderung nötig.
- AK6-Guards liegen in zwei Blöcken in `run-tests.sh`: AK5 direkt vor dem `TMP_SW`-Cleanup
  (braucht die dortigen gh-Stub-/Worktree-Fixtures aus dem #74/#236-Block), AK1–AK4/AK7 am
  Dateiende (reine Doku-Content-Checks, keine Fixtures nötig).
- Stolperstein: Pfad-Konstanten für den AK7-Guard erst als space-getrennten String zusammengefasst
  – der Worktree-Pfad dieses Repos enthält selbst ein Leerzeichen
  (`TCH Gastro Services.worktrees/…`), unquoted Word-Splitting zerriss die Pfade und der Guard
  fand keine Treffer. Fix: Bash-Array statt String.
- Alle Gates lokal grün: `run-tests.sh` (1062 grün/0 rot), `pre-commit.sh`, `pre-push.sh`
  (Vitest 687 grün, Typecheck, Prettier, Routen-Doku-Drift).

## Review-Findings

Siehe [`tasks/review-267.md`](review-267.md). Empfehlung: APPROVED. 1 Wichtig- und 1
Nitpick-Finding (Grammatik-Fix in `git-workflow.md`:293, Pfeil-Konsistenz in `start-work.sh`:419)
noch in derselben Session behoben, alle Gates danach erneut grün (1062 grün/0 rot, Vitest 687
grün).

## Test-Vollständigkeit

Siehe [`tasks/coverage-267.md`](coverage-267.md). Keine App-Code-Änderung in dieser Task – die
Regressions-Guards für AK1–AK7 wurden bereits während `/implement` geschrieben und decken alle
Akzeptanzkriterien sowie F1–F3 mutationsbelegt ab; F4 war ein einmaliger Doku-Drift-Grep vor
`/review`. `run-tests.sh` zweimal unabhängig ausgeführt (Determinismus-Check): beide Male
1062 grün/0 rot. `pnpm test:coverage`: 89.27% Statements (über der 80%-Schwelle), keine
Verschiebung ggü. dem Vor-Task-Stand, da kein App-Code geändert wurde. Keine fehlenden Tests
identifiziert, kein neuer Testcode nötig.

## Refactoring-Notizen

Kein neues Verhalten – nur Code-Duplikation in `scripts/checks/tests/run-tests.sh` beseitigt:
sechs Stellen im `#267`-Testcode (2× in der AK5-Positiv-Prüfung, 4× in den AK1/AK2/AK3/AK4-
Mutationsbelegen) reimplementierten die Logik der bereits vorhandenen Helfer
`assert_contains_286`/`assert_absent` inline (`printf ... | grep -qF ...` +
`assert_true`/`assert_true`-Negation) statt sie aufzurufen. Auf die Helfer umgestellt – 12
Zeilen weniger, gleiche Assertions. Volle Suite danach identisch grün (1062/0), Prosa-Dateien
unverändert gelassen (keine weiteren Refactoring-Kandidaten dort gefunden).

## Security-Review-Notizen

Siehe [`tasks/security-267.md`](security-267.md). Ergebnis: PASSED, keine Findings. Reine
Prozess-Doku + interner Test-Code, kein App-Code/Dependencies/Secrets betroffen; die neuen
`grep`-Aufrufe in `run-tests.sh` verarbeiten ausschließlich fest verdrahtete String-Literale und
skript-eigene Pfade, keine externe/Fremd-Eingabe.

## Codify-Notizen

Siehe [`tasks/codify-267.md`](codify-267.md). Zwei Lesson-Ergänzungen (jeweils Volltext +
Index-Zeile): Rezidiv des #298-Fork-Kontamination-Learnings in `factory-workflow.md` (Resume
verschlimmerte die Konfusion – Regel jetzt „einmaliger Versuch, kein Retry-Loop") und 4.
Vorkommnis des #240/#224/#251-Duplikat-Smells in `testing.md`, jetzt auf Einzel-Assertion-Ebene
(`assert_contains_286`/`assert_absent` inline reimplementiert statt aufgerufen). Kein neuer
automatisierbarer Check, kein Out-of-Scope-Finding oberhalb der ADR-018/043-Schwelle. Volle
Suite nach den Edits erneut grün (1062/0).

---
Branch: `docs/267-session-wechsel-doku-praezisieren`
Erstellt: 2026-08-17 05:36
