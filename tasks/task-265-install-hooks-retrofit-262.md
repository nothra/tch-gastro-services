# Task 265: install-hooks-retrofit-262

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Spec: `docs/specs/spec-265-hooks-installed-check.md`.

Aus Issue #265 (Review-Finding zu #262, ADR-042 §Consequences). Punkt 1 des Issues
(einmaliger Retrofit-Lauf von `bash scripts/install-hooks.sh`) ist bereits erledigt –
verifiziert per erneutem idempotenten Lauf (keine „wird ersetzt"-Warnung für
`pre-commit`/`pre-push`/`commit-msg`). Scope dieser Task ist ausschließlich Punkt 2: ein
neuer **fail-closed** Check in `scripts/checks/pre-push.sh`, der verifiziert, dass alle
drei Factory-Hooks im gemeinsamen Git-Verzeichnis vorhanden und ausführbar sind – ohne
Inhaltsvergleich gegen `install-hooks.sh` und ohne Sonderbehandlung von `core.hooksPath`
(siehe Spec „Nicht inbegriffen").

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [x] GIVEN alle drei Factory-Hooks (`pre-commit`, `pre-push`, `commit-msg`) sind im
      gemeinsamen `.git/hooks`-Verzeichnis vorhanden und ausführbar WHEN
      `scripts/checks/pre-push.sh` läuft THEN meldet der neue Check Erfolg und blockiert
      den Push nicht (aus diesem Grund).
- [x] GIVEN mindestens einer der drei Hooks fehlt im gemeinsamen Git-Verzeichnis (z. B.
      `commit-msg` wurde nie installiert) WHEN `scripts/checks/pre-push.sh` läuft THEN
      schlägt der Check fehl, der Push wird blockiert (Exit ≠ 0), und die Fehlermeldung
      nennt den fehlenden Hook-Namen sowie `bash scripts/install-hooks.sh` als
      Remediation-Befehl.
- [x] GIVEN einer der drei Hooks existiert als Datei, ist aber nicht ausführbar (z. B.
      nach `chmod -x`) WHEN der Check läuft THEN wird er wie ein fehlender Hook behandelt
      (gleiche Fehlerbehandlung) – reine Existenzprüfung ohne Ausführbarkeits-Check reicht
      nicht.
- [x] GIVEN der Check läuft aus einem beliebigen Git-Worktree dieses Repos (nicht nur dem
      Haupt-Arbeitsbaum) WHEN er das Hook-Verzeichnis bestimmt THEN verwendet er das
      **gemeinsame** Git-Verzeichnis (`git rev-parse --git-common-dir`), konsistent mit
      `install-hooks.sh` (ADR-042) – nicht ein worktree-lokales `.git`.
- [x] GIVEN mehrere Hooks fehlen gleichzeitig WHEN der Check läuft THEN werden alle
      betroffenen Hook-Namen in der Fehlermeldung genannt (nicht nur der erste gefundene).
- [x] Fehlerszenario: `.git/hooks`-Verzeichnis existiert im gemeinsamen Git-Verzeichnis
      noch gar nicht (Retrofit nie durchgeführt) → alle drei Hooks gelten als fehlend,
      Push blockiert.
- [x] Fehlerszenario: `git rev-parse --git-common-dir` schlägt fehl (kein Git-Repository)
      → Check verhält sich fail-closed (kein stiller Erfolg).

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
- Neues Skript `scripts/checks/hooks-installed-check.sh` (Muster wie
  `routes-doc-check.sh`): ermittelt `git rev-parse --git-common-dir` (relativ → gegen
  `FACTORY_DIR`/Projektwurzel aufgelöst, analog `install-hooks.sh`), prüft je Hook
  `-f && -x`, sammelt fehlende/nicht-ausführbare Hooks in einer Liste und meldet sie
  gesammelt mit Remediation-Befehl `bash scripts/install-hooks.sh`. Kein Git-Repo →
  Exit 1 (fail-closed), kein Inhaltsvergleich gegen `install-hooks.sh` (Spec-Scope).
- In `scripts/checks/pre-push.sh` als neuer „Check 5" verdrahtet (Branch-Check zu
  „Check 6" verschoben); Aufruf-Ausgabe über Kommandosubstitution eingefangen
  (`if VAR="$(...)"; then` statt Umleitung in eine Datei) – unter `set -e` in
  `pre-push.sh` darf eine reine Zuweisung mit fehlschlagender Subshell nicht
  außerhalb einer `if`-Bedingung stehen, sonst bricht das Skript sofort ab.
- Tests in `scripts/checks/tests/run-tests.sh` (#265-Abschnitt, 22 Assertions):
  deckt alle sieben Akzeptanzkriterien inkl. Worktree-Fall (`git worktree add`) und
  Diskriminierung (vorhandener Hook wird NICHT als fehlend gelistet) ab. Gesamte Suite:
  774/774 grün. `pnpm lint` und `pnpm format:check` grün (keine TS/JS-Änderung).
- **`/test`-Durchlauf:** Coverage-Schwelle (Vitest, 80 %) ist nicht anwendbar – diese
  Task ändert ausschließlich Bash-Skripte, keine TS/JS-Zeilen. Test-Vollständigkeit
  stattdessen gegen die 7 Spec-ACs + Boundary-Werte geprüft; einen zusätzlichen
  Boundary-Test ergänzt (Hook-Name existiert als **Verzeichnis** statt regulärer Datei –
  ein Verzeichnis ist über `[ -x ]` fast immer „ausführbar", ohne den `-f`-Test würde es
  fälschlich als installierter Hook durchgehen). Regressionsfähigkeit des neuen Tests
  gegen eine bewusst kaputte Check-Variante (nur `-x`, kein `-f`) verifiziert – dort
  schlägt der Test wie erwartet fehl.
- **CI-Regression nach dem Push behoben (User-Meldung: „Factory-CI/factory-self-test
  meldet Fehler"):** Der bestehende `#149`-Test (`run_prepush_149` in `run-tests.sh`,
  Zeile ~2608) ruft `pre-push.sh` ECHT gegen das reale `FACTORY_DIR` auf (kein isoliertes
  Fixture-Repo). Ein frischer CI-Checkout hat – anders als dieser lokale Worktree – NIE
  installierte Hooks (git hooks laufen in CI ohnehin nie); dadurch schlug der neue
  Check 5 (`hooks-installed-check.sh`) dort IMMER fehl und riss zwei Format-Gate-Testfälle
  mit (erwartet exit 0, tatsächlich exit 1). Root-Cause per Repro bestätigt: lokales
  Entfernen der eigenen Hooks reproduzierte exakt dasselbe CI-Fehlerbild; nach Wieder-
  installation wieder grün. **Fix:** `.github/workflows/factory-ci.yml` installiert im
  `factory-self-test`-Job jetzt die Hooks (`bash scripts/install-hooks.sh`) vor der
  Self-Test-Suite – der CI-Checkout erfüllt damit dieselbe Invariante, die ein
  korrekt aufgesetzter lokaler Clone laut README/CLAUDE.md ohnehin erfüllen muss.
  Neuer Wiring-Test (Job-Block-Extraktion + Reihenfolge-Assertion, RED→GREEN verifiziert
  inkl. Gegenprobe mit vertauschter Reihenfolge) verhindert ein Wiederauftreten. Suite:
  777/777 grün.

## Offene Fragen
- [x] Implementierungsdetail (keine ADR nötig, in `/implement` zu entscheiden): neuer
      Check als Block direkt in `pre-push.sh` oder als eigenes Skript
      `scripts/checks/hooks-installed-check.sh` (Muster wie `routes-doc-check.sh`).
      Empfehlung: eigenes Skript – isoliert testbar, passt zum bestehenden Muster.
      → Entschieden: eigenes Skript, wie empfohlen.

## Review-Findings
<!-- Wird durch /review befüllt -->
Siehe `tasks/review-265.md` – ursprünglich NEEDS_REWORK (1 Wichtig-Finding: fehlende
Git-Identität im Testfixture `hi_repo()`, run-tests.sh). Im zweiten `/implement`-Durchlauf
behoben (RED→GREEN mit künstlich identitätsloser Umgebung verifiziert) → APPROVED.
Out-of-Scope-Finding zu `core.hooksPath` als Issue
[#268](https://github.com/nothra/tch-gastro-services/issues/268) angelegt (bleibt offen,
nicht Teil dieser Task).

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `improvement/265-install-hooks-retrofit-262`
Erstellt: 2026-08-02 17:08
