# Task 82: zentraler-issue-seam-mit-label-funktion-create-issue-helper

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Issues werden an mehreren Stellen erzeugt (`start-work.sh`, `sync-issues.sh --create`, künftig
auch aus Skills wie `codify`/`review`/`security-review`, die einen Fund klassifizieren). Jede
Stelle wiederholt `gh issue create` mit leicht abweichender Logik, und die Label-Setzung ist
uneinheitlich: Das Art-Label wird erst seit #80 in `start-work.sh` gesetzt; **Aspekt-Labels**
(`security`/`tech-debt`/`test`) werden nirgends angeboten – obwohl gerade `codify`/`review`/
`security-review` eine begründete Aspekt-Empfehlung treffen.

Ziel: **ein einziger Seam** für die Issue-Anlage, durch den *jeder* Erzeugungszeitpunkt läuft
und der Label-Vergabe (Art-Label + optionale Aspekt-Labels) einheitlich anbietet.

Spec: `docs/specs/spec-82-issue-seam.md` · ADR: `docs/adr/018-central-issue-seam.md`

## Akzeptanzkriterien
- [x] GIVEN eine neue Bibliotheksfunktion `scripts/lib/create-issue.sh`
      (`create_issue <title> <body> <art-label> [aspekt-csv]`), WHEN sie aufgerufen wird,
      THEN legt sie das Issue an, setzt Art- + Aspekt-Labels und gibt die Issue-Nummer auf
      stdout zurück.
- [x] GIVEN ein Label existiert im Repo nicht, WHEN das Issue angelegt wird, THEN wird es
      trotzdem angelegt (fail-open aufs Label, Warnung), aber die Anlage selbst scheitert
      fail-closed, wenn gar kein Issue entsteht.
- [x] GIVEN `start-work.sh`, WHEN es ein Issue anlegt, THEN nutzt es `create_issue`
      (Art-Label wie bisher aus Branch-Typ) und akzeptiert **optional** `--labels a,b`
      für Aspekt-Labels.
- [x] GIVEN `sync-issues.sh --create`, WHEN es fehlende Issues anlegt, THEN nutzt es
      denselben Seam (kein eigenes `gh issue create` mehr).
- [x] GIVEN die Skills `codify`/`review`/`security-review` haben einen Fund mit Art-/Aspekt-
      Empfehlung, WHEN daraus ein Issue entsteht, THEN rufen sie `create_issue` **autonom** auf
      (Entscheidung 2026-07-12) und geben Art- + Aspekt-Labels mit; Skill-Doku entsprechend anweisen.
- [x] GIVEN der Self-Test, WHEN er läuft, THEN deckt er den Seam ab (Art-Label, Aspekt-CSV,
      fehlendes Label, stdout-Nummer) und bleibt grün.
- [x] GIVEN die Entscheidung „zentraler Issue-Seam + Label-Konvention", THEN ist sie als
      ADR unter `docs/adr/` dokumentiert (inkl. Frage: welche Skills dürfen autonom Issues
      anlegen vs. nur Empfehlung in Datei).

