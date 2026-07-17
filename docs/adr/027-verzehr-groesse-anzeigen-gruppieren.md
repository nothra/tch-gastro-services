# ADR 027: Verzehr-Erfassung – Größe anzeigen & gleichnamige Artikel gruppieren

## Status
Accepted

## Date
2026-07-17

## Context

Issue #137 ([spec-137](../specs/spec-137-verzehr-groesse-anzeigen-gruppieren.md)) verfeinert die
Anzeige der Artikelauswahl in der Verzehr-Erfassung (F5, [ADR-025](025-verzehr-erfassung-datenmodell.md)).
Das Katalogmodell trägt `name` **und** `size` mit `UNIQUE(name, size)` – derselbe Artikelname
existiert ggf. in mehreren Größen (z. B. „Cola · 0,3 l" / „Cola · 0,5 l"). Bisher zeigt die
Erfassung nur `{name} · {preis}` ([app/_verzehr/VerzehrErfassung.tsx](../../app/_verzehr/VerzehrErfassung.tsx)):
Gleichnamige Artikel sind ununterscheidbar. Die Spec fordert (1) Größe je Artikel sichtbar und
(2) Gruppierung gleichnamiger Artikel und delegiert die **exakte Darstellung** sowie die
**Sortier-/Logik-Verortung** ausdrücklich an /architecture.

Die Änderung ist **rein präsentational** – kein neues Verhalten, keine Preis-/Mengen-/Summen-
Logik (ADR-025 D1–D4 bleiben unberührt). Relevante Randbedingungen:

