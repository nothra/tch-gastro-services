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
Entscheidung: [ADR-040](../docs/adr/040-idempotenter-issue-seam-fuer-pipeline-retries.md) (erweitert ADR-018).

- **Neue Funktion** `create_issue_idempotent <title> <body> <art> [aspekt-csv]` in
  `scripts/lib/create-issue.sh` – gleiche Signatur wie `create_issue`. Sucht ein **offenes**
  Issue mit **exakt** gleichem Titel; Treffer → dessen Nummer auf stdout (Exit 0), sonst
  **delegiert** an das unveränderte `create_issue`. `create_issue` bleibt byte-identisch.
- **Exakter Match:** `gh issue list --state open --search "in:title …" --json number,title -q …`
  verengt nur; danach **clientseitig exakter Stringvergleich** je Kandidat. Keine externe
  `jq`-Abhängigkeit (gh-eingebettetes `-q`). Mehrere exakte Treffer → **niedrigste** Nummer.
- **Fail-open (F1):** Lookup nicht durchführbar (gh-Fehler/Auth/Netz/kein gh/unparsebar) →
  regulär via `create_issue` anlegen + stderr-Warnung. Anlage bleibt fail-closed (F2).
- **stdout-Hygiene (F3):** nur reine Nummer auf stdout, alles andere stderr.
- **Aufrufer umstellen** (nur diese drei, `.claude/**` → **Patch-Workflow** aus #91):
  `.claude/commands/{codify,review,security-review}.md` → Snippet ruft
  `create_issue_idempotent` statt `create_issue`. `start-work.sh`/`sync-issues.sh` **nicht**
  anfassen (AC6).
- **Tests** in `scripts/checks/tests/run-tests.sh` mit gh-Stub: offener Treffer (AC1),
  kein Treffer (AC2), geschlossen ignoriert (AC3), Teilstring ≠ Treffer (AC5), Lookup-Fehler
  fail-open (F1), stdout=nur Nummer (F3). Vgl. bestehende Seam-Test-Sektion (#82).
- **ADR-Status:** beim Implementieren `Proposed` → `Accepted` flippen (Lesson aus #197).
  Querverweis in ADR-018 auf ADR-040 ergänzen.

## Offene Fragen
- [x] Mechanismus der Scope-Begrenzung → **separate Wrapper-Funktion** (ADR-040 §2), nicht Flag/Default.
- [x] Robuster exakter Titel-Match → **Suche verengt, clientseitiger exakter Vergleich** (ADR-040 §3).

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `fix/207-create-issue-idempotenz-guard`
Erstellt: 2026-07-23 21:06
