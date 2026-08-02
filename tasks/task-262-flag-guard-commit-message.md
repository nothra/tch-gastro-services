# Task 262: flag-guard-commit-message

## Status
- [x] In Bearbeitung
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
- [x] GIVEN der `commit-msg`-Hook ist installiert WHEN `git commit -m "fix: foo"` (reguläre Message) ausgeführt wird THEN wird der Commit wie bisher angelegt.
- [x] GIVEN der `commit-msg`-Hook ist installiert WHEN `git commit -m "--help"` oder `git commit -m "-h"` ausgeführt wird THEN lehnt der Hook fail-closed ab (kein Commit).
- [x] GIVEN eine Commit-Message, die mit `-` beginnt, aber nicht `--help`/`-h` ist (z. B. `-x`) WHEN committet wird THEN bleibt das bisherige Verhalten erhalten (keine Ablehnung).
- [x] GIVEN `scripts/factory-commit.sh -h`/`--help` wird aufgerufen WHEN das Skript läuft THEN nur Usage-Meldung, Exit 0, kein `git add`/`commit`/`push`.
- [x] GIVEN `scripts/factory-commit.sh` mit regulärer, nicht-leerer Message (kein `-h`/`--help`) WHEN das Skript läuft THEN Verhalten wie bisher (Regressionstest).
- [x] GIVEN `scripts/factory-commit.sh` mit anderem `-`-präfigiertem Argument (z. B. `-x`) WHEN das Skript läuft THEN wie jede andere Message behandelt (kein Sonderfall).
- [x] GIVEN ein Repo WHEN `bash scripts/install-hooks.sh` ausgeführt wird THEN sind `pre-commit`/`pre-push`/`commit-msg` installiert; wiederholter Aufruf ist idempotent.
- [x] GIVEN `scripts/init-factory.sh` für ein neues Projekt WHEN Hook-Installation läuft THEN ist `commit-msg` Teil der installierten Hooks.
- [x] GIVEN Commit-Message-Datei beim `commit-msg`-Hook nicht lesbar WHEN `commit-msg-check.sh` läuft THEN fail-closed Abbruch.
- [x] GIVEN eine leere Commit-Message WHEN committet wird THEN bestehende Leer-Prüfung bleibt unverändert wirksam.

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

### Notizen aus `/implement` (2026-08-02)

- **AK8 strukturell statt end-to-end getestet:** `init-factory.sh` ist interaktiv (`read`-Prompts)
  und nutzt `sed -i ''` (BSD-Syntax) – ein echter Bootstrap-Lauf wäre in CI (GNU) nicht portabel.
  Der Test prüft deshalb die *Delegation* an `install-hooks.sh` in beide Richtungen (ruft es auf
  **und** enthält keine `.git/hooks`-Referenz mehr). Dass die kanonische Quelle den
  `commit-msg`-Hook tatsächlich installiert, deckt der Verhaltenstest zu AK7 ab.
- **Kein zweiter Happy-Path für AK5:** Die Regression „reguläre Message committet und pusht wie
  bisher" ist bereits durch den bestehenden `factory-commit`-Fall 1 abgedeckt – keine parallele
  Schleife mit identischem Rumpf (Lesson #240/#251).
- **E2E-Hook-Tests neutralisieren `pre-commit`:** Im Wegwerf-Repo wird der `pre-commit`-Hook durch
  einen No-op ersetzt, damit ausschließlich der `commit-msg`-Pfad über Erfolg/Ablehnung
  entscheidet (`pre-commit.sh` ruft `pnpm lint` und existiert dort gar nicht) – sonst wäre der
  Test rot aus dem falschen Grund (Lesson #214).

### Gate-Verifikation (2026-08-02)

- `bash scripts/checks/tests/run-tests.sh`: **697 grün, 0 rot**; `bash scripts/checks/pre-commit.sh`
  (inkl. `pnpm lint`): grün. Keine UI-/Routen-Berührung → keine Oberflächen-/E2E-Verifikation nötig.
- **Umgebungsbedingter Fehlschlag ohne Bezug zu #262 (belegt, nicht behauptet):** Sind in der
  aufrufenden Shell `PR_SHEPHERD=true`/`FACTORY_STAGE=3` exportiert (so in der Session dieses
  Laufs), laufen 4 Assertions des `#212 W3`-E2E-Blocks rot – die Variable schlägt in das
  Wegwerf-Repo durch, `run-pipeline.sh` startet dort Phase 7 und bricht mit „Skill-Datei nicht
  gefunden: …/.claude/commands/pr-shepherd.md" ab, bevor die Endzustands-Verifikation greift.
  Nachweis nach Lesson #239/#244: (a) Diff-Scope dieses Branches berührt keinen Input des Blocks
  (`run-pipeline.sh`, `verify-final-state.sh`, `raise-interrupt.sh`, `factory.defaults.yml`
  unverändert), (b) identisch reproduziert gegen einen unveränderten `origin/main`-Worktree,
  (c) CI auf `main` ist grün (dort ist `PR_SHEPHERD` nicht gesetzt), (d) mit `unset PR_SHEPHERD`
  ist die Suite hier vollständig grün. Härtung (E2E-Block sollte `PR_SHEPHERD` explizit
  neutralisieren, statt es aus der Umgebung zu erben) ist **out of scope** für #262 → eigenes Issue.

**Offen (außerhalb dieses PRs):** `scripts/install-hooks.sh` muss nach dem Merge in diesem Repo
einmalig manuell ausgeführt werden, damit der `commit-msg`-Hook hier real scharf ist (ADR-042).

## Offene Fragen
- [x] Code-Duplikation zwischen `scripts/install-hooks.sh` und dem Hook-Block in `scripts/init-factory.sh` – entschieden in ADR-042: `init-factory.sh` ruft `install-hooks.sh` auf.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/262-flag-guard-commit-message`
Erstellt: 2026-08-02 12:11
