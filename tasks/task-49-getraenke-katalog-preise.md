# Task 49: getraenke-katalog-preise

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [x] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Feature **F2** des Epics „Digitale Veranstaltungs-Abrechnung": Der **Verwalter** pflegt
den Getränke-Katalog (Bezeichnung, optionale Größe, Preis, Kategorie `getraenk`/`kaffee`,
Sortierung, aktiv/inaktiv). Grundlage für die automatische Getränke-Summe (F5). Kaffee
ist Katalog-Artikel mit festem Preis (mehrere erlaubt); Essen gehört **nicht** hierher
(pro Abend in F4). Preise in EUR mit genau 2 Nachkommastellen, serverseitig (Zod)
validiert. Artikel werden nie hart gelöscht, sondern deaktiviert/wieder aktiviert. Die
Excel-Referenzpreisliste wird initial geseedet.

Kanonische Spec: [spec-49-getraenke-katalog.md](../docs/specs/spec-49-getraenke-katalog.md).
Hängt ab von F1 (#48 Login & Rollen).

## Akzeptanzkriterien
<!-- Gespiegelt aus docs/specs/spec-49-getraenke-katalog.md -->
- [ ] Verwalter legt Artikel (Bezeichnung + Preis, Größe optional) an → erscheint im Katalog, für neue Abende wählbar.
- [ ] Preisänderung gilt für künftige Erfassungen; abgeschlossene Abende bleiben unverändert.
- [ ] Deaktivierter Artikel ist in neuen Abenden nicht mehr wählbar, bleibt in alten Abrechnungen erhalten.
- [ ] Deaktivierter Artikel kann wieder aktiviert werden.
- [ ] Mehrere Artikel der Kategorie `kaffee` sind erlaubt (kein Ein-Kaffee-Limit).
- [ ] Ungültiger Preis (kein EUR ≥ 0 mit ≤ 2 Nachkommastellen) wird serverseitig (Zod) abgelehnt.
- [ ] Frisch initialisiertes System enthält die geseedete Excel-Referenzpreisliste.
- [ ] Abrechner ohne Verwalter-Rolle wird beim Katalog-Bearbeiten serverseitig abgelehnt (F1).
- [ ] Fehlerfall: doppelte Bezeichnung+Größe → Hinweis, kein stiller Duplikat.
- [ ] Fehlerfall: Deaktivieren eines in offenem Abend genutzten Artikels → bleibt dort nutzbar, nur für neue Abende gesperrt.

## Technische Notizen
<!-- Von /architecture befüllt (2026-07-13) -->

**Architektur-Entscheidungen dieses Features:**

### Geld → ADR-021 (verbindlich, cross-cutting)
Preis als **Integer-Cent** (`price_cents integer`), Umrechnung/Formatierung nur über
neues Modul **`lib/money.ts`** (`parseEuroToCents`, `formatCents`). Zod validiert die
Roh-Eingabe (Regex ≤ 2 Nachkommastellen, ≥ 0) und transformiert zu Cents. Siehe
[ADR-021](../docs/adr/021-geldbetraege-integer-cent.md).

### Datenmodell – neue Tabelle `catalog_item` (`db/schema.ts`)
- `id text pk` ($defaultFn crypto.randomUUID – wie `users`)
- `name text notNull`
- `size text notNull default ''` — leere Größe = „keine Größe" (Kaffee). **Bewusst
  `NOT NULL default ''`** (nicht nullable), damit die Duplikat-Regel eine **einfache**
  zusammengesetzte Unique-Constraint `UNIQUE(name, size)` ist und `ON CONFLICT (name, size)`
  im Seed direkt greift (kein funktionaler `COALESCE`-Index nötig). Anzeige rendert `''`
  als „ohne Größe".
- `price_cents integer notNull` (ADR-021)
- neuer Enum `catalog_category` = `['getraenk','kaffee']` (deutsche Werte wie `user_role`);
  Spalte `category catalog_category notNull`
- `sort_order integer notNull default 0`
- `active boolean notNull default true`
- optional `created_at/updated_at timestamptz` (Muster wie in bestehenden Tabellen, nur wenn
  ohne Mehraufwand)
- **Unique:** `UNIQUE(name, size)` → deckt „doppelte Bezeichnung+Größe" **und** „zweiter
  Kaffee ohne Größe kollidiert" ab. **Mehrere `kaffee`-Artikel bleiben erlaubt** (kein
  Constraint auf `category`).

