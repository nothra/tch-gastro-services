# Security Review: Task 49

Geprüft: `git diff main...HEAD` (Branch `feature/49-getraenke-katalog-preise`),
Fokus auf `app/verwaltung/katalog/*`, `db/catalog.ts`, `db/schema.ts`,
`db/migrations/0003_*.sql` + `0004_*.sql`, `lib/money.ts`. Referenz-Muster:
`lib/authz.ts`, `proxy.ts`, `app/login/actions.ts`.

## Kritische Findings (Blocker)
- (keine)

## Wichtige Findings
- (keine)

## Hinweise
- [ ] [Input-Validierung / Robustheit] `EURO_INPUT_RE = /^\d+([.,]\d{1,2})?$/`
  (`lib/money.ts`) begrenzt die Ziffernzahl **nicht**. Ein Verwalter kann einen sehr
  großen Betrag eingeben (z. B. `99999999999`), der `parseEuroToCents` in einen Wert
  > `int4`-Maximum (2 147 483 647) übersetzt. Der `INSERT`/`UPDATE` läuft dann in einen
  Postgres-`numeric value out of range`-Fehler, der **nicht** als Unique-Violation
  erkannt und von `runWithUniqueCheck` re-geworfen wird → generischer 500 statt einer
  fachlichen Ablehnung. Kein Exploit (nur ein authentifizierter Verwalter, kein
  Datenleck – Next.js maskiert Server-Action-Fehler in Produktion), aber unsauberes
  Error-Handling. **Empfehlung:** Obergrenze im Zod-Schema ergänzen, z. B. nach dem
  `.transform(parseEuroToCents)` ein `.refine((c) => c <= 2_147_483_647, "Preis ist zu
  hoch.")` (analog für `sortOrder` ein `.max(...)`). Rein defensiv/UX, kein Blocker.
- [ ] [Error Handling] Nicht-Unique-DB-Fehler werden aus den Actions re-geworfen
  (`actions.ts`, `runWithUniqueCheck`). Das ist korrekt (fail-closed, kein stiller
  Erfolg) und leakt in Produktion keine Stack-Traces/DB-Details an den Client
  (Next.js ersetzt sie durch eine Digest-Referenz). Nur als bewusst-so-Bestätigung
  notiert – keine Änderung nötig.

## Positiv bestätigt (kein Handlungsbedarf)
- **AuthZ fail-closed auf allen mutierenden Actions:** `createCatalogItemAction`,
  `updateCatalogItemAction` und `setCatalogItemActiveAction` rufen jeweils als **erste
  Zeile** `await requireRole("verwalter")` (`lib/authz.ts`, wirft `ForbiddenError` bei
  fehlender Rolle). Die Server-Durchsetzung hängt nicht am UI-Gate in `page.tsx`
  (das ist reiner Anzeige-Komfort / Defense in Depth).
- **Kein IDOR/BOLA:** Der Katalog ist eine globale Stammdaten-Tabelle ohne
  Nutzer-Scoping; jeder Verwalter darf legitim jeden Artikel bearbeiten. Die per
  `formData` übergebene `id` steuert nur, welcher globale Datensatz getroffen wird –
  keine fremde Ressourcengrenze überschreitbar.
- **Route geschützt:** `/verwaltung/katalog` ist **nicht** im Negativ-Lookahead des
  `proxy.ts`-Matchers → unangemeldete Zugriffe werden auf `/login` umgeleitet
  (kein öffentlicher Endpunkt, #63-Regel nicht betroffen).
- **Keine SQL-Injection:** DB-Zugriff ausschließlich über die Drizzle-Data-Layer
  (`db/catalog.ts`) mit parametrisierten Queries; keine rohen SQL-Strings mit
  Nutzerdaten. Die handgeschriebene Seed-Migration `0004` enthält ausschließlich
  **statische Literale** (keine Interpolation von User-Input), `gen_random_uuid()`
  ist Postgres-eingebaut, `ON CONFLICT DO NOTHING` idempotent.
- **Input-Validierung an der Grenze:** Alle Eingaben laufen durch `catalogItemSchema`
  (Zod) inkl. Enum-Whitelist für `category`, Trim/Min für `name`, Regex für den Preis;
  `Object.fromEntries(formData)` unbekannte Felder werden von Zod verworfen.
- **Kein XSS:** React escaped by default; kein `dangerouslySetInnerHTML`/`eval`/
  `new Function` im Feature-Code.
- **Keine Secrets / keine neuen Dependencies:** keine Credentials/Env-Werte im Code,
  `package.json` unverändert. Kein Logging sensibler Daten im Feature-Code.

## Ergebnis
PASSED
