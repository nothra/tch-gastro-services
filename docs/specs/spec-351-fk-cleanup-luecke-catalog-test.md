# Spec: FK-Cleanup-Lücke im afterEach von db/catalog.test.ts nach duplicateCatalog

## Kontext

> Alle `Datei:Zeile`-Anker dieser Spec beziehen sich auf den Stand **vor** dem Fix – sie
> beschreiben den Defekt, nicht das Ergebnis. Nach dem Merge sind sie erwartungsgemäß
> verschoben (kein Drift).

`duplicateCatalog()` (`db/catalog.ts:176`) fügt kopierte `catalog_item`-Zeilen über einen
eigenen `runAtomic`-Aufruf ein (`db/catalog.ts:196-205`), ohne sie über den Test-Helfer
`track()` (`db/catalog.test.ts:121`) zu registrieren. Der einzige betroffene Testfall ist
`should_copyOnlyActiveArticles_when_duplicateCatalogIsCalled` (`db/catalog.test.ts:521`):
er registriert nur den kopierten Katalog über `createdCatalogs.push(result.catalog.id)`
(Zeile 541), nicht aber den kopierten Artikel, den `listCatalog(result.catalog.id)`
anschließend liefert.

Das `afterEach` (`db/catalog.test.ts:151`) löscht daher beim Aufräumen dieses Tests
Artikel nur über die `created`-ID-Liste und danach Kataloge über `createdCatalogs` – der
kopierte Artikel bleibt stehen, und das `DELETE` des kopierten Katalogs scheitert an der
Pflicht-FK `catalog_item.catalog_id` (kein `ON DELETE`, ADR-050 D2).

Der zweite Duplizier-Test (`should_allowEmptyCatalogDuplication_when_sourceHasNoActiveArticles`,
Zeile 566) ist nicht betroffen: die Quelle hat keine aktiven Artikel, `duplicateCatalog`
kopiert dort nichts. Der dritte (`should_rejectDuplicate_when_duplicateCatalogTargetNameExists`,
Zeile 583) wirft eine Unique-Violation, bevor irgendetwas persistiert wird.

