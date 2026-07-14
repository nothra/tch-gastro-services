# Review: Task 49

Multi-Persona-Review (Backend/Logik · Code-Qualität · Architektur) des Getränke-Katalogs
(F2, #49). Basis: Arbeitsbaum (money.ts, db/catalog.ts, db/schema.ts, Migrationen 0003/0004,
app/verwaltung/katalog/*). Die eigentliche Implementierung liegt noch un-committed im
Working Tree (nicht im `main...HEAD`-Diff, der nur Docs/ADR enthält).

## Kritische Findings (müssen behoben werden)

_Keine._ Es wurde kein die Akzeptanzkriterien verletzender oder abstürzender Fehler gefunden.

## Wichtige Findings (sollten behoben werden)

- [ ] [db/catalog.ts:28-46] `updateItem` und `setItemActive` geben bei **nicht existierender
      `id`** ein `undefined` zurück, obwohl der Rückgabetyp `Promise<CatalogItem>` ist
      (`const [updated] = await …returning()` → `updated === undefined`). Heute unkritisch,
      weil die Actions den Rückgabewert nicht auswerten – aber es ist ein stiller No-op mit
      Typ-Unsauberkeit, über den ein Konsument in F5+ stolpern kann. Empfehlung: bei leerem
      `returning()` einen `NotFoundError` werfen (oder `Promise<CatalogItem | undefined>`
      im Typ ehrlich machen).
- [ ] [db/catalog.test.ts:42] Der komplette Data-Layer (`db/catalog.ts`) ist **nur** über
      DB-gebundene Integrationstests abgedeckt, die per `describe.skipIf(!hasDb)` im CI-Test-Gate
      (`pnpm test` ohne `DATABASE_URL`, keine Postgres-Services in `factory-ci.yml`)
      **übersprungen** werden. Damit prüft das reguläre CI **weder** die Duplikat-Regel
      (`UNIQUE(name,size)` / SQLSTATE 23505) **noch** das Vorhandensein der geseedeten
      Referenzliste automatisch. Teilweise entschärft durch `pnpm db:migrate:int` im
      Deploy-Gate (führt 0003+0004 gegen eine echte DB aus) – aber die *inhaltliche*
      Assertion „ISO-Sportdrink = 200 Cent, Kaffee vorhanden" läuft nirgends automatisch.
      Deckt sich mit der #63-Codify-Lehre („Unit grün, Bug erst live"). → für `/test`
      vormerken (z. B. Postgres-Service im CI oder ein separates DB-Job-Gate).
- [ ] [app/verwaltung/katalog/CatalogRow.tsx, CatalogItemForm.tsx] Die **interaktiven**
      Client-Komponenten (Inline-Bearbeiten, Deaktivieren/Reaktivieren-Toggle, Anlege-Formular)
      haben **keine** Komponententests – nur `page.tsx` ist getestet. Erwartung „neuer Code
      100 % Coverage" (testing-standards). Toggle-Logik (`active ? "false" : "true"`) und das
      `useEffect([state])`-Schließen der Zeile sind ungetestet. → in `/test` ergänzen.

## Nitpicks (optional)

- [ ] [app/verwaltung/katalog/CatalogFields.tsx:39-42 vs CatalogRow.tsx:9-12] Das
      Kategorie-Label (`Getränk`/`Kaffee`) existiert zweimal (die `<option>`-Texte und
      `CATEGORY_LABEL`) – zwei Quellen der Wahrheit. Bei einer dritten Kategorie driftet das
      leicht auseinander. Optional in eine gemeinsame Konstante ziehen.
- [ ] [db/migrations/meta/_journal.json:28,35] Die `when`-Timestamps für 0003/0004
      (`1784000000000` / `…001`) sind synthetisch/handgesetzt statt `db:generate`-`Date.now()`.
      Funktional unbedenklich (monoton), signalisiert aber, dass Journal/Schema-Migration
      nachträglich von Hand angefasst wurde. Für die Reproduzierbarkeit dokumentiert lassen.
- [ ] [app/verwaltung/katalog/actions.ts:73] Der `if (!id) return`-Zweig in
      `setCatalogItemActiveAction` ist nicht getestet (die beiden Toggle-Tests liefern immer
      eine id). Kleiner Guard, gerne mit einem Test absichern.
- [ ] [lib/money.ts:9] `EURO_INPUT_RE` akzeptiert führende Nullen (`"02,50"`). Harmlos, da der
      Cent-Wert korrekt bleibt; nur zur Kenntnis.

## Positives

- **ADR-021-Seam sauber umgesetzt:** `lib/money.ts` rechnet ausschließlich in ganzzahligen
  Cent, keine Float-Arithmetik (`Number(euroPart)*100 + Number(centPart.padEnd(2,"0"))` bleibt
  exakt). Edge-Cases (`,`/`.`, einstellige Nachkommastelle, negativ, leer, Tausendertrenner)
  sind gründlich und mockfrei getestet.
- **Defense-in-Depth-RBAC korrekt:** Seitenschutz (`hasRole` in `page.tsx`, zeigt „Kein Zugriff")
  **und** `requireRole("verwalter")` als erste Zeile jeder mutierenden Action – nicht nur
  UI-seitig. Durch Tests belegt (Abrechner → `ForbiddenError`, keine Persistenz).
- **Seed-Werte stimmen exakt** mit der kanonischen Referenz-Preisliste
  (`README-montagsrunde.md`, Stand 2026-04-28) überein; Multi-Größen-Zeilen korrekt expandiert,
  Kaffee als `category='kaffee'`, `size=''`.
- **Separation of Concerns eingehalten:** Drizzle-Queries nur in `db/catalog.ts`; Actions/UI
  greifen nie direkt auf die Tabelle zu. Zod-Grenze zentral, Preis-Transform über den Money-Seam.
- **Duplikat-Handling robust über SQLSTATE 23505** – funktioniert für beide Treiber
  (node-postgres DEV + Neon-HTTP PRD, `.code` ist auf beiden gesetzt); der Kommentar begründet
  das explizit.
- **Idempotente Seed-Daten-Migration** (`ON CONFLICT (name,size) DO NOTHING`) korrekt **nach**
  der Schema-Migration platziert; `gen_random_uuid()::text` (PG13+ eingebaut) statt der
  App-`$defaultFn` – richtig für reines SQL.
- YAGNI eingehalten: Preis-„Einfrieren" (Snapshot) bewusst F5 überlassen, nicht spekulativ gebaut.

## Empfehlung
APPROVED
</content>
</invoke>
