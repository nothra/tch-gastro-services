# Task 209: verzehr-gesamt-summe-anzeigen

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Im Karten-Kopf der Verzehr-Erfassung soll je Teilnehmer zusätzlich zu den drei Kategorie-Summen
(Getränke · Essen · Kaffee) die **Gesamt-Summe** angezeigt werden – optisch hervorgehoben an die
bestehende Kategorie-Zeile angehängt (`… · Kaffee Z,ZZ € · Gesamt G,GG €`).

Spec: `docs/specs/spec-209-verzehr-gesamt-summe-anzeigen.md`

## Akzeptanzkriterien
- [ ] GIVEN Zeile mit Positionen in mehreren Kategorien WHEN Kopf gerendert THEN erscheint neben den Kategorie-Summen eine hervorgehobene Gesamt-Summe.
- [ ] GIVEN Positionen in Cent WHEN `gesamtCents` berechnet THEN `gesamtCents = getraenkeCents + essenCents + kaffeeCents` (exakt, ADR-021).
- [ ] GIVEN 0 Positionen WHEN Kopf gerendert THEN Gesamt = `0,00 €`.
- [ ] GIVEN nur eine Kategorie WHEN Kopf gerendert THEN Gesamt = deren Kategorie-Summe.
- [ ] GIVEN alle drei Kategorien WHEN Kopf gerendert THEN Gesamt = Summe der drei.
- [ ] GIVEN abgeschlossene Veranstaltung (`editable=false`) WHEN Kopf gerendert THEN Gesamt erscheint wie in der Erfassung.
- [ ] Unit-Test für `gesamtCents`; UI-Test für die Anzeige im Kopf.

## Technische Notizen
- Summen-Logik: `gesamtCents` in `app/_verzehr/summen.ts` (`ZeileSummen`-Typ + `zeileSummen`), DB-frei, TDD.
- Anzeige: Karten-Kopf in `app/_verzehr/VerzehrErfassung.tsx` (`ZeileKarte`, ~Zeile 109–117), Formatierung via `formatCents`.
- `ZeileKarte` ist route-neutral und wird von `/veranstaltung/[id]/verzehr` **und** `/theke/[token]` (via `IdentityGate`) genutzt → beide Seiten profitieren.
- Keine Ad-hoc-Summe in der UI – Gesamt kommt aus `summen.ts`.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/209-verzehr-gesamt-summe-anzeigen`
Erstellt: 2026-07-23 16:49
