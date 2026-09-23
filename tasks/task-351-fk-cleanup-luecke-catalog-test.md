# Task 351: fk-cleanup-luecke-catalog-test

## Status
- [x] In Bearbeitung
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
- [x] AK1: `afterEach` löscht kopierte `catalog_item`-Zeilen generisch über
      `catalog_id IN createdCatalogs` (vor dem Katalog-`DELETE`)
- [x] AK2: zwei aufeinanderfolgende Läufe von `db/catalog.test.ts` gegen eine echte DB
      hinterlassen keine verwaisten Zeilen
- [x] AK3: doppeltes Löschen (bereits über `created` entfernt + generisch über
      `createdCatalogs`) verursacht keinen Fehler
- [x] AK4: die zwei nicht betroffenen Duplizier-Tests bleiben unverändert grün
- [x] AK5: Mutationsbeleg – ohne die neue generische Lösch-Zeile schlägt
      `should_copyOnlyActiveArticles_when_duplicateCatalogIsCalled` mit FK-Fehler fehl
- [x] AK6: Pre-Push-Gates grün

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

### Umsetzung (/implement, 2026-09-23)

**ADR-Trigger-Check:** keine der vier Kategorien trifft zu – reine Testhygiene, keine
Technologiewahl, kein Architekturmuster, kein Schnittstellen-Vertrag, keine irreversible
Konsequenz (Schema und Data-Layer bleiben unverändert).

**Änderung (`db/catalog.test.ts`, nur diese Datei):**
1. Der `afterEach`-Rumpf ist als benannte Funktion `cleanupCreatedRows()` extrahiert. Grund:
   der Regressionstest führt damit denselben **vollen** Codepfad aus statt ein Fragment
   nachzubauen (Lesson „Mutationsbeleg muss denselben Assert-Ausdruck ausführen", #286).
   `afterEach(cleanupCreatedRows)` – reiner Refactor, kein Verhaltensunterschied.
2. Neu darin: `db.delete(catalogItems).where(inArray(catalogItems.catalogId, catalogIds))`
   **vor** dem Katalog-`DELETE` und **nach** dem bestehenden Löschen über `created`.
   `createdCatalogs.splice(0)` wandert dafür in eine lokale Variable, damit beide DELETEs
   dieselbe ID-Liste sehen.
3. Zwei neue Tests: `should_deleteCopiedArticles_when_cleanupRunsAfterDuplicateCatalog`
   (AK1/AK5) und `should_notThrow_when_cleanupDeletesSameArticleByIdAndByCatalog` (AK3).

**Sicherheitsargument zur generischen Löschung:** `createdCatalogs` wird ausschließlich in
`trackCatalog()` und an drei Testfällen mit frisch angelegten Katalogen befüllt, nie mit
`STANDARD_CATALOG_ID` (per Grep über die ganze Datei belegt). Der geseedete Referenzbestand
kann also nicht in den Löschbereich geraten.

**Verifikation gegen die lokale Docker-DEV-DB** (`.env.local` fehlt in diesem Worktree,
bekannte Lücke #228/#236; `DATABASE_URL` wurde für die Läufe aus `docker-compose.yml`
abgeleitet):
- RED vorher: `should_copyOnlyActiveArticles_when_duplicateCatalogIsCalled` scheiterte mit
  Postgres `23503` (`catalog_item_catalog_id_catalog_id_fk`) im `afterEach` – exakt das in
  der Spec beschriebene Bild. Der Lauf hinterließ 1 verwaisten Artikel + 2 Kataloge.
- GREEN nachher: 42/42 Tests grün.
- AK2: zwei aufeinanderfolgende volle Läufe, beide 42/42 grün, danach je **0** verwaiste
  `catalog_item`- und `catalog`-Zeilen (per `psql`-Zählung auf `__test__%` geprüft).
- AK5 (Mutationsbeleg): die neue Lösch-Zeile per `grep -vF` an ihrer **vollen** Aufrufzeile
  entfernt (Anker vorher genau 1×, danach 0×), Suite erneut gelaufen → beide Duplizier-nahen
  Tests rot mit `23503`. Danach Datei wiederhergestellt und DB-Reste gelöscht.
- AK6: `scripts/checks/pre-push.sh` vollständig grün (Lint, 871 Tests, Typecheck, Format,
  Routen-Doku-Drift, Hooks, `@import`-Kontextgrenze).

**Nicht Teil dieser Task, aber unterwegs aufgefallen:**
- Im Worktree fehlt `.env.local` (Lesson #228/#236 – `start-work.sh` kopiert sie eigentlich).
- Der lokalen DEV-DB fehlten 8 der 16 Zeilen der Referenz-Preisliste aus Migration 0004,
  wodurch `should_containSeededReferenceList_when_freshlyMigrated` rot war. Reine lokale
  Datendrift (Migration 0004 gilt im drizzle-Journal als angewandt), kein Code-Defekt; für
  die Verifikation lokal idempotent nachgezogen. Kein Repo-Artefakt geändert.

**Oberflächentests:** entfallen – die Task berührt keine UI, keine Route und keinen
Produktionscode (nur eine Testdatei).

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `fix/351-fk-cleanup-luecke-catalog-test`
Erstellt: 2026-09-23
