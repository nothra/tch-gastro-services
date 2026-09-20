# Review: Task 345

## Kritische Findings (müssen behoben werden)

- [x] **[app/verwaltung/katalog/actions.ts:188-195]** Error-Handling in `duplicateCatalogAction` unvollständig – `SOURCE_CATALOG_INACTIVE` wird nicht von `runWithUniqueCheck` gefangen. Der Fehler wird re-thrown und führt zu unkontrolliertem Server-Error statt benutzerfreundlicher Fehlermeldung (Spec FS1 verletzt, AK5 Serverseitige Durchsetzung unvollständig).

  **Problem:** Die `runWithUniqueCheck`-Wrapper kümmert sich nur um Unique-Violations (23505), alle anderen Exceptions werden ungehandhabt weitergegeben.
  
  **Behebung:** Entweder (a) `runWithUniqueCheck` erweitern um einen optionalen Error-Handler-Parameter, oder (b) die beiden Exception-Cases (`CATALOG_NOT_FOUND`, `SOURCE_CATALOG_INACTIVE`) außerhalb des `runWithUniqueCheck`-Aufrufs per try-catch separat handhaben – dann auch die korrekte Fehlermeldung zurückgeben (nicht immer `CATALOG_MANAGEMENT_DUPLICATE_MESSAGE` für beide Fälle).

- [x] **[app/verwaltung/katalog/actions.ts:137]** Message-Mapping ist falsch für Katalog-Management-Actions. Die Zeile `error: CATALOG_MANAGEMENT_DUPLICATE_MESSAGE` wird auch dann zurückgegeben, wenn `outcome.ok = false` durch einen anderen Fehler als Unique-Violation kam (z. B. `SOURCE_CATALOG_INACTIVE`). Eine Unique-Violation auf ein inaktiven Katalog würde dann die falsche Message bekommen.

  **Behebung:** Das Fehlermapping differenzieren – nur für echte Unique-Violations die `DUPLICATE_MESSAGE` nehmen, für andere die ursprüngliche `outcome.state.error` durchreichen.

- [x] **[db/catalog.ts:168-203]** `duplicateCatalog` Transaktions-Fehlerbehandlung: die Transaktion wirft bei Fehler statt `undefined` zu liefern – das ist asymmetrisch zu den guarded UPDATEs (`renameCatalog`, `setCatalogActive`) die `undefined` liefern (Kern-Kurzregel 1). Wenn die Transaktion abbricht (z. B. Unique-Violation auf `newCatalog.name`), wird sie nicht in der Action gefangen.

  **Problem:** Zeile 198 in `duplicateCatalogAction` (`if (!activeOnly.value)`) wurde offensichtlich für einen anderen Fall geschrieben, der hier gar nicht eintritt. Eine Transaktion beim `duplicateCatalog`-Aufruf bricht mit Exception ab, nicht mit `undefined`.
  
  **Behebung:** Klarstellen – entweder `duplicateCatalog` auch `| undefined` liefern (dann die Transaktions-Exception in der Action fangen), oder die Try-catch-Logik in `duplicateCatalogAction` anpassen. Die aktuelle Zeile 198 ist totes Verhalten.

## Wichtige Findings (sollten behoben werden)

- [x] **[app/verwaltung/katalog/[id]/CatalogManager.tsx]** Error-Handling für Katalog-Management-Actions ist komplett fehlend – `useActionState` wird NICHT genutzt, Actions werden mit `await` aufgerufen (Zeilen 23-35). Der `CatalogFormState` mit eventuellen Fehler-Meldungen wird ignoriert.

  **Problem:** Ein Benutzer versucht, einen Katalog mit einem Duplikat-Namen anzulegen → `createCatalogAction` meldet `{ error: "Ein Katalog mit diesem Namen existiert bereits." }` → die Komponente zeigt das nicht an, das Modal schließt sich trotzdem.
  
  **Asymmetrie:** `CatalogItemForm` nutzt `useActionState` korrekt (sieh Diff) und zeigt Fehler an. `CatalogManager` hat dieselbe Anforderung, nutzt aber einen direkten Action-Aufruf ohne State-Management. 
  
  **Behebung:** `useActionState` in `CatalogManager` einführen (wie in `CatalogItemForm`), für jede Action einen eigenen State halten, und das Modal nur dann schließen, wenn `state.ok === true`. Fehler-Meldungen in den Modalen anzeigen (ähnlich wie in `CatalogItemForm`).

- ~~[ ] **[app/verwaltung/katalog/schema.ts]** `catalogNameSchema` – Zod-Schema für die Katalognamen nicht in der Datei. Lass mich verifizieren, ob die Validierung vorhanden ist (FS4: leerer Name sollte abgelehnt werden).~~ ✓ Vorhanden und korrekt: `trim()` + `min(1)` erfüllt FS4.

- [ ] **[app/verwaltung/katalog/[id]/CatalogSwitcher.tsx]** – nicht gelesen. Das Komponenten-Routing mit dem aktuell ausgewählten Katalog braucht eine Überprüfung: Wenn ein Katalog deaktiviert wird und der Benutzer gerade auf ihm ist, bleibt er dort (sollte das sein? AK4 sagt, deaktiviert Katalog bleibt sichtbar und editierbar – also OK).

## Nitpicks (optional)

