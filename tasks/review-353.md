# Review: Task 353

## Kritische Findings (müssen behoben werden)
_Keine._

## Wichtige Findings (sollten behoben werden)
- [ ] [app/verwaltung/katalog/actions.ts:97-108] Der neue `try`-Block um den `createItem`-Aufruf
  in `createCatalogItemAction` umschließt mehr als die eigentlich riskante Operation: er läuft
  bis inklusive `revalidatePath(...)` und dem finalen `return { ok: true }`. Würde
  `revalidatePath` (oder ein künftig dort ergänzter Aufruf) je einen Fehler mit
  `.code === "23503"` werfen, würde `isForeignKeyViolation` das fälschlich als „Katalog nicht
  gefunden" melden – obwohl der Katalog in diesem Fall existiert und der `createItem`-Aufruf
  bereits erfolgreich war. Aktuell praktisch nicht erreichbar (`revalidatePath` wirft keine
  SQLSTATE-Fehler), aber der Scope des `catch` sollte exakt auf die eine riskante Operation
  begrenzt sein – genau das Prinzip, das die Datei bei `runWithUniqueCheck` selbst durchsetzt
  (Kommentar: „jeder andere Fehler wird weitergeworfen, nie hier abgefangen"). Enger fassen,
  z. B.:
  ```ts
  let outcome: Awaited<ReturnType<typeof runWithUniqueCheck<CatalogItem>>>;
  try {
    outcome = await runWithUniqueCheck(() => createItem(catalogId, parsed.data));
  } catch (error) {
    if (isForeignKeyViolation(error)) return { error: CATALOG_NOT_FOUND };
    throw error;
  }
  if (!outcome.ok) return outcome.state;
  revalidatePath(`/verwaltung/katalog/${catalogId}`);
  return { ok: true };
  ```

## Nitpicks (optional)
- [ ] [app/verwaltung/katalog/actions.ts:33-54] `isUniqueViolation` und `isForeignKeyViolation`
  sind bis auf den SQLSTATE-Literal identisch (`typeof error === "object" && error !== null &&
  "code" in error && (error as { code?: string }).code === "..."`). Ein gemeinsamer Helper
  `hasSqlState(error: unknown, code: string): boolean` würde die Duplikation auflösen, ohne die
  beiden benannten Prädikate (die an ihren Aufrufstellen weiterhin sprechend bleiben sollen) zu
  verlieren.

## Positives
- Root Cause präzise isoliert und in der Task-Datei dokumentiert; Fix ist chirurgisch – kein
  Scope Creep, keine Änderung an `runWithUniqueCheck` selbst.
- Die dokumentierte Invariante von `runWithUniqueCheck` („fängt ausschließlich 23505") wird
  bewusst nicht verletzt; stattdessen ein zweiter, eigener Catch – exakt wie im Security-Review
  zu #345 vorgeschlagen ("... in `runWithUniqueCheck` (oder einem zweiten Wrapper) abfangen").
  Der neue Kommentar an `isForeignKeyViolation` begründet zusätzlich nachvollziehbar, warum
  dieser Fehlerpfad nur an dieser einen Aufrufstelle erreichbar ist (durch Grep verifiziert:
  `createItem` hat genau einen Aufrufer).
- Reproduktionstest (`should_returnCatalogNotFoundMessage_when_foreignKeyViolation`) prüft nicht
  nur die Fehlermeldung, sondern auch, dass `revalidatePath` in diesem Fall nicht aufgerufen
  wird – echte Verhaltensabdeckung statt reinem Rückgabewert-Check.
- Bestehender Test `should_rethrow_when_unexpectedDbError` (generischer Fehler ohne `code`)
  bleibt unverändert grün – belegt, dass das Rethrow-Verhalten für unbekannte Fehler nicht
  aufgeweicht wurde.
- `CATALOG_NOT_FOUND` sinnvoll wiederverwendet statt einer zweiten, textgleichen Konstante mit
  eigenem Namen (analog zur bereits dokumentierten `ITEM_CATALOG_REFERENCE_MISSING_MESSAGE` vs.
  `CATALOG_ID_MISSING_MESSAGE`-Unterscheidung, hier aber korrekterweise dieselbe Semantik).
- Task-Datei vollständig gepflegt: Root Cause, Fix-Beschreibung und Codify-Hinweis (Verweis auf
  bereits existierende Lesson in `db-drizzle.md`) sind vorhanden.

## Empfehlung
NEEDS_REWORK
