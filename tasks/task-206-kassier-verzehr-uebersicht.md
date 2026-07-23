# Task 206: kassier-verzehr-uebersicht

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [x] Codify ausgeführt
- [x] Fertig / PR erstellt

## Beschreibung
<!-- Was soll implementiert werden? -->
Zwei präsentationale Verfeinerungen auf der Kassier-Seite (rein Anzeige, keine Änderung an
Preis-/Mengen-/Summen-/Status-Logik). Spec: [spec-206](../docs/specs/spec-206-kassier-verzehr-uebersicht.md).
1. Je Teilnehmer eine **aufklappbare** Aufschlüsselung des erfassten Verzehrs (Positionen mit
   Menge, Bezeichnung inkl. Größe, Einzelpreis, Positionsbetrag), damit der Thekenwart den
   Betrag nachvollziehbar machen kann.
2. Kategorie **„Sonstige" → „Essen" + „Kaffee"** auflösen (Teilnehmer-Zusammenfassung UND
   Tagessummen, analog spec-138); Verzehr-Gesamt bleibt und wird **hervorgehoben**.

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [x] GIVEN Zeile mit Verzehr WHEN Seite gerendert THEN Aufschlüsselung standardmäßig eingeklappt, per Element auf-/zuklappbar.
- [x] GIVEN eingeklappte Aufschlüsselung WHEN aufgeklappt THEN alle konsumierten Positionen (`menge > 0`) sichtbar.
- [x] GIVEN aufgeklappte Position WHEN dargestellt THEN zeigt Menge, Bezeichnung (inkl. Größe), Einzelpreis und Positionsbetrag (2 Nachkommastellen).
- [x] GIVEN Positionen mehrerer Kategorien WHEN angezeigt THEN sortiert nach Kategorie → Name → Größe (wie Abschlussbericht).
- [x] GIVEN Zeile ohne Verzehr (keine Position `menge > 0`) WHEN aufgeklappt THEN Hinweis „Kein Verzehr erfasst" statt leerer Liste.
- [x] GIVEN aufgeklappte Aufschlüsselung WHEN Positionsbeträge summiert THEN Summe = angezeigtes Verzehr-Gesamt der Zeile.
- [x] GIVEN abgeschlossene Veranstaltung (Lese-Ansicht) WHEN Seite gerendert THEN Aufschlüsselung weiterhin je Teilnehmer aufklappbar, gleiche Angaben.
- [x] GIVEN Position mit soft-gelöschtem Katalogartikel WHEN angezeigt THEN Position erscheint dennoch (COALESCE-Name/-Preis), Summe bleibt konsistent.
- [x] GIVEN Teilnehmer-Zusammenfassung WHEN gerendert THEN Getränke · Essen · Kaffee getrennt (kein „Sonstige").
- [x] GIVEN Tagessummen WHEN gerendert THEN Getränke · Essen · Kaffee je eigene Summenzeile (kein „Sonstige").
- [x] GIVEN nur Getränke-Positionen WHEN Zusammenfassung gerendert THEN alle drei Kategorien sichtbar, Essen/Kaffee mit 0,00 €.
- [x] GIVEN Kategorie-Beträge WHEN Verzehr-Gesamt angezeigt THEN `Getränke + Essen + Kaffee`, Betrag visuell hervorgehoben.

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
- Wiederverwendungs-Kandidat: `berichtPositionen` / Typ `BerichtPosition` in
  `app/veranstaltung/berichtModell.ts` liefert bereits die itemisierten Positionen je Zeile
  (Bezeichnung, Größe, Kategorie, Menge, Einzelpreis, Positionsbetrag; `menge > 0`; sortiert).
- Daten (`listPositionen`) werden auf der Kassier-Seite bereits geladen.
- Kategorie-Auflösung ist reine Anzeige: `KassierZeile`/`KassierTagessummen` führen `essenCents`
  und `kaffeeCents` bereits getrennt (`kassierSummen.ts`). `sonstigeCents` wird für die Anzeige
  nicht mehr gebraucht – ob das Feld entfernt wird, entscheidet /implement bzw. /refactor
  (weitere Konsumenten prüfen: `berichtModell.ts` nutzt `sonstigeCents` weiter).
- **Entscheidung `sonstigeCents`:** Feld **behalten**. Der Abschlussbericht (`berichtModell.ts`)
  ist weiterhin Konsument (`sonstigeCents: kassier.sonstigeCents`). Ein Entfernen läge außerhalb
  des Scopes dieser rein präsentationalen Task (F8) und beträfe fremde Renderer (F9) – kein
  Gold-Plating.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
- ~~Disclosure-Feindesign (natives `<details>/<summary>` vs. Button + `aria-expanded`)~~
  → **entschieden:** natives `<details>/<summary>` (standardmäßig eingeklappt, tastaturbedienbar,
  kein Client-JS → Kassier-Seite bleibt Server Component). `VerzehrAufschluesselung.tsx`.
- ~~Markierung soft-gelöschter Artikel in der Aufschlüsselung?~~ → **entschieden:** keine
  Sonder-Markierung (analog Abschlussbericht F9). Die Position erscheint mit COALESCE-Name/-Preis,
  damit die Summe konsistent bleibt (`should_showSoftDeletedArticleInBreakdown` deckt das ab).
- ~~Positions-Aufbereitung als geteilte reine Funktion extrahieren (SINGLE SOURCE)?~~
  → **entschieden: ja.** `berichtPositionen`/`gruppiereNachZeile`/`artikelBezeichnung`/`BerichtPosition`
  aus `berichtModell.ts` in das route-neutrale `app/_verzehr/positionen.ts` gezogen
  (`verzehrPositionen`, `gruppierePositionenNachZeile`, `VerzehrPositionDetail`). `berichtModell.ts`
  re-exportiert `artikelBezeichnung` + `BerichtPosition` als Fassade für die Excel-/PDF-Renderer –
  ein einziger Wahrheitspfad für Bericht und Kassier-Aufschlüsselung. Rein präsentational, kein
  ADR-Trigger (Schritt 0: keine der vier Kategorien greift).

## Review-Findings
<!-- Wird durch /review befüllt -->
Details in [review-206](../tasks/review-206.md) (Runde 3, Empfehlung `APPROVED`; der einzige
Rework-Grund aus Runde 2 – React-Key-Kollision – ist behoben, keine offenen kritischen/wichtigen
Findings).

## Refactoring-Notizen
- **React-Key-Kollision behoben** (einziger Rework-Grund aus Review Runde 2):
  `VerzehrAufschluesselung.tsx` nutzte `${category}-${name}-${size}` als `key` – zwei
  Katalog-Artikel mit identischem Namen/Größe (z. B. soft-gelöschter + neu angelegter Zwilling,
  ADR-033 D2) hätten denselben Key erzeugt. Fix: Index-basierter Key auf dem deterministisch
  sortierten, nie umgeordneten `positionen`-Array – lokal, kein neues Verhalten.
- **Nitpick behoben:** `CATEGORY_ORDER` in `app/_verzehr/positionen.ts` nicht mehr `export`iert
  (kein externer Konsument – nur intern in `verzehrPositionen` genutzt, per Grep verifiziert).
- Verbleibende Nitpicks aus review-206 (Order-Duplikat mit `VerzehrErfassung.tsx`,
  ADR-Kommentar-Referenz, `scope="col"` auf `sr-only`-Kopfzeile, Test-Redundanzhinweis) bewusst
  nicht angefasst – außerhalb des Scopes bzw. Gold-Plating.
- Gates nach dem Fix: Lint grün, Typecheck grün, Format grün, Routen-Doku synchron,
  633/633 Tests grün (692 inkl. 59 skipped) – identisch grün vor und nach dem Refactoring.

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->
Neue Lesson `docs/factory/lessons/frontend-react.md` („`.map`-Key aus Anzeigefeldern statt
stabilem Identifier ist eine latente Kollisionsquelle", aus #206) + Index-Zeile in
`docs/factory/PROJECT-CONTEXT.md`. Details: [codify-206](../tasks/codify-206.md). Security-Review
und übrige Nitpicks lieferten kein neues, wiederkehrendes Muster.

---
Branch: `feature/206-kassier-verzehr-uebersicht`
Erstellt: 2026-07-23 16:30
