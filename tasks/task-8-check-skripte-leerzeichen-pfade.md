# Task 8: check-skripte-leerzeichen-pfade

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [x] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [x] Fertig / PR erstellt

## Beschreibung
Bugfix: Check-Skripte zerlegten Pfade mit Leerzeichen (unquotierte Wort-Trennung
`for x in $VAR`). Betroffen: `completion-check.sh` (gemeldeter Stop-Hook-Fehler) und
`sync-issues.sh` (latent). Fix: newline-sichere `while IFS= read -r`-Iteration.

## Akzeptanzkriterien
- [x] GIVEN Repo-Pfad mit Leerzeichen WHEN completion-check.sh läuft THEN kein grep-Fehler, exit 0, Task-Datei mit vollem Pfad genannt
- [x] GIVEN Leerzeichen-Pfad + fehlendes Issue WHEN sync-issues --create --dry-run THEN Titel wird aus Datei gelesen, kein Datei-Fehler
- [x] GIVEN Regressionstests WHEN run-tests.sh läuft THEN grün (148/148); reproduzierender Bug-#8-Testblock vorhanden

## Technische Notizen
`factory-poll.sh:122` NICHT betroffen (iteriert nur über numerische Issue-IDs).
Zusätzlich SIGPIPE-Absicherung (`|| true`) an der `grep | head`-Pipeline in completion-check.sh.

## Offene Fragen
- Keine.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `fix/8-check-skripte-leerzeichen-pfade`
Erstellt: 2026-07-08 18:46
