# Task 298: verify-final-state-merged-vor-unpushed

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [ ] Security-Review bestanden
- [x] Refactoring abgeschlossen
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
- [x] GIVEN clean + PR_SHEPHERD=true + MERGED + unpushed=NO_UPSTREAM THEN verifiziert (exit 0)
- [x] GIVEN clean + PR_SHEPHERD=true + MERGED + unpushed=3 THEN ebenfalls verifiziert (exit 0)
- [x] GIVEN dirty + PR_SHEPHERD=true + MERGED THEN weiterhin "Working Tree nicht sauber" (Tree-Check bleibt vor dem Kurzschluss)
- [x] GIVEN PR_SHEPHERD=true + pr_state≠MERGED + unpushed nicht-numerisch THEN weiterhin fail-closed "Push-Zustand nicht verifizierbar" (Regressions-Guard)
- [x] GIVEN PR_SHEPHERD=false THEN unverändertes Verhalten (AK1/AK2/F2/F3 wie bisher)
- [x] GIVEN bestehende Tests AK1–AK6/F1–F4 THEN bleiben unverändert grün
- [x] GIVEN verify_final_state() I/O-Ebene mit echtem git-Repo (origin/<branch> gelöscht) + gestubbtem gh (MERGED) THEN verifiziert (exit 0)
- [x] GIVEN ADR-040 THEN Punkt 1 beschreibt den MERGED-Kurzschluss (Prosa-Abgleich)

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

## Root Cause
Root Cause [2026-08-15]: `scripts/lib/verify-final-state.sh:42–51` (vor dem Fix) – der
Unpushed-Check (`case "$unpushed" in ''|*[!0-9]*)`) lief **vor** dem MERGED-Kurzschluss
(der stand erst bei Zeile ~62). Nach Squash-Merge + Branch-Auto-Delete existiert
`origin/<branch>` nicht mehr, `unpushed` wird also `NO_UPSTREAM` (nicht-numerisch) –
der fail-closed-Check griff dadurch fälschlich zuerst und meldete „Push-Zustand nicht
verifizierbar", obwohl AK6 (MERGED = Erfolg) unabhängig davon hätte greifen müssen.

## Fix
`scripts/lib/verify-final-state.sh` (`evaluate_final_state()`): MERGED-Kurzschluss
(`if [ "$pr_shepherd" = "true" ] && [ "$pr_state" = "MERGED" ]; then return 0; fi`) direkt
nach dem Tree-Check und vor den Unpushed-Check gezogen; der alte, dadurch unreachable
gewordene MERGED-Block weiter unten entfernt. Funktionskopf-Kommentar (Meldungs-Priorität)
und ADR-040-Nachtrag entsprechend aktualisiert.

## Review-Findings
Siehe `tasks/review-298.md` – APPROVED (nur 2 Nitpicks zu Test-Kombinationsabdeckung,
kein Verhaltensrisiko).

## Test-Notizen
`/test`: Die beiden Nitpicks aus `tasks/review-298.md` (Fehlerszenario-Kombinationen aus
spec-298 nicht als eigene Testfälle abgedeckt: CLOSED+`unpushed=NO_UPSTREAM` sowie leerer
`pr_state`+`unpushed` nicht-numerisch) wurden ergänzt (`run-tests.sh` #298-Block). Kein
TS/TSX im Diff → Vitest-Coverage-Schwelle nicht betroffen. Volle Suite: 1040/1040 grün.

## Refactor-Notizen
`/refactor`: Checkliste (Naming, Struktur, Funktionslänge/Parameteranzahl) gegen den
geänderten Code in `evaluate_final_state()` durchgespielt – keine Änderung nötig. Die
Funktion hat 6 Parameter/~49 Zeilen, das ist aber die vorbestehende, unveränderte Signatur
(nur zwei Blöcke wurden vertauscht); eine Restrukturierung (Parameter-Objekt, Aufteilen)
wäre Gold-Plating außerhalb des Scopes von Task 298 und hätte unnötigen Blast-Radius auf
die Tests. Bereits im Review (`tasks/review-298.md`) als sauber bestätigt.

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

Hinweis für `/codify`: Reihenfolge-Bug in einer Kurzschluss-Kette – ein früherer,
unabhängig fail-closed greifender Check (Unpushed) stand vor einem später eingeführten
Kurzschluss (MERGED-Erfolg), der ihn eigentlich hätte überstimmen sollen. Beim Hinzufügen
eines neuen Erfolgs-Kurzschlusses zu einer bestehenden Guard-Clause-Kette immer prüfen, ob
er VOR (nicht nach) bereits existierenden fail-closed-Checks stehen muss, die er außer
Kraft setzen soll.

---
Branch: `fix/298-verify-final-state-merged-vor-unpushed`
Erstellt: 2026-08-15 11:13
