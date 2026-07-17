# Spec: Verzehr erfassen – Größe je Artikel anzeigen & gleichnamige Artikel gruppieren

> Issue #137 · Anzeige-/UX-Verfeinerung von Feature F5 ([spec-52](spec-52-verzehr-erfassen.md)) ·
> Epic [Digitale Veranstaltungs-Abrechnung](README-montagsrunde.md)
>
> **Kein neues fachliches Verhalten** – Preise, Mengen und Summen bleiben unverändert. Diese
> Spec betrifft ausschließlich die Darstellung der Artikelauswahl in der Verzehr-Erfassung.

## Kontext

Das Katalogmodell trägt `name` **und** `size` mit `UNIQUE(name, size)` ([db/schema.ts](../../db/schema.ts)) –
derselbe Artikelname kann in mehreren Größen existieren (z. B. „Cola · 0,3 l" und „Cola · 0,5 l"
als zwei Katalogeinträge). In der Verzehr-Erfassung ([app/_verzehr/VerzehrErfassung.tsx](../../app/_verzehr/VerzehrErfassung.tsx))
wird zu jedem Artikel bisher nur `{name} · {preis}` gezeigt – die Größe fehlt. Gleichnamige
Artikel erscheinen dadurch als mehrere ununterscheidbare Zeilen. Für eine eindeutige und
übersichtliche Auswahl soll die Größe sichtbar sein und gleichnamige Artikel gruppiert werden.

Die Größe liegt bereits im Data-Layer vor (`listActiveCatalog()` liefert `CatalogItem.size`),
wird aber im Page-Mapping ([app/veranstaltung/[id]/verzehr/page.tsx:68](../../app/veranstaltung/[id]/verzehr/page.tsx))
verworfen und erreicht die UI nicht. Für den Sonderabschnitt „Nicht mehr im Katalog"
(soft-gelöschte Artikel mit erfasstem Verzehr, ADR-026) fehlt `size` zusätzlich im
Data-Layer-Vertrag (`VerzehrPositionRow` / `listPositionen`, [db/verzehr.ts](../../db/verzehr.ts)).

## Scope

**Inbegriffen:**
- **Größe je Artikel anzeigen** in der Verzehr-Erfassung – für den aktiven Katalog **und** für
  den Abschnitt „Nicht mehr im Katalog".
- **Gruppierung gleichnamiger Artikel** (gleicher `name`, unterschiedliche `size`) innerhalb
  einer Kategorie, sodass Größen-Varianten zusammengehörig und eindeutig unterscheidbar sind.
- `size` durch den Data-Layer bis zur UI durchreichen: Ergänzung in `VerzehrArtikel` (route-neutrale
  UI-Prop), im Page-Mapping und in `VerzehrPositionRow` / `listPositionen` (für inaktive Positionen).

**Nicht inbegriffen:**
- Preis-, Mengen- oder Summenlogik (unverändert – rein präsentational).
- Änderungen am Katalog-Datenmodell (`size`/`UNIQUE(name, size)` existieren bereits).
- Die Katalog-Verwaltungs-UI (`app/verwaltung/katalog/*`) – dort wird die Größe bereits gezeigt.
- Die **exakte** Gruppierungs-Darstellung (Untergruppe vs. Segment-Buttons vs. Dropdown je Name)
  → Feindesign in `/architecture` (siehe Offene Fragen).

## Entschiedene Fragen (aus /requirements, 2026-07-17)

- **Beide Teile** (Größe anzeigen + Gruppierung) werden in dieser Task umgesetzt.
- **Leere Größe** (`size = ""`, z. B. Kaffee) → **nur der Name**, kein Größen-Suffix. In der
  Erfassung sind Artikel bereits nach Kategorie gruppiert; „· ohne Größe" wäre unnötiges Rauschen.
  (Bewusste Abweichung vom Verwaltungs-Muster `· ohne Größe` in `CatalogRow.tsx:62`, das dort
  der Eindeutigkeit in einer ungruppierten Gesamtliste dient.)
