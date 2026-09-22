# Task 353: fk-violation-catalogid-abfangen

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
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
- [x] GIVEN ein POST an `createCatalogItemAction` mit einer nicht existenten `catalogId`
      WHEN der INSERT eine FK-Violation (`23503`) auslöst
      THEN wird sie abgefangen und als Nutzermeldung (`CATALOG_NOT_FOUND` o. ä.) zurückgegeben,
      kein ungefangener 500er.
- [x] Bestehendes Verhalten bei Unique-Violation (`23505`) bleibt unverändert.

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

Root Cause [2026-09-22]: `app/verwaltung/katalog/actions.ts:66` (`createCatalogItemAction`) –
`catalogId` wird seit #345 aus einem clientseitigen FormData-Feld gelesen und ungeprüft an
`createItem` weitergegeben; `runWithUniqueCheck` fängt ausschließlich SQLSTATE `23505` ab, eine
FK-Violation (`23503`) bei nicht existentem Katalog wurde ungefangen durchgereicht (500 statt
Nutzermeldung).

Fix: `app/verwaltung/katalog/actions.ts` – neuer Helper `isForeignKeyViolation` (23503), analog
zu `isUniqueViolation`. Bewusst **nicht** in `runWithUniqueCheck` selbst ergänzt (dessen
dokumentierte Invariante fängt nur 23505, #345 Review-Finding), sondern als zweiter `try/catch`
direkt um den `createItem`-Aufruf in `createCatalogItemAction` – der einzigen Aufrufstelle, an
der dieser Fehler auftreten kann (alle anderen Actions binden `catalogId` bereits ins WHERE).
Bei FK-Violation liefert die Action jetzt `{ error: "Katalog nicht gefunden." }` (Konstante
`CATALOG_NOT_FOUND`, an den Modulanfang verschoben, damit sie an beiden Stellen ohne
Vorwärtsreferenz sichtbar ist).

Reproduktionstest: `app/verwaltung/katalog/actions.test.ts` →
`should_returnCatalogNotFoundMessage_when_foreignKeyViolation`.

Hinweis für `/codify`: Muster „serverseitig-fix → client-gelesenes Feld öffnet neue
DB-Fehlerklassen, die der bestehende Error-Translation-Wrapper nicht abdeckt" ist bereits als
Lesson dokumentiert (`docs/factory/lessons/db-drizzle.md`, aus #345 Security-Review-Hinweis,
Issue #353) – dieser Fix ist die Umsetzung, kein neues Learning.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

## Review-Findings
<!-- Wird durch /review befüllt -->

Runde 1 ([tasks/review-353.md](review-353.md), NEEDS_REWORK):
- Wichtig: `try`-Block um `createItem` war zu breit gefasst (reichte bis über `revalidatePath`
  hinaus) – behoben durch eng gefassten Wrapper `runCreateItem`, der ausschließlich den
  `createItem`-Aufruf umschließt.
- Nitpick (übernommen): `isUniqueViolation`/`isForeignKeyViolation` teilten identischen Code bis
  auf den SQLSTATE-Literal – auf gemeinsamen Helper `hasSqlState(error, code)` extrahiert.

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

## Refactoring [2026-09-22]

Beide Nitpicks aus Review-Runde 2 ([tasks/review-353.md](review-353.md)) umgesetzt, kein neues
Verhalten:
- `runCreateItem` → `createItemOrCatalogNotFound` umbenannt (Name beschreibt jetzt beide
  Zweige: erfolgreiches Anlegen oder „Katalog nicht gefunden", nicht nur den ersten Aufruf).
- Parameter-/Rückgabetyp von `Parameters<typeof createItem>[1]` /
  `Awaited<ReturnType<typeof createItem>>` auf benannte Importe umgestellt (`CatalogItemData`
  aus `@/db/catalog`, `CatalogItem` aus `@/db/schema`) – lesbarer, konsistent mit dem bereits
  vorhandenen Import-Stil in `actions.test.ts`.

Tests vor/nach identisch grün (21/21), Typecheck und Lint unverändert sauber.

---
Branch: `fix/353-fk-violation-catalogid-abfangen`
Erstellt: 2026-09-22 19:27
