# Spec: Kassiervorgang – Gesamtsumme hervorheben + offene Vorgänge oben

## Kontext

Auf der Kassierseite (`/veranstaltung/[id]/kassieren`) ist der pro Teilnehmer zu
kassierende Betrag („Verzehr-Gesamt") aktuell nur mit `font-medium` leicht gewichtet und
steht gleichrangig neben Getränke/Essen/Kaffee/Spende – er sticht kaum heraus. Zugleich ist
die Teilnehmerliste rein alphabetisch sortiert, sodass der Thekenwart die noch **offenen**
Kassiervorgänge in der Liste suchen muss. Beides erschwert die Bar-Abrechnung.

Ziel: Der zu kassierende Betrag wird optisch so hervorgehoben wie „Gesamt" auf der
Verzehr-erfassen-Seite, und noch nicht kassierte Teilnehmer stehen oben.

Quelle: Issue #223. Verwandt: [ADR-033](../adr/033-kassieren-abschluss.md) (abgeleiteter
Zeilenstatus), `spec-55-kassieren-abschluss.md`, `spec-209-verzehr-gesamt-summe-anzeigen.md`.

## Scope

**Inbegriffen:**
- Visuelle Hervorhebung von „Verzehr-Gesamt" auf der Kassierseite (Schriftgewicht
  `font-medium` → `font-semibold`; volle Textfarbe bleibt), analog zum „Gesamt"-Span in
  `app/_verzehr/VerzehrErfassung.tsx`.
- Sortierung der Kassier-Teilnehmerliste: offene (noch nicht vollständig kassierte)
  Teilnehmer zuoberst, bereits kassierte darunter; innerhalb beider Gruppen weiterhin
  alphabetisch nach Anzeigename.

**Nicht inbegriffen:**
- Kein neues DB-Feld und keine Änderung der DB-Sortierung (`listZeilen` bleibt
  `.orderBy(anzeigename)`); die Gruppierung basiert auf dem abgeleiteten Offen-Status.
- Keine Änderung der Berechnungslogik in `app/veranstaltung/kassierSummen.ts`
  (bezahlt/offen, Spende, Tagessummen bleiben unverändert).
- Keine Änderung an der Verzehr-erfassen-Seite (nur Referenz).
- Kein Umstyling anderer Kategorien (Getränke/Essen/Kaffee/Spende) oder anderer Seiten.

## Akzeptanzkriterien

- [ ] GIVEN die Kassierseite einer Veranstaltung mit Teilnehmern WHEN sie gerendert wird
  THEN ist „Verzehr-Gesamt" mit `font-semibold` und voller Textfarbe
  (`text-zinc-900 dark:text-zinc-100`) hervorgehoben – dieselbe Gewichtung wie „Gesamt" auf
  der Verzehr-erfassen-Seite.
- [ ] GIVEN dieselbe Seite WHEN sie gerendert wird THEN bleiben Getränke, Essen, Kaffee und
  Spende in der gedämpften Sekundärfarbe (`text-zinc-600 dark:text-zinc-400`) und ohne
  hervorgehobenes Schriftgewicht.
- [ ] GIVEN die Betragsausrichtung WHEN „Verzehr-Gesamt" dargestellt wird THEN bleibt
  `tabular-nums` erhalten.
- [ ] GIVEN eine Teilnehmerliste mit teils offenen, teils bereits kassierten Zeilen WHEN die
  Kassierseite gerendert wird THEN erscheinen alle **offenen** (`bezahlt === false`)
  Teilnehmer oberhalb aller **bezahlten** Teilnehmer.
- [ ] GIVEN mehrere Teilnehmer mit demselben Offen-/Bezahlt-Status WHEN die Liste sortiert
  wird THEN bleiben sie innerhalb ihrer Gruppe alphabetisch nach Anzeigename geordnet (stabile
  Sortierung über die bereits alphabetisch gelieferten Zeilen).
- [ ] GIVEN ein Teilnehmer mit 0,00 € Verzehr und ohne „Erhalten" (abgeleitet
  `bezahlt === true`) WHEN die Liste sortiert wird THEN steht er in der **bezahlt**-Gruppe
  (unten) – konsistent mit dem angezeigten „bezahlt"-Badge; kein Sonderfall.
- [ ] GIVEN Light- und Dark-Mode WHEN die Seite dargestellt wird THEN ist die Hervorhebung in
  beiden Modi korrekt.

## Fehlerszenarien / Randfälle

- [ ] GIVEN eine Veranstaltung ohne Teilnehmer WHEN die Kassierseite gerendert wird THEN
  bleibt die bestehende „Noch keine Teilnehmer erfasst."-Anzeige unverändert (keine
  Sortierung nötig, kein Fehler).
- [ ] GIVEN alle Teilnehmer sind bereits kassiert (bzw. alle offen) WHEN sortiert wird THEN
  bleibt die alphabetische Reihenfolge über die gesamte Liste erhalten (nur eine Gruppe).
- [ ] Die Zuordnung `zeile ↔ kassier ↔ positionen` (aktuell per Index gezippt) muss beim
  Umsortieren zusammenbleiben – sortiert wird das bereits kombinierte Objekt, nicht die
  Einzel-Arrays getrennt.

## Technische Notizen

- **Styling (Teil 1):** In `app/veranstaltung/[id]/kassieren/page.tsx` (aktuell Z. 134–139)
  bei `dt`/`dd` von „Verzehr-Gesamt" `font-medium` → `font-semibold`; Textfarbe bleibt.
- **Sortierung (Teil 2):** Der Offen-Status ist abgeleitet (`kassierSummen.ts`,
  `bezahlt = (erhalten ?? 0) >= verzehrGesamtCents`) und nicht in der DB. Daher **nicht** in
  der Drizzle-Query sortieren, sondern das bereits kombinierte Array `zeilenMitKassier` in der
  Server Component stabil nach `!kassier.bezahlt` umsortieren. Da `listZeilen` bereits
  alphabetisch liefert und `Array.prototype.sort` seit ES2019 **stabil** ist, bleibt die
  alphabetische Ordnung je Gruppe automatisch erhalten – kein zweites Sortierkriterium nötig.
- Sortierung erst **nach** dem Zippen von `zeile`, `kassier` und `positionen` (Z. ~63–67),
  damit die Index-Kopplung nicht bricht.

## Offene Fragen

- [ ] Keine offen. (Null-Verzehr-Randfall geklärt: sortiert wie „bezahlt" nach unten.)