- **Inaktive Positionen** („Nicht mehr im Katalog") zeigen die Größe **konsistent** mit – inkl.
  Data-Layer-Ergänzung von `size` in `VerzehrPositionRow` / `listPositionen`.

## Akzeptanzkriterien

- [ ] GIVEN ein aktiver Katalogartikel mit gesetzter Größe (z. B. „Cola", „0,5 l") WHEN er in
      der Verzehr-Erfassung angeboten wird THEN wird die Größe sichtbar am Artikel angezeigt
      (Muster `· {size}`, z. B. „Cola · 0,5 l").
- [ ] GIVEN ein aktiver Artikel ohne Größe (`size = ""`, z. B. Kaffee) WHEN er angezeigt wird
      THEN erscheint **nur der Name** ohne Größen-Suffix (keine irreführende leere Angabe,
      kein „· ohne Größe").
- [ ] GIVEN mehrere aktive Artikel mit gleichem `name` und unterschiedlicher `size` innerhalb
      derselben Kategorie WHEN sie angeboten werden THEN sind sie gruppiert dargestellt (als
      eine zusammengehörige Namensgruppe) und die Größen sind eindeutig unterscheidbar.
- [ ] GIVEN ein Name mit nur **einer** Variante (genau ein Artikel dieses `name`) WHEN er
      angezeigt wird THEN entsteht **keine** unnötige Gruppierungs-Verschachtelung/Chrome –
      die Darstellung bleibt so schlank wie bisher (nur Größe ggf. ergänzt).
- [ ] GIVEN Größen-Varianten desselben Namens WHEN sie dargestellt werden THEN erscheinen sie
      in einer **deterministischen, stabilen** Reihenfolge (Varianten desselben Namens stehen
      zusammen; keine Zufalls-/DB-Reihenfolge).
- [ ] GIVEN ein soft-gelöschter Artikel mit erfasstem Verzehr (`menge > 0`) und gesetzter Größe
      WHEN er im Abschnitt „Nicht mehr im Katalog" angezeigt wird THEN wird seine Größe ebenfalls
      sichtbar (gleiches Muster: `· {size}`, bzw. nur Name bei leerer Größe).
- [ ] GIVEN dieselbe Artikelauswahl WHEN Größe/Gruppierung angezeigt werden THEN bleiben
      Mengensteuerung (+/−), Zeilensummen (Getränke/Sonstige) und Preise **unverändert**
      (rein präsentationale Änderung, keine neue Fachlogik).
- [ ] GIVEN die route-neutrale Erfassungs-UI (`app/_verzehr/`, ADR-025 D5) WHEN `size` ergänzt
      wird THEN bleibt das Modul feature-frei (keine Imports aus `app/<feature>/`) und für F7
      (öffentliche Theke) unverändert wiederverwendbar.

## Fehlerszenarien

- [ ] Größe ist ein leerer String (`""`) → wird als „keine Größe" behandelt (nur Name), nie als
      sichtbares leeres Suffix (`· `).
- [ ] Größe mit führenden/nachfolgenden Leerzeichen sollte nicht als „gesetzt" durchschlagen
      (Konsistenz mit „leer" → nur Name). *(Randfall; Katalog trimmt bereits bei der Anlage –
      im Zweifel defensiv behandeln.)*

## Offene Fragen (für /architecture)

> **Erledigt durch [ADR-027](../adr/027-verzehr-groesse-anzeigen-gruppieren.md) (2026-07-17).**

- [x] **Exakte Gruppierungs-Darstellung** → Namens-Untergruppe (Überschrift + eingerückte
      Varianten); genau eine Variante bleibt eine flache Zeile (ADR-027 D2).
- [x] **Sortierung der Varianten/Gruppen** → stabiles group-by, das die Katalog-Reihenfolge
      (`sortOrder, name, size`) bewahrt; kein alphabetisches Re-Sort (ADR-027 D3).
- [x] **Verortung der Logik** → route-neutraler, DB-freier Helfer `app/_verzehr/artikel-anzeige.ts`
      (`gruppiereArtikel`, `groessenSuffix`), 100 % unit-testbar (ADR-027 D3).
