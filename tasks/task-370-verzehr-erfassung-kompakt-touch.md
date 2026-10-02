# Task 370: verzehr-erfassung-kompakt-touch

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Verzehr-Erfassung (`app/_verzehr/`) als Einzelansicht je Person: sticky Kopf, Kategorie-Umschalter, einheitliches Zeilenmuster, 44-px-Touch-Ziele, „Nächste Person" in Fußleiste; für Veranstalter-Seite und Theke. Spec: `docs/specs/spec-370-verzehr-erfassung-kompakt.md` (Volltext der AK dort). Entscheidung 2026-10-01: Einzelansicht statt Akkordeon (ADR-039 wird ergänzt/abgelöst → `/architecture`).

## Akzeptanzkriterien
- [x] **AK1.1** GIVEN eine aktive Person WHEN die Erfassung angezeigt wird THEN zeigt der Kopf den Namen groß, den Gesamtbetrag groß rechts daneben und darunter kl…
- [x] **AK1.2** GIVEN ein langer Name (z. B. „Familie Müller-Lüdenscheidt-Hoffmann") bei 375 px WHEN der Kopf gerendert wird THEN bricht der Gesamtbetrag nicht um…
- [x] **AK1.3** GIVEN die Liste ist länger als der Bildschirm WHEN der Nutzer scrollt THEN bleiben Personen-Chips, Kopf und Kategorie-Umschalter (AK2) sichtbar am…
- [x] **AK1.4** GIVEN die Person ändert ihren Verzehr WHEN der Server die Aktion bestätigt THEN zeigen Gesamtbetrag und Aufschlüsselung im Kopf den neuen Wert (ser…
- [x] **AK1a.1** GIVEN eine Veranstaltung mit n ≥ 1 Teilnehmern WHEN die Erfassung geöffnet wird THEN steht pro Teilnehmer ein Chip in der Liste-Reihenfolge; genau…
- [x] **AK1a.2** GIVEN ein Chip einer anderen Person WHEN er angetippt wird THEN wechselt die Einzelansicht auf diese Person; bei der Theke wird dabei wie heute das…
- [x] **AK1a.3** GIVEN die Chip-Leiste ist breiter als der Bildschirm WHEN der Nutzer wechselt THEN ist der aktive Chip sichtbar (horizontal in den Sichtbereich ges…
- [x] **AK1a.4** GIVEN eine Person mit erfasstem Verzehr (Summe > 0) WHEN die Chips angezeigt werden THEN ist sie am Chip erkennbar (Punkt/Marke mit Textalternative…
- [x] **AK1a.5** GIVEN der Aufruf der Veranstalter-Seite trägt einen gültigen Personenbezug (`?zeile=`, #308) WHEN die Seite lädt THEN ist genau diese Person aktiv…
- [x] **AK1a.6** GIVEN die Theke mit gemerktem Ziel WHEN die Erfassung erscheint THEN ist das Ziel aktiv; ohne gültiges Ziel führt weiterhin das Identitäts-Gate („W…
- [x] **AK2.1** GIVEN ein Katalog mit Artikeln in mehreren Kategorien WHEN die Erfassung angezeigt wird THEN gibt es einen Umschalter mit den Kategorien (Getränke,…
- [x] **AK2.2** GIVEN der Umschalter WHEN eine Kategorie gewählt wird THEN zeigt die Liste nur deren Artikel; die anderen Kategorien sind nicht im Dokument sichtbar.
- [x] **AK2.3** GIVEN ein Katalog ohne aktive Artikel einer Kategorie (z. B. stehende Theke ohne Essen, ADR-023 §D7) WHEN der Umschalter gebaut wird THEN erscheint…
- [x] **AK2.4** GIVEN die Erfassung wird geöffnet THEN ist die erste vorhandene Kategorie in der Reihenfolge Getränke, Kaffee, Essen vorgewählt; GIVEN der Nutzer w…
- [x] **AK2.5** GIVEN eine Person hat eine Position auf einem inzwischen deaktivierten Artikel (Menge > 0, ADR-026 D3) WHEN ihre Ansicht angezeigt wird THEN bleibt…
- [x] **AK3.1** GIVEN die sichtbare Kategorie WHEN Artikel gerendert werden THEN bilden gleichnamige Artikel eine Gruppe mit dem Artikelnamen als Gruppenüberschrif…
- [x] **AK3.2** GIVEN ein Artikel mit nur einer Größe WHEN er gerendert wird THEN folgt er demselben Muster (Name als Gruppenüberschrift, eine Zeile) – keine abwei…
- [x] **AK3.3** GIVEN ein Artikel ohne Größenangabe (`size` leer) WHEN er gerendert wird THEN zeigt die Zeile eine sinnvolle Beschriftung (heute „ohne Größe" in Gr…
- [x] **AK3.4** GIVEN Preise WHEN sie angezeigt werden THEN im deutschen Format mit „€" und Ziffern gleicher Breite, sodass Beträge untereinander bündig stehen.
- [x] **AK3.5** GIVEN die Gruppenüberschrift WHEN sie gerendert wird THEN ist sie als Überschrift erkennbar (Schriftgröße/-stärke über Fließtext, nicht das winzige…
- [x] **AK4.1** GIVEN ein Stepper WHEN „−" und „+" gerendert werden THEN messen beide mindestens 44 × 44 px (gemessen, nicht nur Klasse).
- [x] **AK4.2** GIVEN Personen-Chips und Kategorie-Umschalter WHEN sie gerendert werden THEN messen sie in der Höhe mindestens 44 px, Chips zusätzlich in der Breit…
- [x] **AK4.3** GIVEN die Menge einer Position ist 0 WHEN der Stepper gerendert wird THEN ist „−" deaktiviert (`disabled`, nicht auslösbar, erkennbar); ab Menge 1…
- [x] **AK4.4** GIVEN eine laufende Aktion (pending) WHEN sie noch nicht bestätigt ist THEN sind die Knöpfe der betroffenen Position deaktiviert (Verhalten wie heu…
- [x] **AK4.5** GIVEN die Menge WHEN sie angezeigt wird THEN ist sie groß genug lesbar und in Ziffern gleicher Breite; Menge 0 ist zurückgenommen dargestellt (erke…
- [x] **AK4.6** GIVEN Knöpfe und Bedienelemente THEN sind sie Bausteine aus `app/components/ui/` (Button o. ä.) bzw. nutzen deren Touch-Mindesthöhe; keine neue Kop…
- [x] **AK5.1** GIVEN mindestens zwei Teilnehmer WHEN die Erfassung angezeigt wird THEN steht in einer fixierten Fußleiste am unteren Rand (beim Scrollen sichtbar,…
- [x] **AK5.2** GIVEN die aktive Person ist die letzte der Liste WHEN „Nächste Person →" getippt wird THEN wechselt die Ansicht auf die **erste** Person (Umlauf);…
- [x] **AK5.3** GIVEN der Wechsel zur nächsten Person WHEN er ausgeführt wird THEN beginnt die Ansicht der neuen Person am Anfang (Kopf sichtbar, Liste oben) – kei…
- [x] **AK5.4** GIVEN nur ein Teilnehmer WHEN die Erfassung angezeigt wird THEN erscheinen keine „Nächste Person"-Schaltfläche (ein einzelner Chip ist zulässig).
- [x] **AK5.5** GIVEN die Veranstalter-Seite WHEN die Fußleiste angezeigt wird THEN bleibt der personenbezogene Weg „Kassieren →" (#308) erreichbar, und zwar **in…
- [x] **AK6.1** GIVEN die Veranstalter-Seite und die Theke WHEN sie dieselben Daten laden THEN rendern beide dieselbe Einzelansicht aus `app/_verzehr/` (keine dupl…
- [x] **AK6.2** GIVEN eine abgeschlossene Veranstaltung (`editable=false`) WHEN die Ansicht erscheint THEN sind Kopf, Personen-Wahl und Kategorie-Umschalter nutzba…
- [x] **AK6.3** GIVEN die Theke vor der Namenswahl (Identitäts-Gate, Schritt 1/2) WHEN die Seite lädt THEN bleibt die Wahl-Frage wie heute führend, und darunter st…
- [x] **AK6.4** GIVEN eine Veranstaltung ohne Teilnehmer WHEN die Erfassung geöffnet wird THEN erscheint unverändert der bestehende Hinweis (Veranstalter: `KEIN_TE…
- [x] **AK7.1** GIVEN `app/_verzehr/` WHEN die Umstellung fertig ist THEN steht das Verzeichnis in `eslint/ui-token-files.mjs`, und `pnpm lint` ist grün: keine roh…
- [x] **AK7.2** GIVEN die Einzelansicht WHEN sie bei 375 px in hell **und** dunkel gegen den lokalen Dev-Server durchgeklickt wird THEN ist nichts abgeschnitten od…
- [x] **AK7.3** GIVEN die Fachlogik WHEN die bestehenden Unit-, Integrations- und E2E-Tests laufen THEN sind sie grün; Anpassungen betreffen nur Struktur/Selektore…
- [x] **AK7.4** GIVEN #205 (Rand-Bleed der Chip-Leiste hart kodiert) WHEN der Umbau fertig ist THEN existiert kein hart kodierter Rand-Bleed (`-mx-6`/`px-6`) mehr…
- [x] **AK7.5** GIVEN die Anleitung für Veranstalter WHEN der Umbau fertig ist THEN zeigt `docs/anleitung/veranstalter/bilder/08-verzehr.png` die neue Einzelansich…
- [x] **FS1** GIVEN eine Action antwortet mit regulärem Fehlerzustand (z. B. Drossel, ADR-044) WHEN der Nutzer „+" oder „−" tippt THEN bleibt die alte Menge steh…
- [x] **FS2** GIVEN eine Antwort außerhalb des Server-Action-Protokolls (429-Klartext, Offline) WHEN sie eintrifft THEN greift unverändert die bestehende Fehlerg…
- [x] **FS3** GIVEN die aktive Person verschwindet (Teilnehmer wurde parallel entfernt) WHEN die Seite neu lädt THEN fällt die Ansicht auf die erste vorhandene P…
- [x] **FS4** GIVEN Veranstaltung wird während der Erfassung abgeschlossen WHEN der Nutzer tippt THEN lehnt der Server wie heute ab; die Anzeige zeigt die Ablehn…
- [x] **FS5** GIVEN gemerktes Ziel/Erfasser der Theke ist nicht mehr in der Liste (stale) WHEN die Seite lädt THEN greift unverändert die bestehende Stale-Behand…

## Technische Notizen
**ADR:** [ADR-054](../docs/adr/054-verzehr-einzelansicht-statt-fokus-akkordeon.md) (Accepted). Reine Client-/Präsentationsschicht: keine Migration, keine Dependency, keine neue Route, Actions/Summen/Delta-Protokoll unverändert.

**Betroffene Dateien (`app/_verzehr/` + 2 Konsumenten):**
- NEU `VerzehrEinzelansicht.tsx` (Client; aktive Person + Kategorie, Wechsel, Scroll), `PersonenChips.tsx`, `PersonenKopf.tsx`, `KategorieUmschalter.tsx`, `ArtikelListe.tsx` (inkl. `PositionZeile`), `kategorien.ts` (reine Funktion: sichtbare Kategorien inkl. „Nicht mehr im Katalog"), `VerzehrUebersicht.tsx` (schlanke Nur-Lese-Übersicht Name + Gesamt; nur Theke vor der Namenswahl).
- ÄNDERN `MengeControl.tsx` (44 px via Button-Baustein, `−` bei 0 disabled, Tokens), `verzehr-props.ts` (Typ `VerzehrZeile`).
- ENTFERNEN `FokusListe.tsx`(+Test), `VerzehrErfassung.tsx` samt `ZeileKarte` (und Collapse-Props). Tests dazu **ersetzen**, nicht ersatzlos löschen (spec AK7.3).
- Konsumenten: `app/veranstaltung/[id]/verzehr/page.tsx` (rendert `VerzehrEinzelansicht`, `initialeZeileId = Personenbezug`, `kopfClassName`, `fussleisteClassName`, `aktionJeZeile` bleibt), `app/theke/[token]/IdentityGate.tsx` (+Read-only-Zweig; `initialeZeileId = zielId`, `kopfClassName`, `fussleisteClassName`, `onFokusWechsel` bleibt).
- `eslint/ui-token-files.mjs`: `app/_verzehr/` ergänzen; danach `pnpm lint` – keine rohen Farbklassen, kein `dark:`.

**Entscheidungen (Kurzfassung ADR-054):**
- Aktive Person: `useState`, initial `initialeZeileId` (gültig) sonst erste Zeile; kein „keine aktiv". Stale/entfernte Zeile → beim Rendern auf erste ableiten (kein Effekt, Lesson `set-state-in-effect`).
- Kategorie: lokaler State, bleibt beim Personenwechsel; fehlt sie für die neue Person → erste vorhandene (beim Rendern ableiten).
- Sticky: Chips + Kopf + Umschalter als EIN Block; seitlicher Bleed über `kopfClassName` des Konsumenten (löst #205: kein hartes `-mx-6/px-6` in der route-neutralen Komponente; `scroll-mt-16` entfällt).
- Fußleiste `fixed inset-x-0 bottom-0`, innen `mx-auto max-w-3xl` + seitliches Padding per `fussleisteClassName` des Konsumenten, Safe-Area-Padding, Platzhalter gleicher Höhe am Inhaltsende. Enthält „Nächste Person →" (zyklisch: letzte → erste; nur bei ≥ 2 Teilnehmern) + `aktionJeZeile`-Baustein (Kassieren, #308).
- Personenwechsel: `requestAnimationFrame` → `window.scrollTo?.({ top: 0 })` (guarded); aktiver Chip per `scrollIntoView?.({ inline: "center", block: "nearest" })`. rAF-Timing mit `raf-stub.ts` testen.

**TDD-Reihenfolge:** (1) `kategorien.ts` (reine Tests: Reihenfolge, fehlende Kategorie, inaktive Positionen) → (2) `MengeControl` 44 px/disabled → (3) `PersonenKopf`, `KategorieUmschalter`, `ArtikelListe` (Gruppen- und Einzelartikel gleiches Muster, leere Größe einheitlich) → (4) `PersonenChips` (aria-pressed, Marke mit Textalternative) → (5) `VerzehrEinzelansicht` (Start-Person, Fallbacks, Kategorie bleibt, `onFokusWechsel`, Nächste Person, read-only, Fehler inline) → (6) Konsumenten + `IdentityGate`-Tests anpassen → (7) Lint-Liste erweitern → (8) E2E.

**Testgrenzen:** jsdom hat kein Layout → 44-px (spec AK4.1/4.2) und 375-px-Overflow (AK7.2) im Playwright-Test per `boundingBox()`/`scrollWidth` prüfen; Unit-Tests prüfen die Klassen/den Baustein. Vor dem ersten `pnpm test:e2e`: `pnpm db:seed`; eigener Dev-Server auf freiem Port + `PLAYWRIGHT_BASE_URL` (Lesson #368), Wegwerf-Daten mit `__test__`-Präfix.

**Anleitung:** `docs/anleitung/veranstalter/bilder/08-verzehr.png` nach dem Umbau neu erzeugen (Vorgehen wie #388/#389 für 05/07; Text neben dem Bild gegenlesen).

**Drift im selben PR:** ADR-039/-035 (Status-Banner bereits gesetzt, beim Implementieren gegenlesen), spec-54 AC B (Hinweis gesetzt), `docs/routes.md` Funktionsbeschreibung F5 prüfen; Issue #205 mit `Closes #205` im PR-Body, sofern der Befund wegfällt.

**Implementierungs-Notizen (/implement, 2026-10-02):**
- Oberflächentests: `e2e/verzehr-einzelansicht.spec.ts` (neu, hinter `E2E_VERZEHR_370=1`) misst
  AK1.2/1.3/1.4, AK1a.1/1a.4/1a.5/1a.6, AK4.1–4.3, AK5.1–5.3/5.5, AK6.3, AK7.2 (375 px, hell +
  dunkel, Veranstalter + Theke) und FS3 per `boundingBox()`/`scrollWidth`; `wechsel-verzehr-kassieren`
  (#308) und die Anleitungs-Capture auf die Einzelansicht umgestellt. Alle grün gegen eine eigene,
  frisch migrierte Wegwerf-DB im lokalen Container (geteilte Dev-DB unberührt) + volle Vitest-Suite
  inkl. DB-Integrationstests (1423 Tests). Nicht in CI (legt Daten an, wie #308).
- E2E-Stolperstein: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:…` lässt `next dev` (16.3) seine
  Dev-Ressourcen sperren („Blocked cross-origin request") → keine Hydrierung, Client-Knöpfe stumm,
  nur native Formulare (Login) funktionieren. Über `localhost` laufen; dann startet die Config ihren
  eigenen `webServer` auf 3000 – vorher prüfen, dass dort kein fremder Server läuft (Lesson #368).
- Browser-Befund, den jsdom nicht sah: der `sr-only`-Span der Verzehr-Marke ist als eigenes
  Flex-Kind blockifiziert, Chrome baute daraus „Anna , Verzehr erfasst". Textalternative jetzt per
  `aria-label` am Chip (AK1a.4); belegt durch den E2E-Test.
- Bild 08: Dev-Overlay von Next.js per Screenshot-`style` ausgeblendet (lag über „Kassieren →");
  Text neben dem Bild gegengelesen, passt.

**Rework nach Review-Runde 1 (/implement, 2026-10-02):**
- K1 behoben: `ArtikelListe` ist je Person gekeyt (`key={aktiveZeile.id}`), damit Fehler- und
  Pending-Zustand der `MengeControl`s (useActionState) nicht beim Personenwechsel mitwandern
  (FS1/AK4.4). Belegt durch `VerzehrEinzelansicht.positionszustand.test.tsx` mit echtem
  `MengeControl` – beide Richtungen + Pending (nie auflösendes Promise); vor dem Fix rot (3/3).
- W1: E2E liest die aktive Person per auto-wiederholender Assertion (`expectAktivePerson`), Gesamt
  auf den Kopf begrenzt, `selectOption` per Label statt Index.
- W2: toter `groessenSuffix` samt Tests entfernt. W3: erledigter `kleinfunde.md`-Eintrag
  (ADR-035 D2) gelöscht. W4: PR-Body trägt `Closes #205`.
- Nitpicks mitgenommen: Fußleisten-Padding kommt per `fussleisteClassName` vom Konsumenten (beide
  `px-6`, ADR-054 D3 nachgezogen); toter Leer-Zweig in `ArtikelListe` entfernt; ADR-039 D2–D4 und
  ADR-035 D2/D3 tragen Ablöse-Banner; Kommentare (`kategorien.ts`, `VerzehrUebersicht.tsx`)
  präzisiert, `KATEGORIE_REIHENFOLGE` dateiintern; Konfigurations-Test `KATEGORIE_LABEL` entfernt;
  Lese-Ansicht-Test klickt eine andere Kategorie; Import-Pfad `VerzehrArtikel` intern einheitlich;
  rohe Farbe am Leer-Hinweis von F5 → `text-muted`. Bewusst offen gelassen: rAF-Abbruch in
  `wechsleZu` (harmlos) und doppelte Summen-/Gruppier-Logik (→ `/refactor`), `?zeile=` nach F5.
- Gates: Lint, `tsc --noEmit`, Prettier, volle Vitest-Suite grün (1314 Tests, DB-Tests ohne dotenv
  übersprungen – Rework berührt keine Data-Layer).
- **Nachtest offen:** `e2e/verzehr-einzelansicht.spec.ts` nach dem Rework **nicht** erneut
  gelaufen (in dieser Session kein Zugriff auf `.env.local`, keine Wegwerf-DB; geteilte Dev-DB
  bewusst nicht beschrieben, Lesson #346). Geändert sind dort nur Assertions/Locators; vor dem
  Merge mit `E2E_VERZEHR_370=1` gegen eine Wegwerf-DB wiederholen.

**Rework nach Review-Runde 2 (/implement, 2026-10-02):**
- Wichtig 1–3 (ADR-Drift): ADR-054 D1 nennt `fussleisteClassName`; ADR-035 D5 trägt ein
  Teil-Banner (Read-only ohne Gate gilt fort, Layout abgelöst), Statuszeile von ADR-035 und der
  Drift-Absatz in ADR-054 angeglichen; ADR-039 D4-Banner: `VerzehrErfassung` entfällt,
  `VerzehrUebersicht` vor der Namenswahl.
- Wichtig 4: Grenze des Positionszustands als bewusste Entscheidung in ADR-054 D2 und im
  Key-Kommentar („gilt, solange die Person angezeigt wird"). Rückweg-Tests A → B → A ergänzt
  (Pending: Knöpfe wieder aktiv; später eintreffender Fehler verworfen). Kommentar
  „Spiegel-Richtung" korrigiert (Test heißt jetzt „Gegenrichtung"). Mutationsbeleg in dieser
  Session: `key` entfernt → alle 5 Tests der Datei rot (auch mit `--sequence.shuffle`), `key`
  zurück → grün.
- Selbstfund beim Mutationsbeleg: der Test „später eintreffender Fehler" war ohne `key` zunächst
  **grün aus dem falschen Grund**. Die nie auflösenden Promises der Pending-Tests derselben Datei
  hielten React 19s modulweiten Async-Action-Scope offen, sodass spätere Action-Ergebnisse nie
  committet wurden (isoliert per Sonde belegt: ohne die Vortests zeigte die Ansicht den Fehler bei
  Bernd). Fix: offene Aktionen werden über `offeneAktion()` registriert und im `afterEach`
  aufgelöst. Kandidat für `/codify` (Ergänzung zur #369-Lesson „nie auflösendes Promise").
- Nitpicks: Leerzeilen nach Bannern (ADR-035 D3, ADR-039 D2), #187-Banner „(überholt durch
  ADR-054)", ADR-039 D1-Hinweis auf `initialeZeileId`, ADR-054 D4-Überschrift/Text und
  ADR-052-Satz auf `app/_verzehr/` eingegrenzt, Technische Notizen aktualisiert, Kommentarlängen,
  Fußleisten-Test nur noch `px-6`, Testimporte `VerzehrArtikel` aus `./artikel-anzeige`,
  `PersonenKopf` nutzt `KATEGORIE_LABEL`, E2E `erstesMinus` + einmal gemessener Stepper.
- Bewusst offen: Konstanten (F7) vs. Literale (F5) für Bleed/Padding – F7 nutzt die Werte in zwei
  Zweigen, F5 einmal; `gewaehlteKategorie` nach Rückfall auf „inaktiv" und `wechsleZu` auf den
  aktiven Chip (vom Review als harmlos eingestuft, spec-konform).
- Gates: Lint, `tsc --noEmit`, Prettier, Vitest für `app/_verzehr`, `app/theke`,
  `app/veranstaltung/[id]/verzehr` grün (186 Tests). E2E-Nachtest weiterhin offen (s. o.).

## Test-Notizen (/test)
- Vitest mit Coverage über `app/_verzehr`, `app/theke`, `app/veranstaltung`: 104 Dateien / 1316 Tests grün, Gesamt 99,74 % Stmts / 99,48 % Branch (Schwelle 80 %). Alle in #370 geänderten/neuen Dateien in `app/_verzehr` bei 100 %.
- Einzige Lücken: `IdentityGate.tsx` Z. 53/58 (`() => null` als Server-Snapshot von `useSyncExternalStore`) – vorbestehend, in `main` unverändert, nicht Teil dieses PR.
- Kein Produktionscode und keine Tests geändert; keine Lücke gegenüber den AK gefunden.
- **E2E-Nachtest weiterhin offen** (kein `.env.local`-Zugriff, keine Wegwerf-DB): vor dem Merge `E2E_VERZEHR_370=1` gegen Wegwerf-DB/eigenen Server wiederholen.

## Offene Fragen
Keine – alle am 2026-10-02 entschieden (siehe Spec, Abschnitt „Offene Fragen").

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/370-verzehr-erfassung-kompakt-touch`
Erstellt: 2026-10-01 00:02
