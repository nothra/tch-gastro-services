# Task 427: factory-split-t1b-historie-nach-dev-factory

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Teil-Task **T1b-1** des Epics #424 (T1b geteilt, spec-427 Q6): das Werkzeug fürs Herauslösen der
Factory nach `nothra/dev-factory` bauen und testen, einen **Probelauf** mit Scan-Bericht fahren und
die T1b-Entscheidungen als Nachtrag in ADR-063 festhalten. **Kein Push** ins Factory-Repo – das ist
T1b-2 (#436), nach dem Merge dieser Task. TCH verhält sich danach exakt wie vorher.

Spec: [`docs/specs/spec-427-factory-nach-dev-factory-herausloesen.md`](../docs/specs/spec-427-factory-nach-dev-factory-herausloesen.md)
· Architektur: ADR-063 D5, D6, D9 + Nachtrag 2026-10-23.

## Akzeptanzkriterien
<!-- Volltext in der Spec; T1b-1-Anteil laut Teilungstabelle. Übrige AK → T1b-2 (#436) -->
- [ ] A1 `factory-extract.sh paths` = `ownership-check.sh --list factory` + Altpfade, erzeugt, zweiter Lauf identisch
- [ ] A4 Umschreibregel (`factory-extract.rules`) getestet; im Probelauf kein unqualifiziertes `#<nr>` in Messages
- [ ] B3 Probelauf-Bericht (Werkzeug-Versionen, TCH-Commit, Commits/Dateien, A2/B1/B2-Ergebnis) in dieser Task-Datei und im PR-Body #435
- [ ] X1 Diff ändert keine Factory-Datei außer dem ADR-063-Nachtrag; `run-tests.sh` + App-Gates grün
- [ ] X2 `run` arbeitet auf frischem Klon; Arbeitsklon und `origin` unberührt

## Technische Notizen
Entscheidungen: ADR-063 → „Nachtrag 2026-10-23 · Detailentscheidungen aus T1b".

- **Neue Dateien (alle projekteigen, `scripts/project/**`):** `factory-extract.sh` mit
  `paths`, `run <ziel>`, `verify <ziel>`, `scan <ziel>`, `qualify <ziel>`;
  `factory-extract.rules` (einzige Umschreibregel, von `run` und `qualify` gelesen);
  `factory-extract.allow` (Erlaubt-Liste E-Mail-Muster); Tests in `scripts/project/tests/`.
- **Umschreibregel:** `#<ziffern>` als ganzes Wort, ohne vorangehendes Wortzeichen, `/`, `.`, `-`
  → `nothra/tch-gastro-services#<ziffern>`. Gegenbeispiele testen: schon qualifiziert, Farbcode
  `#1e40af`, `#!`, String-Fixture `"Closes #42"` in Shell-Code (bleibt, `qualify` fasst in `*.sh`
  nur Kommentarzeilen an).
- **TDD:** `paths` gegen Fixture-Repo mit Umbenennung (Altpfad muss erscheinen, fremde Datei
  nicht); Regel über `python3 re` (gleiches Regex-Dialekt wie `filter-repo --replace-message`),
  ohne `filter-repo`; `verify`/`scan` gegen präparierte Fixture-Repos, `gitleaks` als Stub im `PATH`
  – auch „Stub meldet Fund"/„Stub fehlt" (fail-closed). `filter-repo` läuft in keinem Test/CI.
- **Probelauf** braucht lokal `git-filter-repo` und `gitleaks` (z. B. `brew install`) – Installation
  vorher mit dem Entwickler abstimmen. Ziel-Verzeichnis außerhalb des Repos (Scratchpad o. ä.),
  danach löschen. Nichts pushen, kein `gh repo create`.
- **Altpfade, die in TCH weiterleben** (`CLAUDE.md`, `.claude/settings.json`, `.gitignore`): kommen
  bewusst mit; im Probelauf-Bericht als erwartet ausweisen, nicht als A2-Verstoß.
- **Bash 3.2 / BSD-kompatibel** (macOS): `LC_ALL=C sort`, `shasum -a 256`, kein `sed -i` ohne
  Suffix-Argument, Zeichenklassen in BSD-`awk` per `index()`.
- **Lessons:** `docs/factory/lessons/testing.md` (Fixture-Git-Identität, Messung brechen statt
  Input #319, Mutationsbeleg), `factory-workflow.md` (Wegwerf-Dateien sofort löschen, `-c
  user.email` bei Commits), `docs/factory/guidelines/bash-gotchas.md`.
- `docs/routes.md` unberührt (keine Route). Label `factory-pipeline` passt (Pfade `scripts/`).

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
Keine – Q1–Q6 der Spec im ADR-063-Nachtrag beantwortet.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/427-factory-split-t1b-historie-nach-dev-factory`
Erstellt: 2026-10-23 17:01
