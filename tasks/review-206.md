# Review: Task 206

Review-Runde 2 (nach Rework-Commit `c4e2a86`, der die Coverage-Lücke aus Runde 1 auf
`page.tsx:68` schloss). Drei unabhängige Personas (Logik/Korrektheit · Code-/Testqualität ·
Architektur/Patterns) auf dem exakten Diff-Scope `git diff origin/main...HEAD` (10 Dateien;
lokales `main` hing hinter `origin/main`, `main...HEAD` hätte fälschlich den bereits gemergten
Fremd-PR #187 gezeigt — Diff-Scope-Lesson #161 beachtet). Gates lokal verifiziert:
**Lint grün**, **Tests 28/28 grün** (scoped), **Branch-Coverage der neuen/geänderten Dateien
`positionen.ts`, `VerzehrAufschluesselung.tsx`, `page.tsx` = 100 % (33/33)**.

## Kritische Findings (müssen behoben werden)
- Keine.

## Wichtige Findings (sollten behoben werden)
- [ ] [app/veranstaltung/VerzehrAufschluesselung.tsx:34] React-`key` =
      `${category}-${name}-${size}` ist auf **neuem Code** nicht kollisionssicher (von zwei
      unabhängigen Personas gefunden). `VerzehrPositionDetail` trägt keinen stabilen Identifier
      (keine `catalogItemId`); der Key wird rein aus Anzeigefeldern gebildet. Zwei **distinkte**
      Katalog-Artikel mit identischer Kategorie+Name+Größe auf derselben Zeile (realer Fall:
      soft-gelöschter + neu angelegter Zwilling gleichen Namens mit eingefrorenem COALESCE-Namen,
      ADR-033 D2 – genau das Szenario, das `page.test.tsx:290` als real behandelt) erzeugen
      denselben Key. **Impact bewusst begrenzt:** Die Kassier-Seite ist Server Component mit
      statischem Rendering (native `<details>`, kein Client-JS, kein Reordering/State) → Folge ist
      eine React-Key-Warnung, die angezeigten Beträge/Summen bleiben korrekt. Kein Kritisch, aber
      auf neuem Code vermeidbar. Fix ist lokal und billig: entweder index-basierter Key (das Array
      ist deterministisch sortiert und wird nie umgeordnet → hier kollisionsfrei) oder
      `catalogItemId` durch `VerzehrPositionDetail`/`verzehrPositionen` durchreichen (berührt die
      SINGLE SOURCE + beide Konsumenten – schwerer, hier nicht nötig). Begründung: neuer Code soll
      keine latente Key-Kollision einführen (Clean Code / Testing-Standards „neuer Code").

## Nitpicks (optional)
- [ ] [app/_verzehr/positionen.ts:13] `CATEGORY_ORDER` wird `export`ed, hat aber **keinen
      externen Konsumenten** (nur intern in `verzehrPositionen`; kein Import in `berichtModell.ts`,
      `positionen.test.ts` o. a. — per Grep verifiziert). Vor der Extraktion war es modul-privat.
      Der `export` weitet die Modul-API ohne Bedarf → könnte privat bleiben.
- [ ] [app/_verzehr/VerzehrErfassung.tsx:25 vs. app/_verzehr/positionen.ts:13] Zwei
      Repräsentationen derselben Kategorie-Reihenfolge im selben route-neutralen Ordner
      (`readonly CatalogCategory[]` als Renderreihenfolge vs. `Record<…, number>` als Sortkey).
      Werte identisch (getraenk < essen < kaffee), Divergenzrisiko gering, teils vorbestehend —
      eine gemeinsame Quelle der Ordering-Intention wäre konsequenter. Außerhalb des Scopes;
      Gold-Plating vermeiden.
- [ ] [app/_verzehr/positionen.ts:4] Header-Kommentar zitiert „ADR-025 D5" (aus `summen.ts`
      übernommen) für die route-neutrale/DB-freie Natur; das Muster route-neutraler Platzierung
      ist eigentlich ADR-039. Rein dokumentarisch.
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
- **Beweisbar verhaltensneutrale Extraktion / echte SINGLE SOURCE.** `verzehrPositionen`,
  `gruppierePositionenNachZeile`, `artikelBezeichnung` und `CATEGORY_ORDER` wurden aus
  `berichtModell.ts` in das route-neutrale `app/_verzehr/positionen.ts` gezogen (Logik gegen
  `git show origin/main:…berichtModell.ts` als byte-äquivalent bestätigt: gleicher `menge > 0`-
  Filter, gleiche Formel `menge × priceCents`, identische Sort-Kette Kategorie→Name→Größe mit
  `localeCompare(…, "de-DE")`). `berichtModell.ts` re-exportiert `artikelBezeichnung` und aliast
  `BerichtPosition`/`BerichtPositionInput` als Fassade — `berichtPdf.ts`/`berichtXlsx.ts`
  importieren unverändert aus `./berichtModell` (verifiziert). Kein zweiter Wahrheitspfad.
- **AC6 (Positionssumme = Verzehr-Gesamt) hält per Konstruktion:** dieselbe `positionen`-Liste
  speist `kassierZeilen` (`zeileSummen` über alle Positionen; `menge=0` trägt 0 bei) **und**
  `verzehrPositionen` (nur `menge > 0`) — beide Summen identisch, gleiche Cent-Formel, keine
  Rundung. Test `should_matchBreakdownSumToVerzehrGesamt_when_expanded` (Literal `800`, nicht tautologisch).
- **Fehlerszenario soft-gelöschter Artikel erfüllt:** `verzehrPositionen` filtert nur auf
  `menge > 0`, nicht auf `active`; Preis via COALESCE eingefroren → Position sichtbar, Summe
  konsistent (`should_showSoftDeletedArticleInBreakdown`, Mock mit befüllten Daten → Leeres-Array-
  Mock-Falle vermieden).
- **Schicht-Sauberkeit einwandfrei:** `positionen.ts` importiert nur type-only
  (`CatalogCategory`, `VerzehrPositionSum`), kein Drizzle-Runtime/DOM, kein Feature-Import;
  Import-Richtung Feature → route-neutral korrekt. Platzierung konsistent
  (`VerzehrAufschluesselung.tsx` bei den veranstaltungs-eigenen Komponenten neben `StatusToggle`/
  `KassiereZeileForm`; `positionen.ts` route-neutral unter `_verzehr/` neben `summen.ts`).
- **Rein präsentational bestätigt:** keine Änderung an Preis-/Mengen-/Summen-/Spende-/Status-Logik.
  `sonstigeCents` bewusst behalten (Bericht weiter Konsument). Kein „Sonstige" im Page-UI mehr;
  Getränke · Essen · Kaffee getrennt, Verzehr-Gesamt via `font-medium`/`bold` hervorgehoben.
  Native `<details>/<summary>` → Kassier-Seite bleibt Server Component ohne Client-JS.
- **Coverage-Lücke aus Runde 1 geschlossen:** `should_showKeinVerzehr_when_zeileHasNoPositions`
  deckt den `?? []`-Zweig (page.tsx:68) auf Seitenebene ab; Branch-Coverage der Datei 100 %.
- **Kein ADR-Trigger / keine Routen-Änderung** — `docs/routes.md` korrekt unangetastet
  (`git diff origin/main...HEAD -- docs/routes.md` leer). Stil konsistent (cyan-Link-Konvention,
  `formatCents`, `tabular-nums`).
- **Alle 12 Akzeptanzkriterien inkl. Fehlerszenario erfüllt.**

## Empfehlung
NEEDS_REWORK

> Fachlich, architektonisch und stilistisch sauber – **null kritische** Findings, die Extraktion
> ist nachweislich verhaltensneutral, alle 12 AC (inkl. Soft-Delete und Summenkonsistenz) sind
> abgedeckt, Coverage auf neuem Code 100 %. Alle drei Personas empfahlen für sich APPROVED.
> Einziger Rework-Grund ist die **React-Key-Kollision auf neuem Code** (`VerzehrAufschluesselung.tsx:34`):
> von zwei Personas unabhängig gefunden, realer (wenn auch seltener) Trigger, den `page.test.tsx`
> bereits als echt behandelt, und ein **lokaler One-Line-Fix** (index-basierter Key auf dem
> deterministisch sortierten, nie umgeordneten Array). Kein Kritisch, weil statisches
> Server-Rendering die Auswirkung auf eine Dev-Warnung begrenzt und die Beträge korrekt bleiben –
> aber auf neuem Code vermeidbar. Die Nitpicks (unnötiger `CATEGORY_ORDER`-Export, Order-Duplikat,
> `scope="col"`, ADR-Kommentar) sind optional und blockieren nicht.
