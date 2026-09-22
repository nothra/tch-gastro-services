# Security Review: Task 345

Geprüft: `db/catalog.ts`, `db/atomic.ts`, `app/verwaltung/katalog/actions.ts`,
`app/verwaltung/katalog/schema.ts`, `app/verwaltung/katalog/page.tsx`,
`app/verwaltung/katalog/[id]/page.tsx`, `app/verwaltung/katalog/[id]/CatalogControls.tsx`,
`app/verwaltung/katalog/[id]/CatalogSwitcher.tsx`, `app/verwaltung/katalog/CatalogItemForm.tsx`,
`app/verwaltung/katalog/CatalogRow.tsx`, `lib/authz.ts`, `db/schema.ts` (Katalog-Tabellen), sowie
die zugehörigen Tests. Diff-Basis: `git diff origin/main...HEAD` (24 Dateien, +2936/-189).
Jede Behauptung unten wurde am tatsächlichen Code verifiziert, nicht aus der Review-Historie
übernommen.

## Kritische Findings (Blocker)

_Keine._

## Wichtige Findings

_Keine._

## Hinweise

- [ ] **[Fehlerbehandlung] `createCatalogItemAction` kann bei ungültiger `catalogId` einen
      unbehandelten FK-Violation-Fehler (23503) werfen statt einer Nutzermeldung.** Mit #345 wird
      `catalogId` erstmals aus einem **clientseitigen** Hidden-Field gelesen (`CatalogItemForm.tsx`,
      `CatalogRow.tsx`) statt serverseitig fix auf `STANDARD_CATALOG_ID` gesetzt zu werden (vorher:
      `createItem(STANDARD_CATALOG_ID, ...)`, jetzt: `createItem(catalogId, ...)` mit `catalogId`
      aus `FormData`). `runWithUniqueCheck`/`isUniqueViolation` fängt nur SQLSTATE `23505`
      (Unique-Violation) ab; ein nicht existierender `catalogId`-Wert löst beim `INSERT` eine
      Fremdschlüssel-Verletzung (`23503`) aus, die ungefangen durchgereicht wird → unbehandelter
      Serverfehler statt einer Meldung wie „Katalog nicht gefunden.". `updateCatalogItemAction`/
      `setCatalogItemActiveAction` sind **nicht** betroffen, da deren `WHERE`-Klausel `catalogId`
      bereits mitführt (Parent-Key-Bindung, Kern-Kurzregel 2) und ein falscher/fremder Wert dort
      korrekt zu `undefined`/„nicht gefunden" statt einer Exception führt.
      **Einordnung:** keine Autorisierungslücke – da laut Fachdomäne jeder `verwalter` jeden
      Katalog verwalten darf (kein Besitzer-Konzept, spec-345), verschafft ein manipulierter
      `catalogId`-Wert keinen zusätzlichen Zugriff; im schlimmsten Fall entsteht ein 500 statt
      einer sauberen Fehlermeldung. Praktisch nur über eine manuell verfälschte Anfrage oder eine
      Navigation zu einer nicht-existenten `[id]`-Route erreichbar (Kataloge werden nie hart
      gelöscht, spec-345 „Nicht inbegriffen" – ein `page.tsx`-Aufruf mit unbekannter ID liefert
      bewusst kein 404, siehe `/test`-Notizen in der Task-Datei, dort ebenfalls als akzeptierte
      Lücke dokumentiert). Kein Merge-Blocker; empfohlene Lösung, falls aufgegriffen: `23503`
      analog zu `23505` in `runWithUniqueCheck` (oder einem zweiten Wrapper) abfangen und in
      `CATALOG_NOT_FOUND` übersetzen. Über den zentralen Anlage-Weg (ADR-018) als Issue
      [#353](https://github.com/nothra/tch-gastro-services/issues/353) angelegt (Label `bug`) –
      funktionaler Defekt mit reproduzierbarem Auslöser, daher Issue statt `kleinfunde.md`
      (Schwelle ADR-043).

- [ ] **[Doku/Kommentar-Drift] Kommentar in `db/catalog.ts` (Zeile 64–66) beschreibt ein durch
      #345 geändertes Verhalten nicht mehr korrekt.** Der Kommentar über `CatalogItemData` sagt:
      „er wird serverseitig gesetzt und nie aus `FormData` geparst … ein Client kann keinen
      fremden Katalog als Schreibziel angeben." Das war vor #345 wörtlich wahr (`STANDARD_CATALOG_ID`
      fix verdrahtet); seit #345 wird `catalogId` in den Actions **aus** `FormData` gelesen
      (`app/verwaltung/katalog/actions.ts:66`, `:94`, `:122`) und lediglich server-seitig als
      Parent-Key ins `WHERE`/`INSERT` gebunden – der zweite Halbsatz („kann keinen fremden Katalog
      als Schreibziel angeben") ist im engen Wortsinn nicht mehr zutreffend (siehe Hinweis oben:
      ein Client *kann* eine fremde/beliebige `catalogId` angeben, sie wird nur konsistent
      gebunden/geprüft statt blind vertraut). Kein Sicherheitsrisiko für sich, aber ein
      Tatsachenbehauptungs-Kommentar, der nach dieser Task nicht mehr stimmt (Lesson
      `code-style.md`: „„X erzwingt Y" ist eine überprüfbare Tatsachenbehauptung"). Empfehlung:
      Kommentar in einer Folge-Task präzisieren (z. B. „wird serverseitig als Parent-Key
      gebunden/geprüft, nicht blind übernommen" statt „kann keinen fremden Katalog angeben").
      Unter der Schwelle (reine Doku-Drift, 1-2 Zeilen Fix) – als Eintrag in
      [`kleinfunde.md`](../../docs/factory/kleinfunde.md) festgehalten statt Issue.

