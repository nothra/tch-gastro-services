# Task 206: kassier-verzehr-uebersicht

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
Beim Kassieren je Teilnehmer eine **aufklappbare** Aufschlüsselung des erfassten Verzehrs
anzeigen (Positionen mit Menge, Bezeichnung inkl. Größe, Einzelpreis, Positionsbetrag), damit
der Thekenwart den Betrag nachvollziehbar machen kann. Rein präsentational – keine Änderung an
Preis-/Mengen-/Summen-/Status-Logik. Spec: [spec-206](../docs/specs/spec-206-kassier-verzehr-uebersicht.md).

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [ ] GIVEN Zeile mit Verzehr WHEN Seite gerendert THEN Aufschlüsselung standardmäßig eingeklappt, per Element auf-/zuklappbar.
- [ ] GIVEN eingeklappte Aufschlüsselung WHEN aufgeklappt THEN alle konsumierten Positionen (`menge > 0`) sichtbar.
- [ ] GIVEN aufgeklappte Position WHEN dargestellt THEN zeigt Menge, Bezeichnung (inkl. Größe), Einzelpreis und Positionsbetrag (2 Nachkommastellen).
- [ ] GIVEN Positionen mehrerer Kategorien WHEN angezeigt THEN sortiert nach Kategorie → Name → Größe (wie Abschlussbericht).
- [ ] GIVEN Zeile ohne Verzehr (keine Position `menge > 0`) WHEN aufgeklappt THEN Hinweis „Kein Verzehr erfasst" statt leerer Liste.
- [ ] GIVEN aufgeklappte Aufschlüsselung WHEN Positionsbeträge summiert THEN Summe = angezeigtes Verzehr-Gesamt der Zeile.
- [ ] GIVEN abgeschlossene Veranstaltung (Lese-Ansicht) WHEN Seite gerendert THEN Aufschlüsselung weiterhin je Teilnehmer aufklappbar, gleiche Angaben.
- [ ] GIVEN Position mit soft-gelöschtem Katalogartikel WHEN angezeigt THEN Position erscheint dennoch (COALESCE-Name/-Preis), Summe bleibt konsistent.

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
- Wiederverwendungs-Kandidat: `berichtPositionen` / Typ `BerichtPosition` in
  `app/veranstaltung/berichtModell.ts` liefert bereits die itemisierten Positionen je Zeile
  (Bezeichnung, Größe, Kategorie, Menge, Einzelpreis, Positionsbetrag; `menge > 0`; sortiert).
- Daten (`listPositionen`) werden auf der Kassier-Seite bereits geladen.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
- Disclosure-Feindesign (natives `<details>/<summary>` vs. Button + `aria-expanded`) → /implement.
- Markierung soft-gelöschter Artikel in der Aufschlüsselung? (geringe Tragweite) → /implement.
- Positions-Aufbereitung als geteilte reine Funktion aus `berichtModell.ts` extrahieren (SINGLE SOURCE)? → /architecture/implement.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/206-kassier-verzehr-uebersicht`
Erstellt: 2026-07-23 16:30
