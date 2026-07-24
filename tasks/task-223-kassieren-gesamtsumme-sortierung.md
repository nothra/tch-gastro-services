# Task 223: kassieren-gesamtsumme-sortierung

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [x] Tests vollständig
- [ ] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Zwei UI-Verbesserungen am Kassiervorgang (`/veranstaltung/[id]/kassieren`):
1. „Verzehr-Gesamt" prägnanter hervorheben (`font-medium` → `font-semibold`, volle
   Textfarbe bleibt) – analog zum „Gesamt"-Span auf der Verzehr-erfassen-Seite.
2. Kassier-Teilnehmerliste umsortieren: offene (noch nicht kassierte) Teilnehmer oben,
   bereits kassierte darunter; je Gruppe weiterhin alphabetisch.

Spec: `docs/specs/spec-223-kassieren-gesamtsumme-sortierung.md`.

## Akzeptanzkriterien
- [x] „Verzehr-Gesamt" ist mit `font-semibold` + voller Textfarbe hervorgehoben (wie „Gesamt" auf der Verzehr-erfassen-Seite). → `should_emphasizeVerzehrGesamtWithSemibold_when_rendered`
- [x] Getränke/Essen/Kaffee/Spende bleiben in gedämpfter Sekundärfarbe, ohne hervorgehobenes Gewicht. → `should_keepOtherCategoriesInMutedSecondary_when_rendered`
- [x] `tabular-nums` für den Betrag bleibt erhalten. → dd-Assertion in `should_emphasizeVerzehrGesamtWithSemibold_when_rendered`
- [x] Offene (`bezahlt === false`) Teilnehmer stehen oberhalb der bereits kassierten. → `should_listOffenParticipantsAboveBezahlt_when_rendered`
- [x] Innerhalb beider Gruppen weiterhin alphabetisch nach Anzeigename (stabile Sortierung). → dito (Bernd<Dora, Anna<Carla)
- [x] Null-Verzehr ohne Erhalten (abgeleitet `bezahlt`) sortiert nach unten (wie bezahlt). → `should_sortNullVerzehrParticipantIntoBezahltGroup_when_noConsumptionAndNoErhalten`
- [x] Light- und Dark-Mode korrekt. → `dark:`-Klassen in den beiden Styling-Tests mitgeprüft.
- [x] Leere Teilnehmerliste + Einzelgruppen-Fälle unverändert/fehlerfrei. → `should_showEmptyState_when_noZeilen`; Einzelgruppe durch stabile Sortierung (nur ein Sortierschlüssel) abgedeckt.

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
- Styling: `app/veranstaltung/[id]/kassieren/page.tsx` (Z. ~134–139), nur Schriftgewicht.
- Sortierung: kein DB-Feld/keine Query-Änderung; abgeleiteter Status → das kombinierte
  Array `zeilenMitKassier` stabil nach `!kassier.bezahlt` sortieren, nach dem Zippen von
  `zeile`/`kassier`/`positionen`. `Array.sort` ist stabil → Alphabetik je Gruppe bleibt.
- Kein ADR-Trigger (kleine, reversible Präsentations-Änderung; Logik in `kassierSummen.ts`
  unverändert).

### Umsetzungsnotizen (/implement, 2026-07-24)
- Nicht-ADR 2026-07-24: reine Präsentations-/Sortier-Änderung in der Server Component,
  keine der vier Trigger-Kategorien betroffen (kein Tech-/Muster-/Vertrags-/irreversibler Wechsel).
- Sortierung als `.sort((a,b) => Number(a.kassier.bezahlt) - Number(b.kassier.bezahlt))` **nach**
  dem Zippen; `kassierRows[index]` ist ohne `noUncheckedIndexedAccess` `KassierZeile` (nicht
  `| undefined`) → kein defensiver Fallback nötig (Clean-Code-Regel).
- Bestandstest `should_matchBreakdownSumToVerzehrGesamt_when_expanded` wählte implizit das erste
  `li`; nach der Sortierung (offen zuerst) explizit auf Annas Zeile umgestellt. `…forEachZeile…`
  erwartet nun `["z-2","z-1"]` (Bernd offen vor Anna bezahlt).
- Gates grün: `pnpm lint`, `pnpm test` (647 passed), `pnpm format:check`.
- **UI-Verifikation offen (Nachtest):** Kein lokaler DB-/Browser-Lauf in dieser Session; kein
  bestehendes E2E für `/kassieren`. Verhalten ist über jsdom-Komponententests (Reihenfolge +
  Klassen inkl. `dark:`) abgedeckt. Visuelle Light/Dark-Kontrolle im Browser bzw.
  `/post-merge-verify` nachziehen.

### Testnotizen (/test, 2026-07-24)
- Coverage-Analyse gezielt auf `app/veranstaltung/[id]/kassieren/page.tsx` (`vitest run --coverage
  --coverage.include`): 100 % Statements/Branches/Functions/Lines – keine Lücke.
- Jedes AC aus `spec-223` hat einen zugeordneten Test (siehe Akzeptanzkriterien-Liste oben);
  keine fehlenden Test-Fälle identifiziert. Kein Produktionscode geändert.
- Vollständige Suite grün: `pnpm test` (647 passed, 59 skipped), `pnpm lint`, `pnpm format:check`.

### Refactoring-Notizen (/refactor, 2026-07-24)
- Review (`tasks/review-223.md`) bereits APPROVED, keine kritischen/wichtigen Findings – nur
  zwei bewusst akzeptierte Nitpicks (implizite `listZeilen`-Sortiervertrag; DOM-Reihenfolge-
  gekoppelter Test-Helper), beide explizit als „kein Blocker"/„vertretbar" bewertet.
- Checkliste (Naming, Funktionslänge, Verschachtelung, Duplikation, Magic Numbers, Kommentare)
  gegen den Diff (`page.tsx`, `page.test.tsx`) geprüft: keine Verstöße gefunden. Der WHY-
  Kommentar zur Sortierung erklärt Index-Kopplungsrisiko + Stabilitätsgarantie, kein WHAT.
- Keine Code-Änderung nötig – Diff ist bereits clean. `pnpm lint`, `pnpm test` (647 passed),
  `pnpm format:check` grün (Baseline vor/nach identisch, da keine Produktionscode-Änderung).

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/223-kassieren-gesamtsumme-sortierung`
Erstellt: 2026-07-24 16:51