- [ ] **[Autorisierungsmodell, informativ]** `listCatalogs()`/`getCatalogById()` und alle neuen
      Actions kennen kein Besitzer-Konzept auf Katalogebene – jeder `verwalter` sieht und verwaltet
      jeden Katalog. Das ist laut `PROJECT-CONTEXT.md`/spec-345 fachlich korrekt gewollt (eine
      Rolle, kein Multi-Tenant-Modell), daher **kein** IDOR: die alleinige Rollenprüfung
      (`requireRole("verwalter")`) ist hier ausreichend, eine zusätzliche Objekt-Ebene wäre
      Over-Engineering. Nur zur Doku aufgeführt, damit dieser Punkt nicht in einer künftigen
      Runde erneut aufgerollt werden muss.

## Detailergebnisse je Prüfpunkt

- **AK7 (Rollen-Gate):** `grep -n "requireRole"` bestätigt: `createCatalogItemAction`,
  `updateCatalogItemAction`, `setCatalogItemActiveAction`, `createCatalogAction`,
  `renameCatalogAction`, `setCatalogActiveAction`, `duplicateCatalogAction` rufen
  `await requireRole("verwalter")` jeweils als **erste** Anweisung nach der Signatur auf, vor
  jedem Parsing/DB-Zugriff. `lib/authz.ts` ist fail-closed (`requireAnyRole` wirft
  `ForbiddenError`, wenn keine Session oder keine passende Rolle vorhanden ist). Für die vier
  neuen Katalog-Actions existieren zusätzlich echte Verhaltenstests
  (`catalog-management-actions.test.ts`), die `expect(<dbFn>Mock).not.toHaveBeenCalled()` neben
  dem `ForbiddenError`-Throw prüfen – kein reiner Wiring-Grep.
- **AK5 (Duplizier-Quelle fail-closed):** `duplicateCatalogAction` lädt den Quell-Katalog über
  `getCatalogById(sourceId)` und lehnt explizit `!source` (nicht gefunden) und `!source.active`
  (inaktiv) **außerhalb** von `runWithUniqueCheck` ab, bevor `duplicateCatalog()` aufgerufen wird
  – ein direkter Server-Action-Aufruf mit beliebiger/inaktiver `sourceId` kann keinen inaktiven
  Katalog duplizieren. Die UI blendet den Button zusätzlich nur bei `currentCatalog.active` ein
  (Defense in Depth, kein alleiniger Schutz).
- **AK6 (Parent-Key-Bindung):** `updateItem`/`setItemActive` (`db/catalog.ts`) führen `catalogId`
  im `WHERE` mit (nicht nur die Primärschlüssel-`id`) – ein Treffer erfordert Übereinstimmung
  beider. `createItem` bindet `catalogId` beim `INSERT`. Der Wert kommt seit #345 aus einem
  Hidden-Field, das der Katalog-Kontext der `[id]`-Seite setzt – siehe Hinweis oben zur einzigen
  daraus resultierenden Lücke (unbehandelte FK-Violation bei nicht existentem Wert, kein
  Autorisierungsproblem).
- **IDOR-Lessons (db-drizzle.md) gegengeprüft:** Parent-Key im WHERE ✓ (siehe oben), Soft-Delete-
  `active`-Prüfung nach Laden by ID – für Katalog-Items unverändert aus #59/#51 vorhanden, für
  den neuen `catalog`-Datensatz selbst nicht zutreffend (Katalog-Aktionen prüfen fachlich bewusst
  nur `active` bei der Duplizier-Quelle, nicht als generelles Schreibverbot – FS2/AK4 verlangen
  ausdrücklich, dass ein deaktivierter Katalog weiter editierbar bleibt). Zod-Obergrenzen ✓
  (`catalogNameSchema.name.max(100)`).
- **Input-Validierung/Injection:** Kein `sql\`…\``, kein `db.execute`, keine rohen Strings in den
  #345-Dateien (`grep` negativ) – ausschließlich Drizzle-Query-Builder. `catalogNameSchema` hat
  `.trim()` + `.min(1)` (lehnt Leer-/Nur-Leerzeichen-Namen ab, FS4) + `.max(100)` (Obergrenze
  vorhanden).
- **Fehlerbehandlung/Datenlecks:** `isUniqueViolation`/`runWithUniqueCheck` übersetzen ausschließlich
  `23505` in eine Nutzermeldung; alle anderen Fehler werden weitergeworfen (Next.js Server-Action-
  Fehlerbehandlung redigiert die Nachricht clientseitig in Production, siehe Hinweis oben zur
  einen konkret erreichbaren Fehlerklasse). Kein Logging sensibler Daten in den #345-Dateien;
  `authz.ts`s `console.warn` (vorbestehend, unverändert) loggt nur Rollen, keine PII.
- **Dependencies:** `git diff origin/main...HEAD -- package.json pnpm-lock.yaml` ist leer – keine
  neuen/geänderten Dependencies durch #345.
- **Prompt-Injection-relevantes Muster:** Katalognamen sind reine App-Datenbank-Werte
  (Preisliste), werden nirgends in eine von einem Agenten/System später als Anweisung
  interpretierte Repo-Datei geschrieben – nicht relevant für diese Task.

## Ergebnis
PASSED
