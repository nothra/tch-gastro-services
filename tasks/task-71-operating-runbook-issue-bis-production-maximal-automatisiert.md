# Task 71: operating-runbook-issue-bis-production-maximal-automatisiert

## Status
- [x] In Bearbeitung
- [x] Review bestanden — Selbst-Review gegen die Quellen (siehe Verifikation); reine Doku, keine Multi-Persona-Runde nötig
- [x] Tests vollständig — keine Code-Änderung; Bestands-Suite grün (25 Tests), Lint grün (pre-push)
- [x] Security-Review bestanden — Doku führt keine Secrets/Endpunkte ein; nur Verweise auf bestehende Mechanismen
- [x] Refactoring abgeschlossen — n/a (Markdown-Dokument, kein Verhalten)
- [x] Codify ausgeführt — Prozess-Learning direkt eingearbeitet (Runbook selbst kodifiziert den Ablauf); kein neuer Regel-Bedarf
- [x] Fertig / PR erstellt

## Beschreibung
Neues Betriebs-Runbook `docs/factory/OPERATING.md`: „Factory optimal nutzen – Issue → Production,
maximal automatisiert". Bündelt den prozeduralen Ablauf, der bisher über CLAUDE.md, README und die
ADRs verstreut war, an einer Stelle.

Abgedeckte Abschnitte (wie beauftragt):
0. Einmal-Setup (lokale Tools, GitHub-Secrets, Repo-Variablen, Vercel Production-Branch, Async-Trigger, Telemetrie)
1. Feature-Checkliste Issue → /requirements → ggf. /architecture → /implement → /review//test//refactor//security-review//codify → Task-Datei **vor** Merge abschließen → /pr-shepherd
2. Stage-3-Modus `run-pipeline.sh` (inkl. Kosten-Hebel, Circuit Breaker, Interrupt)
3. Interrupt-Tabelle (ADR-004): ADR/MISSING_INFO/REVIEW_CONFLICT/MERGE_CONFLICT/CI_FAILURE/APPROVAL_PENDING/POST_MERGE_FAIL
4. Menschen-Gates (ADR-Trigger, Security-Freigabe, destruktive Prod-Migrationen, Auto-Trigger-Freigabe)
5. Wartung (Codify, Metriken, Post-Merge, Invarianten)
+ Anhang: Branch-Protection richtig einordnen.

## Akzeptanzkriterien
- [x] GIVEN ein neuer Entwickler WHEN er OPERATING.md liest THEN kennt er den vollständigen Weg Issue→Prod inkl. Einmal-Setup.
- [x] GIVEN die Guardrail aus #63 WHEN das Runbook den Feature-Flow beschreibt THEN steht „Task-Datei auf dem Branch vor dem Merge abschließen" explizit vor `/pr-shepherd`.
- [x] GIVEN Issue #38 (entkoppelter production-Branch + E2E-Gate) WHEN das Runbook Branch-Protection erwähnt THEN wird sie als optionale main-Hygiene eingeordnet, **nicht** als Prod-Sicherheitslücke.
- [x] GIVEN die Interrupt-Typen im Code WHEN die Interrupt-Tabelle sie listet THEN stimmen Typ, Auslöser und Aktion mit `raise-interrupt.sh`-Aufrufern überein.

## Technische Notizen
- Faktentreue gegen die Quellen geprüft: `deploy-gate.yml`, `factory-ci.yml` (post-merge-verify nur
  auf `main`; lint/test als eigene Jobs), `run-pipeline.sh`, `start-work.sh`, `factory-poll.sh`,
  `post-merge-verify.sh`, `raise-interrupt.sh`, ADR-002/004/007/008/015/017, README, CLAUDE.md.
- Interrupt-Typen aus den `.claude/commands/*`- und `scripts/*`-Aufrufern übernommen (nicht erfunden).
- Pflicht-Secrets inkl. der Neon-/INT-Secrets (seit ADR-017 Pflicht) korrekt als fail-closed markiert.

## Offene Fragen
Keine.

## Review-Findings
Selbst-Review: Behauptungen gegen die genannten Dateien verifiziert. Kein widersprüchlicher Rest;
Verweise statt Duplikate (kanonische Quellen referenziert, Codify-Regel W-02/W-03).

## Codify-Notizen
Kein neuer Stolperstein/keine neue Regel: Das Runbook ist selbst die kodifizierte Form des Ablaufs.
Backlog-Punkte aus review-63/security-63/codify-63 (+ #48) werden separat als GitHub-Issues angelegt
(nicht Teil dieser Doku-Task).

---
Branch: `docs/71-operating-runbook-issue-bis-production-maximal-automatisiert`
Erstellt: 2026-07-12 11:24
</content>
</invoke>
