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

**Runde 1** (`tasks/review-318.md`, `NEEDS_REWORK`): keine kritischen, vier wichtige Findings,
sechs Nitpicks. Kein funktionaler Defekt – alle wichtigen Findings betreffen die Beweiskraft des
neuen Reihenfolge-Tests und die Präzision des Kommentarblocks:

1. AK1s „unmittelbar" ist nicht assertiert (`toBeGreaterThan` statt `toBe(kopfIndex + 1)`) –
   per Mutation gemessen: ein Fremd-Element zwischen Kopf und Slot lässt alle 40 Tests grün.
2. Reihenfolge-Nachweis liegt auf dem Pfad ohne `collapsible`, obwohl der einzige
   Produktions-Konsument (`FokusListe`) immer `collapsible` rendert.
3. Kommentar-Widerspruch in `VerzehrErfassung.tsx:69` vs. `:74-77` („Körper" trägt zwei
   Bedeutungen; „entfällt nur der Erfassungs-Körper" ist unvollständig).
4. Markup-gekoppelte/asymmetrische Test-Anker (`tagName === "SECTION"`,
   `textContent === "Kassieren"` vs. `includes("Anna")`).

Ein Out-of-Scope-Fund (ADR-035 D2, Ungenauigkeit aus #308) ist unterhalb der Issue-Schwelle in
`docs/factory/kleinfunde.md` festgehalten.

**Rework nach Runde 1:** Alle vier wichtigen Findings behoben:
1. `expect(aktionIndex).toBe(kopfIndex + 1)` statt `toBeGreaterThan` – belegt „unmittelbar" (AK1).
2. Reihenfolge-Test nutzt jetzt `collapsible: true, open: true` – deckt den ausgelieferten
   Kopf-`<button>`-Pfad ab (Produktionskombination von `FokusListe`).
3. Kommentar in `VerzehrErfassung.tsx:74-77` korrigiert: `aktion` teilt das Sichtbarkeits-Gate
   `koerperSichtbar`, statt widersprüchlich „am Körper zu hängen"; Zeile 69 nennt jetzt
   „Erfassungs-Körper und Aktion" beim Einklappen.
4. Indizes im Reihenfolge-Test über verhaltensnahe Marker (`getByText("Anna")`,
   `getByRole("link", { name: "Kassieren" })`, `getByTestId("menge")`) statt Markup/Text-Substring.

Verifiziert: `pnpm vitest run` über alle vier Testdateien → 112/112 grün, `pnpm lint` grün.

**Runde 2** (`tasks/review-318.md`, `NEEDS_REWORK`): keine kritischen Findings, zwei wichtige,
sechs Nitpicks. Alle vier wichtigen Findings aus Runde 1 sind behoben – der Kernfund (AK1
„unmittelbar") ist per Mutation gemessen geschlossen: ein Fremd-Element zwischen Kopf und Slot
macht jetzt genau die Adjazenz-Assertion rot (vorher blieben alle 40 Tests grün). Offen bleiben
zwei Präzisionsfehler in Artefakten dieses PRs:

1. `docs/factory/kleinfunde.md:293` – die Anker `VerzehrErfassung.tsx:113`/`:148` sind durch den
   eigenen Rework-Commit `1a2d137` um eine Zeile verschoben (korrekt: `:114`/`:149`); der
   Dateikopf verlangt verifizierte Anker (Rezidiv-Muster #291).
2. `app/_verzehr/VerzehrErfassung.test.tsx:607` – der von Runde 1 (W3) beanstandete Wortlaut
   „hängt am sichtbaren Körper" steht unverändert in der Geschwister-Kopie und widerspricht dem
   Nachbartest `:615` („nicht mehr am Fuß des Körpers"); Rezidiv-Muster #264 (Grep auf kopierte
   Stellen im selben PR).

**Rework nach Runde 2:** Beide Präzisionsfehler behoben:
1. `docs/factory/kleinfunde.md:294` – Anker korrigiert auf `VerzehrErfassung.tsx:114`/`:149`
   (gegen die aktuelle Datei verifiziert).
2. `app/_verzehr/VerzehrErfassung.test.tsx:607-608` – Wortlaut auf „teilt das Sichtbarkeits-Gate
   des Körpers, sitzt aber nicht mehr im Körper selbst (seit #318)" korrigiert, widerspruchsfrei
   zum Nachbartest `:614-617`.

Verifiziert: `pnpm vitest run app/_verzehr/VerzehrErfassung.test.tsx` → 40/40 grün.

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/318-wechsel-links-kopfposition`
Erstellt: 2026-09-09 17:54
