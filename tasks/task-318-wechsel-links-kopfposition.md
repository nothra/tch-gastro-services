# Task 318: wechsel-links-kopfposition

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Die beiden personenbezogenen Wechsel-Links aus #308 (`Kassieren →` in der Verzehr-Karte,
`← Verzehr erfassen` in der Kassier-Karte) stehen heute am Fuß der jeweiligen Teilnehmer-Karte.
Sie werden an den Kartenkopf verschoben – direkt unter den Anzeigenamen. Pfeilrichtungen,
Link-Texte, Zielsemantik und die Sichtbarkeitsregeln aus #308 bleiben unverändert.

Spec: [docs/specs/spec-318-wechsel-links-kopfposition.md](../docs/specs/spec-318-wechsel-links-kopfposition.md)

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [ ] AK1 – Position in der Verzehr-Karte: `Kassieren →` unmittelbar unter dem Kartenkopf
      (Name + Summenzeile), oberhalb der ersten Erfassungs-Sektion
- [ ] AK2 – Position in der Kassier-Karte: `← Verzehr erfassen` unmittelbar unter dem
      Namensblock (Name + Status-Badge), oberhalb der Beträge-Zeile
- [ ] AK3 – Sichtbarkeitsregeln aus spec-308 (AK7/AK9/AK10) unverändert, nur an neuer Position
- [ ] AK4 – Zielsemantik der Links (`kassierenHref`/`verzehrHref`, Hervorhebung/Fokus) unverändert
- [ ] AK5 – `VerzehrErfassung.tsx`/`ZeileKarte` bleibt route-neutral (ADR-039 D1)
- [ ] AK6 – Bestehende Tests auf neue Position umgestellt, mit expliziter
      Reihenfolge-Assertion (Name → Link → Körper), nicht nur Anwesenheit

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

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