## Technische Notizen
- **Seam extrahieren, nicht neu erfinden:** Die fail-open-Label-Logik existiert bereits in
  `start-work.sh` (aus #80) – von dort in `scripts/lib/create-issue.sh` herausziehen und beide
  bisherigen Aufrufer (`start-work.sh`, `sync-issues.sh`) darauf umstellen (DRY).
- **Art vs. Aspekt sauber trennen:** genau ein Art-Label (`bug`/`enhancement`/`documentation`),
  null..n Aspekt-Labels (`security`/`tech-debt`/`test`) – siehe `git-workflow.md` „GitHub-Labels".
  Der Seam validiert das nicht hart (fail-open), aber die aufrufenden Skills sollen die
  Konvention einhalten.
- **Skills legen heute keine Issues an** (nur Empfehlungen in Dateien). Die ADR muss klären,
  ob `codify`/`review`/`security-review` künftig autonom `create_issue` aufrufen dürfen oder
  weiterhin nur eine Empfehlung schreiben, die ein Mensch via `start-work.sh` übernimmt.
- **Portabilität** beachten (`bash-gotchas.md`, clean-code.md „Portabilität in Gate-Skripten“):
  POSIX-taugliche Shell, `gh`-Aufrufe stubbar für den Self-Test (Muster: `GH_LOG` aus
  run-tests.sh, siehe #80).
- **Scope-Abgrenzung:** baut auf PR #81 (#80) auf – erst mergen lassen, dann hier rebasen,
  damit die Art-Label-Logik in `start-work.sh` schon vorhanden ist.

### Architektur-Notizen (ADR-018) – für den Coding-Agenten
- **Ort/Form:** sourcebare Lib `scripts/lib/create-issue.sh` (neues Verzeichnis `scripts/lib/`),
  Signatur `create_issue <title> <body> <art-label> [aspekt-csv]`. Aufrufer sourcen sie.
- **Interface-Kontrakt (fail-closed nur auf die Anlage):** Issue-Nummer **nur auf stdout**,
  alle Warnungen/Diagnostik auf **stderr** (damit `num=$(create_issue …)` sauber bleibt).
  Exit ≠ 0 nur, wenn gar kein Issue entsteht.
- **Label-Degradation (fail-open aufs Label):** `create` mit Art+allen Aspekt-Labels →
  bei Fehlschlag `create` nur mit Art-Label (Warnung nennt die weggefallenen Aspekte) →
  zuletzt ganz ohne Label. Das Art-Label darf nie durch ein fehlendes Aspekt-Label mitgerissen
  werden. **Keine Allowlist im Seam** – Label-Liste bleibt kanonisch in `git-workflow.md`.
- **Repo-Bezug:** Slug **nicht** im Seam ableiten. `--repo "${FACTORY_REPO:-$REPO}"` nur setzen,
  wenn nicht-leer; sonst `gh`-Auto-Erkennung. Aufrufer setzen `REPO` wie bisher.
- **Test:** gh-Stub-Muster `GH_LOG` aus `run-tests.sh` (#80) wiederverwenden – Fälle: Art-only,
  Art+Aspekt-CSV, fehlendes Label (Warnung + Issue trotzdem), stdout = reine Nummer.

## Offene Fragen
- ~~Dürfen Skills Issues **autonom** anlegen?~~ **Entschieden 2026-07-12: Ja** – Skills rufen
  `create_issue` selbst auf (ADR-018 §5).
- ~~Aspekt-Labels validieren (fail-closed) oder durchreichen (fail-open)?~~ **Entschieden
  (ADR-018 §3): fail-open pass-through**, gestufte Degradation, keine Allowlist im Seam.

## Implementierungs-Notizen (2026-07-12)
- **Seam:** `scripts/lib/create-issue.sh` – `create_issue <title> <body> <art-label> [aspekt-csv]`.
  Nummer nur auf stdout, Diagnostik auf stderr; gestufte Label-Degradation (Art+Aspekt → Art →
  ohne Label); Repo aus `FACTORY_REPO`/`REPO`, sonst gh-Auto. Kein `set -e` nötig (sourcebar).
- **Aufrufer umgestellt:** `start-work.sh` (sourct den Seam relativ zum Skript-Ort, damit
  `FACTORY_DIR`-Override in Tests nicht bricht; neu: `--labels a,b` / `FACTORY_ASPECT_LABELS`)
  und `sync-issues.sh --create` (Art-Label `enhancement`-Default, Override `FACTORY_ISSUE_LABEL`) –
  beide ohne eigenen `gh`-Direktaufruf. TDD: 17 Seam-Tests + Integrations-/Doku-Checks in
  `run-tests.sh` (185 grün, 0 rot); pre-commit grün.
- **Skill-Doku:** `codify`/`review`/`security-review` weisen den autonomen `create_issue`-Aufruf
  für Out-of-Scope-Funde an; `git-workflow.md` nennt den Seam als kanonischen Anlage-Weg.

## Review-Findings
Siehe `tasks/review-82.md`. Kern: 1 kritisches Finding (F1 – `repo_args`-Expansion ohne
`+`-Guard → „unbound variable" unter `set -u` auf bash 3.2/macOS im no-repo-Pfad, den die
Skills nutzen) reproduziert und behoben; wichtige Findings (interne Duplikation → Helfer
`_cri_try_create`, `set -e`-Härtung, `--labels`-ohne-Wert-Guard, Test-Blindstellen) mit Rework
+ Regressionstests geschlossen. Nach Rework **APPROVED**, 197 Tests grün.

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/82-zentraler-issue-seam-mit-label-funktion-create-issue-helper`
Erstellt: 2026-07-12 14:32
