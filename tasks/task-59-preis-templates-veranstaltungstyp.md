# Task 59: preis-templates-veranstaltungstyp

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [ ] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung

Grundlage für Preis-Templates: **der Katalog wird eine eigene Entität.** Alle bestehenden
Artikel werden einem Standard-Katalog **„Montagsrunde"** zugeordnet, die Duplikat-Regel wandert
von „Name + Größe global" auf „Name + Größe je Katalog". Bewusst **verhaltensneutral** – Verwalter
und Veranstalter merken nichts, damit die Migration allein deploybar bleibt (Expand/Contract).

Story-Schnitt: **#59 (diese Task)** Katalog als Entität → **#345** mehrere Kataloge verwalten →
**#346** Katalog je Veranstaltung auswählen (dort landet der fachliche Nutzen).

Spec: [`docs/specs/spec-59-katalog-als-entitaet.md`](../docs/specs/spec-59-katalog-als-entitaet.md)

## Akzeptanzkriterien

- [x] **AK1** – Katalog-Entität existiert (Name, Aktiv-Kennzeichen, Sortierung); Name eindeutig
- [x] **AK2** – Standard-Katalog „Montagsrunde" angelegt, **alle** bestehenden Artikel zugeordnet
- [x] **AK3** – Katalogbezug je Artikel ist DB-Pflicht (fail-closed, referenziell)
- [x] **AK4** – Duplikat-Regel gilt je Katalog (gleicher Name+Größe in K2 erlaubt, in K1 nicht);
      Nutzermeldung unverändert
- [x] **AK5** – Umbenennen des Katalogs bricht nichts (Auflösung wertet den Namen nicht aus)
- [x] **AK6** – Artikel-Abfrage per ID ist katalog-gebunden (Parent-Key im `WHERE`)
- [x] **AK7** – Verhaltensneutral für den `verwalter` (`/verwaltung/katalog` unverändert)
- [x] **AK8** – Verhaltensneutral für Veranstalter und Theke (Verzehrerfassung, `/theke/[token]`)
- [x] **AK9** – Migration wiederholbar und leer-DB-fest (kein zweiter Standard-Katalog)
- [x] **AK10** – ADR zum Modell + Begriff „Katalog" in `PROJECT-CONTEXT.md` fortgeschrieben

### Fehlerszenarien

- [x] **FS1** – Artikel ohne Katalog wird von der DB abgelehnt
- [x] **FS2** – Unbekannter/fremder Artikel an der Verzehr-Grenze → bestehende Fehlermeldung, kein Crash
- [x] **FS3** – Unique-Verletzung (23505) weiterhin als Nutzermeldung, nicht als technischer Fehler
- [x] **FS4** – Soft-Delete unverändert (deaktivierter Artikel bleibt zugeordnet und auflösbar)
- [x] **FS5** – Referenz-Schutz: keine Artikel ohne Katalog durch Katalog-Entfernung

## Technische Notizen

> Aus [ADR-050](../docs/adr/050-katalog-als-template-entitaet.md) (`/architecture`, 2026-09-17).
> Kanonische Begründung steht dort – hier nur die Umsetzungs-Reihenfolge.

**Reihenfolge (TDD, jeder Schritt Red → Green → Refactor):**

1. **Schema** (`db/schema.ts`): Tabelle `catalog` (`id` text PK, `name` text notNull **unique**,
   `active` bool notNull default true, `sortOrder` int notNull default 0, `createdAt`,
   `updatedAt`) + Typen `Catalog`/`NewCatalog`. Dann `catalogItems.catalogId` als
   `text().notNull().references(() => catalog.id)` (**kein** `onDelete`), Unique-Tausch:
   `catalog_item_name_size_unique` → `catalog_item_catalog_name_size_unique`
   auf **`(catalogId, name, size)`** – `catalogId` zuerst (ADR-050 D2, der Index bedient damit
   die katalog-gefilterten Lesezugriffe; **kein** separater FK-Index).
