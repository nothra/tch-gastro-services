# Task 239: factory-commit-push-nachholen

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
`scripts/factory-commit.sh` (mandatierte Commit/Push-Seam, ADR-019) holt im „nichts zu
committen"-Zweig einen zuvor fehlgeschlagenen Push nicht nach – der Commit bleibt lokal liegen,
was für Stage-3-Agenten zum Pipeline-Abbruch führt (kein Weg, rohes `git push` auszuführen).
Fix: der leere Zweig prüft zusätzlich auf ungepushte Commits/fehlenden Upstream und holt den
Push in dem Fall nach. Details siehe [spec-239](../docs/specs/spec-239-factory-commit-push-nachholen.md).

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [x] GIVEN nichts zu committen UND Branch hat Commits voraus (`git rev-list @{u}..HEAD` nicht leer) WHEN `factory-commit.sh` läuft THEN Push wird nachgeholt, Exit 0
- [x] GIVEN nichts zu committen UND Branch hat keinen Upstream WHEN `factory-commit.sh` läuft THEN Push mit `-u origin HEAD`, Exit 0
- [x] GIVEN nichts zu committen UND Branch ist deckungsgleich mit Upstream WHEN `factory-commit.sh` läuft THEN keine Aktion, unveränderte Meldung, Exit 0
- [x] GIVEN nichts zu committen UND ungepushte Commits vorhanden, nachgeholter Push scheitert WHEN `factory-commit.sh` läuft THEN Exit ≠ 0, Fehlschlag weitergereicht
- [x] GIVEN erfolgreicher Nachhol-Push WHEN das Skript sich beendet THEN unterscheidet sich die Meldung erkennbar vom Happy-Path-Text „committet und gepusht"
- [x] Bestehende Fail-closed-Guards (main/master, kein Repo, detached HEAD, Argumentanzahl) bleiben unverändert wirksam

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
Kein neues ADR – Ergänzung zu [ADR-019](../docs/adr/019-stage3-commit-seam-report-guard.md)
(Abschnitt „Nachtrag #239"), da keine neuen Alternativen abzuwägen sind: die Push-Mechanik
existiert bereits im Skript, nur der leere Zweig erreicht sie zusätzlich.

Implementierung in `scripts/factory-commit.sh`:
- Im `git diff --cached --quiet`-Zweig (aktuell Zeile 63–66) zusätzlich prüfen:
  - Hat der Branch einen Upstream (`git rev-parse --abbrev-ref --symbolic-full-name '@{u}'`)?
    Wenn ja: `git rev-list @{u}..HEAD` leer? → wirklich nichts zu tun, unverändertes Exit-0-
    Verhalten. Nicht leer → Push nachholen (`git push`).
  - Kein Upstream → Push nachholen mit `git push -u origin HEAD` (legt Tracking-Ref an).
- Die Push-Logik (Upstream-Erkennung + `git push`/`git push -u origin HEAD`) ist unten im
  Skript (Zeile 73–77) für den Commit-Pfad bereits vorhanden – **in einen gemeinsamen Helper
  extrahieren** statt zu duplizieren (DRY), von beiden Stellen aufgerufen.
- Scheitert der nachgeholte Push, muss `set -e` den non-zero Exit unverändert weiterreichen
  (kein eigenes Error-Handling, das den Fehler verschluckt).
- Bestehende Guards (main/master, Argumentanzahl, kein Repo, detached HEAD) bleiben unverändert
  vor `git add -A` – keine Interaktion mit der neuen Logik.

Tests: `scripts/checks/tests/run-tests.sh`, Abschnitt „#91 factory-commit.sh", gleiches
Fixture-Muster (`fc_repo`, echtes Bare-Remote+Klon) wie die bestehenden 8 Fälle – neue Fälle
gemäß Spec „Hinweis für /test".

**Umsetzung (2026-07-26):** Push-Logik in Helper `push_branch()` extrahiert (DRY), von
Commit- und leerem Zweig genutzt. Leerer Zweig unterscheidet jetzt: kein Upstream → Nachhol-
Push mit `-u origin HEAD`; Upstream vorhanden + `git rev-list @{u}..HEAD` nicht leer → Nachhol-
Push; sonst unverändert „übersprungen". 4 neue Testfälle in Abschnitt „#239" (549 grün, 4 rot
insgesamt – die 4 roten sind ein vorbestehender, unabhängiger E2E-Testblock „#212 W3", der
`factory-commit.sh` nicht referenziert; siehe Review-Findings).

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
Keine – Problem/Fix-Ansatz sind im Issue #239 bereits vollständig beschrieben. `/architecture`
entscheidet nur noch, ob eine eigene ADR nötig ist oder eine Ergänzung von ADR-019 genügt.

## Review-Findings
<!-- Wird durch /review befüllt -->
Beobachtung aus /implement (2026-07-26, außerhalb des Scopes dieser Task): der Testlauf zeigt
4 rote Fälle im Abschnitt „#212 WICHTIG-3: Verifikations-Interrupt end-to-end" (Zeilen ~3009–
3023 in `run-tests.sh`). Der kopierte Datei-Satz dieses E2E-Tests enthält `factory-commit.sh`
nicht (weder direkt noch transitiv referenziert von `run-pipeline.sh`,
`verify-final-state.sh`, `report-verdict.sh`, `tier-select.sh`, `raise-interrupt.sh`) – die
Ursache liegt also nicht in dieser Task. Nicht behoben (Scope), aber hier protokolliert, damit
es nicht verloren geht; ggf. eigenes Issue via `/review`.

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `fix/239-factory-commit-push-nachholen`
Erstellt: 2026-07-26 13:47
