# Security Review: Task 59

> Persona: `docs/factory/agents/security-agent.md` · Diff-Scope: `git diff origin/main...HEAD`
> (nach `git fetch origin`, Lesson #161/#176) · Datum: 2026-09-17

**Scope des Diffs:** 26 Dateien, davon 8 Produktionsdateien (`db/schema.ts`, `db/catalog.ts`,
`db/migrations/0012_catalog_als_entitaet.sql`, `app/verwaltung/katalog/{actions,page}.tsx|ts`,
`app/veranstaltung/actions.ts`, `app/veranstaltung/[id]/verzehr/page.tsx`,
`app/theke/[token]/page.tsx`). Keine neuen Routen, keine neuen Dependencies, keine
Auth-/Session-Mechanik berührt.

## Kritische Findings (Blocker)

_Keine._

## Wichtige Findings

_Keine._

## Hinweise

- [ ] **[Mass Assignment / Defense-in-Depth] `updateItem` schützt `catalogId` nicht symmetrisch
      zu `createItem`.** `createItem` setzt den Katalogbezug **nach** dem Spread
      (`db/catalog.ts:74-76`: `.values({ ...data, catalogId })`) und überschreibt damit auch ein
      verunreinigtes `data`. `updateItem` spreadet `data` ungefiltert in `.set()`
      (`db/catalog.ts:82`) – ein `catalogId`-Key in `data` würde den Artikel in einen fremden
      Katalog verschieben. **Nicht ausnutzbar**, zwei unabhängige Ebenen schließen es aus:
      `CatalogItemData` `Omit`tet `catalogId` (Typebene) und `catalogItemSchema` ist ein
      nicht-strictes `z.object`, das unbekannte Keys **verwirft** (Laufzeitebene). Letzteres
      **empirisch geprüft** statt aus dem Gedächtnis behauptet: gegen die installierte
      zod-Version `^4.4.3` liefert `z.object({name}).safeParse({name, catalogId})` ein
      `parsed.data` mit ausschließlich `["name"]`, `catalogId` ist nicht durchgereicht.
      → **Empfehlung (kein Blocker):** `.set({ ...data, catalogId, updatedAt: … })` – macht das
      Feld idempotent statt beschreibbar und hängt die Zusicherung nicht länger allein an einer
      Zod-Laufzeiteigenschaft. Ausgelagert nach `docs/factory/kleinfunde.md` (ADR-043 Schritt B:
      1 Zeile, keine aktuelle Angriffsfläche).

- [ ] **[Security Misconfiguration / Doku-Drift] `db/catalog.test.ts`-Dateikopf behauptet
      „nicht-destruktiv", der AK9-Replay macht DDL.** Der Kopf (`:22-23`) sagt weiterhin „Tests
      sind nicht-destruktiv: sie räumen nur die selbst angelegten Zeilen per id wieder ab" –
      seit #59 legt der AK9-Replay in derselben Verbindung ein Schema an und verwirft es
      (`:442` `CREATE SCHEMA`, `:505` `DROP SCHEMA … CASCADE`). Der Radius ist sauber begrenzt
      (generierter Name `__test_ak9_${Date.now()}`, keine Fremdeingabe im DDL-String;
      `SET search_path` **ohne** `public` hält die aus der Datei gelesenen Migrationsanweisungen
      fail-closed von den echten Tabellen fern – ein gut gewählter Guard). Die Suite braucht
      seither aber `CREATE SCHEMA`-Rechte auf der per `DATABASE_URL` verbundenen DB, und der
      Kommentar sagt das Gegenteil. → Halbsatz nachziehen; ausgelagert nach
      `docs/factory/kleinfunde.md` (ADR-043 Schritt B).

- [ ] **[Error Handling] Deploy-Fenster aus ADR-050 D6 leakt keine internen Details.** Während
      `deploy-gate.yml` PRD migriert, bevor es promotet, läuft der alte Build kurz gegen
      `catalog_id NOT NULL`; `createItem` scheitert dort mit SQLSTATE `23502`.
      `runWithUniqueCheck` (`app/verwaltung/katalog/actions.ts:33-40`) übersetzt nur `23505` und
      **wirft alles andere weiter** – korrekt fail-closed statt einen Fehlschlag als Erfolg zu
      melden. Nach außen ist das unkritisch: Next.js maskiert in einem Produktions-Build
      geworfene Server-Action-Fehler zu einer generischen Meldung mit Digest, ein Stack-Trace
      erreicht den Client nicht. Der Trade-off ist in ADR-050 D6 benannt und bewusst
      angenommen; hier nur als geprüft festgehalten.

## Geprüft und ohne Befund

**Input-Validierung & Injection**
- SQL-Injection ausgeschlossen: sämtliche neuen Queries sind parametrisierte Drizzle-Builder
  (`eq`/`and`), kein String-Concat mit Nutzerdaten. Die einzige `sql`-Template-Stelle im Umfeld
  (`db/veranstaltung.ts:183`, Preis-Freeze) interpoliert ausschließlich Drizzle-Spalten-/
  Tabellenobjekte, keine Eingabe – und wurde von #59 bewusst nicht angefasst (ADR-050 D5).
- Die Migration `0012` enthält nur statische Literale (`'standard'`, `'Montagsrunde'`), keine
  dynamische Werteinsetzung.
- Kein Command-Injection-Vektor (keine Shell-Aufrufe im Diff).
- XSS: kein neuer Output-Pfad; `catalog.name` wird bis #345/#346 nirgends gerendert (AK7), und
  React escapet ohnehin. Kein `dangerouslySetInnerHTML` im Diff.
- Zod-Grenze unverändert (`app/verwaltung/katalog/schema.ts`) – Obergrenzen für `name`/`size`
  (50) und `priceCents`/`sortOrder` (`INT4_MAX`) bleiben gesetzt (Kern-Kurzregel 4).

**Authentifizierung & Autorisierung**
- Alle drei Katalog-Actions rufen weiterhin `requireRole("verwalter")` als erste Zeile;
  `lib/authz.ts` ist unverändert und fail-closed (`throw ForbiddenError` bei fehlender Session
  **oder** fehlender Rolle).
- **BOLA/IDOR: netto verbessert.** `getCatalogItem`, `updateItem` und `setItemActive` führen den
  Parent-Key jetzt im `WHERE` (`and(eq(id), eq(catalogId))`, `db/catalog.ts:59-70/77-87/91-101`)
  – exakt Kern-Kurzregel 2. `updateCatalogItemAction` wertet den No-Match aus
  (`actions.ts:76`), meldet also keinen Erfolg für einen nicht stattgefundenen Schreibvorgang
  (Kern-Kurzregel 1 / Lesson #55). `setCatalogItemActiveAction` schluckt den No-Match still,
  schreibt dabei aber **nichts** – fail-closed, nur ohne Rückmeldung (bewusst, auf #345 vertagt).
- Der Katalogbezug kommt **nie** aus `FormData`, sondern serverseitig aus `STANDARD_CATALOG_ID`
  (ADR-050 D4) – ein Client kann kein fremdes Schreibziel angeben.
- Öffentliche Theken-Route (`app/theke/[token]/page.tsx`, `adjustVerzehrByTokenAction`):
  Rate-Limiter-Guard, Token-Self-Scoping und IDOR-Bindung in `applyVerzehrAdjust` unverändert.
  Die neue katalog-gebundene Abfrage **verengt** die erreichbare Artikelmenge, sie erweitert sie
  nicht; ein Artikel aus einem fremden Katalog läuft in dieselbe neutrale Bestandsmeldung
  (`ITEM_NOT_FOUND`, spec-59 FS2) wie ein unbekannter – keine Unterscheidbarkeit, kein
  Enumerations-Orakel.
- Keine hartkodierten Credentials; `process.env.DATABASE_URL` erscheint nur in
  `db/catalog.test.ts:135` (Testverbindung), nicht im Produktionscode.

**Daten & Kryptographie**
- Keine Secrets/Keys im Diff. `catalog.id` nutzt `globalThis.crypto.randomUUID()` (CSPRNG),
  kein `Math.random()`.
- Keine neuen personenbezogenen Felder; `catalog` trägt nur Name/Aktiv/Sortierung.
- Datenresidenz unverändert (Neon Frankfurt / Vercel `fra1`).

**Dependencies**
- `git diff origin/main...HEAD -- package.json pnpm-lock.yaml pnpm-workspace.yaml` ist **leer**:
  keine neue, geänderte oder entfernte Abhängigkeit. Eine Advisory-Prüfung ist für diesen Diff
  gegenstandslos; der Bestand ist zuletzt in `/security-review` zu #337/#339 bewertet worden.

**Error Handling & Information Disclosure**
- Die neue Meldung `ITEM_NOT_FOUND = "Artikel nicht gefunden."` übernimmt den Wortlaut aus
  `app/veranstaltung/actions.ts` (keine neue Meldung erfunden) und enthält keine internen
  Details. Sie ist nur hinter `requireRole("verwalter")` erreichbar.
- `isUniqueViolation` prüft weiterhin nur den SQLSTATE `23505` und gibt die Treiber-Meldung
  nicht an den Nutzer durch – der Duplikat-Fall bleibt eine fachliche Meldung (FS3).
- Ein `23503` (FK-Verletzung, etwa bei fehlendem Standard-Katalog) wird bewusst nicht übersetzt
  und schlägt fehl statt still zu schreiben – fail-closed.

**Referenzielle Härtung (positiv)**
- `catalog_id` ist `NOT NULL` mit FK **ohne** `ON DELETE` (Postgres-Default „no action"):
  ein Katalog mit Artikeln lässt sich nicht löschen (FS5), ein Artikel ohne Katalog kann
  unabhängig vom Aufrufweg nicht entstehen (AK3/FS1, per Roh-INSERT an der Data-Layer vorbei
  getestet: `db/catalog.test.ts:263-275`).
- Die Migration ist in der sicheren Reihenfolge handgeschrieben (nullable → seed → backfill →
  `SET NOT NULL` → FK/Unique-Tausch) und in den Datenschritten wiederholbar
  (`ON CONFLICT DO NOTHING`, `WHERE catalog_id IS NULL`) – kein Datenverlust bei Re-Apply.

## Ergebnis

**PASSED**

0 kritische, 0 wichtige Findings. Drei Hinweise, alle ohne aktuelle Angriffsfläche; die zwei
handlungsfähigen sind nach `docs/factory/kleinfunde.md` ausgelagert (ADR-043 Schritt B –
jeweils 1–2 Zeilen, keine Sicherheitsrelevanz, daher kein Issue). Kein Merge-Blocker.

Sicherheitstechnisch ist #59 netto eine **Verbesserung**: drei Data-Layer-Zugriffe führen jetzt
den Parent-Key im `WHERE`, eine bislang stille No-Match-Stelle meldet den Fehlschlag, und die
DB lehnt Artikel ohne Katalogbezug fail-closed ab.
