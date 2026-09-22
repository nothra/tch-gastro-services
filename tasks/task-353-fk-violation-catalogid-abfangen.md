# Task 353: fk-violation-catalogid-abfangen

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
<!-- Was soll implementiert werden? -->
Bug aus #353 (Security-Review zu #345, `tasks/security-345.md`):
`createCatalogItemAction` (`app/verwaltung/katalog/actions.ts`) liest `catalogId` seit #345 aus
einem clientseitigen Hidden-Field. `runWithUniqueCheck`/`isUniqueViolation` fängt nur SQLSTATE
`23505` (Unique-Violation) ab. Ein nicht existierender `catalogId` löst beim INSERT eine
Fremdschlüssel-Verletzung (`23503`) aus, die ungefangen durchgereicht wird (500 statt
Nutzermeldung `CATALOG_NOT_FOUND`). `updateCatalogItemAction`/`setCatalogItemActiveAction` sind
nicht betroffen (Parent-Key in WHERE).

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [ ] GIVEN ein POST an `createCatalogItemAction` mit einer nicht existenten `catalogId`
      WHEN der INSERT eine FK-Violation (`23503`) auslöst
      THEN wird sie abgefangen und als Nutzermeldung (`CATALOG_NOT_FOUND` o. ä.) zurückgegeben,
      kein ungefangener 500er.
- [ ] Bestehendes Verhalten bei Unique-Violation (`23505`) bleibt unverändert.

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `fix/353-fk-violation-catalogid-abfangen`
Erstellt: 2026-09-22 19:27
