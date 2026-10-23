# Task 427: factory-split-t1b-historie-nach-dev-factory

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [ ] Security-Review bestanden
- [x] Refactoring abgeschlossen
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
- [x] A1 `factory-extract.sh paths` = `ownership-check.sh --list factory` + Altpfade, erzeugt, zweiter Lauf identisch
- [x] A4 Umschreibregel (`factory-extract.rules`) getestet; im Probelauf kein unqualifiziertes `#<nr>` in Messages
- [x] B3 Probelauf-Bericht (Werkzeug-Versionen, TCH-Commit, Commits/Dateien, A2/B1/B2-Ergebnis) in dieser Task-Datei und im PR-Body #435
- [x] X1 Diff ändert keine Factory-Datei außer dem ADR-063-Nachtrag; `run-tests.sh` + App-Gates grün
- [x] X2 `run` arbeitet auf frischem Klon; Arbeitsklon und `origin` unberührt

## Technische Notizen
Entscheidungen: ADR-063 → „Nachtrag 2026-10-23 · Detailentscheidungen aus T1b".

- **Neue Dateien (alle projekteigen, `scripts/project/**`):** `factory-extract.sh` mit
  `paths`, `run <ziel>`, `verify <ziel>`, `scan <ziel>`, `qualify <ziel>`;
  `factory-extract.rules` (einzige Umschreibregel, von `run` und `qualify` gelesen);
  `factory-extract.allow` (Erlaubt-Liste E-Mail-Muster); `factory-extract.gitleaksignore`
  (begründete gitleaks-Falsch-Positive, im Probelauf entstanden, ADR-Nachtrag nachgezogen);
  `factory-extract.trailers` (entfernt `Co-authored-by` mit persönlicher Adresse aus Messages) und
  `factory-extract.gitleaks.toml` (gepinnte gitleaks-Konfiguration) aus dem Security-Review;
  Tests in `scripts/project/tests/factory-extract-tests.sh`.
- **Umschreibregel:** `#<ziffern>` (1–5 Ziffern) als ganzes Wort, ohne vorangehendes Wortzeichen,
  `/`, `.`, `-`, `&` und nicht nach `](` → `nothra/tch-gastro-services#<ziffern>`. Gegenbeispiele
  getestet: schon qualifiziert, Farbcodes `#1e40af`/`#333333`, `&#8212;`, Sprunganker
  `](#12-x)`, `#!`, String-Fixture `"Closes #42"` in Shell-Code (bleibt, `qualify` fasst in `*.sh`
  nur Kommentarzeilen an).
- **TDD:** `paths` gegen Fixture-Repo mit Umbenennung (Altpfad muss erscheinen, fremde Datei
  nicht); Regel über `python3 re` (gleiches Regex-Dialekt wie `filter-repo --replace-message`),
  ohne `filter-repo`; `verify`/`scan` gegen präparierte Fixture-Repos, `gitleaks` als Stub im `PATH`
  – auch „Stub meldet Fund"/„Stub fehlt" (fail-closed). `filter-repo` läuft in keinem Test/CI.
- **Probelauf** braucht lokal `git-filter-repo` und `gitleaks` (z. B. `brew install`) – Installation
  vorher mit dem Entwickler abstimmen. Ziel-Verzeichnis außerhalb des Repos (Scratchpad o. ä.),
  danach löschen. Nichts pushen, kein `gh repo create`.
- **Altpfade, die in TCH weiterleben** (`CLAUDE.md`, `.claude/settings.json`; `.gitignore` ist laut
  Probelauf keiner, s. Hinweise für T1b-2): kommen bewusst mit; im Probelauf-Bericht als erwartet
  ausweisen, nicht als A2-Verstoß.
- **Bash 3.2 / BSD-kompatibel** (macOS): `LC_ALL=C sort`, `shasum -a 256`, kein `sed -i` ohne
  Suffix-Argument, Zeichenklassen in BSD-`awk` per `index()`.
