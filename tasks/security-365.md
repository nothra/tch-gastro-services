# Security Review: Task 365

Geprüft: `app/theke/[token]/page.tsx` (geänderte Zeile), `db/veranstaltung.ts`
(`getVeranstaltungByToken`), `db/catalog.ts` (`listActiveCatalog`), `app/veranstaltung/actions.ts`
(`adjustVerzehrByTokenAction` / `applyVerzehrAdjust`), Diff `origin/main...HEAD`,
`docs/adr/050-katalog-als-template-entitaet.md`-Nachtrag, `tasks/review-365.md`.

## Kritische Findings (Blocker)
(keine)

## Wichtige Findings
(keine)

## Hinweise
- [ ] [Threat Model] Die Umstellung von der Konstante `STANDARD_CATALOG_ID` auf die dynamische
      `veranstaltung.catalogId` ist sicherheitsneutral, weil dieses Projekt kein Konzept
      privater vs. öffentlicher Kataloge kennt (Verein, keine Multi-Tenancy) – jeder Katalog
      ist für jeden Veranstalter gleich sichtbar/wählbar (`assertKatalogWaehlbar`). Rein
      informativ zur Nachvollziehbarkeit im Review-Trail, keine Handlung nötig.

## Detail je Prüfpunkt
1. **Injection:** `listActiveCatalog(catalogId)` nutzt `eq(catalogItems.catalogId, catalogId)`
   über Drizzle – parametrisierte Query, keine String-Konkatenation.
2. **BOLA/IDOR:** `veranstaltung.catalogId` ist ein rein serverseitig gelesener Wert (aus
   `getVeranstaltungByToken(token)`), kein Client-Input. Der Token bindet ausschließlich an die
   eigene Veranstaltung; ein Angreifer kann über diesen Pfad keinen fremden Katalog "anfragen",
   weil `catalogId` nicht wählbar ist, sondern aus der per Token aufgelösten Zeile stammt.
2b. **Self-Scoping:** `applyVerzehrAdjust` bindet `zeileId` weiterhin an `ziel.id` und
   `catalogItemId` an `ziel.catalogId` – IDOR-sicher mit Parent-Key im WHERE, unverändert durch
   diesen Fix.
3. **Sensitive Data Exposure:** Gleiche Datenform wie vorher (aktive Katalogartikel:
   Name/Größe/Preis), nur aus dem korrekten statt dem falschen Katalog. Kein Leck über bisher
   nicht zugängliche Kataloge.
4. **Dependencies:** Keine neuen Dependencies im Diff.
5. **Error Handling:** Keine neuen Fehlermeldungen/Stack-Traces; `notFound()` und
   `ITEM_NOT_FOUND` unverändert generisch.

## Ergebnis
PASSED
