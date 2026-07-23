# Task 207: create-issue-idempotenz-guard

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Idempotenz-Guard gegen Duplikat-Issues bei Pipeline-Retries. `run_skill()` startet Skills
bei Exit ≠ 0 bis zu 3× neu (frische Session ohne Gedächtnis); die autonomen Aufrufer
`/codify`, `/review`, `/security-review` legen dabei denselben Out-of-Scope-Fund erneut als
Issue an (beobachtet: #204/#205). Der Seam `create_issue` (ADR-018) soll vor der Anlage
prüfen, ob bereits ein **offenes** Issue mit **exakt gleichem Titel** existiert, und dessen
Nummer zurückgeben statt neu anzulegen.

**Requirements-Entscheidungen (2026-07-23):**
- Match-Zustand: **nur offene** Issues (geschlossene blockieren nicht).
- Fehlerfall der Prüfung: **fail-open** (im Zweifel anlegen, konsistent mit Label-Degradation).
- Geltungsbereich: **nur** die 3 Pipeline-Aufrufer; `start-work.sh`/`sync-issues.sh` unverändert.

Vollständige Spec: [`docs/specs/spec-207-create-issue-idempotenz-guard.md`](../docs/specs/spec-207-create-issue-idempotenz-guard.md)

## Akzeptanzkriterien
- [ ] AC1 – Treffer verhindert Duplikat: offenes Issue mit Titel `T` vorhanden → kein neues, bestehende Nummer zurück (Exit 0)
- [ ] AC2 – Kein Treffer legt regulär an (inkl. Labels wie bisher)
- [ ] AC3 – Geschlossenes Issue mit Titel `T` blockiert nicht → neues Issue
- [ ] AC4 – Retry-Idempotenz: zwei Läufe, identischer Titel → genau ein offenes Issue
- [ ] AC5 – Exakter Titelvergleich (Teilstring ≠ Duplikat)
- [ ] AC6 – Geltungsbereich: `start-work.sh`/`sync-issues.sh` verhalten sich unverändert
- [ ] F1 – Prüfung nicht durchführbar → fail-open anlegen + stderr-Warnung
- [ ] F2 – Anlage bleibt fail-closed (Exit ≠ 0 nur, wenn gar kein Issue entsteht)
- [ ] F3 – stdout-Hygiene: nur reine Issue-Nummer auf stdout

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

## Offene Fragen
- [ ] Mechanismus, um den Guard auf **nur** die 3 Aufrufer zu begrenzen (Seam-Opt-in-Flag/Env vs. Wrapper) → `/architecture`
- [ ] Robuster exakter Titel-Match trotz Teilstring-Suche von `gh issue list --search` → `/architecture`/`/implement`

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `fix/207-create-issue-idempotenz-guard`
Erstellt: 2026-07-23 21:06
