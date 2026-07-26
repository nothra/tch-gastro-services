# Task 239: factory-commit-push-nachholen

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [x] Codify ausgeführt
- [x] Fertig / PR erstellt

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

Hinweis: `pnpm test`/`pnpm typecheck`/`pnpm format:check` (pre-push-Gate) sind unabhängig grün –
die 4 roten Fälle stammen ausschließlich aus dem separaten Bash-Suite-Lauf
(`scripts/checks/tests/run-tests.sh`).

**Test-Vervollständigung (2026-07-26):** Alle 6 Akzeptanzkriterien über die 4 neuen Fälle im
Abschnitt „#239" (`run-tests.sh:1618-1670`) abgedeckt (Push-nachholen mit Upstream, `-u`-Push
ohne Upstream, In-Sync-Regression, Fehlschlag-Weiterreichung + AC5-Meldungsdifferenzierung).
Bash-Suite: 549 grün, 4 rot (ausschließlich der vorbestehende, unabhängige `#212 W3`-Block –
verifiziert, dass `factory-commit.sh` von dessen kopiertem Datei-Satz nicht referenziert wird).
`pnpm test` (665 grün), `pnpm typecheck`, `pnpm format:check` und der Routen-Doku-Drift-Check
(`scripts/checks/pre-push.sh`) laufen unabhängig grün. Keine Produktionscode-Änderung in diesem
Schritt.

**Refactoring (2026-07-26):** Alle drei umsetzbaren Review-Nitpicks behoben (kein neues
Verhalten hinzugekommen, nur Klarheit/Symmetrie): (1) `factory-commit.sh` gibt nach einem
erfolgreichen Nachhol-Push jetzt eine Bestätigungszeile aus („ausstehenden Push nachgeholt auf
'$BRANCH'."), symmetrisch zum Commit-Pfad. (2) Die beiden vormals getrennten Bedingungen
(kein Upstream / Upstream + `rev-list` nicht leer) sind zu einer Bedingung mit einheitlicher
Meldung zusammengeführt – weniger Duplikation, gleiches Verhalten. (3) Testfall 9 und Fall 12
assertieren jetzt zusätzlich positiv den Nachhol-Meldungstext, damit die Fälle nicht durch
beliebigen anderen Output grün werden (Lesson #214). Nitpick 4 (doppelte Upstream-Prüfung in
`push_branch`) bewusst unverändert belassen – im Review als „Preis für den DRY-Helper"
akzeptiert. Bash-Suite weiterhin 551 grün / 4 rot (unverändert der vorbestehende, unabhängige
`#212 W3`-Block); `pnpm test` (665 grün), `typecheck`, `format:check` und der Routen-Doku-Check
laufen grün.

**Security-Review (2026-07-26):** PASSED, keine kritischen/wichtigen Findings – Report in
`tasks/security-239.md`. Threat Surface = das privilegierte Commit/Push-Seam selbst (ADR-019).
Geprüft und unbedenklich: kein neuer externer Input (Commit-Message im leeren Zweig ungenutzt,
`@{u}` ist ein Literal, `rev-list`-Ausgabe nur gequotet im `[ -n … ]`-Längentest → keine Command
Injection); der Nachhol-Push sitzt hinter allen Fail-closed-Guards (main/master, detached HEAD,
Argumentanzahl) → keine Guard-Umgehung; kein `--force`/destruktive Op; Push-Fehlschlag wird via
`set -e` weitergereicht (kein stiller Erfolg); nur Branch-Name in stderr (kein Secret-Leak);
keine neuen Dependencies.

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->
Kein neues Learning aus dem Codify-Schritt selbst – das einzige generalisierbare Muster dieser
Task (Beleg statt Behauptung bei vorbestehendem, scheinbar unabhängigem Testfehlschlag) wurde
bereits während `/review` als Selbstfund extrahiert (`lessons/factory-workflow.md` + Index-Zeile
in `PROJECT-CONTEXT.md`). Details in `tasks/codify-239.md`.

PR-Shepherd 2026-07-26: Merge freigegeben – alle Gates grün (Review, Tests, Security-Review,
Refactoring, Codify). Keine offenen Review-Kommentare (nur der Vercel-Deploy-Bot-Kommentar),
keine ausstehenden Approvals (0 required laut ADR-029). CI zum Zeitpunkt der Freigabe teils
noch `pending` (lint/pr-closes-issue/factory-self-test bereits grün) – `gh pr merge --auto`
wartet server-seitig auf den grünen Zustand.

---
Branch: `fix/239-factory-commit-push-nachholen`
Erstellt: 2026-07-26 13:47
