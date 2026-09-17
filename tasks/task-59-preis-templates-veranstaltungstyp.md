# Task 59: preis-templates-veranstaltungstyp

## Status
- [ ] In Bearbeitung
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

- [ ] **AK1** – Katalog-Entität existiert (Name, Aktiv-Kennzeichen, Sortierung); Name eindeutig
- [ ] **AK2** – Standard-Katalog „Montagsrunde" angelegt, **alle** bestehenden Artikel zugeordnet
- [ ] **AK3** – Katalogbezug je Artikel ist DB-Pflicht (fail-closed, referenziell)
- [ ] **AK4** – Duplikat-Regel gilt je Katalog (gleicher Name+Größe in K2 erlaubt, in K1 nicht);
      Nutzermeldung unverändert
- [ ] **AK5** – Umbenennen des Katalogs bricht nichts (Auflösung wertet den Namen nicht aus)
- [ ] **AK6** – Artikel-Abfrage per ID ist katalog-gebunden (Parent-Key im `WHERE`)
- [ ] **AK7** – Verhaltensneutral für den `verwalter` (`/verwaltung/katalog` unverändert)
- [ ] **AK8** – Verhaltensneutral für Veranstalter und Theke (Verzehrerfassung, `/theke/[token]`)
- [ ] **AK9** – Migration wiederholbar und leer-DB-fest (kein zweiter Standard-Katalog)
- [ ] **AK10** – ADR zum Modell + Begriff „Katalog" in `PROJECT-CONTEXT.md` fortgeschrieben

### Fehlerszenarien

- [ ] **FS1** – Artikel ohne Katalog wird von der DB abgelehnt
- [ ] **FS2** – Unbekannter/fremder Artikel an der Verzehr-Grenze → bestehende Fehlermeldung, kein Crash
- [ ] **FS3** – Unique-Verletzung (23505) weiterhin als Nutzermeldung, nicht als technischer Fehler
- [ ] **FS4** – Soft-Delete unverändert (deaktivierter Artikel bleibt zugeordnet und auflösbar)
- [ ] **FS5** – Referenz-Schutz: keine Artikel ohne Katalog durch Katalog-Entfernung

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

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/59-preis-templates-veranstaltungstyp`
Erstellt: 2026-09-16 22:19
