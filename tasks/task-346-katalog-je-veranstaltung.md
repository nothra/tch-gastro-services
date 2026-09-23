# Task 346: katalog-je-veranstaltung

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Slice 3 von 3 (nach #59, #345): `veranstaltung` bekommt einen eigenen Katalogbezug
(`catalogId`, Pflicht-FK, Default `STANDARD_CATALOG_ID`). Ab jetzt gilt je Veranstaltung eine
eigene Preisliste – hier landet der fachliche Nutzen des Gesamt-Features. Details, Kontext und
Abgrenzung: [spec-346](../docs/specs/spec-346-katalog-je-veranstaltung.md).

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [ ] AK1 – Katalog bei Anlage wählbar (nur aktive Kataloge, Standard vorbelegt)
- [ ] AK2 – Gewählter Katalog bestimmt den Preis (live + Freeze)
- [ ] AK3 – Katalogwechsel möglich, solange kein Verzehr (`menge > 0`) erfasst ist
- [ ] AK4 – Katalogwechsel mit bereits erfasstem Verzehr wird serverseitig abgelehnt
- [ ] AK5 – Abgeschlossene Veranstaltung bleibt unveränderlich (Regressions-AK, ADR-033 D2)
- [ ] AK6 – Deaktivierter Katalog nicht neu wählbar, bestehende Zuordnung bleibt gültig
- [ ] AK7 – Theke bleibt unverändert am Standard-Katalog (kein eigener Katalog in dieser Slice)
- [ ] AK8 – Rollen-Gate (`requireRole("veranstalter")`) greift serverseitig für den Wechsel

Vollständige GIVEN-WHEN-THEN-Formulierungen und Fehlerszenarien (FS1–FS4):
[spec-346](../docs/specs/spec-346-katalog-je-veranstaltung.md).

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
**ADR:** Kein neuer ADR-Trigger (Spec-002-Kategorien geprüft: keine neue Technologie, kein
neues Architekturmuster, kein Schnittstellen-Vertrag zwischen Teams/Services; die
Persistenz-Strategie für einen Pflicht-FK mit stabilem Default ist mit ADR-050 D2/D3/D6 bereits
entschieden). Stattdessen Nachtrag an
[ADR-050](../docs/adr/050-katalog-als-template-entitaet.md#nachtrag-2026-09-24-346-d3-realisiert--veranstaltungcatalogid-ersetzt-standard_catalog_id-in-den-aufrufpfaden)
(2026-09-24, #346), der D3 als jetzt realisiert dokumentiert. Details unten sind daraus
übernommen.

- **Schema:** `veranstaltung.catalog_id` (`text`, FK auf `catalog.id`) braucht einen **echten
  SQL-`DEFAULT 'standard'`** im Drizzle-Schema (nicht nur `$defaultFn`) – dann emittiert
  `drizzle-kit generate` ein einziges
  `ALTER TABLE veranstaltung ADD COLUMN catalog_id text NOT NULL DEFAULT 'standard'
  REFERENCES catalog(id)`, das auch auf der nicht-leeren Tabelle sofort durchläuft (kein
  nullable→backfill→NOT-NULL-Expand wie bei ADR-050 D6 nötig, weil dort kein DB-Default
  deklariert war).
- Lesepfade, die von `STANDARD_CATALOG_ID` auf `veranstaltung.catalogId` umzustellen sind:
  `app/veranstaltung/[id]/verzehr/page.tsx` (`listActiveCatalog`),
  `app/veranstaltung/actions.ts` (`applyVerzehrAdjust` → `getCatalogItem`).
  `app/theke/[token]/page.tsx` bleibt unverändert (AK7, Spalten-Default greift dort weiter).
- Neue Wechsel-Action + UI analog `StatusToggle.tsx`-Pattern (`useActionState`, eigenes
  verstecktes Feld) auf der Detailseite `app/veranstaltung/[id]/page.tsx`. Guarded UPDATE:
  `WHERE id = ? AND status = 'offen'`, Rückgabewert auswerten (Kern-Kurzregel „guarded UPDATE").
- Sperre "kein Verzehr erfasst" prüft `menge > 0` über `listPositionen`, nicht bloße
  Zeilen-Existenz (eine Position kann auf `menge = 0` zurückgesetzt sein, s. spec-346 AK4).
- Ziel-Katalog der Wechsel-Action gegen `catalog.active = true` prüfen, bevor geschrieben wird
  (dieselbe Filterung wie bei der Anlage, FS1) – serverseitig, nicht nur über die
  Dropdown-Optionsliste.
- `VeranstaltungForm.tsx` braucht die Liste aktiver Kataloge als Prop aus
  `app/veranstaltung/page.tsx` (`listCatalogs()` gefiltert auf `active`, analog #345).

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
_Keine offenen Fragen mehr – ADR-Bedarf durch /architecture geklärt (siehe Technische Notizen)._

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/346-katalog-je-veranstaltung`
Erstellt: 2026-09-23 19:29
