# Task 298: verify-final-state-merged-vor-unpushed

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
`evaluate_final_state()` in `scripts/lib/verify-final-state.sh` prüft ungepushte
Commits **vor** dem PR-Zustand. Bei `pr_shepherd=true` + `pr_state=MERGED` +
gelöschtem `origin/<branch>` (Branch-Auto-Delete nach Squash-Merge) bricht die
Funktion fälschlich mit „Push-Zustand nicht verifizierbar" ab, obwohl AK6 (MERGED =
Erfolg) eigentlich greifen sollte. Fix: MERGED muss unabhängig vom Unpushed-Status
sofort als Erfolg zählen (nur der Working-Tree-Check bleibt davor). Details siehe
[spec-298](../docs/specs/spec-298-verify-final-state-merged-vor-unpushed.md).

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [ ] GIVEN clean + PR_SHEPHERD=true + MERGED + unpushed=NO_UPSTREAM THEN verifiziert (exit 0)
- [ ] GIVEN clean + PR_SHEPHERD=true + MERGED + unpushed=3 THEN ebenfalls verifiziert (exit 0)
- [ ] GIVEN dirty + PR_SHEPHERD=true + MERGED THEN weiterhin "Working Tree nicht sauber" (Tree-Check bleibt vor dem Kurzschluss)
- [ ] GIVEN PR_SHEPHERD=true + pr_state≠MERGED + unpushed nicht-numerisch THEN weiterhin fail-closed "Push-Zustand nicht verifizierbar" (Regressions-Guard)
- [ ] GIVEN PR_SHEPHERD=false THEN unverändertes Verhalten (AK1/AK2/F2/F3 wie bisher)
- [ ] GIVEN bestehende Tests AK1–AK6/F1–F4 THEN bleiben unverändert grün
- [ ] GIVEN verify_final_state() I/O-Ebene mit echtem git-Repo (origin/<branch> gelöscht) + gestubbtem gh (MERGED) THEN verifiziert (exit 0)
- [ ] GIVEN ADR-040 THEN Punkt 1 beschreibt den MERGED-Kurzschluss (Prosa-Abgleich)

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

**ADR-Entscheidung:** Kein neuer Design-Fork, kein neues ADR-Dokument. Bestehendes
ADR-040 (`docs/adr/040-pipeline-endzustands-verifikation.md`) um einen datierten
„Nachtrag"-Abschnitt ergänzt (Muster aus ADR-019 §Nachträge) – bereits umgesetzt.

**Konkrete Änderung in `scripts/lib/verify-final-state.sh` → `evaluate_final_state()`:**
Direkt nach dem Tree-Check (aktuell Zeile ~38) und **vor** dem `case "$unpushed" in`
(aktuell Zeile ~42) einen neuen Kurzschluss einfügen:

```sh
# PR bereits MERGED (pr_shepherd=true) zählt sofort als Erfolg – unabhängig vom
# Unpushed-Status (nach Squash-Merge + Branch-Auto-Delete existiert origin/<branch>
# nicht mehr; die Unpushed-Prüfung ist dafür nicht aussagekräftig, #298).
if [ "$pr_shepherd" = "true" ] && [ "$pr_state" = "MERGED" ]; then
  return 0
fi
```

Der bisherige `if [ "$pr_state" = "MERGED" ]; then return 0; fi`-Block weiter unten
(aktuell Zeile ~62–64) wird dadurch für den `pr_shepherd=true`-Pfad unreachable und ist
zu entfernen (kein doppelter Kurzschluss/keine tote Zeile, `clean-code.md`).
Funktionskopf-Kommentar (Zeilen 10–26): Meldungs-Prioritätsreihenfolge im Kommentar
aktualisieren (MERGED-Kurzschluss jetzt direkt nach dem Tree-Check).

**`verify_final_state()` (I/O-Wrapper):** keine Änderung nötig – Fakten werden bereits
unconditional erhoben, unabhängig vom späteren Gebrauch.

**Tests (`scripts/checks/tests/run-tests.sh`, #212-Block):**
- Neuer Fall auf `evaluate_final_state`-Ebene: `efs clean NO_UPSTREAM true MERGED false none` → exit 0.
- Regressions-Guard: `efs clean NO_UPSTREAM true OPEN false none` → weiterhin exit 1, Meldung „Push-Zustand nicht verifizierbar".
- Dirty+MERGED: `efs dirty 0 true MERGED false none` → weiterhin exit 1, Meldung „Working Tree nicht sauber".
- I/O-Ebene: im bestehenden `VFS_REPO`-Block gezielt `origin/<branch>` löschen
  (z. B. `git -C "$VFS_REPO" push origin --delete "$VFS_BR"`, danach lokalen
  `$VFS_BR` unangetastet lassen) und mit `mkgh false MERGED false` +
  `verify_final_state "$VFS_BR" true "$VFS_REPO"` → exit 0 erwarten (reproduziert
  Branch-Auto-Delete exakt).

## Offene Fragen
- [x] ADR-040: reine Prosa-Korrektur oder eigener /architecture-Trigger? → Prosa-Korrektur (Nachtrag) umgesetzt, kein neues ADR nötig.
- [ ] Rückwirkende Metrik-Korrektur für Task #182/PR #296 – separates Issue oder kein Thema? (bleibt offen, nicht Teil dieser Task)

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `fix/298-verify-final-state-merged-vor-unpushed`
Erstellt: 2026-08-15 11:13
