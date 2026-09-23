# Task 351: fk-cleanup-luecke-catalog-test

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
`duplicateCatalog()` (`db/catalog.ts`) fügt kopierte `catalog_item`-Zeilen über einen
eigenen `runAtomic`-Aufruf ein, ohne sie über den Test-Helfer `track()`/`trackCatalog()`
in `db/catalog.test.ts` zu registrieren. Das `afterEach` löscht daher beim Aufräumen
eines Duplizier-Tests die kopierten Artikel-Zeilen nie – das anschließende `DELETE`
des kopierten Katalogs scheitert an der Pflicht-FK `catalog_item.catalog_id`
(kein `ON DELETE`).

Fix: Im Duplizier-Testfall die von `duplicateCatalog` erzeugten `catalog_item`-Zeilen
zusätzlich registrieren (z. B. durch Lesen der neu erzeugten Zeilen nach dem Aufruf und
explizites Nachtragen), oder das `afterEach` so erweitern, dass es `catalog_item`-Zeilen
generisch über `catalog_id` statt nur über die `track()`-Liste löscht.

## Akzeptanzkriterien
Vollständig in [`docs/specs/spec-351-fk-cleanup-luecke-catalog-test.md`](../docs/specs/spec-351-fk-cleanup-luecke-catalog-test.md).
- [ ] AK1: `afterEach` löscht kopierte `catalog_item`-Zeilen generisch über
      `catalog_id IN createdCatalogs` (vor dem Katalog-`DELETE`)
- [ ] AK2: zwei aufeinanderfolgende Läufe von `db/catalog.test.ts` gegen eine echte DB
      hinterlassen keine verwaisten Zeilen
- [ ] AK3: doppeltes Löschen (bereits über `created` entfernt + generisch über
      `createdCatalogs`) verursacht keinen Fehler
- [ ] AK4: die zwei nicht betroffenen Duplizier-Tests bleiben unverändert grün
- [ ] AK5: Mutationsbeleg – ohne die neue generische Lösch-Zeile schlägt
      `should_copyOnlyActiveArticles_when_duplicateCatalogIsCalled` mit FK-Fehler fehl
- [ ] AK6: Pre-Push-Gates grün

## Technische Notizen
Herkunft: Rework Runde 2 zu #345 (Selbstfund während End-to-End-DB-Verifikation),
siehe `tasks/review-345.md` → „Rework Runde 2 (behoben)". Kein Zusammenhang mit der
`runAtomic`-Umstellung aus #345 – reiner Testhygiene-Defekt, identisch reproduzierbar
mit der alten `db.transaction()`-Implementierung.

Fix-Ansatz (in `/requirements` entschieden): generische Erweiterung des `afterEach`
(löscht `catalog_item` zusätzlich über `catalog_id IN createdCatalogs`), nicht
individuelles `track()`-Nachtragen im betroffenen Testfall – deckt automatisch jede
aktuelle und künftige Katalog-Artikel-erzeugende Funktion ab. Betroffener Testfall:
`should_copyOnlyActiveArticles_when_duplicateCatalogIsCalled` (`db/catalog.test.ts:521`).
Nur `db/catalog.test.ts` ändert sich – `db/catalog.ts` bleibt unangetastet.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `fix/351-fk-cleanup-luecke-catalog-test`
Erstellt: 2026-09-23
