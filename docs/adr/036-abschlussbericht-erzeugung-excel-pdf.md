# ADR 036: Abschlussbericht-Erzeugung (Excel + PDF)

## Status

Accepted

## Kontext

Für eine **abgeschlossene** Veranstaltung soll der `veranstalter` einen **Abschlussbericht**
als Datei erzeugen und herunterladen können – als **Excel (`.xlsx`)** und als **PDF**, inhaltsgleich
(Issue #185, [spec-185](../specs/spec-185-abschlussbericht-excel-pdf.md)). Der Bericht bildet die
Abrechnung so ab, wie sie ursprünglich im Excel-Template „Abrechnung Veranstaltung" dargestellt war
(Striche je Teilnehmer), folgt aber den **geltenden Domänenregeln** (Auslagen mindern den Verzehr
nicht, [README-montagsrunde](../specs/README-montagsrunde.md)).

Diese Entscheidung ist nötig, weil:

- das Projekt **keine** Bibliothek für `.xlsx`- oder PDF-Erzeugung enthält (neue Abhängigkeit,
  Betriebsauswirkung auf die Vercel-Serverless-Function-Größe),
- der **Erzeugungs-/Download-Mechanismus** (Route Handler vs. Server Action) und dessen
  **RBAC-/Status-Absicherung** festgelegt werden müssen,
- **zwei Format-Renderer** aus **derselben Datengrundlage** speisen müssen, damit die Werte
  garantiert identisch sind (spec-185 AC10) – ohne zweiten Wahrheitspfad.

Rahmenbedingungen: Next.js App Router, Node 20+, Vercel Region `fra1`, EU-Datenresidenz
(ADR-014). Beträge sind ganzzahlige Cent (ADR-021); Einzelpreise je Position werden beim
Abschluss eingefroren (`einzelpreis_cents`, ADR-033 D2) → die Zahlen einer abgeschlossenen
Veranstaltung sind deterministisch reproduzierbar, ein Bericht-Snapshot ist fachlich nicht nötig.

## Entscheidung

### D1 – Erzeugungs-Mechanismus: authentifizierter GET-Route-Handler

Ein **Route Handler** `app/api/veranstaltung/[id]/bericht/route.ts` (GET) mit Query-Parameter
`?format=xlsx|pdf` (Whitelist, fail-closed: unbekanntes/fehlendes Format → `400`). Antwort ist
der Datei-Buffer mit `Content-Type` (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
bzw. `application/pdf`) und `Content-Disposition: attachment; filename="…"`.

Ein GET-Route-Handler ist der idiomatische Weg für einen **Datei-Download mit Content-Disposition**:
Server Actions sind POST und liefern (De-)Serialisierung/Redirect, keinen sauberen Binär-Download.
Ein Handler mit `?format=` statt zwei getrennter Routen hält die Routen-Doku und den Drift-Check
schlank (eine Zeile) und teilt die komplette Lade-/Autorisierungs-Logik.

Die Detailseite (`app/veranstaltung/[id]/page.tsx`) verlinkt bei Status `abgeschlossen` beide
Downloads (`…/bericht?format=xlsx` / `…/bericht?format=pdf`).

### D2 – Runtime: Node.js

`export const runtime = "nodejs"` im Route Handler. `exceljs` und `pdfmake` benötigen Node-APIs
(Buffer/Streams, eingebettete Fonts) und sind nicht Edge-kompatibel. Läuft in `fra1` (EU); die
Erzeugung ist reines Compute ohne externen Dienst → keine Datenresidenz-Fragen.

### D3 – RBAC serverseitig, Route bleibt proxy-geschützt

Zugriff nur für Rolle **`veranstalter`**, serverseitig durchgesetzt im Handler über den Guard
aus `lib/authz.ts` (`auth()` → `hasRole(session?.user?.roles, "veranstalter")`; bei fehlender
Rolle `403`). Die Route liegt unter dem bestehenden `proxy.ts`-Matcher und wird **nicht**
ausgenommen (im Gegensatz zu `api/health|version|auth`) – sie ist authentifiziert, kein
öffentlicher Endpunkt (Codify #63). Nachweis auf Handler-Ebene (Unit) **und** – da der Handler
direkt getestet den Proxy umgeht – über einen Test, der den Rollen-`403` prüft.

### D4 – Status-Gate + Not-Found

Bericht **nur** für Status `abgeschlossen`. Offene Veranstaltung → fail-closed abgelehnt
(`409 Conflict`, kein Datei-Download). Unbekannte/gelöschte ID → `404`. Reihenfolge im Handler:
`auth`/Rolle → `getVeranstaltung` (404) → Status-Check (409) → Modell bauen → Format rendern.

### D5 – Bibliothekswahl: `exceljs` (.xlsx) + `pdfmake` (PDF)

- **`exceljs`** erzeugt `.xlsx`: mehrere Wertebereiche pro Sheet, Zell-Merge (Kopf, breite
  Artikel-Matrix), Spaltenbreiten und **Zahlenformate** (`#,##0.00 €`, de-DE). Reine Node-Lib,
  kein Headless-Browser.
- **`pdfmake`** erzeugt PDF aus einer deklarativen Dokument-Definition mit direktem
  **Tabellen-Support** (Body-Array), eingebetteten Fonts (deterministisch, kein System-Font-Bedarf),
  ohne Headless-Browser.

Beide sind Node-nativ → kleine Function, schneller Cold-Start, wartungsarm. Da die Erzeugung
**server-only** (Route Handler) ist, zählt die Größe nur zur Serverless-Function, **nicht** zum
Client-Bundle.

### D6 – Single Source: DB-freies Bericht-Modell

Eine reine, DB-freie Funktion `berichtModell(...)` (z. B. `app/veranstaltung/berichtModell.ts`,
analog `kassierSummen.ts`) baut aus `Veranstaltung` + `zeilen` + `positionen` + `auslagen` das
**format-neutrale** Bericht-Datenmodell (Kopf, Teilnehmerzeilen inkl. Artikel-Positionen,
Tagessummen, Auslagen-Einzelnachweis, Gesamtabrechnung). Die beiden Renderer (`berichtXlsx.ts`,
`berichtPdf.ts`) konsumieren **ausschließlich** dieses Modell.

Dadurch sind die Werte in beiden Formaten per Konstruktion identisch (AC10), und das Modell ist
zu 100 % unit-testbar. Das Modell nutzt die bestehenden reinen Summen-Funktionen (`zeileSummen`,
`kassierZeilen`, `kassierTagessummen`, `gesamtabrechnung`, `auslagenSummen`) – kein zweiter
Wahrheitspfad. Die binären Renderer werden **smoke-getestet** (Buffer nicht leer + Magic Bytes:
`.xlsx` beginnt mit ZIP-Signatur `50 4B` „PK", PDF mit `%PDF`); die inhaltliche Korrektheit
verantwortet das getestete Modell.

### D7 – Verzehr-Umsatz je Kategorie + Konsistenz

Das Modell weist den Verzehr-Umsatz getrennt nach **Getränke / Essen / Kaffee** aus (spec-185 AC8).
`kassierTagessummen` fasst Essen+Kaffee zu „Sonstige" zusammen; die getrennte Essen-/Kaffee-Summe
leitet das Modell zusätzlich aus den Positionen (`zeileSummen` je Kategorie) ab – bevorzugt als
kleine Erweiterung der bestehenden Summen-Funktion statt einer Parallel-Aggregation. Die
Konsistenz `Σ Getränke + Σ Essen + Σ Kaffee + Σ Spende = Σ Erhalten` (AC9) gilt bei einer
abgeschlossenen Veranstaltung **per Konstruktion** (jede Zeile bezahlt ⇒
`Erhalten = Verzehr-Gesamt + Spende`) und wird durch einen Modell-Test abgesichert.

### D8 – Layout je Format optimiert

- **Excel:** breite **Artikel-Matrix** (Artikel als Spalten, Strich-Gitter wie das Original),
  nutzt die Tabellenkalkulation aus.
- **PDF:** kompakte **Unterliste je Teilnehmer** (Hochformat, druckfreundlich).

Der **Informationsgehalt ist gleich** (Menge + Zeilenbetrag je Artikel, Kategorie-/Zeilensummen);
nur die Anordnung unterscheidet sich. Alle Beträge im de-DE-Format mit 2 Nachkommastellen
(konsistent zu `formatCents`; im Excel über `numFmt`, sodass die Zellen echte Zahlen bleiben).

### D9 – Dateibenennung

`abschlussbericht-<YYYY-MM-DD>-<slug>.{xlsx,pdf}`, wobei `<slug>` aus der Bezeichnung abgeleitet
wird: lowercase, Umlaute transliteriert (ä→ae …), alles außerhalb `[a-z0-9]` zu `-`, Mehrfach-`-`
zusammengefasst, gekürzt (z. B. 60 Zeichen). Leere/entfallende Slugs → nur Datum. Die Ableitung
liegt in einer eigenen reinen Funktion (testbar) und wird nur für den `filename` verwendet.

### D10 – Orphan-sichere Auslagen

Der Auslagen-Einzelnachweis nutzt `listAuslagen` (LEFT JOIN + `COALESCE` auf einen stabilen
Fallback-Anzeigenamen, Codify #53) – eine Auslage bleibt sichtbar, auch wenn ihre
Teilnehmerzeile gelöscht wurde (spec-185 Fehlerszenario).

## Alternativen

### Mechanismus

#### Option A: GET-Route-Handler mit `?format=` (gewählt)
- **Vorteile:** idiomatischer Datei-Download (`Content-Disposition`); ein Ort für
  Auth/Status/Laden; schlanke Routen-Doku; direkt verlinkbar.
- **Nachteile:** Query-Param muss fail-closed validiert werden (Whitelist).

#### Option B: Server Action(s)
- **Vorteile:** teilt den bestehenden Action-/RBAC-Stil.
- **Nachteile:** POST liefert keinen sauberen Binär-Download; Client müsste Blob/Anchor-Download
  selbst bauen; kein direkter Link; unnatürlich für read-only-Export.

### PDF-Rendering

#### Option A: `pdfmake` (gewählt)
- **Vorteile:** direkter Tabellen-Support; Node-nativ; eingebettete Fonts; klein; deterministisch.
- **Nachteile:** eigenes Doc-Definition-Format (kein React/JSX).

#### Option B: HTML → PDF via Headless-Chromium (`puppeteer`/`@sparticuz/chromium`)
- **Vorteile:** ein HTML-Layout für die Optik.
- **Nachteile:** schwere Serverless-Function (~50 MB), lange Cold-Starts, hohe Wartungslast,
  Chromium-Version-Pflege – Overkill fürs MVP.

#### Option C: `@react-pdf/renderer`
- **Vorteile:** deklaratives React→PDF, passt stilistisch zum Next-Stack.
- **Nachteile:** größere Dependency; Tabellen-Spaltenbreiten sind Flexbox-Handarbeit.

### Excel-Rendering

#### Option A: `exceljs` (gewählt)
- **Vorteile:** reif, weit verbreitet; volles Styling/Merge/`numFmt`/Spaltenbreiten für die
  breite Matrix + mehrere Bereiche.
- **Nachteile:** Repo weniger aktiv (aber stabil, keine kritischen offenen Advisories).

#### Option B: `write-excel-file`
- **Vorteile:** kleiner, aktiver gewartet.
- **Nachteile:** weniger komfortabel für Merge/mehrere Wertebereiche/breite Matrix.

#### Option C: SheetJS (`xlsx` auf npm)
- **Nachteile:** npm-Distribution veraltet mit Prototype-Pollution-Advisory (aktuelle Version nur
  über eigenes CDN) → Konflikt mit `pnpm audit`/Dependabot. **Ausgeschlossen.**

## Begründung

Node-native Renderer aus **einem** DB-freien Modell erfüllen die harten Anforderungen am
günstigsten: identische Werte in beiden Formaten (D6 ⇒ AC10), volle Unit-Testbarkeit der
Fachlogik, kleine/robuste Serverless-Function ohne Headless-Browser (D5/D2), und fail-closed
Autorisierung/Status als authentifizierte, proxy-geschützte Route (D3/D4). Der GET-Handler ist
der natürliche Träger eines Datei-Downloads. Das Layout je Format (D8) nutzt beide Medien aus,
ohne den Informationsgehalt zu spalten.

## Konsequenzen

- **Neue Laufzeit-Abhängigkeiten:** `exceljs`, `pdfmake` (+ Typen). Nur Server-seitig genutzt →
  **kein** Client-Bundle-Impact; Serverless-Function wächst moderat. Nach `pnpm install`
  `pnpm audit` prüfen; pnpm@11 nutzt `pnpm-workspace.yaml` für etwaige Overrides (Codify #167).
- **Neue Route** `app/api/veranstaltung/[id]/bericht/route.ts` → [`docs/routes.md`](../routes.md)
  im selben PR mitpflegen (authentifiziert, `veranstalter`, **nicht** proxy-exempt); der
  Drift-Check erzwingt das fail-closed.
- **Neue Module:** `berichtModell.ts` (rein, getestet), `berichtXlsx.ts`/`berichtPdf.ts`
  (Renderer, smoke-getestet), eine Slug-Funktion; ggf. kleine Erweiterung von `kassierSummen`
  um die getrennte Essen-/Kaffee-Summe (D7).
- **UI:** Detailseite zeigt die beiden Download-Links nur bei Status `abgeschlossen`.
- **Kein** Persistenz-/Archiv-Konzept (On-demand), **kein** Protokoll-Abschnitt (spec-185 Scope).
- Reproduzierbarkeit statt Snapshot bleibt gültig, solange Einzelpreise beim Abschluss eingefroren
  werden (ADR-033 D2) – Voraussetzung für stabile, wiederholbar identische Berichte.
