# Review: Task 206

Multi-Persona-Review (Backend/Logik · Code-Qualität · Architektur/Patterns) auf dem exakten
Diff-Scope `git diff origin/main...HEAD` (9 Dateien; lokales `main` hing hinter `origin/main`,
`main...HEAD` hätte fälschlich den bereits gemergten Fremd-PR #187 gezeigt — Diff-Scope-Lesson
beachtet). Gates lokal verifiziert: **Lint grün**, **Tests 50/50 grün**, Coverage neuer Dateien
`positionen.ts` und `VerzehrAufschluesselung.tsx` = 100 % (via `skipFull` ausgeblendet).

## Kritische Findings (müssen behoben werden)
- Keine.

## Wichtige Findings (sollten behoben werden)
- [x] **Behoben (Rework):** Page-Test `should_showKeinVerzehr_when_zeileHasNoPositions` deckt
      den undefined→[]-Fallback ab (Zeile z-2 ohne `listPositionen`-Eintrag → „Kein Verzehr
      erfasst"). Branch-Coverage `page.tsx` jetzt 100 % (24/24).
- [ ] [app/veranstaltung/[id]/kassieren/page.tsx:68] Der `?? []`-Zweig von
      `positionenJeZeile.get(zeile.id) ?? []` ist **ungetestet** (Branch-Coverage der Datei
      95,83 %, einzige Lücke). `gruppierePositionenNachZeile` legt nur Map-Einträge für Zeilen
      **mit** Positionen an → für eine Teilnehmerzeile **ganz ohne** erfassten Verzehr liefert
      `.get()` `undefined` und der `?? []`-Fallback greift. Das ist kein degenerierter, sondern
      der **Normalfall** jedes neu erfassten Teilnehmers vor der ersten Verzehr-Buchung und auf
      der Kassier-Seite (zeigt alle Teilnehmer) häufig. Der Fall „`positionen={[]}` → Hinweis
      *Kein Verzehr erfasst*" ist nur auf **Komponenten**-Ebene getestet
      (`VerzehrAufschluesselung.test.tsx`), nicht auf **Seiten**-Ebene über das undefined→[]-Mapping.
      Begründung: `testing-standards.md` fordert für neuen Code 100 % Coverage („wird im Review
      geprüft"). Fix: ein Page-Test mit einer Zeile ohne jede Position (z. B. `z-2` ohne
      `listPositionen`-Eintrag) prüft, dass deren `<details>` „Kein Verzehr erfasst" zeigt.

## Nitpicks (optional)
- [ ] [app/veranstaltung/VerzehrAufschluesselung.tsx:29] React-`key` =
      `${category}-${name}-${size}` ist nicht kollisionssicher (unabhängig von Runde 1 **und**
      Runde 2 gefunden). Zwei **distinkte** Katalog-Artikel mit identischer Kategorie+Name+Größe,
      aber verschiedenem eingefrorenem `priceCents` (z. B. soft-gelöschter + neu angelegter
      Artikel gleichen Namens, COALESCE-Preis) auf derselben Zeile erzeugen denselben Key →
      React-Key-Warnung. Laufzeit-Impact minimal (statisches Server-Rendering, kein Reordering/State,
      beide Zeilen erscheinen korrekt, Summe stimmt). Da das Array deterministisch sortiert ist,
      wäre ein index-basierter Key die per Konstruktion kollisionsfreie Alternative.
- [ ] [app/veranstaltung/VerzehrAufschluesselung.tsx:20-25] `<th>Menge</th>` etc. in der
      `sr-only`-Kopfzeile ohne `scope="col"` — für Screenreader-Zuordnung sauberer. Rein a11y-kosmetisch.
- [ ] [app/veranstaltung/VerzehrAufschluesselung.test.tsx:54-62]
      `should_renderPositionsInGivenOrder_when_multiple` belegt nur, dass die Komponente die
      bereits vorsortierte Eingabe **nicht umsortiert**; das Sortierverhalten selbst liegt in
      `verzehrPositionen` und ist dort abgedeckt (`positionen.test.ts`). Redundanzarmer Zusatznutzen,
      kein Fehler.
- [ ] [app/_verzehr/positionen.ts:13 vs. app/_verzehr/VerzehrErfassung.tsx:25] Zwei gleichnamige
      `CATEGORY_ORDER` mit identischer Semantik, aber unterschiedlicher Form (Record-Sortkey vs.
      Array-Renderreihenfolge). Vorbestehend, außerhalb des Diff-Scopes — eine Vereinheitlichung
      wäre Gold-Plating; nur als latente Duplikat-Notiz.
- [ ] [db/verzehr.ts `listPositionen` + app/_verzehr/positionen.ts:60] Bei Positionen, die in
      allen drei Sortierschlüsseln (Kategorie/Name/Größe) gleich sind, fällt die Reihenfolge auf
      die (ohne `ORDER BY`) nicht garantiert deterministische DB-Rückgabe zurück. **Bestandsverhalten**
      (identisch zum bisherigen Bericht), nicht durch diese Task eingeführt.

## Positives
- **Beweisbar verhaltensneutrale Extraktion / echte SINGLE SOURCE.** `verzehrPositionen`,
  `gruppierePositionenNachZeile`, `artikelBezeichnung` und `CATEGORY_ORDER` wurden aus
  `berichtModell.ts` in das route-neutrale `app/_verzehr/positionen.ts` gezogen (byte-identische
  Logik, −55 Zeilen Netto). `berichtModell.ts` re-exportiert `artikelBezeichnung` und aliast
  `BerichtPosition`/`BerichtPositionInput` als saubere Fassade — `berichtPdf.ts`/`berichtXlsx.ts`
  importieren unverändert aus `./berichtModell`. Kein zweiter Wahrheitspfad; Bericht und Kassier
  per Konstruktion identisch.
- **AC6 (Positionssumme = Verzehr-Gesamt) hält per Konstruktion**: beide leiten aus demselben
  `positionen`-Array mit derselben Formel `menge × priceCents` ab; Test
  `should_matchBreakdownSumToVerzehrGesamt_when_expanded` (Literal `800`, nicht tautologisch).
- **Fehlerszenario soft-gelöschter Artikel erfüllt**: `innerJoin` bleibt bei `active=false`
  bestehen, Preis via COALESCE eingefroren → Position sichtbar, Summe konsistent
  (`should_showSoftDeletedArticleInBreakdown`, Mock mit befüllten Daten → Leeres-Array-Mock-Falle vermieden).
- **Schicht-Sauberkeit einwandfrei**: `positionen.ts` importiert nur type-only (`CatalogCategory`,
  `VerzehrPositionSum`), kein Drizzle/DOM, kein Feature-Import; Import-Richtung Feature→route-neutral korrekt.
- **Platzierung konsistent**: `VerzehrAufschluesselung.tsx` wird nur von der Kassier-Seite
  konsumiert und liegt korrekt bei den veranstaltungs-eigenen Komponenten; `positionen.ts`
  (Bericht + Kassier) liegt korrekt route-neutral unter `_verzehr/`.
- **Rein präsentational bestätigt**: keine Änderung an Preis-/Mengen-/Summen-/Spende-/Status-Logik.
  `sonstigeCents` bewusst behalten (Bericht weiter Konsument). Kein „Sonstige" mehr im Page-UI,
  Verzehr-Gesamt via `bold` hervorgehoben. Native `<details>/<summary>` → Kassier-Seite bleibt
  Server Component ohne Client-JS.
- **Kein ADR-Trigger / keine Routen-Änderung** — `docs/routes.md` korrekt unangetastet.
- **Alle 12 Akzeptanzkriterien inkl. Fehlerszenario erfüllt.**

## Empfehlung
NEEDS_REWORK

> Fachlich, architektonisch und stilistisch sauber – null kritische, null wichtige Logik-Findings
> über drei unabhängige Personas. Einziger Rework-Grund ist die **Coverage-Lücke** auf neuem Code
> (`page.tsx:68`, `?? []`-Zweig für Teilnehmerzeilen ohne Positionen): Das Projekt-Gate „100 %
> Coverage bei neuem Code" ist im Review verbindlich zu prüfen. Der Fix ist ein einzelner
> Page-Test. Die Nitpicks (React-Key-Härtung, `scope="col"`) sind optional und blockieren nicht.
