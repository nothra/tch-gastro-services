# Review: Task 353

## Kritische Findings (müssen behoben werden)
_Keine._

## Wichtige Findings (sollten behoben werden)
_Keine – das Wichtig-Finding aus Runde 1 (Catch-Scope in `createCatalogItemAction` zu breit)
ist durch den neuen, eng gefassten Wrapper `runCreateItem` behoben: der `try/catch` umschließt
jetzt ausschließlich den `createItem`-Aufruf, nicht mehr `revalidatePath` (verifiziert:
[app/verwaltung/katalog/actions.ts:82-92](../app/verwaltung/katalog/actions.ts))._

## Nitpicks (optional)
- [ ] [app/verwaltung/katalog/actions.ts:82-92] Der Name `runCreateItem` beschreibt nur die
  Hälfte der Funktion (Aufruf von `createItem`), nicht die eigentliche Besonderheit ggü.
  `runWithUniqueCheck` – die zusätzliche Übersetzung der FK-Violation in `CATALOG_NOT_FOUND`.
  Ein Name wie `createItemOrCatalogNotFound` (analog zum Verhalten, nicht nur zum ersten
  Statement) wäre selbsterklärender an der Aufrufstelle in `createCatalogItemAction`.
- [ ] [app/verwaltung/katalog/actions.ts:82-85] Parameter- und Rückgabetyp von `runCreateItem`
  sind über `Parameters<typeof createItem>[1]` / `Awaited<ReturnType<typeof createItem>>`
  hergeleitet statt die bereits vorhandenen benannten Typen zu importieren (`CatalogItemData`
  aus `@/db/catalog`, `CatalogItem` aus `@/db/schema` – letzterer wird bereits in
  `actions.test.ts` so importiert). Funktional gleichwertig, aber die Typ-Herleitung ist an
  dieser Stelle schwerer zu lesen als ein benannter Import.

## Positives
- Runde-1-Finding (Wichtig) korrekt und minimal behoben: `runCreateItem` kapselt exakt den
  riskanten Aufruf, `revalidatePath`/`return { ok: true }` liegen jetzt außerhalb jedes
  FK-Violation-Catches – kein Risiko mehr, einen unabhängigen Fehler fälschlich als „Katalog
  nicht gefunden" zu melden.
- Runde-1-Nitpick ebenfalls behoben: `hasSqlState(error, code)` als gemeinsame Grundlage für
  `isUniqueViolation`/`isForeignKeyViolation` – keine Duplikation mehr, beide Prädikate bleiben
  an ihren Aufrufstellen sprechend benannt.
- Invariante von `runWithUniqueCheck` weiterhin unverändert und unverletzt; die Komposition
  `runCreateItem` → `runWithUniqueCheck` ist klar geschichtet (erst Unique-Check, dann
  FK-Check), beide mit eigenem, klar abgegrenztem Fehlerbereich.
- Volle Test-Suite (871 Tests), Typecheck, Lint, Format weiterhin grün nach dem Rework.
- Task-Datei dokumentiert den Rework nachvollziehbar unter „Review-Findings" mit Bezug auf
  Runde 1.

## Empfehlung
APPROVED
