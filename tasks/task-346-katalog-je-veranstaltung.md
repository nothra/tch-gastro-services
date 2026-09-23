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
- Schema/Migration nach demselben Muster wie ADR-050 D2/D6 (Pflicht-FK mit Default statt
  nullable→backfill, da `catalog` schon existiert – keine Backfill-Phase nötig).
- Lesepfade, die von `STANDARD_CATALOG_ID` auf `veranstaltung.catalogId` umzustellen sind:
  `app/veranstaltung/[id]/verzehr/page.tsx` (`listActiveCatalog`),
  `app/veranstaltung/actions.ts` (`applyVerzehrAdjust` → `getCatalogItem`).
  `app/theke/[token]/page.tsx` bleibt unverändert (AK7).
- Neue Wechsel-Action + UI analog `StatusToggle.tsx`-Pattern (`useActionState`, eigenes
  verstecktes Feld) auf der Detailseite `app/veranstaltung/[id]/page.tsx`.
- Sperre "kein Verzehr erfasst" prüft `menge > 0` über `listPositionen`, nicht bloße
  Zeilen-Existenz (eine Position kann auf `menge = 0` zurückgesetzt sein, s. spec-346 AK4).
- `VeranstaltungForm.tsx` braucht die Liste aktiver Kataloge als Prop aus
  `app/veranstaltung/page.tsx` (`listCatalogs()` gefiltert auf `active`, analog #345).

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
- ADR-Bedarf für `/architecture` zu bestätigen (siehe spec-346 „Offene Fragen") – vermutlich kein
  neuer Trigger, da dasselbe Muster wie ADR-050 fortgeschrieben wird.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/346-katalog-je-veranstaltung`
Erstellt: 2026-09-23 19:29
