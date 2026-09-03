# ADR 046: Abschlussbericht-Variante „nur Getränke" – Aufruf, Modell-Schnitt, Renderer

## Status

Accepted

## Kontext

Issue #324 ([spec-324](../specs/spec-324-abschlussbericht-getraenke.md)) verlangt eine
zusätzliche Abschlussbericht-Variante, die ausschließlich die Kategorie Getränke ausweist
(Verzehr-Umsatz Getränke + Auslagenerstattung Getränke) – ohne Spende, Kassenveränderung und
Erhalten/Einnahmen. Der bestehende vollständige Bericht (F9, #185,
[ADR-036](036-abschlussbericht-erzeugung-excel-pdf.md)) bleibt unverändert; die Variante kommt
zusätzlich dazu.

Drei Fragen aus spec-324 „Offene Fragen" sind für die Umsetzung zu klären: die Aufruf-Mechanik
der Route, der Schnitt des Bericht-Modells und die Anpassung der Format-Renderer. ADR-036 D6
(Single Source: DB-freies Bericht-Modell) bleibt die Leitplanke – kein zweiter Wahrheitspfad für
die Getränke-Zahlen.

## Entscheidung

### D1 – Aufruf-Mechanik: bestehende Route, neuer Query-Parameter `umfang`

Kein eigener Endpunkt. `app/api/veranstaltung/[id]/bericht/route.ts` bekommt einen zweiten
Query-Parameter `umfang=voll|getraenke` (Whitelist, fail-closed: unbekannter Wert → `400`,
analog `parseFormat`; **fehlender** Parameter → Default `voll`, damit bestehende Links/Tests
ohne `umfang` unverändert den vollständigen Bericht liefern). `docs/routes.md` wird um den
Parameter ergänzt (eine Zeile, kein neuer Routen-Eintrag).

Das folgt derselben Begründung wie ADR-036 D1 (ein Handler statt getrennter Routen hält
Routen-Doku und Drift-Check schlank, teilt Auth-/Status-/Lade-Logik vollständig).

### D2 – Modell-Schnitt: abgeleitete Projektion, kein Scope-Parameter in `berichtModell`

`berichtModell()` bleibt **unverändert** (kein Scope-Parameter, keine Verzweigung in
`kassierZeile`/`kassierTagessummen`/`gesamtabrechnung`). Stattdessen eine neue, reine
Projektions-Funktion `berichtModellGetraenke(modell: BerichtModell): BerichtGetraenkeModell` im
selben Modul (`berichtModell.ts`), die aus dem bereits fertigen vollen Modell die
Getränke-Sicht ableitet:

```ts
export type BerichtGetraenkeTeilnehmer = {
  anzeigename: string;
  positionen: BerichtPosition[]; // gefiltert auf category === "getraenk"
  getraenkeCents: number;
};

export type BerichtGetraenkeModell = {
  kopf: BerichtKopf;
  teilnehmer: BerichtGetraenkeTeilnehmer[];
  getraenkeGesamtCents: number; // Σ Verzehr-Umsatz Getränke
  auslagen: BerichtAuslage[]; // gefiltert auf Kategorie Getränke
  auslagenerstattungGetraenkeCents: number; // Σ Auslagenerstattung Getränke (erstattet)
};
```

Herleitung je Feld, ausschließlich aus bereits vorhandenen Modell-Werten (kein zweiter
Wahrheitspfad):
- `teilnehmer`: je Teilnehmer `positionen.filter(p => p.category === "getraenk")`; Teilnehmer mit
  leerem Ergebnis werden weggelassen (spec-324 AC12). `getraenkeCents` ist bereits als Feld am
  vollen `BerichtTeilnehmer` vorhanden – keine Neuberechnung.
- `getraenkeGesamtCents`: `modell.tagessummen.getraenkeCents` (unverändert übernommen – die
  Tagessumme zählt bereits alle Zeilen, auch die mit 0 Getränken; identisch mit der Summe der
  gefilterten Teilnehmerzeilen).
- `auslagen`: `modell.auslagen.filter(a => a.kategorie === AUSLAGE_KATEGORIE_LABEL.getraenke)`
  (Vergleich gegen die vorhandene Label-Konstante, keine neue Magic-String-Kopplung).
