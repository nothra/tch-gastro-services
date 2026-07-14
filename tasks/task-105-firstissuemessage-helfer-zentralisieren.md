# Task 105: firstissuemessage-helfer-zentralisieren

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [x] Codify ausgeführt
- [x] Fertig / PR erstellt

## Beschreibung
Die Hilfsfunktion `firstIssueMessage(error)` (Extraktion der ersten Zod-Fehlermeldung
an der Formulargrenze) war wortgleich in zwei Server-Actions dupliziert:
`app/verwaltung/katalog/actions.ts` und `app/verwaltung/teilnehmer/actions.ts`
(je Z. 26–28). Gefunden in Review #50. Ziel: in `lib/` zentralisieren, beide
Kopien durch den Import ersetzen. Kein neues Verhalten (tech-debt).

## Akzeptanzkriterien
- [x] GIVEN ein fehlgeschlagenes `safeParse` mit Issues WHEN `firstIssueMessage`
      aufgerufen wird THEN wird die Meldung des ersten Issues zurückgegeben.
- [x] GIVEN ein Fehler ohne Issues WHEN `firstIssueMessage` aufgerufen wird THEN
      wird die Fallback-Meldung „Ungültige Eingabe." zurückgegeben.
- [x] Beide Server-Actions nutzen den zentralen Helfer; keine lokale Kopie mehr.
- [x] Verhalten der beiden Actions unverändert (bestehende Action-Tests bleiben grün).

## Technische Notizen
- Neuer Seam: `lib/form-errors.ts` mit `export function firstIssueMessage(...)`.
  (Issue schlug `form-utils.ts` vor; im Review auf den domänenspezifischen Namen
  `form-errors.ts` umbenannt – konsistent mit `authz`/`money`/`credentials`, kein
  generisches „utils".)
- Parametertyp bleibt strukturell minimal (`{ issues: { message: string }[] }`)
  statt an `ZodError` gebunden – so ist der Helfer ohne Zod-Aufbau testbar und deckt
  jede `safeParse`-Fehlerform ab. Verhalten 1:1 aus den Originalkopien übernommen.
- Import-Pfad `@/lib/form-errors` (Alias-Konvention wie `@/lib/authz`, `@/lib/money`).

## Test-Notizen
- `lib/form-errors.ts`: 100 % Coverage (Stmts/Branch/Funcs/Lines) – 3 Unit-Tests decken
  Einzel-Issue, Mehrfach-Issue (Ordering: erstes Issue) und Fallback (leere `issues`) ab.
- Assertions auf konkrete erwartete Meldungen umgestellt (Review-Nitpick behoben):
  deterministische Custom-Messages via `z.string({ error: "…" })` statt Vergleich
  gegen `result.error.issues[0].message` – testet Verhalten statt Datenquelle.
- Gesamt-Coverage 80 % (≥ Schwelle 80 %); Verhalten der Actions über bestehende
  Action-Tests unverändert grün (112 Tests gesamt).

## Refactoring-Notizen
- Clean-Code-Pass ohne neues Verhalten (Tests vor/nach identisch grün: 112).
- Modul-Kommentar `lib/form-errors.ts`: letzten Halbsatz („Fällt zurück, wenn kein
  Issue vorliegt.") entfernt – er beschrieb das WHAT (den `??`-Operator), Rest bleibt
  WHY (struktureller Parametertyp → testbar). Review-Nitpick behoben.
- Kein weiteres Refactoring nötig: Funktion macht genau eine Sache, 1 Parameter,
  keine Duplikation (das war das Ziel), keine Magic Numbers. Der einzelne Fallback-String
  bleibt inline (Named-Konstante wäre Over-Engineering – siehe Review).

## PR-Shepherd-Notizen
PR-Shepherd [2026-07-15]: Auto-Merge (--squash) freigegeben – alle Gates grün.
- Branch 0 hinter / 7 vor `main` (kein Rebase/update-branch nötig).
- CI grün: factory-self-test, issue-sync, lint, test, Vercel; post-merge-verify skippt off-main.
- Keine offenen Review-Kommentare (nur automatischer Vercel-Deploy-Kommentar); reviewDecision
  leer → keine erforderlichen Approvals auf diesem Repo.
- Draft → ready, dann `gh pr merge --auto --squash`.

## Offene Fragen
Keine.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
Report: `tasks/codify-105.md`. Zwei Regeln abgeleitet (beide im Review gefunden):
1. `PROJECT-CONTEXT.md` – `lib/`-Module domänenspezifisch benennen, kein generisches `utils`
   (Rework: `form-utils` → `form-errors`).
2. `testing-standards.md` – Assertion gegen Literal, nicht gegen das Objekt-under-Test
   (tautologische `toBe(result.error.issues[0].message)`-Assertion behoben).
Kein Check, kein Folge-Issue nötig.

---
Branch: `refactor/105-firstissuemessage-helfer-zentralisieren`
Erstellt: 2026-07-14 22:15
