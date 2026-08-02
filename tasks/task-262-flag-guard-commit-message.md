# Task 262: flag-guard-commit-message

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Flag-Guard gegen versehentliche Commit-Messages, die wie ein CLI-Flag aussehen
(`--help`, `-h`) – sowohl über einen neuen `commit-msg`-Git-Hook (greift
unabhängig vom Aufrufpfad) als auch über ein explizites `-h|--help`-Guard in
`scripts/factory-commit.sh`. Details, Root-Cause-Recherche und Scope-Abgrenzung
in [`docs/specs/spec-262-flag-guard-commit-message.md`](../docs/specs/spec-262-flag-guard-commit-message.md).

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [ ] GIVEN der `commit-msg`-Hook ist installiert WHEN `git commit -m "fix: foo"` (reguläre Message) ausgeführt wird THEN wird der Commit wie bisher angelegt.
- [ ] GIVEN der `commit-msg`-Hook ist installiert WHEN `git commit -m "--help"` oder `git commit -m "-h"` ausgeführt wird THEN lehnt der Hook fail-closed ab (kein Commit).
- [ ] GIVEN eine Commit-Message, die mit `-` beginnt, aber nicht `--help`/`-h` ist (z. B. `-x`) WHEN committet wird THEN bleibt das bisherige Verhalten erhalten (keine Ablehnung).
- [ ] GIVEN `scripts/factory-commit.sh -h`/`--help` wird aufgerufen WHEN das Skript läuft THEN nur Usage-Meldung, Exit 0, kein `git add`/`commit`/`push`.
- [ ] GIVEN `scripts/factory-commit.sh` mit regulärer, nicht-leerer Message (kein `-h`/`--help`) WHEN das Skript läuft THEN Verhalten wie bisher (Regressionstest).
- [ ] GIVEN `scripts/factory-commit.sh` mit anderem `-`-präfigiertem Argument (z. B. `-x`) WHEN das Skript läuft THEN wie jede andere Message behandelt (kein Sonderfall).
- [ ] GIVEN ein Repo WHEN `bash scripts/install-hooks.sh` ausgeführt wird THEN sind `pre-commit`/`pre-push`/`commit-msg` installiert; wiederholter Aufruf ist idempotent.
- [ ] GIVEN `scripts/init-factory.sh` für ein neues Projekt WHEN Hook-Installation läuft THEN ist `commit-msg` Teil der installierten Hooks.
- [ ] GIVEN Commit-Message-Datei beim `commit-msg`-Hook nicht lesbar WHEN `commit-msg-check.sh` läuft THEN fail-closed Abbruch.
- [ ] GIVEN eine leere Commit-Message WHEN committet wird THEN bestehende Leer-Prüfung bleibt unverändert wirksam.

## Technische Notizen
ADR-042 (`docs/adr/042-hook-installation-single-source.md`): `scripts/install-hooks.sh`
ist die einzige Quelle für Hook-Inhalt (`pre-commit`/`pre-push`/`commit-msg`), idempotent,
beliebig oft ausführbar. `scripts/init-factory.sh` ruft für Schritt 5 nur noch
`bash scripts/install-hooks.sh` auf (keine eigenen Heredocs mehr). Für dieses Repo:
`scripts/install-hooks.sh` nach Merge einmalig manuell ausführen (kein Auto-Aufruf durch
`start-work.sh`, siehe Spec).

`commit-msg-check.sh` und `factory-commit.sh` behalten die Literale `--help`/`-h`
unabhängig voneinander (keine gemeinsame Flag-Liste extrahieren – Over-Engineering für
zwei Zeilen an zwei unterschiedlichen Grenzen, siehe ADR-042 „Bewusst nicht extrahiert").
Matching: exakter Vergleich des getrimmten Inhalts gegen `--help`/`-h` (kein Regex nötig,
keine BSD/GNU-Portabilitätsfallen).

## Offene Fragen
- [x] Code-Duplikation zwischen `scripts/install-hooks.sh` und dem Hook-Block in `scripts/init-factory.sh` – entschieden in ADR-042: `init-factory.sh` ruft `install-hooks.sh` auf.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/262-flag-guard-commit-message`
Erstellt: 2026-08-02 12:11
