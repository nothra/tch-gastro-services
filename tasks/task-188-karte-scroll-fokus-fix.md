# Task 188: karte-scroll-fokus-fix

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
<!-- Was soll implementiert werden? -->

Bug #188: Auf der öffentlichen Verzehr-Erfassen-Seite (Selbstbedienung, `app/theke/[token]/`)
springt der Fokus zur ausgewählten Teilnehmer-Karte fehlerhaft:

1. **Screenshot 1 – Kopf verdeckt:** Klick auf einen Namens-Chip öffnet die richtige Karte,
   der Karten-Kopf mit dem Namen ist aber nicht sichtbar (man landet direkt auf „GETRÄNK").
2. **Screenshot 2 – Karte außerhalb des Sichtbereichs:** teils nur der untere Rand der Karte
   sichtbar.

Betrifft die in #183 eingeführte `FokusListe` (ADR-035), Route-neutrale `ZeileKarte` aus
`app/_verzehr/`.

## Reproduktion

1. Veranstaltungs-Link (Selbstbedienung) öffnen.
2. Namen wählen und Namen aus der sticky Chip-Leiste anklicken.
3. Beobachten: Karten-Kopf/Name nicht sichtbar; teils nur unterer Kartenrand im Viewport.

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [ ] AC1: Die Zielkarte reserviert ein `scroll-margin-top` in Höhe der sticky Chip-Leiste, damit
      der Karten-Kopf (Name) beim `scrollIntoView` nicht hinter der Leiste verschwindet
      (Screenshot 1). Nur im collapsible/F7-Modus – die flache F5-Karte bleibt unverändert.
- [ ] AC2: Der Scroll zur Zielkarte erfolgt erst **nach** dem Layout-Update (via
      `requestAnimationFrame`), nicht synchron im selben Tick wie `setOpenId` (Screenshot 2).

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

- `FokusListe.tsx:41-48` (`waehleZiel`) ruft `setOpenId(id)` + `scrollIntoView` im selben Tick.
- Sticky Chip-Leiste: `FokusListe.tsx:60-64` (`sticky top-0 z-10 … py-2`).
- Scroll-Container ist das Fenster (kein `overflow`-Wrapper) → `scroll-padding-top` wäre global;
  daher `scroll-margin-top` an der Zielkarte (scoped auf collapsible-Modus, F5 unberührt).

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `fix/188-karte-scroll-fokus-fix`
Erstellt: 2026-07-20 17:09
