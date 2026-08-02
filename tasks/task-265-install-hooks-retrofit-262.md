# Task 265: install-hooks-retrofit-262

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
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
- [ ] GIVEN alle drei Factory-Hooks (`pre-commit`, `pre-push`, `commit-msg`) sind im
      gemeinsamen `.git/hooks`-Verzeichnis vorhanden und ausführbar WHEN
      `scripts/checks/pre-push.sh` läuft THEN meldet der neue Check Erfolg und blockiert
      den Push nicht (aus diesem Grund).
- [ ] GIVEN mindestens einer der drei Hooks fehlt im gemeinsamen Git-Verzeichnis (z. B.
      `commit-msg` wurde nie installiert) WHEN `scripts/checks/pre-push.sh` läuft THEN
      schlägt der Check fehl, der Push wird blockiert (Exit ≠ 0), und die Fehlermeldung
      nennt den fehlenden Hook-Namen sowie `bash scripts/install-hooks.sh` als
      Remediation-Befehl.
- [ ] GIVEN einer der drei Hooks existiert als Datei, ist aber nicht ausführbar (z. B.
      nach `chmod -x`) WHEN der Check läuft THEN wird er wie ein fehlender Hook behandelt
      (gleiche Fehlerbehandlung) – reine Existenzprüfung ohne Ausführbarkeits-Check reicht
      nicht.
- [ ] GIVEN der Check läuft aus einem beliebigen Git-Worktree dieses Repos (nicht nur dem
      Haupt-Arbeitsbaum) WHEN er das Hook-Verzeichnis bestimmt THEN verwendet er das
      **gemeinsame** Git-Verzeichnis (`git rev-parse --git-common-dir`), konsistent mit
      `install-hooks.sh` (ADR-042) – nicht ein worktree-lokales `.git`.
- [ ] GIVEN mehrere Hooks fehlen gleichzeitig WHEN der Check läuft THEN werden alle
      betroffenen Hook-Namen in der Fehlermeldung genannt (nicht nur der erste gefundene).
- [ ] Fehlerszenario: `.git/hooks`-Verzeichnis existiert im gemeinsamen Git-Verzeichnis
      noch gar nicht (Retrofit nie durchgeführt) → alle drei Hooks gelten als fehlend,
      Push blockiert.
- [ ] Fehlerszenario: `git rev-parse --git-common-dir` schlägt fehl (kein Git-Repository)
      → Check verhält sich fail-closed (kein stiller Erfolg).

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

## Offene Fragen
- [ ] Implementierungsdetail (keine ADR nötig, in `/implement` zu entscheiden): neuer
      Check als Block direkt in `pre-push.sh` oder als eigenes Skript
      `scripts/checks/hooks-installed-check.sh` (Muster wie `routes-doc-check.sh`).
      Empfehlung: eigenes Skript – isoliert testbar, passt zum bestehenden Muster.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `improvement/265-install-hooks-retrofit-262`
Erstellt: 2026-08-02 17:08
