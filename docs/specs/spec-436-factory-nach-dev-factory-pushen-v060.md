# Spec: Factory nach `nothra/dev-factory` pushen, bereinigen, `v0.6.0` (T1b-2)

> **Umsetzungs-Spec zu Teil-Task T1b-2** des Epics #424. Der **AK-Volltext** steht unverändert in
> [spec-427](spec-427-factory-nach-dev-factory-herausloesen.md) (Abschnitte A–F, X, FS1–FS6) –
> hier steht er bewusst **nicht** ein zweites Mal (eine Quelle, kein Drift). Diese Spec legt fest,
> *welche* AK T1b-2 trägt, in *welcher Reihenfolge* und womit sie belegt werden, und hält die
> Übergaben aus T1b-1 (#427, gemergt) fest. Technische Grundlage:
> [ADR-063](../factory/adr/063-factory-eigenes-repo-vendored-manifest.md) D5, D6, D9 und
> Nachtrag 2026-10-23 (Q1–Q6).

## Kontext

T1b-1 (#427) hat das Herauslöse-Werkzeug (`scripts/project/factory-extract.sh`, Befehle `paths`,
`run`, `verify`, `scan`, `qualify`) samt Tests und einem Probelauf geliefert – **ohne Push**.
T1b-2 führt den echten Lauf aus dem **gemergten** TCH-`main` aus, veröffentlicht die Historie in
`nothra/dev-factory` (öffentlich, **nicht rückholbar**), macht das Repo arbeitsfähig und gibt
`v0.6.0` frei. Danach kann T2 (#428) TCH auf diese Version umstellen.

Die Arbeit liegt überwiegend im **Factory-Repo** (dortige Issues/PRs). Diese TCH-Task hält Spec,
Scan-Bericht und Abschlussbericht.

## Scope

**Inbegriffen:** AK **A2, A3, A5, B1–B4, C1–C3, D1–D5, E1–E2, F1–F3, X1, X2** und die
Fehlerszenarien FS1–FS6 aus spec-427 (A1 und A4 sind in T1b-1 mit Tests belegt; im echten Lauf
werden sie über `run`/`verify` erneut geprüft und im Scan-Bericht ausgewiesen).

**Nicht inbegriffen:** wie spec-427 „Nicht inbegriffen" (T2 #428, T3 #429, keine Änderung an
Factory-Dateien im TCH-Repo, keine Bereinigung alter Historienstände, kein ShellCheck-Gate, keine
neuen Factory-Funktionen).

## Ablauf (strikt, jeder Schritt erst nach dem vorherigen)

| # | Schritt | Ort | AK | Freigabe nötig |
|---|---|---|---|---|
| 1 | Vorbedingung prüfen: `git fetch`, ADR-063-Nachtrag liegt auf `origin/main`, Werkzeuge (`git-filter-repo`, `gitleaks`) vorhanden | TCH | X2 | – |
| 2 | `run` auf frischem Klon, danach `verify` (A1–A5) | lokal, außerhalb des Repos | A2, A3, A5 | – |
| 3 | `scan` → Scan-Bericht in Task-Datei + PR-Body des TCH-PR | lokal / TCH | B1–B3 | – |
| 4 | **Freigabe im Chat** zum Bootstrap-Push (Bericht liegt vor, kein offener Fund) | Chat | B4 | **ja, ausdrücklich** |
| 5 | Repo `nothra/dev-factory` öffentlich anlegen, Bootstrap-Push (`--no-verify`), **sofort** Ruleset `protect-main` | GitHub | D1, D4 | ja (Schritt 4) |
| 6 | Bootstrap-PR (Factory-Issue #1): eigene `factory.config.yml`, `CLAUDE.md`, `PROJECT-CONTEXT.md`, `OWNERSHIP.md`, `settings.json`/`.gitignore`, `ci.yml`, `release.yml`, README, Labels | Factory-Repo | D1–D3, D5, E1 | – |
| 7 | Bereinigungs-PR: `qualify` + Begriffs-Bereinigung (ADRs/Lessons nur Wortlaut) | Factory-Repo | C1–C3 | – |
| 8 | Wegwerf-Probe `start-work.sh` im Factory-Repo, danach Aufräumen | Factory-Repo | E2 | – |
| 9 | Release-PR (Versionszeile, `CHANGELOG.md`), Tag `v0.6.0` auf `main`, `release.yml` erzeugt Release + `factory-release.json` | Factory-Repo | F1–F3 | Tag setzt der Mensch |
| 10 | Abschlussbericht in Task-Datei; `X1` am TCH-Diff belegen | TCH | X1 | – |

Läuft manuell in **Stage 2**, nicht über `run-pipeline.sh` (spec-427 „Arbeitsweise").

## Übergaben aus T1b-1 (Pflichtlektüre für die Umsetzung)

- `CLAUDE.md` und `.claude/settings.json` kommen als **Altpfade mit ihrer TCH-Fassung** ins Ziel
  (erwartet, kein A2-Verstoß); der Bootstrap-PR ersetzt sie. `.gitignore` kommt **nicht** mit und
  wird aus den eigenen Fragmenten neu zusammengesetzt.
- Der gitleaks-Fingerprint in `factory-extract.gitleaksignore` hängt am Commit-Hash im Ziel. Meldet
  `scan` den bekannten Falsch-Positiv (`scripts/checks/tests/run-tests.sh:280`, `generic-api-key`)
  unter neuem Hash erneut, ist **nur der Fingerprint nachzuziehen** – jeder weitere Fund gilt als
  echt (FS1).
- `qualify` rufen wir aus dem TCH-Klon gegen den Factory-Klon auf. Durchsicht im PR-Diff muss
  abfangen: Abschnittsnummern (`ADR-009 #7`, `bash-gotchas #3`, 9 Stellen) zurückdrehen;
  YAML-Kommentare (~21 `#<nr>` in `factory-ci.yml`, `factory-poll.yml`, `factory.defaults.yml`,
  `factory.config.yml.example`) von Hand qualifizieren.
- Fixture `scripts/checks/tests/fixtures/lessons-split-426.tsv` (173 Treffer) bleibt Fixture und
  ist in `PROJECT-CONTEXT.md` des Factory-Repos als **erlaubte Stelle** zu dokumentieren (C1/C3).
- `run` vergleicht `main` mit dem lokal bekannten `origin/main` – vorher `git fetch`.

## Belege je Schritt (testbar, keine Zusicherung ohne Beleg)

- **Schritt 2/3:** Ausgabe von `verify` und `scan` wörtlich im Scan-Bericht (Werkzeug-Versionen,
  TCH-Ziel-Commit, Anzahl Commits/Dateien, B1, B2, A2).
- **Schritt 5:** `gh repo view` (Sichtbarkeit `PUBLIC`), `gh api repos/nothra/dev-factory/rulesets`;
  D4 per Probe: Direkt-Push auf `main` wird abgelehnt (Ausgabe festhalten).
- **Schritt 6/7:** grünes CI des jeweiligen PR; C1-Grep über alle Dateien mit dokumentierten
  Ausnahmen, Ausgabe im Abschlussbericht.
- **Schritt 8:** Nummern von Issue/Branch/PR der Probe und ihr Aufräumen im Abschlussbericht.
- **Schritt 9:** Tag, Release-URL, Manifest-Asset; Hash-Stichprobe gegen `git show v0.6.0:<pfad>`.

## Offene Fragen

- [ ] **Q1** Wann wird der TCH-PR #439 gemergt? Die Task-Datei muss laut Guardrail **vor dem Merge**
  abgeschlossen sein, die Arbeit im Factory-Repo (inkl. Release) endet aber erst danach.
  Vorschlag: #439 bleibt Draft, bis `v0.6.0` steht; Merge erst mit vollständigem Abschlussbericht.
  → Entscheidung Entwickler.
- [ ] **Q2** Bei einem **echten** Fund aus B1/B2 (FS1): Ausschluss oder Umschreiben entscheidet der
  Entwickler im Chat – kein Default. (Nur zur Kenntnis; keine Vorabentscheidung nötig.)
- [ ] **Q3** Soll `shellcheck` (heute lokal nicht installiert) als Folge-Issue im Factory-Repo
  angelegt werden (ADR-063-Nachtrag: „folgt als Issue")? Vorschlag: ja, nach `v0.6.0`.
