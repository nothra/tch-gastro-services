# Spec: Kassier-Übersicht – Verzehr je Teilnehmer aufschlüsseln

> Issue #206 · Anzeige-/UX-Verfeinerung von Feature F8 ([spec-55](spec-55-kassieren-abschluss.md)) ·
> Epic [Digitale Veranstaltungs-Abrechnung](README-montagsrunde.md)
>
> **Kein neues fachliches Verhalten** – Preise, Mengen, Summen, Spende und Zeilenstatus bleiben
> unverändert. Diese Spec betrifft ausschließlich die **Darstellung** des bereits erfassten
> Verzehrs auf der Kassier-Seite (`app/veranstaltung/[id]/kassieren`).

## Kontext

Beim Kassieren einer Teilnehmerzeile zeigt die Kassier-Seite
([app/veranstaltung/[id]/kassieren/page.tsx](../../app/veranstaltung/[id]/kassieren/page.tsx))
heute je Teilnehmer nur die **Kategorie-Summen** (Getränke, Sonstige = Essen + Kaffee,
Verzehr-Gesamt, Spende) plus das „Erhalten"-Feld. **Welche** Getränke, welches Essen und
welcher Kaffee auf die Zeile gebucht sind, ist nicht sichtbar.

Der Thekenwart braucht diese Aufschlüsselung, um korrekt abzurechnen und dem Teilnehmer/der
Familie den zu zahlenden Betrag **nachvollziehbar** zu machen („2 × Pils · 0,5 l à 1,50 € =
3,00 €, 1 × Schnitzel = 8,50 € …").

Die itemisierte Positions-Logik existiert bereits als reine, DB-freie Funktion für den
Abschlussbericht: `berichtPositionen` / Typ `BerichtPosition`
([app/veranstaltung/berichtModell.ts](../../app/veranstaltung/berichtModell.ts)) liefert pro
Zeile die konsumierten Artikel (Bezeichnung, Größe, Kategorie, Menge, Einzelpreis,
Positionsbetrag), gefiltert auf `menge > 0` und deterministisch sortiert
(Kategorie → Name → Größe). Die Positionsdaten (`listPositionen`, inkl. aufgelöstem
Name/Größe/Preis via COALESCE) werden auf der Kassier-Seite bereits geladen.

## Scope

**Inbegriffen:**
- Je Teilnehmerzeile eine **aufklappbare** Verzehr-Aufschlüsselung (Disclosure), **standardmäßig
  eingeklappt**. Beim Aufklappen erscheinen die einzelnen konsumierten Positionen der Zeile.
- Jede Positionszeile enthält: **Menge**, **Bezeichnung** (Artikelname inkl. Größe, falls
  vorhanden), **Einzelpreis** und **Positionsbetrag** (`Menge × Einzelpreis`).
- Nur tatsächlich konsumierte Positionen (`menge > 0`); deterministische Sortierung nach
  Kategorie → Name → Größe (identisch zur Bericht-Reihenfolge).
- Sichtbar in **beiden** Veranstaltungs-Zuständen: **offen** (während des Kassierens) **und**
  **abgeschlossen** (Lese-Ansicht) – konsistent zur Summen-Anzeige, die ebenfalls in beiden
  Zuständen erscheint.
- Beträge in Cent gerechnet, Anzeige de-DE mit 2 Nachkommastellen (`formatCents`).

**Nicht inbegriffen:**
- Änderung an Preis-, Mengen-, Summen-, Spende- oder Status-Logik (rein präsentational; die
  bestehenden reinen Summen-Funktionen bleiben die einzige Wahrheitsquelle).
- Erfassen/Ändern von Verzehr auf der Kassier-Seite (das ist Feature F5, eigene Route
  `…/verzehr`) – hier wird nur **angezeigt**.
- Änderungen am Abschlussbericht (F9, #185) oder an der Verzehr-Erfassung (F5).
- Anzeige/Verrechnung von Auslagen in der Aufschlüsselung (eigener Vorgang F6, unverändert).
- Die **exakte** visuelle Ausgestaltung der Aufschlüsselung (Tabelle vs. Liste, Icons,
  Gruppen-Überschriften je Kategorie) → Feindesign in `/implement` bzw. `/architecture`.

## Akzeptanzkriterien

- [ ] GIVEN eine Teilnehmerzeile mit erfasstem Verzehr WHEN die Kassier-Seite gerendert wird
      THEN ist die Verzehr-Aufschlüsselung dieser Zeile **standardmäßig eingeklappt** und über
      ein bedienbares Element (aufklappen/zuklappen) zugänglich.
- [ ] GIVEN eine eingeklappte Zeilen-Aufschlüsselung WHEN der Nutzer sie aufklappt THEN werden
      alle konsumierten Positionen (`menge > 0`) der Zeile angezeigt.
- [ ] GIVEN eine aufgeklappte Position WHEN sie dargestellt wird THEN zeigt sie **Menge**,
      **Bezeichnung** (inkl. Größe, falls vorhanden), **Einzelpreis** und **Positionsbetrag**
      (`Menge × Einzelpreis`, 2 Nachkommastellen).
- [ ] GIVEN eine Zeile mit Positionen mehrerer Kategorien WHEN die Aufschlüsselung angezeigt
      wird THEN erscheinen die Positionen deterministisch sortiert nach Kategorie → Name →
      Größe (identisch zur Abschlussbericht-Reihenfolge).
- [ ] GIVEN eine Zeile ohne jeden erfassten Verzehr (keine Position mit `menge > 0`) WHEN die
      Aufschlüsselung geöffnet wird THEN wird ein Hinweis „Kein Verzehr erfasst" angezeigt
      (keine leere Liste).
- [ ] GIVEN eine aufgeklappte Zeilen-Aufschlüsselung WHEN die Positionsbeträge summiert werden
      THEN entspricht ihre Summe dem angezeigten **Verzehr-Gesamt** der Zeile (die
      Aufschlüsselung ist konsistent zur bestehenden Summe, kein zweiter Wahrheitspfad).
- [ ] GIVEN eine **abgeschlossene** Veranstaltung (Lese-Ansicht) WHEN die Kassier-Seite
      gerendert wird THEN ist die Verzehr-Aufschlüsselung je Teilnehmer weiterhin verfügbar
      (aufklappbar), mit denselben Positionsangaben wie im offenen Zustand.

## Fehlerszenarien

- [ ] GIVEN eine konsumierte Position, deren Katalogartikel zwischenzeitlich soft-gelöscht wurde
      („nicht mehr im Katalog", ADR-026) WHEN die Aufschlüsselung angezeigt wird THEN erscheint
      die Position dennoch (mit ihrem aufgelösten Namen/Preis via COALESCE), damit die Summe der
      Positionsbeträge dem Verzehr-Gesamt entspricht.

## Offene Fragen (für /architecture bzw. /implement)

- [ ] Feindesign der Disclosure: natives `<details>/<summary>` vs. Button mit `aria-expanded`
      (Barrierefreiheit sicherstellen) → `/implement`.
- [ ] Ob soft-gelöschte Artikel in der Aufschlüsselung zusätzlich als „nicht mehr im Katalog"
      markiert werden (der Abschlussbericht markiert sie derzeit nicht) → `/implement`, geringe
      Tragweite.
- [ ] Ob die Positions-Aufbereitung als geteilte reine Funktion aus `berichtModell.ts`
      extrahiert/wiederverwendet wird (SINGLE SOURCE) statt einer zweiten Ableitung →
      `/architecture`/`/implement` (kein ADR-Trigger erwartet, da rein präsentational).
