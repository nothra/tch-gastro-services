# Task 59: preis-templates-veranstaltungstyp

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
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

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/59-preis-templates-veranstaltungstyp`
Erstellt: 2026-09-16 22:19