Empirisch verifiziert gegen eine echte lokale Postgres-DB (Task #345, Rework Runde 2,
siehe `tasks/review-345.md` → „Rework Runde 2 (behoben)"). Kein Zusammenhang mit der
`runAtomic`-Umstellung aus #345 selbst – identisch reproduzierbar mit der alten
`db.transaction()`-Implementierung, reiner Testhygiene-Defekt. Aktuell folgenlos, weil
`factory-ci.yml` kein `DATABASE_URL` setzt (`describe.skipIf(!hasDb)`, Zeile 150) und die
Integrationstests dort übersprungen werden – wird aber zum Problem, sobald sich das ändert.

## Scope

**Inbegriffen:**
- `afterEach` (`db/catalog.test.ts:151`) löscht `catalog_item`-Zeilen zusätzlich generisch
  über `catalog_id IN createdCatalogs` – **vor** dem `DELETE` der Kataloge selbst, aber
  **nach** dem bestehenden Löschen über die `created`-Liste (Reihenfolge bleibt: erst
  Artikel, dann Kataloge, ADR-050 D2). Das deckt automatisch jede aktuelle und künftige
  Katalog-Artikel-erzeugende Funktion ab (z. B. `duplicateCatalog`), ohne dass jeder
  einzelne Testfall seine erzeugten Artikel manuell nachträgt.
- Ein doppeltes Löschen bereits über `created` entfernter Zeilen (die zufällig auch zu
  einem `createdCatalogs`-Eintrag gehören) ist unschädlich (0 betroffene Zeilen, kein
  Fehler) – kein zusätzlicher Dedupe-Mechanismus nötig.
- Ein Regressionstest, der belegt, dass `duplicateCatalog` erzeugte Artikel-Zeilen ohne
  expliziten `track()`-Aufruf sauber aufgeräumt werden (End-to-End: zwei aufeinander-
  folgende Testläufe der Duplizier-Suite hinterlassen keine verwaisten Zeilen).
- Ein Mutationsbeleg, der zeigt, dass `should_copyOnlyActiveArticles_when_duplicateCatalogIsCalled`
  ohne die neue generische Löschung tatsächlich am FK-Verstoß scheitert (derselbe
  `afterEach`-Codepfad, nicht ein Fragment).

**Nicht inbegriffen:**
- **Keine** Änderung an `duplicateCatalog()` selbst (`db/catalog.ts`) – der Defekt liegt
  ausschließlich im Test-Cleanup, nicht in der Produktions-Data-Layer.
- **Kein** individuelles Nachtragen der kopierten Artikel-IDs per `track()` im betroffenen
  Testfall (Alternative aus dem Issue, in `/requirements` bewusst gegen die generische
  Lösung abgewählt: würde nur diesen einen Testfall absichern, nicht künftige ähnliche
  Fälle).
- Keine Änderung an den zwei anderen Duplizier-Tests (Zeilen 566, 583) – beide sind vom
  Defekt nicht betroffen (siehe Kontext).
- Kein `ON DELETE CASCADE` auf `catalog_item.catalog_id` in der Schema-Migration – ADR-050
  D2 legt die Pflicht-FK ohne `ON DELETE` bewusst fest (Fachlogik: ein Katalog wird nicht
  gelöscht, solange er Artikel hat); das gilt für Produktionscode unverändert, hier geht es
  nur um Test-Cleanup.
- Keine Änderung an `factory-ci.yml`/`DATABASE_URL`-Wiring – das Fehlen von `DATABASE_URL`
  in CI ist ein bekannter, separat zu behandelnder Zustand (siehe Kontext), kein Teil
  dieses Fixes.

## Akzeptanzkriterien

- [ ] GIVEN der Test `should_copyOnlyActiveArticles_when_duplicateCatalogIsCalled` ruft
      `duplicateCatalog()` auf und registriert nur den kopierten Katalog (nicht den
      kopierten Artikel) in `createdCatalogs`
      WHEN das `afterEach`-Cleanup läuft
      THEN wird die kopierte `catalog_item`-Zeile trotzdem gelöscht (generisch über
      `catalog_id IN createdCatalogs`), und das anschließende `DELETE` des kopierten
      Katalogs schlägt nicht an der FK `catalog_item.catalog_id` fehl.
- [ ] GIVEN eine echte lokale Postgres-DB (`DATABASE_URL` gesetzt)
      WHEN die volle Test-Suite in `db/catalog.test.ts` zweimal hintereinander läuft
      THEN bleibt in beiden Läufen kein verwaister `catalog_item`- oder `catalog`-Datensatz
      zurück (zweiter Lauf scheitert nicht an einer Unique-Verletzung durch Reste aus Lauf 1).
- [ ] GIVEN ein Testfall registriert einen Artikel sowohl über `track()` (in `created`) als
      auch indirekt über seinen Katalog (in `createdCatalogs`)
      WHEN das erweiterte `afterEach` läuft
      THEN führt das zu keinem Fehler (das zweite, generische `DELETE` betrifft 0 bereits
      gelöschte Zeilen).
- [ ] GIVEN die zwei anderen Duplizier-Tests (Zeilen 566 und 583, unverändert)
      WHEN sie nach dem Fix laufen
      THEN bleiben sie unverändert grün (kein Verhaltensunterschied für sie).
- [ ] GIVEN der neue Regressionstest/Mutationsbeleg
      WHEN die generische Lösch-Zeile im `afterEach` probeweise entfernt wird
      THEN schlägt `should_copyOnlyActiveArticles_when_duplicateCatalogIsCalled` (oder ein
      gleichwertiger Regressionstest) nachweislich mit einem FK-Fehler fehl – über denselben
      vollen `afterEach`-Codepfad, nicht über ein isoliertes Fragment.
- [ ] GIVEN die Pre-Push-Gates (Lint, Tests, Typecheck, Format, Drift-Checks)
      WHEN sie nach der Änderung laufen
      THEN sind sie grün.

## Fehlerszenarien

- [ ] Die generische Löschung läuft **nach** dem `DELETE` der Kataloge statt davor → FK-
      Verstoß bleibt bestehen. Abgedeckt durch AK1 (Reihenfolge: Artikel vor Katalogen).
- [ ] Die generische Löschung filtert nur auf `created`-IDs statt auf `catalogId IN
      createdCatalogs` → deckt weiterhin nur explizit registrierte Artikel ab, der
      eigentliche Defekt bliebe unverändert. Abgedeckt durch AK1/AK5.
- [ ] Ein künftiger Testfall verlässt sich auf die generische Löschung, obwohl sein Katalog
      gar nicht in `createdCatalogs` landet (z. B. Katalog wird nur indirekt referenziert) →
      außerhalb des Scopes dieses Fixes; `createdCatalogs` bleibt die kanonische Quelle für
      „welche Kataloge gehören zu diesem Testlauf".
- [ ] Der Mutationsbeleg (AK5) entfernt nur einen Kommentar oder eine andere, harmlose Zeile
      statt der tatsächlichen Lösch-Anweisung → belegt dann nichts. Muss an der echten
      `db.delete(catalogItems)...`-Zeile ansetzen (Rezidiv-Muster aus
      `lessons/factory-workflow.md`, „Mutationsbeleg muss denselben Assert-Ausdruck
      ausführen").

## Offene Fragen

- [ ] Keine. Fix-Richtung (generisches `afterEach` statt individuelles `track()`-Nachtragen)
      ist in `/requirements` entschieden.