2. **Migration** (`pnpm db:generate`, dann **von Hand nachziehen**, ADR-050 D6):
   `CREATE TABLE catalog` → `INSERT … ('standard','Montagsrunde',0) ON CONFLICT (id) DO NOTHING`
   → `ADD COLUMN catalog_id text` **nullable** → `UPDATE … SET catalog_id='standard' WHERE
   catalog_id IS NULL` → `SET NOT NULL` → FK + Unique-Tausch. Je Schritt
   `--> statement-breakpoint`. Vorbild für die Daten-Schritte:
   `db/migrations/0004_seed_catalog_reference.sql`.
   ⚠️ `db:generate` emittiert die Spalte direkt als `NOT NULL` – so angewandt **scheitert** die
   Migration auf jeder DB mit bestehenden Artikeln.
3. **Data-Layer** (`db/catalog.ts`): `export const STANDARD_CATALOG_ID = "standard";`
   Signaturen (ADR-050 D4, **kein** Default-Parameter):
   `listCatalog(catalogId)`, `listActiveCatalog(catalogId)`, `getCatalogItem(id, catalogId)`,
   `createItem(catalogId, data)`, `updateItem(id, catalogId, data)`,
   `setItemActive(id, catalogId, active)`.
   `CatalogItemData` bekommt `"catalogId"` in die `Omit`-Liste.
   Bei `getCatalogItem`/`updateItem`/`setItemActive` gehört `catalogId` in das `WHERE`
   (`and(eq(id), eq(catalogId))`) – Parent-Key, Kern-Kurzregel 2.
4. **Aufrufer** (6 Produktionsstellen, alle übergeben `STANDARD_CATALOG_ID`):
   `app/verwaltung/katalog/page.tsx` (`listCatalog`),
   `app/verwaltung/katalog/actions.ts` (`createItem`/`updateItem`/`setItemActive`),
   `app/veranstaltung/[id]/verzehr/page.tsx` (`listActiveCatalog`),
   `app/theke/[token]/page.tsx` (`listActiveCatalog`),
   `app/veranstaltung/actions.ts` (`getCatalogItem`).
5. **Doku:** Begriff „Katalog" in `docs/factory/PROJECT-CONTEXT.md` → Fachdomäne als eigene
   Entität beschreiben (AK10). `docs/routes.md` braucht **keine** Änderung (keine Routen berührt).

**Unbedingt NICHT anfassen (ADR-050 D5 – sonst Historien-Schaden):**

- der Anzeige-Join in `db/verzehr.ts` (`innerJoin catalogItems … eq(catalogItemId, id)`)
- die Freeze-Subquery in `db/veranstaltung.ts:183` (`select price_cents … where id = …`)

Beide bleiben **katalog-frei**. Eine `catalog_id`-Bedingung dort würde in #346 Zeilen aus dem
Join fallen lassen bzw. den Preis-Freeze auf `NULL` laufen lassen.

**Ebenfalls unverändert:** `app/verwaltung/katalog/schema.ts` (Zod) – `catalogId` kommt **nie**
aus `FormData`, die Action setzt ihn (ADR-050 D4). Kein neues Formularfeld → AK7.
`listActiveCatalog` filtert weiterhin **nur** `catalog_item.active`, **nicht** `catalog.active`
(ADR-050 D7).

**Testhinweise:**

- `db/catalog.test.ts`-Muster (Integration gegen echte DB, `hasDb`-Guard, `__test__`-Präfix,
  Aufräumen per id): AK1–AK4, AK6, FS1, FS4, FS5.
