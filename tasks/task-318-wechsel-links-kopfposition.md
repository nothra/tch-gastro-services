# Task 318: wechsel-links-kopfposition

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Der personenbezogene Wechsel-Link aus #308 (`Kassieren →` in der Verzehr-Karte) steht heute am
Fuß der Teilnehmer-Karte. Er wird an den Kartenkopf verschoben – direkt unter den Anzeigenamen.
Pfeilrichtung, Link-Text, Zielsemantik und die Sichtbarkeitsregeln aus #308 bleiben unverändert.

**Scope-Entscheidung (Requirements-Gespräch):** Die Kassier-Karte (`← Verzehr erfassen`) bleibt
unverändert – abweichend vom ursprünglichen Issue-Text #318 wird dort nichts verschoben.

Spec: [docs/specs/spec-318-wechsel-links-kopfposition.md](../docs/specs/spec-318-wechsel-links-kopfposition.md)

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [x] AK1 – Position in der Verzehr-Karte: `Kassieren →` unmittelbar unter dem Kartenkopf
      (Name + Summenzeile), oberhalb der ersten Erfassungs-Sektion
- [x] AK2 – Sichtbarkeitsregeln aus spec-308 (AK7/AK9/AK10) unverändert, nur an neuer Position
- [x] AK3 – Zielsemantik des Links (`kassierenHref`, Hervorhebung/Fokus) unverändert
- [x] AK4 – `VerzehrErfassung.tsx`/`ZeileKarte` bleibt route-neutral (ADR-039 D1)
- [x] AK5 – Bestehende Tests der Verzehr-Karte auf neue Position umgestellt, mit expliziter
      Reihenfolge-Assertion (Name → Link → Körper), nicht nur Anwesenheit; Kassier-Karte
      bleibt unverändert (keine Test-Anpassung dort)

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
Kein ADR-Trigger (reine Positionsänderung eines bestehenden Slots, keine neue Technologie/
Architektur/Schnittstelle/irreversible Konsequenz).

Umsetzung: In `ZeileKarte` (`app/_verzehr/VerzehrErfassung.tsx`) wird `{koerperSichtbar && aktion}`
jetzt direkt nach dem Kopf gerendert statt nach dem letzten Erfassungs-Abschnitt. Der `aktion`-Slot
selbst bleibt unverändert (ein einzelner, vom Konsumenten gelieferter `ReactNode`) – `FokusListe`
und die Verzehr-Seite brauchten keine Änderung, da sie nur den Slot befüllen, nicht seine Position
bestimmen.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
Keine offenen fachlichen Fragen – Details zur Kopf-Abgrenzung (Name+Summenzeile vs. nur Name)
sind in der Spec unter „Offene Fragen" bereits entschieden.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/318-wechsel-links-kopfposition`
Erstellt: 2026-09-09 17:54
