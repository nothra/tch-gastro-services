# Spec: Abschlussbericht-Variante „nur Getränke" (Einnahmen und Auslagen)

> Issue [#324](https://github.com/nothra/tch-gastro-services/issues/324)
>
> Baut auf F9 (#185, [spec-185](spec-185-abschlussbericht-excel-pdf.md),
> [ADR-036](../adr/036-abschlussbericht-erzeugung-excel-pdf.md)) auf.

## Kontext

Der bestehende Abschlussbericht (F9, #185) weist für eine abgeschlossene Veranstaltung **alle**
Kategorien gemeinsam aus: Verzehr-Umsatz Getränke/Essen/Kaffee, Spende, Einnahmen,
Auslagenerstattung Getränke/Essen/Sonstiges und die Kassenveränderung.

Für die Abrechnung der Theke wird zusätzlich ein Bericht gebraucht, der **ausschließlich die
Kategorie Getränke** ausweist – auf beiden Seiten:

- **Einnahmen:** nur der Verzehr-Umsatz aus Getränke-Positionen (Katalog-Kategorie `getraenk`).
- **Auslagen:** nur Auslagenerstattungen der Kategorie `getraenke`.

Der bestehende (vollständige) Abschlussbericht bleibt inhaltlich, routen- und dateinamensseitig
unverändert – die Getränke-Variante kommt **zusätzlich** dazu.

**Nur kategoriescharfe Werte:** Die Variante zeigt ausschließlich Werte, die sich eindeutig der
Kategorie Getränke zuordnen lassen. **Spende**, **Kassenveränderung** und **Erhalten/Einnahmen
(Σ Erhalten)** entfallen vollständig, weil sie kategorieübergreifend definiert sind
(`Spende = Erhalten − Verzehr-Gesamt` über alle Kategorien; `Kassenveränderung = Σ Erhalten −
Σ Auslagenerstattungen`; `Erhalten` ist der kassierte Barbetrag über alle Kategorien). Eine auf
Getränke „heruntergerechnete" Fassung dieser drei Werte wäre eine neue, fachlich nicht gedeckte
Größe – sie bleiben dem vollständigen Bericht vorbehalten.

**Detailtiefe:** Der Berichtsaufbau des vollständigen Berichts bleibt erhalten (Teilnehmerzeilen
mit Pro-Artikel-Strichen, Auslagen-Einzelnachweis) – durchgehend auf Getränke gefiltert und ohne
die drei genannten Werte. Relevant als Ergebnis sind genau zwei Summen: **Σ Verzehr-Umsatz
Getränke** und **Σ Auslagenerstattung Getränke**.

## Scope

**Inbegriffen:**

- Zusätzlicher Berichts-Umfang „nur Getränke", abrufbar wie der bestehende Bericht: nur für
  Veranstaltungen im Status `abgeschlossen`, nur Rolle `veranstalter`, serverseitig durchgesetzt.
- **Beide Ausgabeformate** wie bisher: Excel (`.xlsx`) und PDF – inhaltsgleich zueinander.
- Bericht-Aufbau analog zum vollständigen Bericht, aber auf Getränke reduziert:
  1. **Kopf:** Bezeichnung, Datum, Kasse, Status – plus erkennbarer Umfang „nur Getränke".
  2. **Teilnehmerzeilen:** je Teilnehmer **mit mindestens einer Getränke-Position** die
     konsumierten Getränke mit Menge (Strichzahl) und Zeilenbetrag
     (`Menge × eingefrorener Einzelpreis`) sowie die Getränke-Summe der Zeile. **Keine** Spalten
     `Sonstige`, `Verzehr-Gesamt`, `Erhalten`, `Spende`.
  3. **Tagessumme:** Σ Getränke über alle Teilnehmer.
  4. **Auslagen-Einzelnachweis:** je Auslage der Kategorie `getraenke` eine Zeile mit
     Teilnehmer, Betrag und Status (offen/erstattet).
  5. **Ergebnis:** genau zwei Summen – **Σ Verzehr-Umsatz Getränke** und
     **Σ Auslagenerstattung Getränke** (erstattet).
- **Teilnehmer ohne Getränke-Position werden weggelassen** – keine 0,00-€-Zeile (entschieden;
  Essen-/Kaffee-only-Teilnehmer erscheinen nicht in der Getränke-Teilnehmertabelle).
- **UI:** eine gemeinsame Sektion „Abschlussbericht" in der Veranstaltungs-Detailansicht mit zwei
  erkennbaren Gruppen: „Vollständig" (xlsx/pdf, bestehend) und „Nur Getränke" (xlsx/pdf, neu).
- Werte weiterhin aus den bestehenden reinen Summen-Funktionen (`zeileSummen`, `auslagenSummen`,
  `verzehrPositionen`) – **kein zweiter Wahrheitspfad** und keine zweite
  Bericht-Modell-Implementierung neben `berichtModell`.
- Dateiname der Variante nach bestehendem Muster erweitert:
  `abschlussbericht-getraenke-<YYYY-MM-DD>-<slug>.xlsx/.pdf` (`berichtDateiname`/`berichtSlug`
  bleiben Single Source, um einen Umfangs-Parameter erweitert).
- Alle Beträge de-DE mit 2 Nachkommastellen, konsistent zu `formatCents` (wie #185 AC12).

**Nicht inbegriffen:**

- **Keine Spende-, keine Kassenveränderungs- und keine Erhalten-/Einnahmen-Zeile** in der
  Getränke-Variante – weder je Teilnehmer noch als Summe.
- Keine Essen-/Kaffee-Positionen und keine Auslagen der Kategorien `essen`/`sonstiges`.
- Keine Änderung am bestehenden vollständigen Abschlussbericht (Inhalt, Route, Dateiname) – dort
  bleiben Spende, Erhalten und Kassenveränderung unverändert erhalten.
- Keine weiteren Kategorie-Varianten (Essen/Kaffee) in dieser Task.
- Keine Persistenz/Archivierung, kein E-Mail-Versand (wie #185).
- Kein laufender Kassen-Saldo über mehrere Veranstaltungen (#57).

## Akzeptanzkriterien

- [ ] **AC1** GIVEN eine abgeschlossene Veranstaltung WHEN ein `veranstalter` die
      Getränke-Variante abruft THEN wird sie als `.xlsx` **und** als PDF erzeugt und
      heruntergeladen.
- [ ] **AC2** GIVEN die Getränke-Variante WHEN sie erzeugt wird THEN enthalten die
      Teilnehmerzeilen **ausschließlich** Positionen der Katalog-Kategorie `getraenk` mit Menge
      und Zeilenbetrag; Essen- und Kaffee-Positionen erscheinen nicht.
- [ ] **AC3** GIVEN die Getränke-Variante WHEN der Auslagen-Abschnitt erzeugt wird THEN enthält
      er **ausschließlich** Auslagen der Kategorie `getraenke`, jede einzeln mit Teilnehmer,
      Betrag und Status.
- [ ] **AC4** GIVEN die Getränke-Variante WHEN das Ergebnis erzeugt wird THEN weist es genau
      zwei Summen aus: Σ Verzehr-Umsatz Getränke und Σ Auslagenerstattung Getränke (erstattet).
- [ ] **AC5** GIVEN eine Veranstaltung **mit** Spende (Erhalten > Verzehr-Gesamt), **mit**
      Essen-/Kaffee-Verzehr und **mit** Auslagen aller drei Kategorien WHEN die Getränke-Variante
      erzeugt wird THEN enthält sie **weder** Spende **noch** Kassenveränderung **noch**
      Erhalten/Einnahmen – weder als Beschriftung noch als Betrag, weder je Teilnehmer noch als
      Summe, in **beiden** Formaten.
- [ ] **AC6** GIVEN dieselbe Veranstaltung WHEN der **vollständige** Bericht erzeugt wird THEN
      enthält er Spende, Erhalten und Kassenveränderung unverändert (Gegenprobe zu AC5: die
      Variante lässt sie weg, der vollständige Bericht verliert sie nicht).
- [ ] **AC7** GIVEN dieselbe Veranstaltung WHEN vollständiger Bericht und Getränke-Variante
      erzeugt werden THEN stimmen die Getränke-Werte (Σ Verzehr-Umsatz Getränke,
      Σ Auslagenerstattung Getränke) in beiden Berichten überein.
- [ ] **AC8** GIVEN die Getränke-Variante in beiden Formaten WHEN Excel und PDF erzeugt werden
      THEN sind die dargestellten Werte identisch (analog AC10 aus #185).
- [ ] **AC9** GIVEN ein erzeugter Getränke-Bericht WHEN Kopf und Dateiname dargestellt werden
      THEN ist der eingeschränkte Umfang „nur Getränke" daraus eindeutig erkennbar
      (Dateiname-Segment `getraenke`, Kopf-Hinweis).
- [ ] **AC10** GIVEN eine Veranstaltung im Status `offen` ODER eine Anforderung ohne Rolle
      `veranstalter` WHEN die Getränke-Variante angefordert wird THEN wird sie serverseitig
      abgelehnt (fail-closed, gleiche Gates wie AC2/AC3 aus #185).
- [ ] **AC11** GIVEN eine abgeschlossene Veranstaltung **ohne** Getränke-Verzehr und **ohne**
      Getränke-Auslagen WHEN die Variante erzeugt wird THEN wird sie dennoch erzeugt
      (Kopf + leere Tabellen + Nullsummen), kein Fehler.
- [ ] **AC12** GIVEN eine Veranstaltung mit Teilnehmern, von denen mindestens einer **keine**
      Getränke-Position hat (z. B. nur Essen) WHEN die Getränke-Variante erzeugt wird THEN
      erscheint dieser Teilnehmer **nicht** in der Teilnehmertabelle (keine 0,00-€-Zeile);
      Teilnehmer mit mindestens einer Getränke-Position erscheinen unverändert.
- [ ] **AC13** GIVEN eine unbekannte Umfangs-Angabe im Request WHEN der Bericht angefordert wird
      THEN wird fail-closed abgelehnt (Whitelist, analog `parseFormat`).
- [ ] **AC14** GIVEN die Veranstaltungs-Detailansicht einer abgeschlossenen Veranstaltung WHEN
      die Downloads angezeigt werden THEN stehen sie in einer gemeinsamen Sektion
      „Abschlussbericht" in zwei erkennbaren Gruppen: „Vollständig" (xlsx/pdf, unverändert) und
      „Nur Getränke" (xlsx/pdf, neu).
- [ ] **AC15** `docs/routes.md` ist mitgepflegt, falls sich Pfad oder Query-Parameter der
      Bericht-Route ändern (Routen-Doku-Gate).

## Fehlerszenarien

- [ ] Getränke-Variante für **offene** Veranstaltung angefordert → serverseitig abgelehnt
      (fail-closed), kein Datei-Download (AC10).
- [ ] Anforderung **ohne** Veranstalter-Rolle → serverseitig abgelehnt (AC10).
- [ ] Unbekannte/gelöschte Veranstaltungs-ID → 404 / „nicht gefunden", kein leerer Datei-Download
      (analog #185).
- [ ] Unbekannter Umfangs-Parameter (z. B. `umfang=essen`) → 400, fail-closed (AC13).
- [ ] Auslage der Kategorie `getraenke` bezieht sich auf eine gelöschte Teilnehmerzeile → im
      Auslagen-Abschnitt weiterhin sichtbar mit Fallback-Anzeigename (LEFT JOIN / COALESCE,
      analog `listAuslagen`, Codify #53) – unverändert zum vollständigen Bericht.

## Offene Fragen (für /architecture)

Entschieden in [ADR-046](../adr/046-abschlussbericht-getraenke-variante.md):

- [x] **Aufruf-Mechanik:** zusätzlicher Query-Parameter `umfang=voll|getraenke` an der
      bestehenden Route (Whitelist, fail-closed, Default `voll`) – keine eigene Route.
      `docs/routes.md` wird um den Parameter ergänzt (AC15).
- [x] **Modell-Schnitt:** abgeleitete Projektion `berichtModellGetraenke(modell)` über dem
      vollen `BerichtModell` (keine Änderung an `berichtModell()` selbst). Filtert
      Teilnehmer-Positionen auf `category === "getraenk"` (leere Teilnehmer weggelassen, AC12)
      und Auslagen auf Kategorie Getränke; übernimmt die zwei verbleibenden Summen unverändert.
- [x] **Renderer-Anpassung:** eigene `berichtXlsxGetraenke`/`berichtPdfGetraenke`-Funktionen
      statt Verzweigung in den bestehenden Renderern – der vollständige Bericht (AC6) bleibt
      dadurch unberührt.

## Betroffene Stellen (Orientierung)

- `app/veranstaltung/berichtModell.ts` (Single Source des Bericht-Modells,
  `gesamtabrechnungsZeilen`)
- `app/veranstaltung/berichtXlsx.ts`, `app/veranstaltung/berichtPdf.ts` (Renderer)
- `app/veranstaltung/berichtDateiname.ts` (Dateiname/Format-Typ)
- `app/api/veranstaltung/[id]/bericht/route.ts` (Rolle/Status/Parameter-Whitelist)
- `app/veranstaltung/[id]/page.tsx` (Download-Links, gruppierte Sektion)
- `docs/routes.md`, ggf. `docs/adr/036-abschlussbericht-erzeugung-excel-pdf.md` (ADR beschreibt
  die geänderte Mechanik) und `docs/anleitung/veranstalter/anleitung.md`

## Bezug

- Basis: #185 (Abschlussbericht Excel + PDF), #193 (PDF-Erzeugung), #206
  (Verzehr-Aufschlüsselung)
- Domänenregeln: `docs/factory/PROJECT-CONTEXT.md`, `docs/specs/README-montagsrunde.md`
