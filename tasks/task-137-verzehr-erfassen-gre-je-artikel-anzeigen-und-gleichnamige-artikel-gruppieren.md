# Task 137: verzehr-erfassen-gre-je-artikel-anzeigen-und-gleichnamige-artikel-gruppieren

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung

Anzeige-/UX-Verfeinerung der Verzehr-Erfassung (F5, #52): In der Artikelauswahl wird zu
jedem Artikel die **Größe** (`size`) angezeigt, und **gleichnamige Artikel** (gleicher
`name`, unterschiedliche `size`) werden **gruppiert** dargestellt. Rein präsentational –
Preise, Mengen und Summen bleiben unverändert.

Spec: [spec-137](../docs/specs/spec-137-verzehr-groesse-anzeigen-gruppieren.md)

Entscheidungen aus /requirements (2026-07-17):
- Beide Teile (Größe anzeigen **und** Gruppierung) in dieser Task.
- Leere Größe (`size = ""`, z. B. Kaffee) → **nur Name**, kein Suffix (kein „· ohne Größe").
- Größe auch im Abschnitt „Nicht mehr im Katalog" (erfordert `size` in
  `VerzehrPositionRow` / `listPositionen`).

## Akzeptanzkriterien

- [ ] GIVEN aktiver Artikel mit gesetzter Größe WHEN er angeboten wird THEN wird die Größe
      sichtbar angezeigt (`· {size}`, z. B. „Cola · 0,5 l").
- [ ] GIVEN aktiver Artikel ohne Größe (`size = ""`) WHEN er angezeigt wird THEN erscheint
      nur der Name (kein Suffix, kein „· ohne Größe").
- [ ] GIVEN mehrere aktive Artikel mit gleichem `name` und unterschiedlicher `size` in
      derselben Kategorie WHEN sie angeboten werden THEN sind sie gruppiert dargestellt und
      die Größen eindeutig unterscheidbar.
- [ ] GIVEN ein Name mit nur einer Variante WHEN er angezeigt wird THEN entsteht keine
      unnötige Gruppierungs-Verschachtelung (Darstellung bleibt schlank).
- [ ] GIVEN Größen-Varianten desselben Namens WHEN dargestellt THEN in deterministischer,
      stabiler Reihenfolge (Varianten stehen zusammen).
- [ ] GIVEN soft-gelöschter Artikel mit Verzehr (`menge > 0`) und Größe WHEN im Abschnitt
      „Nicht mehr im Katalog" angezeigt THEN wird seine Größe ebenfalls sichtbar.
- [ ] GIVEN dieselbe Auswahl WHEN Größe/Gruppierung angezeigt THEN bleiben Mengensteuerung,
      Zeilensummen und Preise unverändert.
- [ ] GIVEN die route-neutrale UI (`app/_verzehr/`, ADR-025 D5) WHEN `size` ergänzt wird
      THEN bleibt das Modul feature-frei (keine `app/<feature>/`-Imports).

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

Betroffene Stellen (aus /requirements-Recherche):
- `app/_verzehr/VerzehrErfassung.tsx` – `VerzehrArtikel`-Typ (+`size`), `PositionZeile`-Anzeige,
  Gruppierung je Kategorie; auch Abschnitt „Nicht mehr im Katalog".
- `app/veranstaltung/[id]/verzehr/page.tsx:68` – Page-Mapping reicht `size` durch.
- `db/verzehr.ts` – `VerzehrPositionRow` (+`size`), `listPositionen`-Select (+`catalogItems.size`).
- Muster-Referenz: `app/verwaltung/katalog/CatalogRow.tsx:62` (dort `· ohne Größe`; hier bewusst abweichend).

### Architektur-Entscheidung: [ADR-027](../docs/adr/027-verzehr-groesse-anzeigen-gruppieren.md)

Rein präsentational (ADR-025 D1–D4 unberührt). Umsetzungs-Reihenfolge (TDD):

1. **Data-Layer** `db/verzehr.ts`: `VerzehrPositionRow` +`size: string`; `listPositionen`-Select
   um `size: catalogItems.size` ergänzen. (Integrationstest, dass `size` durchkommt.)
2. **Route-neutraler Helfer** `app/_verzehr/artikel-anzeige.ts` (DB-frei, testbar, Codify #105 –
   **kein** `utils`, **keine** `app/<feature>/`-Imports):
   - `groessenSuffix(size)` → `""` bei leer/whitespace (trim), sonst ` · {trimmed}`.
   - `gruppiereArtikel(artikel)` → `VerzehrArtikelGruppe[]` (`{ name, varianten }`), **stabiles
     group-by name**, Katalog-Reihenfolge bewahrt (Bucket am Erstauftreten), Varianten in
     Eingabereihenfolge – **kein** Re-Sort.
   - Unit-Tests: gesetzte Größe, leere Größe, Whitespace-Größe, mehrere Varianten, Einzel-Variante,
     **nicht benachbarte** gleichnamige Varianten (unterschiedl. `sortOrder`).
3. **UI** `app/_verzehr/VerzehrErfassung.tsx`: `VerzehrArtikel` +`size`; je Kategorie über
   `gruppiereArtikel` rendern – >1 Variante: Namens-Überschrift + eingerückte `{size} · {preis}`-
   Zeilen; genau 1 Variante: flache Zeile `{name}{groessenSuffix} · {preis}` (keine Gruppen-Chrome).
   Inaktiv-Abschnitt: Größe via `groessenSuffix`, **keine** Gruppierung (ADR-027 D5).
   `MengeControl`/Summen/Preise unverändert.
4. **Page** `app/veranstaltung/[id]/verzehr/page.tsx`: `size: item.size` ins Mapping.
5. **Route-Neutralität prüfen** (Codify #52): `grep -r 'from "@/app/[^_]' app/_verzehr/` = leer.

Verworfen (ADR-027): Dropdown/Segment-Buttons je Name (versteckt je-Größe-Strichliste);
alphabetisches Sortieren (ignoriert `sortOrder`).

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/137-verzehr-erfassen-gre-je-artikel-anzeigen-und-gleichnamige-artikel-gruppieren`
Erstellt: 2026-07-17 22:12
