# Task 351: fk-cleanup-luecke-catalog-test

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [x] Codify ausgeführt
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
`should_copyOnlyActiveArticles_when_duplicateCatalogIsCalled` (`db/catalog.test.ts:521`,
Zeilennummer bezieht sich auf den Stand vor dem Fix, s. Spec-Hinweis).
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

### Rework nach `/review` Runde 1 (/implement, 2026-09-23)

`/review` lieferte NEEDS_REWORK mit einem Wichtig-Finding (kein kritisches). Behoben:

1. **Dateikopf `db/catalog.test.ts:25-33`** (Wichtig-Finding): Der Kopf behauptete weiter,
   die Tests räumten „nur die selbst angelegten Zeilen **per id**" ab – seit diesem PR falsch,
   weil `cleanupCreatedRows()` zusätzlich generisch über `catalog_id` löscht. Der Kopf nennt
   jetzt beide Wege und trägt das Sicherheitsargument selbst (Standard-Katalog steht nie in
   `createdCatalogs`). Drift vom PR selbst verursacht → gehört in denselben PR (#211/#176).
2. **Kleinfund mitgenommen** (derselbe Satz, Mitnahme-Regel aus dem `kleinfunde.md`-Kopf):
   Der Kopf benennt jetzt auch die AK9-Replay-Ausnahme (Wegwerf-Schema per `CREATE`/`DROP
   SCHEMA`, die Suite braucht Schema-Rechte). Der Eintrag „`db/catalog.test.ts`-Dateikopf
   behauptet ‚nicht-destruktiv‘, der AK9-Replay macht DDL" ist in `docs/factory/kleinfunde.md`
   **gelöscht**, nicht abgehakt.
3. **Nitpicks** (alle drei mitgelaufen): deutsche Test-Locals → `remainingItems` /
   `remainingCatalogs` / `remaining`; der AK3-Kommentar sagt nicht mehr, die generische
   Löschung „trifft" die bereits entfernte Zeile, sondern „würde sie treffen, falls sie noch
   existierte"; die Spec trägt einen Hinweis, dass ihre `Datei:Zeile`-Anker den **Vor-Fix**-Stand
   beschreiben.
4. **Folge-Drift im eigenen PR:** Der neu angelegte `veranstaltung.test.ts`-Kleinfund verwies
   auf `db/catalog.test.ts:159-168`; durch den vier Zeilen längeren Dateikopf nun `:163-172`.

**Kein Verhaltensunterschied:** Die Änderungen sind Kommentar-/Doku-Text plus lokale
Test-Variablennamen. Die generische Lösch-Zeile und beide neuen Tests sind unverändert –
ein erneuter Mutationsbeleg (AK5) war deshalb nicht nötig.

**Verifikation nach dem Rework:**
- `scripts/checks/pre-push.sh` vollständig grün (Lint, 871 Tests, Typecheck, Format,
  Routen-Doku, Hooks, `@import`-Grenze).
- Gegen die lokale DEV-DB: zwei aufeinanderfolgende Läufe von `db/catalog.test.ts`,
  je 42/42 grün, danach 0 verwaiste `catalog_item`- und 0 verwaiste `catalog`-Zeilen
  (`__test__`-Zählung per `psql`) – AK2 bleibt belegt.

### /test (2026-09-23)

Coverage-/Vollständigkeitsprüfung nach `/review` Runde 2 (APPROVED): pro AK aus der Spec
Happy Path, Fehlerfall und Boundary geprüft – keine Lücke gefunden, alle drei Runde-2-Nitpicks
sind reine Doku-/Anker-Präzisierungen ohne Testbezug. Kein neuer Testcode nötig; die beiden
Regressionstests aus `/implement` (`should_deleteCopiedArticles_when_cleanupRunsAfterDuplicateCatalog`,
`should_notThrow_when_cleanupDeletesSameArticleByIdAndByCatalog`) decken AK1/AK3/AK5 bereits
mit Vorbedingungs-Assertion (Vakuum-Grün-Schutz) und Mutationsbeleg ab.

`scripts/checks/pre-push.sh` in diesem Worktree erneut vollständig grün: 871 Tests
(4 Testdateien/91 Tests DB-abhängig übersprungen – kein `DATABASE_URL` in dieser Session,
bekannte Lücke #228/#236, strukturelles CI-Risiko bereits als Issue #357 verankert), Lint,
Typecheck, Format, Routen-Doku-Drift, Hooks, `@import`-Grenze. Die DB-gestützte Verifikation
(AK2/AK5 gegen echte Postgres-DB) bleibt unverändert die aus `/implement`/`/review` Runde 2
dokumentierte – ein erneuter Lauf war ohne `DATABASE_URL` in dieser Session nicht möglich.

### /refactor (2026-09-23)

Clean-Code-Checkliste gegen `db/catalog.test.ts` durchlaufen: Naming, Funktionslänge,
Verschachtelung, Kommentar-WHY/WHAT bereits durch die Rework-Runden aus `/review` sauber
(keine neuen Struktur-Findings). Einziger noch offene Punkt aus Review-Runde 2 – der fehlende
Vor-Fix-Disclaimer im Task-Log (Nitpick, symmetrisch zum bereits vorhandenen Spec-Hinweis) –
nachgetragen (`db/catalog.test.ts:521` trägt jetzt denselben Hinweis wie die Spec). Der
STANDARD_CATALOG_ID-Fail-closed-Guard-Nitpick bleibt bewusst unimplementiert (laut Review
kein erreichbarer Auslöser, bereits als `kleinfunde.md`-Eintrag verankert). Kein neues
Verhalten: `pre-push.sh` erneut vollständig grün (871 Tests, Lint, Typecheck, Format,
Routen-Doku, Hooks, `@import`-Grenze).

### /security-review, zweiter Lauf (2026-09-23)

Der erste Security-Report (Commit `2d88506`) lief **vor** `/codify` und `/refactor` und deckte
nur 5 der inzwischen 10 geänderten Dateien ab (565+/26− gegen jetzt 785+/28−) – er war damit
stale. `tasks/security-351.md` wurde neu geschrieben und deckt jetzt auch `tasks/codify-351.md`,
die Lesson-/PROJECT-CONTEXT-Ergänzungen, die korrigierte `kleinfunde.md` und die neue Zeile in
`tasks/interrupt-log.jsonl` ab. Ergebnis erneut **PASSED**, keine kritischen und keine wichtigen
Findings. Zusätzlich geprüft: Anker-Drift beider `kleinfunde.md`-Einträge (Lesson #291/#351,
adressiert ausdrücklich `/security-review` vor Merge-Freigabe) – alle fünf Anker treffen; das
Interrupt-Sentinel ist nachweislich entfernt (`git ls-files 'tasks/INTERRUPT-*'` → 0 Treffer).
Ein Hinweis ohne Sicherheitsbezug bleibt offen: `tasks/codify-351.md:47-49` behauptet die
Task-Log-Symmetrie-Lücke sei unadressiert, `eb7cd0d` hat sie jedoch behoben.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen

Voller Report: [`tasks/codify-351.md`](codify-351.md). Kurzfassung: keine neue Regel nötig –
beide Findings (Dateikopf-Drift durch eigene PR, Kleinfunde-Anker-Ungenauigkeit) sind bereits
durch bestehende Lessons (#211/#176 bzw. #291) abgedeckt. Lesson zu #291 um „zweites
Vorkommnis" ergänzt (Drift kann schon bei Erstverifikation entstehen, nicht nur durch spätere
Folge-Commits). Zwei `kleinfunde.md`-Pflege-Fixes: Anker-Korrektur (`db/veranstaltung.test.ts`)
und neuer Eintrag für den unadressierten `STANDARD_CATALOG_ID`-Fail-closed-Guard-Nitpick.

**Nachtrag (zweiter `/codify`-Lauf, 2026-09-23, nach dem zweiten `/security-review`):**
Zwei weitere Punkte behoben/verankert – Details in `tasks/codify-351.md`:
1. Die eigene Aussage in `tasks/codify-351.md`, die Task-Log-Symmetrie-Lücke bleibe
   „unadressiert", war seit `eb7cd0d` überholt (dort nachgetragen) – korrigiert.
2. Neue Lesson: `/security-review` lief in dieser Task **vor** `/codify`/`/refactor` statt
   danach (entgegen der kanonischen Reihenfolge in `CLAUDE.md`) und wurde dadurch stale –
   ein kompletter Re-Lauf war nötig. Neu in
   [`lessons/factory-workflow.md`](../docs/factory/lessons/factory-workflow.md) + Index-Zeile
   in `PROJECT-CONTEXT.md`.

---
Branch: `fix/351-fk-cleanup-luecke-catalog-test`
Erstellt: 2026-09-23