- [ ] **[app/verwaltung/katalog/actions.ts:107-118]** `setCatalogItemActiveAction` – der Kommentar (Zeilen 108-110) sagt, dieser `void`-Return hat keinen Meldungskanal und deshalb bleibt ein No-Match-Fall stumm. Das ist eine bewusste Lücke bis #345. Aber jetzt in #345 gibt es die `setCatalogActiveAction` (Zeilen 160-174) für Katalog-Management, die **auch** `CatalogFormState` zurückgibt und deshalb beide Fehler-Zweige abdeckt. Die Asymmetrie zwischen Item und Katalog ist nachvollziehbar, aber einen Kommentar hinzufügen, dass **Katalog**-Deaktivierung einen Fehlerkanal hat, würde das dokumentieren.

- [ ] **[db/catalog.test.ts:102-105]** Test-Daten-Namenspräfix-Kollision: Die Konvention für den Test-Präfix ist dokumentiert (Kommentar "#347"), aber das Präfix `__test__` wird in THREE verschiedenen Filterwegen erwartet (Artikel, Kataloge, Migration-Drift-Guard). Ein typo beim Rename von `__test__` in einen anderen Präfix würde still fehlschlagen. Dokumentation ist da, aber könnte präziser sein (z. B. "alle Filter nutzen denselben Präfix `__test__`, nie trennen").

## Positives

- ✓ Data-Layer ist solid: `listDuplicatableCatalogs()` filtert korrekt nur aktive Kataloge (AK5), die Transaktion in `duplicateCatalog()` ist die richtige Abstraktionsebene
- ✓ Alle neuen Artikel-Tests korrekt angepasst für das neue `catalogId`-FormData-Feld
- ✓ Katalog-Integration-Tests sind umfassend und gut strukturiert (AK1–AK8, FS1–FS5 abgedeckt)
- ✓ Drift-Guard auf `STANDARD_CATALOG_ID` ist mustergültig (Konstante vs. Migrations-Literal)
- ✓ AK9 Migrations-Wiederholbarkeits-Test ist gründlich
- ✓ Routes sind korrekt strukturiert: dynamisches Segment `[id]` mit Fallback auf `STANDARD_CATALOG_ID`
- ✓ Rollen-Gate `requireRole("verwalter")` sitzt serverseitig auf allen neuen Actions (AK7)
- ✓ `listActiveCatalog()` unverändert (filtert nur `catalog_item.active`, nicht `catalog.active`) – ADR-050 D7 korrekt umgesetzt per Nachtrag

## Empfehlung

**NEEDS_REWORK** – Kritische Error-Handling-Lücken in `duplicateCatalogAction` und asymmetrische Fehlerbehandlung zwischen `duplicateCatalog` (throws) und anderen guarded Updates (undefined). Diese müssen vor Merge behoben werden (Spec FS1, Kern-Kurzregel 1).

Nach dem Rework bitte eine zweite Review-Runde (insbes. auf `CatalogManager.tsx` Error-State-Verarbeitung und die finale Exception-Handling-Symmetrie in `duplicateCatalogAction`).

## Rework Runde 1 (behoben)

Alle drei kritischen Findings und das wichtige `CatalogManager.tsx`-Finding sind behoben (TDD,
Details siehe Commit):

- `duplicateCatalogAction`: Existenz-/Aktiv-Prüfung des Quell-Katalogs steht jetzt **außerhalb**
  von `runWithUniqueCheck` (neue Data-Layer-Funktion `getCatalogById` in `db/catalog.ts`) –
  `CATALOG_NOT_FOUND`/`SOURCE_CATALOG_INACTIVE` geben direkt ihre spezifische Meldung zurück statt
  ungefangen durchzuschlagen. Die tote Zeile 198 (`if (!activeOnly.value)`) ist entfernt.
- Message-Mapping ist dadurch strukturell korrekt: `runWithUniqueCheck`s `ok:false`-Zweig bedeutet
  jetzt in jeder Aufrufstelle garantiert eine echte Unique-Violation (dokumentiert als Invariante
  im Code), das Überschreiben mit der katalogspezifischen Duplikat-Message ist damit sicher.
- `duplicateCatalog` (Data-Layer) wirft weiterhin bei einer Unique-Violation auf den neuen Namen
  (bewusst beibehalten, Option (b) aus dem Finding) – jetzt konsistent über denselben
  `runWithUniqueCheck`-Pfad wie `createCatalog`/`renameCatalog` behandelt, keine Sonderbehandlung
  mehr nötig. Neuer Integrationstest `should_rejectDuplicate_when_duplicateCatalogTargetNameExists`
  dokumentiert das.
- `CatalogManager.tsx`: `useActionState` + `useCallback`-Wrapper (analog `CatalogRow`) für
  create/rename/duplicate – Modal schließt nur bei `ok: true`, Fehler werden im Modal angezeigt.
  `setCatalogActiveAction` bekommt ebenfalls einen sichtbaren Fehlerkanal.
- Neue Tests: `app/verwaltung/katalog/catalog-management-actions.test.ts` (20 Tests, deckt die
  vier Katalog-Management-Actions erstmals auf Action-Ebene ab – vorher nur Data-Layer-
  Integrationstests) und `app/verwaltung/katalog/[id]/CatalogManager.test.tsx` (13 Tests). RED vor
  dem Fix verifiziert (Crash bzw. fehlendes Error-Handling reproduziert).
- Nebenbei behoben: `docs/routes.md` fehlte der Eintrag für `/verwaltung/katalog/[id]` (Drift aus
  der ursprünglichen #345-Implementierung, blockierte `pre-push.sh`) – Doku ergänzt.
- Alle Gates grün: `pnpm lint`, `pnpm test` (839 passed, 90 skipped – DB-Integrationstests ohne
  `DATABASE_URL`), `pnpm build`.