### Migration
- Schema-Migration via `pnpm db:generate` (neue Tabelle → **eindeutig**, kein interaktiver
  drizzle-kit-Prompt; die Enum-Falle aus CLAUDE.md #48 tritt bei *Neuanlage* nicht auf).
  Generiertes SQL + Snapshot committen, lokal gegen Wegwerf-DB `0000→…→n` verifizieren.

### Seeding der Referenz-Preisliste → als **Daten-Migration** (nicht Seed-Skript)
- Eigene, **handgeschriebene** nummerierte SQL-Migration **nach** der Schema-Migration
  mit idempotenten `INSERT INTO catalog_item (...) VALUES (...) ON CONFLICT (name, size) DO NOTHING`.
- **Begründung:** Die Referenzliste ist **nicht-geheime Stammdaten**, die in **jeder**
  Umgebung (DEV/INT/PRD) existieren müssen. Migrationen laufen automatisch im Deploy-Gate
  (ADR-017) → deterministisch, versioniert, überall vorhanden. Das bestehende `db/seed.ts`
  ist bewusst für **secret-abgeleitete** Daten (Admin-Konto, `.env`) und wird **manuell**
  je Env aufgerufen → für Stammdaten ungeeignet. `ON CONFLICT DO NOTHING` seedet **einmalig**;
  spätere Verwalter-Änderungen werden nie überschrieben.
- Quelle der Werte: Referenz-Preisliste in `docs/specs/README-montagsrunde.md` (Stand
  2026-04-28). Multi-Größen-Zeilen (z. B. Cola 0,2/0,33/0,5/0,7) werden zu **je einem**
  `catalog_item` expandiert. Kaffee: `category='kaffee'`, `size=''`, Beispielpreis 1,00 € → `100`.

### Data-Layer & Server Actions (Separation of Concerns)
- Data-Layer **`db/catalog.ts`**: `listCatalog`, `listActiveCatalog`, `createItem`,
  `updateItem`, `setItemActive` – **nur** hier Drizzle-Queries (keine rohen SQL/Queries in
  Actions/UI, PROJECT-CONTEXT).
- Route unter dem geschützten Verwalter-Bereich, z. B. `app/verwaltung/katalog/`
  (`page.tsx`, `actions.ts`, `schema.ts`).
- **`actions.ts`**: jede mutierende Server Action ruft als **erste Zeile**
  `await requireRole('verwalter')` (`lib/authz.ts`, fail-closed) – erfüllt „Abrechner wird
  serverseitig abgelehnt" ohne UI-only-Gate. Muster analog `app/login/actions.ts`.
- **`schema.ts`**: Zod-Schema für Anlegen/Bearbeiten; Preis-Feld via `parseEuroToCents`
  transformiert; `category`-Enum; `size` optional (→ `''`).
- Route ist bereits durch `proxy.ts` auth-geschützt (kein neuer öffentlicher Endpunkt →
  **kein** Eintrag in den Negativ-Lookahead nötig; #63-Regel betrifft nur *öffentliche* Routen).

### Preis-„Einfrieren" (Spec-Offene-Frage) → Richtung festgelegt, **nicht** in F2 gebaut
- **Richtung: Snapshot pro erfasster Position.** In F5 wird beim Erfassen einer
  Verzehr-Zeile der **Stückpreis (Cents) und das Label** in die Verzehr-Position kopiert.
  Preisänderung/Deaktivierung im Katalog ändert damit **nie** historische Zeilen; keine
  separate Preis-Historientabelle nötig.
- **In F2 wird davon nichts implementiert** (YAGNI): F2 liefert nur den pflegbaren Katalog.
  Die **verbindliche** Modellierung der Snapshot-Spalten erfolgt in **F5 (#52)** – dort ist
  diese Richtung die Vorgabe.

**Teststrategie (TDD):** `lib/money.ts` rein & mockfrei (Parser/Formatter, Edge-Cases:
`","` vs `"."`, > 2 Nachkommastellen, negativ, leer). Data-Layer gegen lokale Test-DB
(Integration). Server Actions: Rollen-Guard (Abrechner → `ForbiddenError`), Zod-Ablehnung,
Duplikat-Konflikt. Seed-Migration im `0000→…→n`-Lauf gegen Wegwerf-DB verifizieren.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

## Review-Findings
<!-- Wird durch /review befüllt -->

### Für /refactor vorgemerkt: Lint-Fehler (manuell via `pnpm lint` gefunden, 2026-07-13)

`app/verwaltung/katalog/CatalogRow.tsx:22` — `react-hooks/set-state-in-effect`:
`setEditing(false)` wird synchron im `useEffect`-Body aufgerufen (`if (state?.ok) setEditing(false);`),
das löst laut ESLint kaskadierende Re-Renders aus. Vor dem finalen Commit beheben
(z. B. Reaktion auf `state` außerhalb des Effekts modellieren oder Ableitung aus `state`
statt eigenem `editing`-State), danach `pnpm lint` erneut grün bestätigen.

### Refactoring (2026-07-13)
- `actions.ts`: `runWithUniqueCheck`-Helper extrahiert – eliminiert identische try/catch-Blöcke in create und update.
- `CATEGORY_LABEL` nach `CatalogFields.tsx` verschoben und exportiert; `CatalogRow.tsx` importiert es daraus – eine Quelle für Kategorie-Labels.

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->
Siehe `tasks/codify-49.md`. Zwei neue Stolpersteine in `docs/factory/PROJECT-CONTEXT.md`:
1. `useActionState` + Inline-Toggle: setState im Callback, nicht im useEffect
2. Zod-Schema: Obergrenze für Integer-mapped Inputs (int4-Overflow → generischer 500)
   → umgesetzt in `app/verwaltung/katalog/schema.ts` (`priceCents`-`.refine(... <= 2_147_483_647)`)
   + Testfall in `schema.test.ts`, noch in diesem PR.

---
Branch: `feature/49-getraenke-katalog-preise`
Erstellt: 2026-07-13 18:40
