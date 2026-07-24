# Task 223: kassieren-gesamtsumme-sortierung

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
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
- [ ] „Verzehr-Gesamt" ist mit `font-semibold` + voller Textfarbe hervorgehoben (wie „Gesamt" auf der Verzehr-erfassen-Seite).
- [ ] Getränke/Essen/Kaffee/Spende bleiben in gedämpfter Sekundärfarbe, ohne hervorgehobenes Gewicht.
- [ ] `tabular-nums` für den Betrag bleibt erhalten.
- [ ] Offene (`bezahlt === false`) Teilnehmer stehen oberhalb der bereits kassierten.
- [ ] Innerhalb beider Gruppen weiterhin alphabetisch nach Anzeigename (stabile Sortierung).
- [ ] Null-Verzehr ohne Erhalten (abgeleitet `bezahlt`) sortiert nach unten (wie bezahlt).
- [ ] Light- und Dark-Mode korrekt.
- [ ] Leere Teilnehmerliste + Einzelgruppen-Fälle unverändert/fehlerfrei.

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
- Styling: `app/veranstaltung/[id]/kassieren/page.tsx` (Z. ~134–139), nur Schriftgewicht.
- Sortierung: kein DB-Feld/keine Query-Änderung; abgeleiteter Status → das kombinierte
  Array `zeilenMitKassier` stabil nach `!kassier.bezahlt` sortieren, nach dem Zippen von
  `zeile`/`kassier`/`positionen`. `Array.sort` ist stabil → Alphabetik je Gruppe bleibt.
- Kein ADR-Trigger (kleine, reversible Präsentations-Änderung; Logik in `kassierSummen.ts`
  unverändert).

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/223-kassieren-gesamtsumme-sortierung`
Erstellt: 2026-07-24 16:51
