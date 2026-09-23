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
- [ ] GIVEN ein Duplizier-Test in `db/catalog.test.ts` ruft `duplicateCatalog()` auf
      WHEN das `afterEach`-Cleanup läuft
      THEN werden auch die kopierten `catalog_item`-Zeilen gelöscht (kein FK-Verstoß beim
      Löschen des kopierten Katalogs)
- [ ] GIVEN eine echte lokale Postgres-DB (`DATABASE_URL` gesetzt)
      WHEN die Test-Suite für `db/catalog.test.ts` mehrfach hintereinander läuft
      THEN bleibt kein verwaister `catalog_item`/`catalog`-Datensatz zurück

## Technische Notizen
Herkunft: Rework Runde 2 zu #345 (Selbstfund während End-to-End-DB-Verifikation),
siehe `tasks/review-345.md` → „Rework Runde 2 (behoben)". Kein Zusammenhang mit der
`runAtomic`-Umstellung aus #345 – reiner Testhygiene-Defekt, identisch reproduzierbar
mit der alten `db.transaction()`-Implementierung.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `claude/start-work-351-pynzpb`
Erstellt: 2026-09-23