- **Route-Neutralität (ADR-025 D5, Codify #52):** `app/_verzehr/` ist mit der künftigen
  öffentlichen Theke (F7/#54) geteilt und darf **keine** Imports aus `app/<feature>/` tragen.
- **Katalog-Ordnung:** `listActiveCatalog()` liefert bereits sortiert nach
  `sortOrder, name, size` ([db/catalog.ts](../../db/catalog.ts)). `sortOrder` ist die bewusste
  Kuratierung des Verwalters – gleichnamige Varianten sind dadurch **nicht garantiert benachbart**.
- **Soft-Delete-Sonderabschnitt (ADR-026):** „Nicht mehr im Katalog" rendert bereits konsumierte,
  danach deaktivierte Artikel aus `VerzehrPositionRow` – dessen `listPositionen`-Select führt
  aktuell **kein** `size`.
- **Strichlisten-Modell (ADR-025):** Jede (Zeile, Artikel)-Kombination hat ihre eigene laufende
  Menge und ihr eigenes +/− – für **volle Transparenz** müssen alle Größen samt Menge sichtbar sein.

## Decision

### D1 — `size` durch den route-neutralen Vertrag durchreichen

- `VerzehrArtikel` (UI-Prop in `app/_verzehr/types.ts`/`VerzehrErfassung.tsx`) erhält `size: string`.
- Das Page-Mapping ([app/veranstaltung/[id]/verzehr/page.tsx](../../app/veranstaltung/[id]/verzehr/page.tsx))
  reicht `item.size` durch (liegt bereits vor, wurde nur verworfen).
- `VerzehrPositionRow` erhält `size: string`; `listPositionen` selektiert `catalogItems.size`
  ([db/verzehr.ts](../../db/verzehr.ts)) – für den Inaktiv-Abschnitt.

### D2 — Darstellung: **Namens-Untergruppe** (eine Variante = flache Zeile)

Innerhalb jeder Kategorie-Sektion (Getränke/Essen/Kaffee, Reihenfolge unverändert):

- **> 1 Variante desselben `name`:** eine **Namens-Überschrift** + darunter je Variante eine
  eingerückte Zeile, die **nur** `{size} · {preis}` + `MengeControl` zeigt (Name nicht wiederholt).
  So bleibt für jede Größe die laufende Menge und das +/− sichtbar (Transparenz + Strichliste).
- **Genau 1 Variante:** eine **flache Zeile** wie bisher (`{name}{· size} · {preis}` +
  `MengeControl`), **ohne** Gruppen-Chrome (erfüllt „keine unnötige Verschachtelung").

Verworfen: Dropdown/Segment-Buttons je Name (Option B) – sie **verstecken** die je-Größe-Menge
und -Strichliste hinter einer Auswahl und widersprechen dem Transparenz-/Strichlisten-Modell.

### D3 — Grouping-/Label-Logik als route-neutraler, testbarer Helfer

Ein DB-freies Modul in `app/_verzehr/` mit sprechendem Namen (Codify #105, **kein** `utils`),
z. B. `app/_verzehr/artikel-anzeige.ts`:

- `gruppiereArtikel(artikel: readonly VerzehrArtikel[]): VerzehrArtikelGruppe[]` –
  **stabiles group-by `name`**, das die **Katalog-Reihenfolge bewahrt**: Gruppen erscheinen in
  der Reihenfolge des ersten Auftretens ihres Namens in der (bereits nach `sortOrder, name, size`
  sortierten) Eingabe; Varianten innerhalb der Gruppe in Eingabereihenfolge. **Kein** erneutes
  Sortieren → die `sortOrder`-Kuratierung des Verwalters bleibt respektiert. Gruppiert auch bei
  nicht benachbarten gleichnamigen Einträgen korrekt (Bucket am Erstauftreten).
  `VerzehrArtikelGruppe = { name: string; varianten: readonly VerzehrArtikel[] }` (`varianten` ≥ 1).
- `groessenSuffix(size: string): string` – `""` wenn leer **oder nur Whitespace** (trim), sonst
  ` · {trimmed}`. Deckt die Fehlerszenarien (leerer/whitespace-Wert → kein sichtbares leeres Suffix).

Beide Funktionen sind ohne DB/Render zu 100 % unit-testbar; die Komponente wird zur reinen
Projektion. Keine Feature-Imports (ADR-025 D5).

### D4 — Leere Größe → **nur der Name** (kein „· ohne Größe")

Bewusste Abweichung vom Verwaltungs-Muster `CatalogRow.tsx:62` (`· ohne Größe`): Dort dient das
Suffix der Eindeutigkeit in einer **ungruppierten Gesamtliste**; in der Erfassung sind Artikel
bereits nach Kategorie gruppiert, und leere Größen (v. a. Kaffee) wären nur Rauschen.

### D5 — Inaktiv-Abschnitt: Größe sichtbar, **keine** Gruppierung

„Nicht mehr im Katalog" zeigt die Größe über denselben `groessenSuffix` (D3/D4), aber **ohne**
Namens-Gruppierung: Es sind seltene Ausnahme-Restposten (ADR-026), und `gruppiereArtikel` über
den abweichenden Typ `VerzehrPositionRow` zu generisieren wäre Aufwand ohne fachlichen Nutzen.
Die Größe genügt hier zur Unterscheidung.

## Alternatives

### Frage 1 – Darstellung der Gruppierung

#### Option A: Namens-Untergruppe, Einzel-Variante flach (gewählt)
**Pros:** Jede Größe behält sichtbare Menge + Strichliste (Transparenz, ADR-025); touch-freundlich;
degradiert für Einzel-Varianten exakt auf die bisherige schlanke Zeile; F7-tauglich unverändert.
**Cons:** Etwas mehr Render-Logik (Gruppe vs. flach) – gekapselt in der Projektion.

#### Option B: Dropdown / Segment-Buttons je Name
**Pros:** Kompakter bei sehr vielen Varianten.
**Cons:** Versteckt je-Größe-Menge/Strichliste hinter Auswahl → bricht Transparenz- und
Strichlisten-Modell; zusätzlicher Interaktionsschritt am Theken-/Handy-Gerät. Verworfen.

#### Option C: Eine Zeile mit Inline-Größen-Chips (je Chip eigenes +/−)
**Pros:** Sehr kompakt.
**Cons:** Auf Handy gedrängt; mehrere MengeControls je Zeile unübersichtlich. Verworfen.

### Frage 2 – Reihenfolge der Gruppen/Varianten

#### Option A: Stabiles group-by, Katalog-Reihenfolge bewahren (gewählt)
**Pros:** Respektiert die `sortOrder`-Kuratierung des Verwalters; deterministisch, da die Eingabe
deterministisch sortiert ist; kein Locale-Sortier-Sonderfall (z. B. „0,3 l" vs. „0,5 l").
**Cons:** Nicht alphabetisch – aber die kuratierte Ordnung ist gewünscht.

#### Option B: Gruppen/Varianten alphabetisch per `localeCompare("de")`
**Pros:** Feste alphabetische Ordnung.
**Cons:** Ignoriert `sortOrder`; ordnet bewusst kuratierte Getränkelisten um; Locale/`numeric`-
Feinheiten bei Größenstrings. Verworfen.

## Rationale

Die Entscheidungen halten die Änderung strikt **präsentational** und musterkonform: `size`
fließt durch den bestehenden route-neutralen Vertrag (ADR-025 D5), die Darstellung bewahrt das
Strichlisten-/Transparenz-Modell (jede Größe sichtbar mit eigener Menge), und die Ableitung lebt
als DB-freier, testbarer Helfer mit sprechendem Namen (Codify #105) statt in der JSX. Das
stabile group-by respektiert die vorhandene `sortOrder`-Kuratierung und ist ohne Locale-Sonderfall
deterministisch. Die leere Größe wird kontextgerecht weggelassen (Abweichung von der Verwaltung
ist begründet). F7 erbt alles unverändert.

## Konsequenzen

**Positiv:**
- Gleichnamige Artikel sind eindeutig und übersichtlich; Einzel-Varianten bleiben schlank.
- Gruppierung/Label sind isoliert unit-testbar; die Komponente wird zur reinen Projektion.
- Rein additiv: keine Schema-, Preis-, Mengen- oder Summen-Änderung; F7 unverändert wiederverwendbar.

**Zu beachten / Handoff:**
- `listPositionen` um `catalogItems.size` erweitern und `VerzehrPositionRow` +`size` – Konsumenten
  prüfen (nur Anzeige betroffen; Summen unberührt).
- Route-Neutralität nach dem ersten Draft aktiv prüfen (Codify #52):
  `grep -r 'from "@/app/[^_]' app/_verzehr/` muss leer bleiben.
- `groessenSuffix` trimmt – der Whitespace-Fehlerszenario-Test gehört dazu.
- Reihenfolge-/Gruppierungs-Verhalten mit einem Fall testen, in dem gleichnamige Varianten in der
  Eingabe **nicht benachbart** sind (unterschiedliche `sortOrder`) → Bucket am Erstauftreten.