- **Lessons:** `docs/factory/lessons/testing.md` (Fixture-Git-Identität, Messung brechen statt
  Input #319, Mutationsbeleg), `factory-workflow.md` (Wegwerf-Dateien sofort löschen, `-c
  user.email` bei Commits), `docs/factory/guidelines/bash-gotchas.md`.
- `docs/routes.md` unberührt (keine Route). Label `factory-pipeline` passt (Pfade `scripts/`).

## Probelauf-Bericht (B3, 2026-10-23)

Ablauf: `factory-extract.sh run` → `verify` → `scan` gegen ein Ziel im Session-Scratchpad (außerhalb
des Repos), danach gelöscht. Nichts gepusht, kein `gh repo create`. Der Lauf ging vom gemergten
TCH-`main` aus (lokales `main` == `origin/main` geprüft) – also **ohne** den ADR-063-Nachtrag dieses
Branches; der ändert nur eine bestehende Datei, Pfadliste und Altpfade bleiben dieselben.

| Kennzahl | Wert |
|---|---|
| TCH-Commit (Quelle) | `b5d0cd91903d1132977ada3ac2949683c38c1d66` |
| Commits (nach dem Herauslösen) | 123 (von 184 in TCH; 61 ohne Factory-Pfad entfallen) |
| Dateien im Ziel (HEAD) | 113 = 111 Factory-Dateien + `CLAUDE.md`, `.claude/settings.json` (erwartet, s. u.) |
| Pfade in der Liste (A1) | 142 = 111 Factory-Dateien + 31 Altpfade |
| git | 2.54.0 (Apple Git-157) |
| git-filter-repo | a40bce548d2c (Homebrew) |
| gitleaks | 8.30.1 (Homebrew) |
| python3 | 3.9.6 |

| Prüfung | Ergebnis | Details |
|---|---|---|
| A2 | ✓ | 142 Pfade in der Historie, alle in der Liste, keiner unter `app/`, `db/`, `lib/`, `tasks/`, `e2e/`, `scripts/project/`, `docs/specs/`, `docs/project/` |
| A3 | ✓ | alle 111 Factory-Dateien: `--follow` reicht im Ziel über dieselben Namen wie in TCH; 31 mit Altpfad. Stichprobe: ADR-019 8 Commits bis 2026-07-13 (← `docs/adr/019-…`), `FACTORY.md` 18 Commits bis 2026-07-08 (← `CLAUDE.md`), `.claude/settings.factory.json` 7 Commits bis 2026-07-08 (← `.claude/settings.json`) |
| A4 | ✓ | keine Message mit unqualifiziertem `#<nr>`; 122 von 123 Messages tragen `nothra/tch-gastro-services#<nr>` (der Initial-Commit hat keinen Verweis) |
| A5 | ✓ | 123 Commits mit unverändertem Autor, Autor-Datum und Commit-Datum (gegen die commit-map von filter-repo) |
| B1 | ✓ | gitleaks über alle Commits: kein Fund nach Ausnahme **eines** Falsch-Positivs (s. u.) |
| B2 | ✓ | 8 Adressen in allen Blobs, alle in der Erlaubt-Liste (s. u.) |
| X2 | ✓ | Arbeitsklon danach unverändert (`git status` leer, `origin` unverändert); das Ziel hat keinen Remote mehr (filter-repo entfernt `origin`) |

**Befunde aus dem ersten Scan und wie sie aufgelöst sind:**
- **B1 – ein gitleaks-Fund, Falsch-Positiv:** `generic-api-key` in `scripts/checks/tests/run-tests.sh:280`
  (Initial-Commit `5fbdaf2`): die absichtlich angelegte Fixture `api_key = "…"` des
  Credential-Check-Regressionstests von `pre-commit.sh`. Ausgenommen per Fingerprint in
  `scripts/project/factory-extract.gitleaksignore` (mit Begründung), damit `scan` reproduzierbar mit
  Exit 0 endet statt dauerhaft rot zu sein.
- **B2 – sechs Adressen außerhalb der ersten Erlaubt-Liste, alle Test-Fixtures:**
  `anon@example.invalid` (`otel-console-sample.txt`, `run-tests.sh`), `opfer@`/`opfer2@`/`opfer3@`/
  `opfer4@angreifer.example` und `test@test.com` (`run-tests.sh`). `.invalid`/`.example` sind
  reservierte Test-TLDs (RFC 2606); `test@test.com` ist eine Fixture-Identität. Erlaubt-Liste
  `scripts/project/factory-extract.allow` entsprechend ergänzt (je mit Begründung). Keine Adresse
  einer realen Person in Datei-Inhalten.

**Nachlauf nach dem Security-Review (2026-10-23, gleicher TCH-Commit `b5d0cd9`):** `run` entfernt
jetzt `Co-authored-by`-Trailer mit persönlicher Adresse (Entscheidung des Entwicklers; vorher 4×
dm-Adresse mit Personalnummer in der herausgelösten Historie), `scan` prüft zusätzlich alle
Commit-/Tag-Messages und scannt gitleaks-seitig einen Klon ohne Arbeitsbaum mit gepinnter
Konfiguration. Ergebnis mit den echten Werkzeugen: A2–A5 ✓ (123 Commits, Autor/Datum unverändert),
B1 ✓ (derselbe eine Falsch-Positiv – der Initial-Commit trägt keinen Trailer, sein Hash bleibt),
**B1 Messages ✓**, B2 ✓ (8 Adressen), **B2 Messages ✓** (1 Adresse: `noreply@anthropic.com`); in den
Messages bleiben nur noreply-Trailer. Gegenprobe W1: eingeschleustes `ghp_…`-Token plus
`.gitleaks.toml`/`.gitleaksignore` im Ziel und gesetztes `GITLEAKS_CONFIG` → B1 ✗ (wird erkannt).

**Hinweise für T1b-2 (#436):**
- `CLAUDE.md` und `.claude/settings.json` kommen als Altpfade mit ihrer TCH-Fassung ins Ziel (ADR-063
  Nachtrag) – erwartet, kein A2-Verstoß; der Bootstrap-PR ersetzt sie.
- `.gitignore` ist **kein** `--follow`-Altpfad von `docs/factory/gitignore.factory` (Git erkennt die
  Aufteilung in #431 nicht als Umbenennung) und kommt daher nicht mit; der ADR-Nachtrag ist im
  Review-Rework entsprechend korrigiert.
- Der Fingerprint in `factory-extract.gitleaksignore` hängt am Commit-Hash im Ziel, und der hängt an
  Pfadliste, Umschreibregel und filter-repo-Version. Kommt bis T1b-2 eine Factory-Datei oder ein
  Altpfad hinzu, der schon in früheren Commits existierte, ändern sich auch deren Hashes – dann
  meldet `scan` den Fund erneut, und nur der Fingerprint ist nachzuziehen.
- `qualify` aus dem TCH-Klon gegen den Pfad des Factory-Klons aufrufen
  (`bash scripts/project/factory-extract.sh qualify <factory-klon>`); Grenzen, die die Durchsicht im
  Bereinigungs-PR abfangen muss:
  - Falschtreffer bei Abschnittsnummern wie `ADR-009 #7` oder `bash-gotchas #3` (9 Stellen in
    `*.md`/`*.sh`, Stand Review 2026-10-23) – zurückdrehen;
  - YAML-Kommentare (`factory-ci.yml`, `factory-poll.yml`, `factory.defaults.yml`,
    `factory.config.yml.example`, zusammen ~21 `#<nr>`) fasst `qualify` nicht an – von Hand
    qualifizieren;
  - drei- bis fünfstellige Ziffern-Farbcodes (`#000`) würden umgeschrieben (heute 0 im Bestand).
- Für den C3-Rest-Grep (nicht `qualify`, das `*.tsv` gar nicht anfasst): das Fixture
  `scripts/checks/tests/fixtures/lessons-split-426.tsv` (173 Zeilen mit Treffern) bleibt Fixture
  und ist als erlaubte Stelle zu dokumentieren.
- `run` vergleicht `main` mit dem lokal bekannten `origin/main` – vorher `git fetch`, sonst gilt ein
  veralteter Stand als „gemergt". Prüfen, dass der ADR-063-Nachtrag dieser Task auf `main` liegt.
- Die Umschreibregel wurde im Review-Rework (Anker, Entities, Ziffern-Farbcodes) geändert. Gegen
  alle 184 Commit-Messages von `origin/main` liefert die neue Regel dasselbe Ergebnis wie die des
  Probelaufs; A4 und der gitleaks-Fingerprint aus dem Probelauf bleiben damit gültig.

## Test-Abdeckung (/test, 2026-10-23)

Coverage misst das Projekt nur für die App (Vitest); dieser Diff ist reines Bash, die App-Gates
(`pnpm test`, Typecheck) laufen unverändert im Pre-Push mit. Vollständigkeit deshalb über AK ↔ Test
(`scripts/project/tests/factory-extract-tests.sh`, 223 grün in der Projekt-Suite):

| AK / FS | Happy Path | Fehler- / Grenzfälle |
|---|---|---|
| A1 | Liste = `--list factory` + Altpfad, sortiert, zweiter Lauf gleich | Umbenennungskette (zwei Altpfade), Umlaut-Pfad ungequotet, App-Code/App-ADR nicht drin, leere Tabelle → Exit 2 ohne Teil-Liste |
| A4 / C3 | `qualify` + Regel: Satzende, Klammer/Komma-Liste, Kompositum, Shell-Kommentar | qualifiziert, Farbcodes, Entity, Sprunganker, `/ . - &` davor, `#!`, String-Fixture, Code mit Rest-Kommentar, YAML, Symlink, gequoteter Dateiname, idempotent, kein Repo / kein Verzeichnis / kaputter Index → Exit 2; A4 in `verify` |
| A2 / FS2 | sauberes Ziel | Pfad außerhalb der Liste; verbotener Bereich trotz Liste; je isoliert |
| A3 / FS3 | alle Factory-Dateien `--follow` gleich | Datei fehlt im Ziel; `--follow` reißt am Altpfad ab |
| A5 | identische commit-map | abweichender Autor; commit-map fehlt / ohne verbleibende Commits / mit unbekanntem Ziel-Commit → Exit 2 |
| B1 | kein Fund; Falsch-Positive mit Begründung im Bericht | Fund (Exit 1), gitleaks-Fehler (Exit 1), gitleaks fehlt / Liste fehlt / Eintrag ohne Begründung (Exit 2), Formatvarianten der Liste, 0 Falsch-Positive |
| B2 / FS1 | nur erlaubte Adressen | Adresse nur in altem Blob mit Datei genannt; Leerzeichen am Musterende; Liste fehlt (Exit 2) |
| B3 | Bericht: Versionen, TCH-Commit, Commits, Zeilen A2/B1/B2 | A2 ✗ im Bericht bei sonst sauberem Scan |
| X2 | filter-repo läuft im frischen Klon mit Pfadliste + Regel; Arbeitsklon unberührt | Ziel existiert, filter-repo fehlt / scheitert (Hinweis „halbes Ziel"), `main` ≠ `origin/main`, kein `main` → Exit 2 |
| X1 | – (Prozess-Kriterium, per `ownership-check.sh` gegen den Diff geprüft, s. Review) | – |

Aufruf mit falschen Argumenten → Exit 2. Einziger Produktionscode in `/test`: der vom Entwickler
mitbestellte Fix des `qualify`-Fail-open aus Review-Iteration 3 (Test zuerst rot: kaputter Index → Exit 0).

## Refactoring (/refactor, 2026-10-23)

Kein neues Verhalten, Projekt-Suite vor und nach identisch grün (223). Aus den offenen Nitpicks
von Review-Iteration 3:
- `trim_lines` als gemeinsamer Helfer von `list_entries` und `ignored_with_reasons` – die gleiche
  Lesart beider Listen-Dateien steht jetzt im Code statt nur im Kommentar; `ignored_with_reasons`
  trimmt die Datei einmal statt je Zeile einen `sed`-Prozess zu starten.
- B1-Berichtszeile: ein Zweig mit Suffix „, Liste unten" statt zwei fast gleicher Texte.
- Kopfkommentar von `print_scan_report` nennt auch die gelesene Konfiguration.
- Doku: ADR-Nachtrag präzisiert, dass die PR-Diff-Durchsicht nur für den Inhalt greift; T1b-2-
  Hinweis zum Fixture `lessons-split-426.tsv` als C3-Hinweis statt `qualify`-Grenze.
Bewusst nicht umgesetzt: mehrfache Leerzeichen/Tab nach `#` in Begründungen zu kürzen – das wäre
neues Verhalten (sichtbar im Bericht), kein Refactoring.

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