- **AK4 beide Richtungen** assertieren: gleicher Name+Größe in K1 abgelehnt **und** in K2 erlaubt
  (Lesson „Spiegel-/Symmetrie-AK", #211).
- **AK5** als Verhaltenstest: Katalog umbenennen → `listActiveCatalog(STANDARD_CATALOG_ID)`
  liefert unverändert.
- **Drift-Guard zum Trade-off aus ADR-050:** `STANDARD_CATALOG_ID` liegt im Code **und** als
  Literal in der Migration. Ein Test muss die Konstante gegen das Literal in der
  Migrationsdatei halten, **fail-closed bei unlesbarer Quelle** (Lesson „Kopplungs-/Drift-Guard",
  #214) – Anker ist die volle `INSERT`-Zeile, kein Fragment (Lesson #114 ff.).
- **AK7/AK8** = bestehende Page-/Action-Tests bleiben unverändert grün **plus** je eine
  Wiring-Assertion, dass `STANDARD_CATALOG_ID` an die Data-Layer durchgereicht wird.
- **AK9:** das drizzle-Journal verhindert ein Doppel-Apply bereits; `ON CONFLICT (id) DO NOTHING`
  und `WHERE catalog_id IS NULL` decken den Fall einer vorab manuell angelegten Zeile. Belegen,
  indem die Statements in einem Wegwerf-Schema **zweimal** ausgeführt werden – nicht durch
  zweimaliges `db:migrate` (das führt nichts erneut aus).
- Typfehler fallen weder durch Lint noch Vitest (Lesson #137): `pnpm typecheck` bzw.
  `pnpm build` gehört in diesen Schritt – die Signaturänderung trifft jede Aufrufstelle.

## Offene Fragen

- [x] ~~Wie wird der Standard-Katalog stabil aufgelöst?~~ → **ADR-050 D3**: stabiler Text-Key
      `'standard'` als Konstante `STANDARD_CATALOG_ID`, von der Migration geseedet. Kein
      Default-Flag (in #346 bedeutungslos), kein Namens-Lookup (bricht AK5).
- [x] ~~Welche Data-Layer-Funktionen nehmen den Katalogbezug in die Signatur?~~ → **ADR-050 D4**:
      alle sechs, als **Pflichtparameter** ohne Default; `catalogId` nie aus `FormData`.
- [ ] Wie erreicht der `verwalter` das Umbenennen bis #345 (bis dahin nur direkt in der DB)?
      Bleibt offen – ein minimaler Pflege-Weg würde den Schnitt „verhaltensneutral" verlassen.

## Implementierungs-Notizen (`/implement`, 2026-09-17)

**Gates:** Lint grün (`pre-commit.sh`), `pnpm typecheck` grün, Vitest **885/885 grün, 0 skipped**
gegen eine frisch migrierte DB. Playwright-E2E grün (8 passed, 3 skipped); der
`CredentialsSignin`-Stacktrace im Server-Log stammt aus dem Test „falsche Zugangsdaten" und ist
erwartetes Verhalten.

**AK9 / Leer-DB gegen einen Wegwerf-Container verifiziert** (nicht gegen die geteilte Dev-DB, die
nicht zerstört werden sollte): frischer `postgres:18-alpine`, alle Migrationen der Reihe nach →
genau **ein** Katalog (`standard | Montagsrunde | active`), **16** Artikel, davon **0** ohne
Katalog und **0** außerhalb von `standard`. Direkt am SQL nachgewiesen: AK3/FS1 (NOT-NULL greift),
AK4 in **beiden** Richtungen (gleiche Kombi in K2 gelingt, in `standard` scheitert mit
`catalog_item_catalog_name_size_unique`), FS5 (FK verhindert das Löschen eines belegten Katalogs).
Die Reihenfolge stimmt auch fachlich: `0004` seedet mit `ON CONFLICT (name, size)` **vor** dem
Constraint-Tausch in `0012` – ein Repo-weiter Grep belegt, dass es keine weitere Stelle mit
`ON CONFLICT (name, size)` gibt.

**Duplikat-Test zusammengeführt (Lesson #240):** der neu geschriebene AK4-Test
`should_rejectDuplicate_when_sameNameAndSizeInSameCatalog` hatte denselben Rumpf wie der bereits
vorhandene spec-49-Test `should_rejectDuplicate_when_sameNameAndSize`. Statt zwei parallele
Varianten stehen zu lassen, ist der alte Test im AK4-Block aufgegangen (Kommentar dort erklärt es).

**Nachgezogen gegenüber dem vorgefundenen Stand:** Wiring-Assertion
`getCatalogItem(id, STANDARD_CATALOG_ID)` an der Verzehr-Grenze (AK8) fehlte – die Konstante war
im Test zwar deklariert, aber nie gegen den Aufruf assertiert. FS2 prüft die Meldung jetzt als
Literal (`"Artikel nicht gefunden."`), nicht mehr nur „irgendein Fehler".

### Abschluss-Verifikation (`/implement`, zweite Session)

**Alle Gates erneut von Null gefahren.** `pre-commit.sh` grün; `pre-push.sh` grün (Tests,
Typecheck, `format:check`, Routen-Doku-Drift, Hook-Installation, `@import`-Deckel 893/1100,
Branch-Guard). Vitest **885/885 grün, 0 skipped** gegen einen frischen `postgres:18-alpine`
(Port 55432, danach entfernt); ohne `DATABASE_URL` sind es 811 grün + 74 skipped – die
Integrationsblöcke hängen am `hasDb`-Guard, ein reines `pnpm test` belegt AK1–AK6/AK9/FS1/FS4/FS5
also **nicht**.

**Format-Drift behoben:** `format:check` blockierte den Push wegen `db/catalog.ts` – die
`createItem`-Signatur passt in eine Zeile (98 Zeichen). Einziger Code-Eingriff dieser Session,
verhaltensneutral.

**AK9 jetzt auch wörtlich belegt** („die Migrationen erneut angewandt"): zweiter Container,
`drizzle-kit migrate` **zweimal** hintereinander, beide Läufe Exit 0 → danach `kataloge=1`,
`artikel=16`, `ohne_katalog=0`, und als einzige Unique-Constraint auf `catalog_item` steht
`catalog_item_catalog_name_size_unique` (die alte ist weg). Das ergänzt den bisherigen Nachweis,
der nur die **Daten**-Statements doppelt ausgeführt hatte – wichtig, weil das
`DROP CONSTRAINT` in `0012` kein `IF EXISTS` trägt und ein echtes Doppel-Apply allein durch das
drizzle-Journal verhindert wird.

**AK7 am echten Dev-Server verifiziert** (die dauerhafte E2E-Suite deckt `/verwaltung/katalog`
**nicht** ab – Unit-/Page-Tests allein hätten einen fehlenden Backfill nicht gesehen): Wegwerf-Spec
gegen `pnpm dev` + die echte Dev-DB. Dort sind 8 Artikel, alle mit `catalog_id='standard'`, und die
Pflegeansicht zeigt „Artikel (8)", nicht den Leer-Zustand; kein Katalog-Eingabefeld. Die Spec war
gitignoret (`*.tmp.spec.ts`) und ist wieder entfernt. Dauerhafte E2E-Suite unverändert grün
(8 passed, 3 skipped).

**`CLAUDE.md`-Autoblock verworfen:** `next dev` hängt beim E2E-Lauf den
`<!-- BEGIN:nextjs-agent-rules -->`-Block an (Lesson aus #337). Aus dem Diff entfernt – er gehört
nicht in einen fachlichen Task-Commit.

### Befunde, die NICHT zu dieser Task gehören (nicht behoben, Scope)

1. **Lokale Dev-DB ist driftet, keine Regression.** `should_containSeededReferenceList_when_freshly
   Migrated` schlägt gegen die geteilte Dev-DB fehl, weil dort die Referenz-Preisliste aus
   Migration `0004` **gar nicht** vorhanden ist (8 Artikel, u. a. „Testbier 354321" aus alten
   E2E-Läufen). Belegt als Umgebung, nicht als Code: eine ungefilterte `SELECT`-Abfrage zeigt die
   Zeile nirgends, und gegen eine frische DB ist derselbe Test grün. `0004` ist im drizzle-Journal
   als angewandt vermerkt und läuft daher nicht erneut. **Behebung wäre ein Neuaufsetzen des
   lokalen DB-Volumes** – bewusst nicht getan, weil das Volume mit dem Haupt-Checkout geteilt wird.
2. **Vorbestehender Flake zwischen zwei Testdateien.** `db/veranstaltung.test.ts` und
   `db/verzehr.test.ts` legen beide `__test__Cola` mit leerer Größe an; laufen sie parallel, kollidieren
   sie auf der Unique-Constraint. Unter der **alten** globalen `UNIQUE(name, size)` war die
   Kollision identisch möglich – also kein Effekt von #59. Isoliert und gemeinsam sind beide
   Dateien grün, gegen eine frische DB die ganze Suite. Kandidat für `kleinfunde.md`/Issue.
   → als Issue [#347](https://github.com/nothra/tch-gastro-services/issues/347) angelegt und
   **in der dritten `/implement`-Runde doch hier behoben** (Begründung unten: der Rework macht die
   Kollision deterministisch, ein roter Integrationslauf hätte den Gate für alle Folgeschritte
   wertlos gemacht).

## Review-Findings

`/review` **Runde 2** (2026-09-17): **APPROVED** – 0 kritisch, 1 wichtig, 3 Nitpicks.
Volltext (inkl. Runde-1-Anhang): [`tasks/review-59.md`](review-59.md).

Alle fünf wichtigen Findings aus Runde 1 sind behoben; die Runde hat sie **nachgemessen** statt
die Task-Notizen zu übernehmen (Lesson #312): Gates von Null grün, **888/888 in 3 von 3 Läufen**
gegen eine frische DB (bestätigt den #347-Fix unabhängig), `drizzle-kit migrate` zweimal mit
`kataloge=1 / artikel=16 / ohne_standard=0` und nur der neuen Unique-Constraint,
`drizzle-kit check`+`generate` ohne Schema-Drift, und ein **Mutationsbeleg** für den neuen
D5-Guard (je eine `catalog_id`-Bedingung in Anzeige-Join bzw. Freeze-Subquery macht ihn rot,
Quellen danach zurückgesetzt). Der W1-Pfad ist bis in die UI verfolgt
(`CatalogRow.tsx:18/51` – Formular bleibt offen, Meldung sichtbar).

Das eine wichtige Finding ist eine **Kommentar-Korrektur ohne Verhaltensanteil**: der viermal
kopierte Kommentar in den Wiring-Tests behauptet, der Drift-Guard halte das test-lokale Literal
`"standard"` gegen Produktionskonstante und Migration – er liest diese Dateien nie (Lesson #319).
Erledigung ausdrücklich dem `/refactor`-Schritt zugewiesen, **keine** weitere `/implement`-Runde.

Historie Runde 1: **NEEDS_REWORK** – 0 kritisch, 5 wichtig, 5 Nitpicks.
Volltext: [`tasks/review-59.md`](review-59.md). Out-of-Scope-Fund als Issue
[#347](https://github.com/nothra/tch-gastro-services/issues/347) angelegt (vorbestehender
Test-Flake `__test__Cola`).

### Rework (`/implement`, zweite Runde, 2026-09-17)

**Alle 5 wichtigen Findings behoben, 4 von 5 Nitpicks** (Nitpick 4 – ausgelieferte Specs 116/137
nennen die alte Unique-Constraint – war ausdrücklich ohne Handlungsbedarf).

1. **W1 – `updateCatalogItemAction` wertet den No-Match aus.** `runWithUniqueCheck` ist jetzt
   generisch und reicht das Ergebnis durch (`{ ok: true, value }` / `{ ok: false, state }`) statt
   es zu verwerfen; `undefined` von `updateItem` wird zu `{ error: "Artikel nicht gefunden." }`
   (Wortlaut aus `app/veranstaltung/actions.ts`, keine neue Meldung erfunden) und **ohne**
   `revalidatePath`. Neuer Test `should_returnNotFoundAndNotRevalidate_when_updateMatchesNoRow`;
   der Happy-Path-Test setzt jetzt einen echten Rückgabewert, sonst hätte der Mock-Default
   `undefined` den neuen Zweig verdeckt. `createItem` bleibt ohne Guard (Rückgabetyp ohne
   `| undefined` – ein Zweig dort wäre totes Verhalten). `setCatalogItemActiveAction` hat keinen
   Meldungskanal (`void`); der Fall ist jetzt im Code kommentiert und auf #345 vertagt.
2. **W2 – AK5-Test stellt den vorgefundenen Namen wieder her** statt „Montagsrunde"
   zurückzuschreiben. Damit überschreibt die Suite die eine Datenänderung nicht mehr, die ein
   Betreiber bis #345 legitim vornimmt.
3. **W3 – Regressionsguard für ADR-050 D5** in `db/veranstaltung.test.ts`
   (`should_resolveAndFreezePosition_when_itemBelongsToForeignCatalog`): Artikel in einem
   **fremden** Katalog, Position darauf, dann (1) der Anzeige-Join löst sie auf und (2) der
   Abschluss friert ihren Preis ein (spätere Preisänderung bleibt folgenlos). Eine
   `catalog_id`-Bedingung in einem der beiden Pfade macht den Test rot – genau der teuerste
   Fehler, den #346 machen kann, war bis hierhin unbewacht.
4. **W4 – ADR-026/027 fortgeschrieben** (Lesson #211): ADR-050 § „Bezug zu bestehenden ADRs"
   nennt beide, und an den vier Fundstellen steht ein „seit ADR-050"-Nachtrag
   (`UNIQUE(name, size)` → je Katalog; `listActiveCatalog()`/`getCatalogItem()` mit
   Katalogbezug). Die historischen Aussagen bleiben stehen.
5. **W5 – D6 heißt nicht mehr „Expand-only"** und benennt den Trade-off: `deploy-gate.yml`
   migriert PRD **vor** dem Promote, also läuft der alte Build kurz gegen `catalog_id NOT NULL`;
   `createItem` des alten Codes scheitert dann mit 23502 (nicht von `runWithUniqueCheck`
   übersetzt). Fenster bewusst in Kauf genommen (einstelliger Nutzerkreis, Deploy außerhalb der
   Montagsrunde); für #345/#346 gilt die Abwägung ausdrücklich nicht weiter. Dieselbe zu starke
   Formulierung stand im Kopfkommentar von `0012_catalog_als_entitaet.sql` und in den
   „Konsequenzen" von ADR-050 – beide mitgezogen (Lesson #264: Geschwister-Stellen per Grep).
6. **Nitpicks:** AK7-Gegenprobe hängt nicht mehr am Katalognamen (nur noch `queryByLabelText`);
   die AK2-Namensassertion ist entfallen – der Seed-Name ist eine Aussage über die *Migration*
   und dort doppelt belegt (Statement-Drift-Guard + AK9-Replay), während AK5 ihn ausdrücklich
   für änderbar erklärt; neuer D7-Abwesenheitstest
   (`should_stillListItems_when_owningCatalogIsInactive`); Default-Parameter der Test-Helfer
   sind als „bewusst nur im Test" kommentiert.

7. **#347 (Test-Isolation) doch in diesem PR behoben** – Abweichung von der Review-Einordnung
   „nicht in diesem PR", bewusst und gemessen:
   - **Messung.** Volle Suite 3× gegen einen frischen `postgres:18-alpine` (Wegwerf-Container,
     Port 55434, danach entfernt). Mit dem Rework: **3 von 3 Läufen rot**, immer dieselbe
     `__test__Cola`-Kollision (887/888). Mit den beiden DB-Testdateien auf HEAD zurückgespielt
     (nur sie bestimmen das Timing): **2 von 3 rot**, 1 grün. Die Ursache ist also tatsächlich
     vorbestehend, aber der W3-Guard verlängert `veranstaltung.test.ts` gerade so, dass die
     Kollision praktisch immer eintritt.
   - **Warum trotzdem hier.** `testing-standards.md` („Flaky Tests: Zero Tolerance … keine
     Test-Reihenfolge-Abhängigkeiten") ist dauergeladene Guideline, nicht optional. Ohne Fix
     hätten `/test`, `/refactor` und `/security-review` eine gegen eine echte DB rote Suite
     vorgefunden – und das `pre-push`-Gate wäre nur deshalb grün, weil bare `pnpm test` **ohne**
     `DATABASE_URL` läuft und die 74 Integrationsdateien überspringt. Genau die Blöcke belegen
     aber AK1–AK6/AK9/FS1/FS4/FS5. Ein falsch-grüner Gate war die Alternative.
   - **Fix (test-only, kein Produktionscode).** Jede der drei artikelanlegenden Testdateien
     bekommt ein eigenes Namensfenster (`ITEM_PREFIX` = `__test__veranstaltung-` /
     `__test__verzehr-` / `__test__katalog-`). Damit behoben ist nicht nur die in #347 gemeldete
     `__test__Cola`-Kollision, sondern auch eine zweite, latente: `catalog.test.ts` und
     `verzehr.test.ts` legen beide `__test__Kaffee` mit leerer Größe im Standard-Katalog an.
     Keine Assertion hängt an einem Namensliteral (geprüft: `toContain("Schnitzel")` bleibt
     erfüllt, die Fremdzeilen-Filter prüfen weiter auf `TEST_PREFIX`, das im neuen Präfix steckt).
   - Der AK5-Test war zusätzlich selbst nicht parallelitätsfest (er verglich die **gesamte**
     Artikelliste des Standard-Katalogs vor/nach dem Umbenennen und sah dabei Zeilen, die andere
     Dateien parallel anlegen und abräumen) – er prüft jetzt den selbst angelegten Artikel über
     alle drei Lesewege, was AK5 fachlich trägt.

**Gates (dritte Runde, alles von Null gefahren):** `pnpm lint`, `pnpm typecheck` und
`pnpm format:check` grün. Vitest **888/888 grün in 3 von 3 Läufen** gegen einen frischen
`postgres:18-alpine` (Wegwerf-Container, Port 55434). Gegen die geteilte Dev-DB bleibt Befund 1
oben gültig (fehlende `0004`-Referenzliste) – das ist ein Umgebungsproblem ohne Repo-Auslöser.
Keine UI-Änderung in dieser Runde, daher keine erneute Oberflächen-Verifikation nötig (AK7/AK8
wurden in Runde 2 am echten Dev-Server belegt).

## Test-Notizen (`/test`, 2026-09-17)

**Kein Produktionscode geändert** (nur Analyse + Task-Doku). Volle Suite und Coverage erneut
gegen einen frischen `postgres:18-alpine`-Wegwerf-Container gefahren (nicht die driftende
geteilte Dev-DB, Befund 1 aus `/implement`):

- **Vitest: 888/888 grün, 0 skipped** (75 Testdateien).
- **Coverage:** 97,13 % Statements / 95,36 % Branch / 94,63 % Funktionen / 97,59 % Zeilen –
  deutlich über der 80-%-Schwelle aus `PROJECT-CONTEXT.md`.

**AK/FS-Vollständigkeit geprüft:** alle zehn AKs und FS1/FS2/FS4/FS5 sind namentlich in den
Tests referenziert (`db/catalog.test.ts`, `app/verwaltung/katalog/actions.test.ts`,
`app/verwaltung/katalog/page.test.tsx`, `app/veranstaltung/actions.test.ts`,
`db/veranstaltung.test.ts`); FS3 (Unique-Violation 23505 → Nutzermeldung) ist über
`DUPLICATE_MESSAGE`-Assertions in `app/verwaltung/katalog/actions.test.ts` abgedeckt, ohne
das Label im Kommentar zu tragen.

**Verbleibende Coverage-Lücken bewusst nicht geschlossen (Scope, Kern-Kurzregel „Scope
einhalten"):** ein Diff-Abgleich (`git diff origin/main...HEAD --stat`) zeigt, dass jede
Zeile, die dieser Task tatsächlich zuzurechnen ist, abgedeckt ist. Die im Coverage-Report
sichtbaren Lücken liegen ausschließlich in **von #59 nicht berührtem** Code:
- `db/schema.ts` (76 %) – deklarative Tabellen-/Typ-Definitionen ohne Laufzeitlogik.
- `app/verwaltung/katalog/actions.ts:87-88` (`if (!id) return;` in
  `setCatalogItemActiveAction`) – unverändert seit `origin/main`, vor #59 bereits ungetestet.
- `app/veranstaltung/actions.ts:119,333` – Guards in `createWalkInAction`/`ensureThekeAction`,
  von #59 nicht angefasst (die neue Zeile `getCatalogItem(catalogItemId, STANDARD_CATALOG_ID)`
  und ihr `if (!item)`-Zweig in `applyVerzehrAdjust` sind covered).
- `CatalogRow.tsx`, `app/veranstaltung/[id]/page.tsx`, `TeilnehmerRow.tsx`,
  `IdentityGate.tsx` u. Ä. – gar nicht im Diff dieser Task.

Neue Tests waren daher nicht nötig; die vorhandene Suite aus den drei `/implement`-Runden und
Review-Runde 2 ist vollständig.

## Refactoring-Notizen (`/refactor`, 2026-09-17)

**Kein Produktionscode geändert** – nur die eine wichtige Review-Finding aus Runde 2 behoben, die
explizit dem `/refactor`-Schritt zugewiesen war (keine weitere `/implement`-Runde nötig): der
viermal kopierte Kommentar über `STANDARD_CATALOG_ID = "standard"` in fünf Wiring-Test-Dateien
(`app/theke/[token]/page.test.tsx`, `app/veranstaltung/actions.test.ts`,
`app/veranstaltung/[id]/verzehr/page.test.tsx`, `app/verwaltung/katalog/actions.test.ts`,
`app/verwaltung/katalog/page.test.tsx`) behauptete, der Drift-Guard aus `db/catalog.test.ts`
halte dieses test-lokale Literal gegen Produktionskonstante und Migration – der Guard liest diese
fünf Dateien nie (Lesson #319). Kommentar korrigiert: das Literal ist unabhängig auf denselben
Wert gesetzt, der Drift-Guard prüft ausschließlich `db/catalog.ts` gegen die Migrationsdatei.

Restlicher geänderter Code (`db/catalog.ts`, `app/verwaltung/katalog/actions.ts`) wurde gegen die
Checkliste geprüft (Naming, Funktionsgröße, Parameteranzahl, Duplikation, Magic Numbers,
Verschachtelung) – keine weiteren Findings, beides bereits knapp und klar strukturiert.

**Gates:** `pre-commit.sh` grün, `pre-push.sh` grün (Vitest 812/888 grün + 76 skipped ohne
`DATABASE_URL` – wie erwartet, keine DB-Integrationstests in diesem Schritt nötig, da keine
Produktionslogik geändert wurde; Typecheck, Format, Routen-Doku-Drift, Hook-Installation,
`@import`-Deckel 893/1100 alle grün).

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/59-preis-templates-veranstaltungstyp`
Erstellt: 2026-09-16 22:19
