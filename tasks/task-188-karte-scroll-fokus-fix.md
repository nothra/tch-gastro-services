# Task 188: karte-scroll-fokus-fix

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
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
- [x] AC1: Die Zielkarte reserviert ein `scroll-margin-top` in Höhe der sticky Chip-Leiste, damit
      der Karten-Kopf (Name) beim `scrollIntoView` nicht hinter der Leiste verschwindet
      (Screenshot 1). Nur im collapsible/F7-Modus – die flache F5-Karte bleibt unverändert.
- [x] AC2: Der Scroll zur Zielkarte erfolgt erst **nach** dem Layout-Update (via
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

Multi-Persona-Review (Runde 1) → **APPROVED**, keine kritischen Findings. Details in
`tasks/review-188.md`.
- Wichtig (nicht blockierend): `scroll-mt-16` in der route-neutralen `ZeileKarte` koppelt an die
  F7-Chip-Leisten-Höhe (leaky abstraction) – Kandidat für `/refactor` (kein Verhaltens-Change).
- Nitpicks: ADR-035 D3 zitiert den scrollIntoView-Aufruf inline ohne rAF; rAF-Callback ohne
  Cancel-on-Unmount (nachweislich harmlos).

## Root Cause & Fix

Root Cause [2026-07-21]: Zwei gekoppelte Ursachen in der #183-Fokusliste –
1. `FokusListe.tsx:45` – `scrollIntoView({block:"start"})` richtet den Kartenkopf an der
   Viewport-Oberkante aus; die sticky Chip-Leiste (`FokusListe.tsx:60-64`, `top-0`) verdeckt ihn,
   weil kein `scroll-margin-top` reserviert ist (Screenshot 1).
2. `FokusListe.tsx:41-48` – `setOpenId(id)` und `scrollIntoView` liefen im selben Tick; gescrollt
   wurde gegen das noch eingeklappte Layout. Nach dem Reflow (andere Karte klappt zu, Ziel klappt
   auf) rutschte das Ziel aus dem Sichtbereich, nur der untere Rand blieb (Screenshot 2).

Fix:
- `app/_verzehr/VerzehrErfassung.tsx:113-121` – `<li>` der `ZeileKarte` erhält `scroll-mt-16`
  **nur** im `collapsible`-Modus (F7). F5 (flach) bleibt ohne Margin.
- `app/theke/[token]/FokusListe.tsx:41-51` – `scrollIntoView` in `requestAnimationFrame`
  verlagert, läuft also erst nach dem durch `setOpenId` ausgelösten Reflow.

Verifikation: 3 Reproduktionstests (RED→GREEN) + 1 Scope-Guard; volle Suite 608 grün.
Hinweis: Der visuelle Beweis (Screenshots 1/2) erfordert eine seed-befüllte Veranstaltung mit
Token und genug Teilnehmern zum Scrollen – nicht als lokaler Browser-Check ausgeführt; das
Scroll-Verhalten ist in jsdom nicht layoutbar und wird deterministisch über den rAF-/Klassen-Test
abgesichert.

## Refactoring

`/refactor` (kein neues Verhalten – 608 grün vor und nach, Verhalten identisch):
- Wichtiges Review-Finding behoben: `scroll-mt-16` aus der route-neutralen `ZeileKarte` entfernt
  (war an `collapsible` gekoppelt = leaky abstraction). `ZeileKarte` bekommt stattdessen eine
  optionale `className`-Prop, die auf das Wurzel-`<li>` gemergt wird; das F7-Offset gibt jetzt der
  Konsument `FokusListe` vor (`className="scroll-mt-16"` mit Rationale-Kommentar).
- `collapsible` bedeutet damit wieder ausschließlich „einklappbar", nicht „liegt unter einer
  sticky Leiste". Import-Richtung/Route-Neutralität (Codify #52) gestärkt.
- Tests nachgezogen: die zwei ZeileKarte-Unit-Tests prüfen nun den `className`-Vertrag
  (`should_mergeClassNameOntoRoot_when_classNameProvided` / `should_keepBaseClassesOnly_when_noClassName`);
  der FokusListe-Integrationstest (`…ClearingChipBar…`) bleibt unverändert grün und sichert das
  reale App-Verhalten (Karte in F7 trägt weiterhin `scroll-mt-16`).

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

Muster, das den Bug verursachte: `scrollIntoView` (oder generell layout-abhängige Messungen)
unmittelbar nach einem `setState`, das das Layout ändert, im selben Event-Tick aufgerufen – läuft
gegen das alte Layout. Fix-Muster: layout-abhängige Aktion in `requestAnimationFrame` (nach dem
Reflow). Zweitmuster: `scrollIntoView` unter einem sticky/fixed Header ohne `scroll-margin-top`
am Ziel (bzw. `scroll-padding-top` am Scroll-Container) verdeckt das Ziel.

---
Branch: `fix/188-karte-scroll-fokus-fix`
Erstellt: 2026-07-20 17:09
