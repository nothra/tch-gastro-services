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
- [ ] B1 gitleaks über alle Commits + Messages: kein Fund (Falsch-Positive einzeln belegt)
- [ ] B2 E-Mail-Scan: nur Treffer aus der Erlaubt-Liste
- [ ] B3 Scan-Bericht in dieser Datei und im PR-Body #439
- [ ] B4 Bootstrap-Push erst nach ausdrücklicher Freigabe im Chat
- [ ] C1 Begriffs-Grep im Factory-Repo nur an dokumentierten erlaubten Stellen
- [ ] C2 Bereinigung ändert nur Wortlaut/Beispiele; Self-Tests grün
- [ ] C3 Jeder TCH-Verweis qualifiziert (`nothra/tch-gastro-services#<nr>`)
- [ ] D1 Repo öffentlich, Inhalt + README mit Herkunftshinweis
- [ ] D2 Eigene `factory.config.yml`, `CLAUDE.md`, `PROJECT-CONTEXT.md`, `OWNERSHIP.md`
- [ ] D3 CI grün (`factory-self-test`, `config-validation`, `pr-closes-issue`, `lint`); Self-Tests angepasst, nicht übersprungen
- [ ] D4 Ruleset `protect-main` unmittelbar nach dem Push; Direkt-Push wird abgelehnt
- [ ] D5 Frischer Klon: `install-hooks.sh` + lokale Gates grün ohne pnpm/Node/DB
- [ ] E1 Alle Art-/Aspekt-Labels im Factory-Repo vorhanden
- [ ] E2 Wegwerf-Probe `start-work.sh` (Issue, Branch, Worktree, Task-Datei, Draft-PR) und Aufräumen
- [ ] F1 Tag `v0.6.0` + Release mit Notes (inkl. „Breaking")
- [ ] F2 Release-Manifest `factory-release.json`, Hashes stimmen mit dem Tag überein
- [ ] F3 `CHANGELOG.md`-Eintrag und `FACTORY.md`-Version = `v0.6.0`
- [ ] X1 TCH-Diff dieser Task ändert keine Factory-Datei (nur Spec, Task-Datei)
- [ ] X2 Herauslösen auf frischem Klon; Arbeitsklon/`origin`/TCH-GitHub unberührt

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

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `chore/436-factory-nach-dev-factory-pushen-v060`
Erstellt: 2026-10-23 23:03
