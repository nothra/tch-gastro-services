# Review: Task 206

Review-Runde 3 (nach Refactor-Commit `483d80f`, der den einzigen Rework-Grund aus Runde 2 – die
React-`key`-Kollision auf `VerzehrAufschluesselung.tsx` – behoben hat). Drei unabhängige
Perspektiven (Logik/Korrektheit · Code-/Testqualität · Architektur/Patterns) auf dem exakten
Diff-Scope `git diff origin/main...HEAD` (14 Dateien; lokales `main` hing hinter `origin/main`,
`main...HEAD` hätte fälschlich den bereits gemergten Fremd-PR #187 gezeigt — Diff-Scope-Lesson #161
beachtet). Gates lokal verifiziert: **Lint grün**, **Tests 28/28 grün** (scoped), **Branch-Coverage
der neuen/geänderten Dateien `positionen.ts`, `VerzehrAufschluesselung.tsx`, `kassieren/page.tsx`
= 100 %** (via istanbul `skipFull` nicht als Einzelzeile ausgewiesen; die Ordner-Rollups
`app/_verzehr` 76.92 % und `app/veranstaltung` 86.36 % Branch resultieren allein aus den
vorbestehenden Helferdateien `summen.ts`/`auslagenSummen.ts`/`labels.ts`, nicht aus #206-Code).

## Kritische Findings (müssen behoben werden)
- Keine.

## Wichtige Findings (sollten behoben werden)
- Keine. Der einzige wichtige Finding aus Runde 2 (React-`key`-Kollision,
  `VerzehrAufschluesselung.tsx:34`) ist behoben: `key={index}` auf dem deterministisch sortierten
  `positionen`-Array. Da die Kassier-Seite Server Component mit statischem Rendering ist (native
  `<details>`, kein Client-JS, kein Reordering/State), ist der Index innerhalb eines Renders stets
  eindeutig und stabil → kollisionsfrei. Codify #206 hat das Muster als Lesson festgehalten.

## Nitpicks (optional)
- [ ] [app/_verzehr/positionen.ts:4] Header-Kommentar zitiert „ADR-025 D5" (aus `summen.ts`
      übernommen) für die route-neutrale/DB-freie Natur; das Muster route-neutraler Platzierung ist
      eigentlich ADR-039. Rein dokumentarisch, vorbestehend. Bewusst nicht angefasst (Refactor-Notiz).
- [ ] [app/_verzehr/VerzehrErfassung.tsx:25 vs. app/_verzehr/positionen.ts:13] Zwei
      Repräsentationen derselben Kategorie-Reihenfolge im selben route-neutralen Ordner
      (`readonly CatalogCategory[]` als Renderreihenfolge vs. `Record<…, number>` als Sortkey).
      Werte identisch (getraenk < essen < kaffee), Divergenzrisiko gering, teils vorbestehend.
      Außerhalb des Scopes; Gold-Plating vermeiden.
- [ ] [app/veranstaltung/VerzehrAufschluesselung.tsx:24-30] `<th>Menge</th>` etc. in der
      `sr-only`-Kopfzeile ohne `scope="col"` — für Screenreader-Spaltenzuordnung sauberer. Rein
      a11y-kosmetisch.
- [ ] [app/veranstaltung/[id]/kassieren/page.tsx:64-69 vs. app/veranstaltung/berichtModell.ts:141-160]
      Leichte strukturelle Duplikation der „Positionen je Zeile"-Ableitung
      (`gruppierePositionenNachZeile` + Index-Zip + `verzehrPositionen(map.get(zeile.id) ?? [])`).
      Die gemeinsamen Helfer sind bereits ausgelagert und die Summenpfade unterschiedlich
      (`kassierZeilen` vs. `kassierZeile`) → vertretbar, nur als Hinweis.
- [ ] [app/veranstaltung/VerzehrAufschluesselung.test.tsx:49] `should_renderPositionsInGivenOrder_when_multiple`
      belegt nur, dass die Komponente die vorsortierte Eingabe nicht umsortiert; das Sortierverhalten
      selbst liegt in `verzehrPositionen` (dort in `positionen.test.ts` abgedeckt). Redundanzarmer
      Zusatznutzen, kein Fehler.

