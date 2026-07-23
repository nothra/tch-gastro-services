# Task 209: verzehr-gesamt-summe-anzeigen

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [x] Codify ausgeführt
- [x] Fertig / PR erstellt

## Beschreibung
Im Karten-Kopf der Verzehr-Erfassung soll je Teilnehmer zusätzlich zu den drei Kategorie-Summen
(Getränke · Essen · Kaffee) die **Gesamt-Summe** angezeigt werden – optisch hervorgehoben an die
bestehende Kategorie-Zeile angehängt (`… · Kaffee Z,ZZ € · Gesamt G,GG €`).

Spec: `docs/specs/spec-209-verzehr-gesamt-summe-anzeigen.md`

## Akzeptanzkriterien
- [x] GIVEN Zeile mit Positionen in mehreren Kategorien WHEN Kopf gerendert THEN erscheint neben den Kategorie-Summen eine hervorgehobene Gesamt-Summe. → `should_showHighlightedGesamt_when_mixedPositions`
- [x] GIVEN Positionen in Cent WHEN `gesamtCents` berechnet THEN `gesamtCents = getraenkeCents + essenCents + kaffeeCents` (exakt, ADR-021). → `should_sumAllThreeCategories_when_allCategoriesPresent`
- [x] GIVEN 0 Positionen WHEN Kopf gerendert THEN Gesamt = `0,00 €`. → `should_showGesamtAsZero_when_noPositions` + `should_returnZeroGesamt_when_noPositions`
- [x] GIVEN nur eine Kategorie WHEN Kopf gerendert THEN Gesamt = deren Kategorie-Summe. → `should_showGesamtEqualToCategory_when_onlyOneCategory` + `should_returnCategorySumAsGesamt_when_onlyOneCategory`
- [x] GIVEN alle drei Kategorien WHEN Kopf gerendert THEN Gesamt = Summe der drei. → `should_showHighlightedGesamt_when_mixedPositions` + `should_sumAllThreeCategories_when_allCategoriesPresent`
- [x] GIVEN abgeschlossene Veranstaltung (`editable=false`) WHEN Kopf gerendert THEN Gesamt erscheint wie in der Erfassung. → `should_showGesamt_when_notEditable`
- [x] Unit-Test für `gesamtCents`; UI-Test für die Anzeige im Kopf.

## Technische Notizen
- Summen-Logik: `gesamtCents` in `app/_verzehr/summen.ts` (`ZeileSummen`-Typ + `zeileSummen`), DB-frei, TDD.
- Anzeige: Karten-Kopf in `app/_verzehr/VerzehrErfassung.tsx` (`ZeileKarte`, ~Zeile 109–117), Formatierung via `formatCents`.
- `ZeileKarte` ist route-neutral und wird von `/veranstaltung/[id]/verzehr` **und** `/theke/[token]` (via `IdentityGate`) genutzt → beide Seiten profitieren.
- Keine Ad-hoc-Summe in der UI – Gesamt kommt aus `summen.ts`.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

## Implementierungs-Notizen
- **Nicht-ADR 2026-07-23:** abgeleitete Summe + reine Anzeige – bewusst kein ADR (kein Trigger aus den vier Kategorien).
- `gesamtCents` als abgeleitetes Feld in `ZeileSummen` (`summen.ts`), berechnet aus den drei bekannten Kategorie-Summen → kein neuer Fehlerpfad, bestehender Exhaustiveness-Guard unberührt (Fehlerszenario der Spec erfüllt).
- Weitere `zeileSummen`-Konsumenten (`kassierSummen.ts`, `berichtModell.ts`) picken einzelne Felder → additives Feld bricht sie nicht.
- Anzeige im Karten-Kopf via verschachteltem `<span className="font-semibold …">` an die Kategorie-Zeile angehängt (optisch hervorgehoben); wirkt route-neutral auf `/veranstaltung/[id]/verzehr` und `/theke/[token]`, editierbar wie lesend.
- Keine Routen-Änderung → `docs/routes.md` unberührt.
- **Offen (UI-Nachtest):** interaktive Browser-/E2E-Verifikation noch nicht ausgeführt (keine lokale DB in dieser Session). ACs sind durch Komponenten-Tests je Kriterium abgedeckt; visuelle Prüfung via `/verify` bzw. `/post-merge-verify` nachziehen.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Refactoring-Notizen
- **Keine Änderungen nötig.** Diff-Scope geprüft gegen `origin/main` (lokales `main` in diesem
  Worktree lag hinter dem Remote – bekannter Stolperstein, siehe `lessons/factory-workflow.md`).
  Betroffene Dateien (`summen.ts`, `summen.test.ts`, `VerzehrErfassung.tsx`, deren Test) sind
  bereits minimal: keine Duplikation, keine Magic Numbers, Exhaustiveness-Guard unberührt.
- Review (`review-209.md`, APPROVED) hatte nur einen Nitpick (`gesamtCents` vs.
  `verzehrGesamtCents`-Naming), bewusst mit Begründung nicht übernommen – erneutes Aufgreifen
  hier hätte nur Churn ohne Verhaltensänderung erzeugt.
- Lint (`pre-commit.sh`) und alle 46 betroffenen Tests grün, unverändert vor/nach diesem Pass.

## Codify-Notizen
Siehe `tasks/codify-209.md` – keine neuen Regeln, keine Änderungen nötig. Feature war klein,
additiv und gut abgegrenzt; bestehende Regeln (Kern-Kurzregeln, ADR-021, testing-standards
§AAA) haben ausgereicht. Review-Nitpick (Naming) bewusst nicht übernommen, kein wiederkehrendes
Muster. Security-Review (`tasks/security-209.md`) PASSED, keine Findings.

PR-Shepherd 2026-07-23: Merge freigegeben – alle Gates grün (CI, keine offenen Review-
Kommentare, `mergeStateStatus: CLEAN`).

---
Branch: `feature/209-verzehr-gesamt-summe-anzeigen`
Erstellt: 2026-07-23 16:49