- `auslagenerstattungGetraenkeCents`: `modell.gesamtabrechnung.auslagenErstattung.getraenkeCents`
  (unverändert übernommen).

**Warum Projektion statt Scope-Parameter:** `berichtModell()` müsste sonst optionale/nullbare
Felder für Spende/Erhalten/Kassenveränderung führen und die interne Berechnung verzweigen –
gegen Single Responsibility und gegen die Clean-Code-Regel „keine Fallbacks für ausgeschlossene
Fälle". Die Projektion ist eine kleine, pure, für sich testbare Funktion über einem bereits
korrekten Modell; AC7 (Werte in beiden Berichten identisch) gilt dadurch **per Konstruktion**,
weil beide aus derselben `berichtModell()`-Instanz stammen.

### D3 – Renderer: eigene, kleine Getränke-Renderer statt Verzweigung

Zwei neue Funktionen `berichtXlsxGetraenke(modell: BerichtGetraenkeModell)` und
`berichtPdfGetraenke(modell: BerichtGetraenkeModell)` (eigene Dateien oder als zweiter Export in
`berichtXlsx.ts`/`berichtPdf.ts` – Detailentscheidung `/implement`), statt eines Scope-Zweigs in
den bestehenden `berichtXlsx`/`berichtPdf`. Der reduzierte Bericht hat eine strukturell andere
Kopf-/Tabellen-/Ergebnis-Form (keine Spalten `Sonstige`/`Verzehr-Gesamt`/`Erhalten`/`Spende`,
keine zehnzeilige Gesamtabrechnung) – eine Verzweigung in den bestehenden Renderern würde deren
Funktionslänge und Verzweigungstiefe unnötig erhöhen (gegen „Eine Sache tun", ~20-Zeilen-
Orientierung). Gemeinsame Low-Level-Bausteine (Zahlenformat/Zellstil, Kopf-Aufbau) werden bei
Bedarf in kleine geteilte Helfer extrahiert, sobald echte Duplikation auftritt – nicht vorab
spekulativ.

Der Kopf beider Getränke-Ausgaben macht den Umfang **explizit erkennbar** (spec-324 AC9), z. B.
Titel-/Kopf-Zusatz „Nur Getränke". Beide Formate rendern denselben `BerichtGetraenkeModell`-Input
→ Werte sind identisch (AC8), analog ADR-036 D6.

### D4 – Dateiname: `berichtDateiname` um Umfangs-Parameter erweitert

`berichtDateiname(datum, bezeichnung, format, umfang: BerichtUmfang = "voll")` – bei
`umfang === "getraenke"` wird das Segment `getraenke` zwischen `abschlussbericht` und dem Datum
eingefügt: `abschlussbericht-getraenke-<YYYY-MM-DD>-<slug>.xlsx/.pdf`. `BerichtUmfang` ist ein
benannter Domänen-Typ (`"voll" | "getraenke"`, wie `BerichtFormat`), kein Boolean-Flag – der
Aufruf bleibt an sich lesbar (`berichtDateiname(d, b, "xlsx", "getraenke")`). Der Default `"voll"`
hält bestehende Aufrufer/Tests ohne Änderung grün.

### D5 – Route-Handler-Fluss

Reihenfolge unverändert zu ADR-036 D4 (Rolle → Format → `getVeranstaltung` (404) → Status (409)),
zusätzlich `umfang`-Whitelist vor dem Rendern:

```
auth/Rolle → format (400) → umfang (400) → getVeranstaltung (404) → Status (409)
  → berichtModell() (immer voll)
  → umfang === "getraenke" ? berichtModellGetraenke(modell) + *Getraenke-Renderer
                            : modell + bestehende Renderer
```

`berichtModell()` wird **immer** mit den vollen Daten aufgerufen (kein Query-Overhead-Unterschied
zum bestehenden Bericht) – die Reduktion passiert ausschließlich in der Projektion (D2).

## Alternativen

### Aufruf-Mechanik
- **Option A (gewählt):** Query-Parameter `umfang` an bestehender Route. Vorteile: kein neuer
  Auth-/Status-Codepfad, schlanke Routen-Doku. Nachteile: zwei orthogonale Query-Parameter
  (`format`, `umfang`) müssen beide whitelisted werden.
