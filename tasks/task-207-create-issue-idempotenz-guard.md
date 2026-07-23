# Task 207: create-issue-idempotenz-guard

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
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
- [x] AC1 – Treffer verhindert Duplikat: offenes Issue mit Titel `T` vorhanden → kein neues, bestehende Nummer zurück (Exit 0)
- [x] AC2 – Kein Treffer legt regulär an (inkl. Labels wie bisher)
- [x] AC3 – Geschlossenes Issue mit Titel `T` blockiert nicht → neues Issue (Lookup fragt `--state open`)
- [x] AC4 – Retry-Idempotenz: zwei Läufe, identischer Titel → genau ein offenes Issue
- [x] AC5 – Exakter Titelvergleich (Teilstring ≠ Duplikat; mehrere Treffer → niedrigste Nummer)
- [x] AC6 – Geltungsbereich: `start-work.sh`/`sync-issues.sh` verhalten sich unverändert
- [x] F1 – Prüfung nicht durchführbar → fail-open anlegen + stderr-Warnung
- [x] F2 – Anlage bleibt fail-closed (Exit ≠ 0 nur, wenn gar kein Issue entsteht)
- [x] F3 – stdout-Hygiene: nur reine Issue-Nummer auf stdout

> Alle ACs sind in `scripts/checks/tests/run-tests.sh` (Sektion „Idempotenter Issue-Seam
> (#207, ADR-040)") abgedeckt und grün. **Ausnahme bis Patch-Apply:** die drei Assertions
> „/codify|/review|/security-review nutzt create_issue_idempotent" sind rot, bis der unten
> beschriebene `.claude/**`-Patch angewendet ist (siehe Blocker).

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

## Implementierungs-Notizen (2026-07-23)
- **`scripts/lib/create-issue.sh`:** neue Funktion `create_issue_idempotent` + Helfer
  `_cri_find_open_issue_by_title`. Lookup via `gh issue list --state open --search "in:title …"
  --json number,title -q '.[] | .number, .title'`; exakter Titelvergleich **clientseitig** in
  der Shell (Helfer-Exit: 0=Treffer, 1=kein Treffer, 2=Lookup unmöglich → fail-open). Bei
  Treffer bestehende Nummer auf stdout (keine Anlage), sonst Delegation an das **byte-identisch**
  belassene `create_issue`. `create_issue` selbst wurde nicht angefasst.
- **Tests:** neue Sektion in `run-tests.sh` mit gh-Stub (`issue list`/`issue create`) – deckt
  AC1–AC6, F1, F3, die niedrigste-Nummer-Regel, die no-gh-Kaskade und `set -euo pipefail` ab.
- **ADRs:** ADR-040 `Proposed`→`Accepted`; ADR-018 mit Querverweis auf ADR-040 ergänzt.
- **`.claude/**`-Snippets (Patch-Workflow #91/#94):** die drei Aufrufer-Snippets liegen als
  `tasks/patch-207.diff` (programmatisch via `difflib` erzeugt, `git apply --check` grün,
  gegen Temp-Kopien angewendet + Greps grün). `. scripts/lib/create-issue.sh` bleibt unverändert.

## Blocker
- **Erledigt [2026-07-23]: `.claude/commands/{codify,review,security-review}.md` sind für den
  Agenten hard-denied (#88/#91).** Umstellung des Out-of-Scope-Anlageaufrufs auf
  `create_issue_idempotent` wurde als `tasks/patch-207.diff` geliefert und vom Menschen per
  `git apply` angewendet. Danach volle `run-tests.sh` = 425 grün / 0 rot; die stale Patch-Datei
  wurde entfernt (Lesson #145).

## Review-Findings
**Runde 1 (Review, 2026-07-23):** NEEDS_REWORK – keine KRITISCH, 4 WICHTIG. Report:
[`tasks/review-207.md`](review-207.md). **Alle behoben (Rework-Iteration 1, 2026-07-23):**
- [x] W1 – Datei-Header `create-issue.sh` sagte „stellt EINE Funktion bereit" → beide Funktionen
  dokumentiert (inkl. `create_issue_idempotent` + ADR-040-Verweis).
- [x] W2 – Numerik-Guard `''|*[!0-9]*)` war ungetestet → Test „Guard: nicht-numerische Nummer-Zeile"
  erzwingt den Zweig (titelgleicher Kandidat mit nicht-numerischer Nummer wird übersprungen).
- [x] W3 – `set -euo pipefail` nur für Treffer-Pfad getestet → zusätzlich No-Match- und
  Fail-open-Pfad unter strict mode verriegelt.
- [x] W4 – F2 (Label-Degradation) über den neuen Einstiegspunkt ungetestet → Test mit ablehnendem
  `issue create`-Stub durch `create_issue_idempotent` (Degradation auf nur-Art, exit 0, stdout=Nummer).
- [x] N1 – AC5b erfasste `out` ungeprüft → jetzt `out`+`rc` asserted (Symmetrie zu AC5a).
- [x] N2 – `--limit 100` → Kommentar ergänzt, warum das für den Dedup-Zweck genügt.
- Bewusst **nicht** behoben (Nitpicks, kosmetisch/vertretbar): Heredoc statt `<<<`, repo_args-Dup
  (Bash-3.2-nameref-Grenze), Flag-Name `expect_num`, AC3-Stub-Grenze. Kein Gold-Plating.

## Refactoring-Notizen (2026-07-23)
Leichter Clean-Code-Pass (kein neues Verhalten, 439 grün vor + nach):
- `_cri_find_open_issue_by_title`: umständliches `<<EOF … EOF`-Heredoc durch das idiomatische
  Herestring `<<<"$raw"` ersetzt (identisches Verhalten inkl. Leer-Fall).
- **Bewusst nicht refactored** (Trade-off, kein Gold-Plating): repo_args-Duplikat (array-rückgebender
  Bash-Helfer bräuchte 4.3-nameref, das Projekt läuft auch auf Bash 3.2), `expect_num`-Flag (gut
  kommentierter lokaler Toggle). Code war nach zwei Review-Runden bereits sauber.

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `fix/207-create-issue-idempotenz-guard`
Erstellt: 2026-07-23 21:06
