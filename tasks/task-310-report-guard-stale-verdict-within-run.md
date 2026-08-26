# Task 310: report-guard-stale-verdict-within-run

## Status

- [x] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung

Der Report-Guard in `run_skill()` (`scripts/run-pipeline.sh`, ADR-019 §4) honoriert einen
Verdict aus `tasks/review-<id>.md` / `tasks/security-<id>.md`, ohne zu prüfen, ob dieser
Verdict im aktuellen Skill-Aufruf entstanden ist. Dadurch gilt ein stehengebliebener Verdict
aus einer früheren Review-Iteration (bzw. aus einem früheren Pipeline-Lauf) als frischer
Erfolg – in Task 308 löste das den Circuit Breaker (Exit 2) aus, obwohl der Rework fertig und
unabhängig verifiziert grün war.

**Fix:** `run_skill()` merkt sich vor dem ersten `claude`-Versuch eines Aufrufs einen
Fingerprint der Report-Datei (bzw. „Datei fehlt") und honoriert den Verdict nur bei
verändertem Fingerprint. Nicht-destruktiv (kein Löschen), generisch für `review` **und**
`security-review` (deckt damit auch den Re-Lauf-Fall aus #91 ab), stale Verdict = regulärer
Fehlversuch im bestehenden Retry-Pfad (3 Versuche, dann `exit 1`).

Spec: [`docs/specs/spec-310-report-guard-frische-pruefung.md`](../docs/specs/spec-310-report-guard-frische-pruefung.md)

## Akzeptanzkriterien

- [ ] AK1: Stale Report bei non-zero Exit → Fehlversuch statt Erfolg (Within-Run, #310)
- [ ] AK2: Frisch geschriebener Report + Turn-Limit → weiterhin toleriert (ADR-019 §4)
- [ ] AK3: Zuvor fehlende, im Aufruf neu geschriebene Report-Datei zählt als frisch
- [ ] AK4: Re-Lauf mit committetem Report → Fehlversuch statt fail-open (#91)
- [ ] AK5: `security-review` wird identisch behandelt
- [ ] AK6: Retry-Semantik unverändert – `exit 1` nach 3 Versuchen, kein Circuit-Breaker-Exit 2
- [ ] AK7: Fingerprint einmal pro `run_skill`-Aufruf vor dem ersten Versuch erhoben
- [ ] AK8: Nicht-destruktiv – Report-Datei bleibt unverändert, kein `git status`-Effekt
- [ ] AK9: Skill→Report-Datei-Zuordnung bleibt an einem Ort (`scripts/lib/report-verdict.sh`)
- [ ] AK10: Nicht report-erzeugende Skills unverändert
- [ ] AK11: E2E-Verhaltenstest (beide Richtungen) + Mutationsbeleg in `run-tests.sh`
- [ ] AK12: ADR-019 §4 und Lesson-Absätze (#91/#310) im selben PR nachgezogen

## Technische Notizen

- Fingerprint über POSIX-`cksum` (portabel macOS/BSD/GNU/busybox, keine neue
  Capability-Prüfung); bei SHA-256 stattdessen das Muster aus `scripts/install-yq.sh`
  übernehmen.
- Neue reine Funktion neben `report_verdict` in `scripts/lib/report-verdict.sh` –
  Modul-Header („stellt EINE Funktion bereit") dabei mitpflegen.
- Nicht im Scope: `max_turns`-Kalibrierung, neuer Interrupt-Typ, Änderungen an
  `circuit_breaker_check()` / `MAX_REVIEW_ITERATIONS`, Preflight-Löschen von Reports.

## Offene Fragen

_Keine – Mechanik, Scope, Fehlerpfad und Turn-Budget sind entschieden (siehe Spec)._

## Review-Findings

<!-- Wird durch /review befüllt -->

## Codify-Notizen

<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---

Branch: `fix/310-report-guard-stale-verdict-within-run`
Erstellt: 2026-08-26 23:27