- **Option B:** eigene Route (`.../bericht/getraenke`). Vorteile: getrennte Handler, keine
  Parameter-Kombinatorik. Nachteile: verdoppelt Auth-/Status-/Lade-Logik oder erzwingt eine
  gemeinsame Hilfsfunktion für zwei Handler; zweiter Eintrag in `docs/routes.md`; ADR-036 D1
  wollte genau das vermeiden.

### Modell-Schnitt
- **Option A (gewählt):** abgeleitete Projektion über dem vollen Modell. Vorteile: `berichtModell()`
  bleibt unverändert und einfach; Projektion ist klein, pur, isoliert testbar; AC7 gilt per
  Konstruktion. Nachteile: zwei Modell-Typen statt eines parametrisierten.
- **Option B:** Scope-Parameter in `berichtModell()`. Vorteile: ein Modell-Typ. Nachteile:
  optionale/nullbare Felder für die entfallenden Werte, interne Verzweigung in mehreren
  Summen-Aufrufen, größere Funktion – gegen SRP und die Clean-Code-Fallback-Regel.

### Renderer
- **Option A (gewählt):** eigene `*Getraenke`-Renderer-Funktionen. Vorteile: jede Funktion bildet
  genau eine Berichtsform ab; keine Scope-Verzweigung in den bestehenden, bereits etablierten
  Renderern (Regressionsrisiko am vollständigen Bericht minimiert). Nachteile: etwas Struktur-
  Ähnlichkeit zwischen den Funktionspaaren (Kopf-Aufbau, Zahlenformat) – bei Bedarf extrahierbar.
- **Option B:** Scope-Zweig in `berichtXlsx`/`berichtPdf`. Vorteile: ein Funktionspaar. Nachteile:
  größere, verzweigte Funktionen; höheres Risiko, den vollständigen Bericht (unveränderter
  Bestandsschutz laut spec-324 AC6) beim Ändern versehentlich zu berühren.

## Begründung

Alle drei Entscheidungen minimieren den Eingriff in den bestehenden, bereits produktiv
beschriebenen Mechanismus (ADR-036): dieselbe Route, dasselbe volle Modell, keine Verzweigung in
etablierten Renderern. Die Getränke-Sicht entsteht als kleine, zusätzliche, für sich testbare
Schicht darüber – das hält den vollständigen Bericht (spec-324 AC6) beweisbar unverändert und
erfüllt AC7 (Wertegleichheit) per Konstruktion, weil beide Berichte aus derselben
`berichtModell()`-Instanz gespeist werden.

## Konsequenzen

- `app/veranstaltung/berichtModell.ts`: neue Typen `BerichtGetraenkeTeilnehmer`,
  `BerichtGetraenkeModell` + Funktion `berichtModellGetraenke`. `berichtModell()` selbst
  unverändert.
- `app/veranstaltung/berichtXlsx.ts`, `berichtPdf.ts` (oder neue Dateien daneben): zusätzliche
  Getränke-Renderer-Funktionen, keine Änderung an den bestehenden Signaturen/Ausgaben.
- `app/veranstaltung/berichtDateiname.ts`: `BerichtUmfang`-Typ + erweiterte
  `berichtDateiname`-Signatur mit Default `"voll"` (bestandssicher).
- `app/api/veranstaltung/[id]/bericht/route.ts`: neue `umfang`-Whitelist-Funktion (analog
  `parseFormat`), Verzweigung Modell → Projektion → passender Renderer.
- `app/veranstaltung/[id]/page.tsx`: gemeinsame Sektion „Abschlussbericht" mit zwei Gruppen
  „Vollständig" / „Nur Getränke" (spec-324 AC14), vier Links auf dieselbe Route mit
  unterschiedlichen Query-Parametern.
- `docs/routes.md`: bestehende Zeile für `/api/veranstaltung/[id]/bericht` um den
  `umfang`-Parameter ergänzt (kein neuer Eintrag).
- Keine neuen Laufzeit-Abhängigkeiten (`exceljs`/`pdfmake` bereits vorhanden, ADR-036 D5).