## Positives
- **Runde-2-Rework korrekt und minimal umgesetzt.** `key={index}` statt
  `${category}-${name}-${size}` – lokaler One-Line-Fix, kein neues Verhalten, Gates identisch grün
  vor/nach dem Refactor (Refactor-Notiz + 28/28 Tests bestätigt). Codify-Lesson `frontend-react.md`
  („`.map`-Key aus Anzeigefeldern statt stabilem Identifier ist eine latente Kollisionsquelle")
  angelegt.
- **Runde-2-Nitpick `CATEGORY_ORDER`-Export behoben:** `positionen.ts:13` ist wieder modul-privat
  (`const`, kein `export`); per Grep kein externer Konsument.
- **Beweisbar verhaltensneutrale Extraktion / echte SINGLE SOURCE.** `verzehrPositionen`,
  `gruppierePositionenNachZeile`, `artikelBezeichnung` und `CATEGORY_ORDER` liegen route-neutral in
  `app/_verzehr/positionen.ts` (gleicher `menge > 0`-Filter, Formel `menge × priceCents`, Sort-Kette
  Kategorie→Name→Größe mit `localeCompare(…, "de-DE")`). `berichtModell.ts` re-exportiert
  `artikelBezeichnung` und aliast `BerichtPosition`/`BerichtPositionInput` als Fassade — die
  Excel-/PDF-Renderer importieren unverändert. Kein zweiter Wahrheitspfad.
- **AC6 (Positionssumme = Verzehr-Gesamt) hält per Konstruktion:** dieselbe `positionen`-Liste
  speist `kassierZeilen` (`zeileSummen` über alle Positionen; `menge=0` trägt 0 bei) **und**
  `verzehrPositionen` (nur `menge > 0`) — identische Cent-Formel, keine Rundung. Test
  `should_matchBreakdownSumToVerzehrGesamt_when_expanded` (Literal `800`, nicht tautologisch).
- **Fehlerszenario soft-gelöschter Artikel erfüllt:** `verzehrPositionen` filtert nur auf
  `menge > 0`, nicht auf `active`; Preis via COALESCE eingefroren → Position sichtbar, Summe
  konsistent (`should_showSoftDeletedArticleInBreakdown`, Mock mit befüllten Daten).
- **Schicht-Sauberkeit einwandfrei:** `positionen.ts` importiert nur type-only (`CatalogCategory`,
  `VerzehrPositionSum`), kein Drizzle-Runtime/DOM, kein Feature-Import; Import-Richtung Feature →
  route-neutral korrekt. Platzierung konsistent.
- **Rein präsentational bestätigt:** keine Änderung an Preis-/Mengen-/Summen-/Spende-/Status-Logik.
  `sonstigeCents` bewusst behalten (Bericht weiter Konsument). Kein „Sonstige" im Page-UI mehr;
  Getränke · Essen · Kaffee getrennt, Verzehr-Gesamt via `font-medium`/`bold` hervorgehoben. Native
  `<details>/<summary>` → Kassier-Seite bleibt Server Component ohne Client-JS.
- **Kein ADR-Trigger / keine Routen-Änderung** — `docs/routes.md` korrekt unangetastet
  (`git diff origin/main...HEAD -- docs/routes.md` leer). Stil konsistent (cyan-Link-Konvention,
  `formatCents`, `tabular-nums`).
- **Alle 12 Akzeptanzkriterien inkl. Fehlerszenario erfüllt; Coverage auf neuem Code 100 %.**

## Empfehlung
APPROVED

> Fachlich, architektonisch und stilistisch sauber – **null kritische, null wichtige** offene
> Findings. Der einzige Rework-Grund aus Runde 2 (React-Key-Kollision) ist mit einem minimalen,
> nachweislich verhaltensneutralen One-Line-Fix behoben, der Runde-2-Export-Nitpick ebenfalls. Alle
> 12 AC (inkl. Soft-Delete und Summenkonsistenz) sind abgedeckt, Coverage auf neuem Code 100 %,
> Gates grün. Die verbleibenden Nitpicks (ADR-Kommentar-Referenz, Order-Duplikat, `scope="col"`,
> Test-Redundanz) sind optional und blockieren den Merge nicht.
>
> **Circuit-Breaker-Hinweis:** Dies ist die 3. Review-Runde. Es liegt jedoch **kein ungelöster
> Konflikt / keine Oszillation** vor, sondern **Konvergenz**: jede Runde fand und behob einen
> distinkten realen Punkt (Runde 1: Coverage-Lücke `page.tsx:68`; Runde 2: Key-Kollision), und
> diese Runde ist terminal (APPROVED, keine weitere Iteration nötig). Keine Eskalation erforderlich.
