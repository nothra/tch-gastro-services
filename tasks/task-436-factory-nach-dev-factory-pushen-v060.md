# Task 436: factory-nach-dev-factory-pushen-v060

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Factory aus dem gemergten TCH-`main` mit Historie herauslösen, scannen, nach Freigabe im Chat nach
`nothra/dev-factory` (öffentlich) pushen, dort arbeitsfähig machen, bereinigen und `v0.6.0`
veröffentlichen (T1b-2 von Epic #424). AK-Volltext: `docs/specs/spec-427-…` (A–F, X); Ablauf und
Übergaben: `docs/specs/spec-436-factory-nach-dev-factory-pushen-v060.md`. Läuft manuell in Stage 2;
Arbeit überwiegend im Factory-Repo, diese Datei hält Scan- und Abschlussbericht.

## Akzeptanzkriterien
<!-- AK-Volltext in spec-427; hier nur die Checkliste von T1b-2 -->
- [x] A2 Keine Pfade außerhalb der Pfadliste in der herausgelösten Historie (`verify`)
- [x] A3 `git log --follow` reicht bei allen Altpfad-Dateien über die Umbenennung (Stichprobe ADR-019, `FACTORY.md`, `settings.factory.json`)
- [x] A5 Autor/Datum der Commits gegenüber TCH unverändert
- [x] B1 gitleaks über alle Commits + Messages: kein Fund (Falsch-Positive einzeln belegt)
- [x] B2 E-Mail-Scan: nur Treffer aus der Erlaubt-Liste
- [x] B3 Scan-Bericht in dieser Datei und im PR-Body #439
- [x] B4 Bootstrap-Push erst nach ausdrücklicher Freigabe im Chat
- [x] C1 Begriffs-Grep im Factory-Repo nur an dokumentierten erlaubten Stellen
- [x] C2 Bereinigung ändert nur Wortlaut/Beispiele; Self-Tests grün
- [x] C3 Jeder TCH-Verweis qualifiziert (`nothra/tch-gastro-services#<nr>`)
- [x] D1 Repo öffentlich, Inhalt + README mit Herkunftshinweis
- [x] D2 Eigene `factory.config.yml`, `CLAUDE.md`, `PROJECT-CONTEXT.md`, `OWNERSHIP.md`
- [x] D3 CI grün (`factory-self-test`, `config-validation`, `pr-closes-issue`, `lint`); Self-Tests angepasst, nicht übersprungen
- [x] D4 Ruleset `protect-main` unmittelbar nach dem Push; Direkt-Push wird abgelehnt
- [x] D5 Frischer Klon: `install-hooks.sh` + lokale Gates grün ohne pnpm/Node/DB
- [x] E1 Alle Art-/Aspekt-Labels im Factory-Repo vorhanden
- [x] E2 Wegwerf-Probe `start-work.sh` (Issue, Branch, Worktree, Task-Datei, Draft-PR) und Aufräumen
- [x] F1 Tag `v0.6.0` + Release mit Notes (inkl. „Breaking")
- [x] F2 Release-Manifest `factory-release.json`, Hashes stimmen mit dem Tag überein
- [x] F3 `CHANGELOG.md`-Eintrag und `FACTORY.md`-Version = `v0.6.0`
- [x] X1 TCH-Diff dieser Task ändert keine Factory-Datei (nur Spec, Task-Datei)
- [x] X2 Herauslösen auf frischem Klon; Arbeitsklon/`origin`/TCH-GitHub unberührt

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

## Offene Fragen
<!-- Quelle: spec-436 „Offene Fragen" -->
- [x] Q1 #439 bleibt Draft, bis `v0.6.0` steht (2026-10-23)
- [x] Q2 Umgang mit Scan-Fund (Entwickler entscheidet, FS1): Inline-Treffer in ADR-063 = Fließtext, Wortlaut im Factory-Repo ändern (2026-10-24)
- [x] Q3 ShellCheck-Folge-Issue im Factory-Repo nach `v0.6.0` (2026-10-23)

## Scan-Bericht (Schritt 2/3, 2026-10-24)
Frischer Klon von `main` (X2), `run` → `verify` → `scan`; kein Push erfolgt.

| Kennzahl | Wert |
|---|---|
| TCH-Commit (Quelle) | `f998473862f4e191ea26cd5fea7d0b755618ac48` |
| Commits / Dateien im Ziel / Pfade | 124 / 113 / 142 |
| Werkzeuge | git 2.54.0, git-filter-repo a40bce548d2c, gitleaks 8.30.1, python3 3.9.6 |

| Prüfung | Ergebnis | Details |
|---|---|---|
| A2 | ✓ | 142 Pfade in der Historie, alle in der Liste, keiner in einem verbotenen Bereich |
| A3 | ✓ | 111 Factory-Dateien, 31 mit Altpfad (u. a. ADR-019, ADR-003 … ADR-063): `--follow` reicht über die Umbenennung |
| A4 | ✓ | keine Commit-Message mit unqualifiziertem `#<nr>` |
| A5 | ✓ | 124 Commits mit unverändertem Autor und Datum |
| B1 Historie | ✓ | kein Fund; 1 bekannter Falsch-Positiv (`5fbdaf21…:scripts/checks/tests/run-tests.sh:generic-api-key:280`, Test-Fixture), Fingerprint unverändert gültig |
| B1 Messages | ✓ | kein Fund |
| B1 Inline-Ausnahmen | ✗ → Falsch-Positiv | `gitleaks:allow` in `docs/factory/adr/063-factory-eigenes-repo-vendored-manifest.md:371` (einziger Treffer, `git grep` im Ziel) |
| B2 Dateien / Messages | ✓ | 8 bzw. 1 Adresse(n), alle in der Erlaubt-Liste |

Restrisiko B2: erkennt ASCII-Adressen `name@domain.tld`; Umlaut-Domains, verschleierte Formen und komprimierte Dateien nicht.

**Q2/FS1-Entscheidung (Entwickler, 2026-10-24):** Der Inline-Treffer ist Fließtext der ADR („Jedes Inline-`gitleaks:allow` in Dateien oder Messages macht …"), keine Unterdrückung eines Fundes, in der Zeile steht kein Secret. Der Wortlaut wird im Factory-Repo nach dem Bootstrap-Push geändert (Bereinigungs-PR); die TCH-Quelle bleibt unverändert (X1).

## Bootstrap-Push (Schritt 4/5, 2026-10-24)
- Freigabe B4: ausdrücklich im Chat („Freigabe Bootstrap-Push"). Der Entwickler hat `nothra/dev-factory` selbst öffentlich angelegt (Klassifizierer blockte `gh repo create --public`); `gh repo view`: `PUBLIC`, leer.
- Push `main` (124 Commits, TCH-Quelle `f998473`) mit `--no-verify`.
- Ruleset `protect-main` (ID 25774138) unmittelbar danach: Pflicht-Checks `lint`, `factory-self-test`, `pr-closes-issue`, `config-validation`; nur Squash; kein Bypass; löschen/Force-Push gesperrt.
- D4-Probe (Leer-Commit direkt auf `main`): `remote: - Changes must be made through a pull request.` / `[remote rejected] main -> main (push declined due to repository rule violations)`.

## Abschlussbericht (2026-10-24)
Arbeit im Factory-Repo `nothra/dev-factory` (öffentlich), Release **v0.6.0** = `main` `72c1779` (CI grün).

| Schritt | Ergebnis |
|---|---|
| 6 Bootstrap | Issue #1, PR #2: eigene `factory.config.yml`, `CLAUDE.md`, `PROJECT-CONTEXT.md`, `OWNERSHIP.md`, Fragmente, README/CONTRIBUTING/CHANGELOG, `ci.yml` (Job `lint`); Labels angelegt (security, tech-debt, test, factory::*). Self-Tests angepasst (136 rot → 1654 grün), TCH-only-Tests entfernt (Liste im PR #2). |
| 7 Bereinigung | Issue #3, PR #4: `qualify` + Handarbeit (Abschnittsnummern `ADR-009 #7`, `bash-gotchas #3` u. a. zurückgedreht, YAML-Kommentare qualifiziert), ADR-063/-012/-037, `OPERATING.md`, Lessons-Beispiele neutralisiert, tote Links aufgelöst, C1-Guard in der Suite (C1-Grep: Treffer nur `PROJECT-CONTEXT.md:61-62` und `lessons-split-426.tsv:95`). |
| Fund | Die Suite als `commands.test` im pre-push-Hook eines Worktrees: `GIT_DIR` schlug in Wegwerf-Repos durch und beschädigte das Probe-Repo (Branch, Remote, Dateien); dabei entstanden 19 Test-Branches auf GitHub (gelöscht, Issues/PRs unberührt). Fix mit Test: Issue #6, PR #7. |
| 8 Probe E2 | `start-work.sh` im frischen Klon: Issue #8 (`enhancement`), Branch `chore/8-…`, Worktree, `tasks/task-8-…md`, Draft-PR #9 `Closes #8`; danach PR/Issue geschlossen, Branch, Worktree entfernt. Der Aufruf von `/requirements` ist **nicht** ausgeführt (nur Skill-Datei und Task-Datei als Voraussetzung belegt). Erster Versuch (Issue #5) scheiterte am Fund oben. |
| D5 | Frischer Klon: `install-hooks.sh`, `pre-commit.sh`, `pre-push.sh` grün mit PATH ohne pnpm/Node/Docker. |
| 9 Release | Issue #10, PR #11: `factory-release-manifest.sh`, `factory-release-check.sh`, `release.yml` (Tests zuerst); Issue #12, PR #13: Version `v0.6.0` + CHANGELOG (Neu/Breaking). Tag `v0.6.0` setzte der Entwickler; `release.yml` lief grün. Release mit Notes (### Neu, ### Breaking) und Asset `factory-release.json` (schema 1, 113 Dateien, commit `72c1779`). Hash-Prüfung: alle 113 Pfade gegen `git show v0.6.0:<pfad>` gleich (0 Abweichungen); Dateiliste == `OWNERSHIP.md` Seite factory am Tag; `FACTORY.md` = v0.6.0. |
| X1/X2 | TCH-Diff dieser Task: nur `docs/specs/spec-436-…md` und diese Task-Datei, keine Factory-Datei. Herauslösen lief auf frischem Klon (`run` → `verify` → `scan`); Arbeitsklon, `origin` und TCH-GitHub unberührt. |

**Offen / Folge:** Factory-Issue #14 (ShellCheck, Q3), #15 (sporadisch roter Test `#334 add-ok/commit-fehlgeschlagen`, ~2 von 8 lokalen Läufen); Lizenz des öffentlichen Repos ungeklärt (keine `LICENSE`). Abweichungen vom Spec-Ablauf: `release.yml` kam mit dem Manifest-Skript in einen eigenen PR (#11) statt in den Bootstrap-PR. `OPERATING.md` und Lessons verweisen auf `docs/project/betrieb.md` & Co. nur noch als Code-Span (Konvention des adoptierenden Projekts). `#<nr>` in Shell-Strings (Testnamen) bleibt unqualifiziert (Konvention in `PROJECT-CONTEXT.md`).

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `chore/436-factory-nach-dev-factory-pushen-v060`
Erstellt: 2026-10-23 23:03
