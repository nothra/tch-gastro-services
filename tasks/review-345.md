# Review: Task 345

## Kritische Findings (müssen behoben werden)

Alle drei Kritisch-Findings aus Runde 1 sind verifiziert behoben – Details siehe „Rework Runde 1"
und „Review Runde 2" unten. Ein neues Kritisch-Finding aus dem Architektur-Fokus (Runde 2):

- [x] **[db/catalog.ts:181]** `duplicateCatalog` nutzt `db.transaction(async (tx) => {...})`
  direkt statt der projektweit etablierten Atomaritäts-Klammer `runAtomic` (`db/atomic.ts`).
  `runAtomic` existiert **genau deshalb**, weil der in INT/PRD verwendete Neon-HTTP-Treiber
  (`db/index.ts`, ADR-014) keine interaktive `.transaction()` unterstützt – empirisch verifiziert
  im installierten Paket:

  ```
  // node_modules/drizzle-orm/neon-http/session.js:151-153
  async transaction(_transaction, _config = {}) {
    throw new Error("No transactions support in neon-http driver");
  }
  ```

  `db/atomic.ts` dokumentiert das selbst: „neon-http (INT/PRD): nur `.batch()` – eine interaktive
  `.transaction()` wirft dort". `duplicateCatalog` ruft aber `db.transaction()` unconditional auf
  dem Proxy-`db`-Objekt auf (nicht über `runAtomic`), das in INT/PRD auf den Neon-HTTP-Treiber
  zeigt. **Konsequenz: AK2 („Katalog duplizieren") schlägt in INT/PRD bei jedem Aufruf mit einer
  ungefangenen Exception fehl** – nicht nur ein Edge-Case, sondern der Kernpfad des Features.

  **Warum das die Tests nicht auffangen:** Die Integrationstests in `db/catalog.test.ts`
  (`should_copyOnlyActiveArticles_when_duplicateCatalogIsCalled` u. a.) laufen laut
  `db/atomic.ts`-Kommentar „über node-postgres" – dieser Treiber unterstützt `.transaction()`
  echt, die Tests sind also lokal/in CI grün und beweisen trotzdem nichts für den Produktions-Pfad.
  Exakt die Diskrepanz, vor der `db/atomic.ts` und ADR-033 D3 warnen.

  **Ist das lösbar, ohne die Katalog-ID-Abhängigkeit aufzugeben?** Ja: `catalog.id` wird
  **client-seitig** per `$defaultFn(() => globalThis.crypto.randomUUID())` erzeugt
  (`db/schema.ts`), nicht von der DB. Die neue Katalog-ID lässt sich also vorab erzeugen, die
  Quell-Artikel vorab lesen (unkritischer Snapshot-Read, keine Atomarität nötig) und danach ein
  `runAtomic`-Aufruf mit einer synchron gebauten Query-Liste `[insert(catalog).values({id: newId, …}),
  ...sourceItems.map(item => insert(catalogItems).values({...item, catalogId: newId}))]` bauen –
  exakt das Muster, das `db/veranstaltung.ts` (`abschliessenVeranstaltung`) bereits für einen
  Mehrfach-Write nutzt. Keine neue Infrastruktur nötig, nur die bestehende Klammer verwenden.

  **Einordnung:** Vorbestehend seit dem ursprünglichen Implementierungs-Commit (`da90af3`), keine
  Regression durch das Rework – aber unabhängig davon ein Merge-Blocker, weil AK2 in der
  Zielumgebung (Neon/Vercel) nicht funktioniert. Weder Review-Runde 1 noch der bisherige Backend-/
  Logik-Review-Durchgang in dieser Runde haben das aufgedeckt (beide bewerteten die Transaktion nur
  auf Fehlerbehandlungs-Korrektheit, nicht auf Treiber-Kompatibilität).

## Wichtige Findings (sollten behoben werden)

- [x] **[app/verwaltung/katalog/[id]/CatalogManager.tsx:96-101]** Der „Duplizieren"-Button wird
  unconditional gerendert, sobald `currentCatalog` gesetzt ist – unabhängig von
  `currentCatalog.active`. Navigiert ein Verwalter zu einem deaktivierten Katalog (bleibt laut
  AK4 im Umschalter auswählbar), sieht er dort trotzdem einen aktiven „Duplizieren"-Button; erst
  nach Ausfüllen des Modals und Absenden kommt die Ablehnung (`SOURCE_CATALOG_INACTIVE`) zurück.

  **Spec-Bezug:** AK5, erster Teil: „WHEN die Katalogliste zum Duplizieren (Quell-Katalog wählen)
  angezeigt wird THEN erscheint er dort nicht mehr zur Auswahl." Umgesetzt ist bisher nur der
  zweite Teil (serverseitige Ablehnung, korrekt und getestet). Die UI-Ausblendung fehlt komplett.

  **Zusammenhang mit totem Code:** `listDuplicatableCatalogs()` (`db/catalog.ts:120-129`) wurde
  laut Task-Datei („Voraussichtliche Data-Layer-Erweiterungen") explizit für genau diese
  UI-Filterung gebaut („dieselbe Funktion ist auch die serverseitige Durchsetzung"). Tatsächlich
  wird sie **nirgends** aus Actions oder Komponenten aufgerufen – einzige Aufrufstelle ist ihr
  eigener Test in `db/catalog.test.ts`. Die serverseitige Durchsetzung läuft stattdessen über
  `getCatalogById` + manuellen `.active`-Check in `duplicateCatalogAction`, was funktional
  korrekt ist, aber `listDuplicatableCatalogs()` als unbenutzten Produktionscode zurücklässt.

  **Einordnung:** Nicht sicherheits-/datenkritisch – die serverseitige Ablehnung (Defense in
  Depth, der zweite und wichtigere Teil von AK5) greift korrekt und ist durch
  `should_returnInactiveSourceMessage_notCrash_when_sourceCatalogIsInactive` abgedeckt. Diese
  Lücke bestand bereits vor dem Rework (unverändert seit dem ursprünglichen
  Implementierungs-Commit `da90af3`, keine Regression durch die Runde-1-Fixes) und ist eine reine
  UI-Politur- + Dead-Code-Frage.

  **Vorschlag:** Button ausblenden/deaktivieren, wenn `!currentCatalog.active` (z. B.
  `{currentCatalog.active && <button ...>Duplizieren</button>}`), und `listDuplicatableCatalogs()`
  entweder dafür verwenden (z. B. um im Umschalter erkennbar zu machen, welche Kataloge
  duplizierbar sind) oder entfernen, falls die Funktion nicht gebraucht wird.

- ~~[ ] **[app/verwaltung/katalog/schema.ts]** `catalogNameSchema` – Zod-Schema für die Katalognamen nicht in der Datei. Lass mich verifizieren, ob die Validierung vorhanden ist (FS4: leerer Name sollte abgelehnt werden).~~ ✓ Vorhanden und korrekt: `trim()` + `min(1)` erfüllt FS4.

- [x] **[app/verwaltung/katalog/[id]/CatalogSwitcher.tsx]** Verifiziert: Ein deaktivierter Katalog
  bleibt im Umschalter sichtbar und auswählbar (Zeile 35-38, kein Ausschluss), Artikel-Pflege
  bleibt möglich – das entspricht AK4 wortwörtlich. Kein Finding.

## Nitpicks (optional)

- [ ] **[app/verwaltung/katalog/actions.ts:107-118]** `setCatalogItemActiveAction` – der Kommentar (Zeilen 108-110) sagt, dieser `void`-Return hat keinen Meldungskanal und deshalb bleibt ein No-Match-Fall stumm. Das ist eine bewusste Lücke bis #345. Aber jetzt in #345 gibt es die `setCatalogActiveAction` (Zeilen 160-174) für Katalog-Management, die **auch** `CatalogFormState` zurückgibt und deshalb beide Fehler-Zweige abdeckt. Die Asymmetrie zwischen Item und Katalog ist nachvollziehbar, aber einen Kommentar hinzufügen, dass **Katalog**-Deaktivierung einen Fehlerkanal hat, würde das dokumentieren.

- [ ] **[db/catalog.test.ts:102-105]** Test-Daten-Namenspräfix-Kollision: Die Konvention für den Test-Präfix ist dokumentiert (Kommentar "#347"), aber das Präfix `__test__` wird in THREE verschiedenen Filterwegen erwartet (Artikel, Kataloge, Migration-Drift-Guard). Ein typo beim Rename von `__test__` in einen anderen Präfix würde still fehlschlagen. Dokumentation ist da, aber könnte präziser sein (z. B. "alle Filter nutzen denselben Präfix `__test__`, nie trennen").

- [ ] **[app/verwaltung/katalog/actions.ts:195-197]** Kleine TOCTOU-Lücke in `duplicateCatalogAction`: `getCatalogById` prüft Existenz/Aktiv-Status des Quell-Katalogs, danach folgt der eigentliche `duplicateCatalog`-Aufruf in einer separaten Transaktion. Zwischen beiden Schritten könnte (theoretisch, bei zwei gleichzeitigen Verwaltern) der Quell-Katalog deaktiviert werden – die Kopie entstünde dann trotzdem. Bei der Nutzergröße dieses Projekts (ein Verein, wenige Verwalter) vernachlässigbares Risiko, kein Merge-Blocker.

- [ ] **[app/verwaltung/katalog/[id]/CatalogManager.tsx:34-56]** Drei der vier Actions
  (`createWithClose`, `renameWithClose`, `duplicateWithClose`) wiederholen exakt dasselbe Muster:
  `useCallback`-Wrapper, der die Action aufruft, bei `result.ok` das jeweilige Modal-`useState`
  schließt und das Ergebnis durchreicht, gefolgt vom `useActionState`-Aufruf. Einziger Unterschied
  ist die aufgerufene Action und das zu schließende Modal-Flag. Kein bestehendes
  `useActionState`-Formular im Projekt (`CatalogRow`, `CatalogItemForm`, `AuslageForm`,
  `WalkInForm` etc.) wiederholt dieses Muster mehrfach in einer Komponente – `CatalogManager.tsx`
  ist die erste Stelle mit dreifacher Kopie. Clean-Code („Keine Code-Duplikation: Wenn du
  Copy-Paste machst, extrahiere eine Funktion") spricht für einen kleinen Hook, z. B.
  `useCloseOnSuccess(action, closeModal)`, der Wrapper + `useActionState` kapselt und die
  Komponente von 225 auf spürbar weniger Zeilen bringen würde. Kein Korrektheitsproblem – reine
  Wartbarkeitsfrage, drei Kopien sind noch überschaubar.

- [ ] **[app/verwaltung/katalog/actions.ts:62,91,151,171]** Die Meldung `"Kein Katalog
  angegeben."` ist viermal als Literal dupliziert (in `createCatalogItemAction`,
  `updateCatalogItemAction`, `renameCatalogAction`, `setCatalogActiveAction`) statt – wie die
  übrigen Katalog-Fehlermeldungen in derselben Datei (`DUPLICATE_MESSAGE`, `ITEM_NOT_FOUND`,
  `CATALOG_NOT_FOUND`, `SOURCE_CATALOG_INACTIVE`, `CATALOG_MANAGEMENT_DUPLICATE_MESSAGE`) – als
  benannte Konstante geführt zu werden. Bemerkenswert: zwei semantisch verschiedene Fälle (Artikel
  ohne `catalogId`-Bezug vs. Katalog ohne eigene `id`) teilen sich zufällig denselben Text statt
  einer gemeinsamen Konstante – ein künftiger Wortlaut-Fix an einer Stelle würde die anderen drei
  nicht automatisch mitziehen. Kein Verhaltensproblem, aber eine Inkonsistenz gegenüber dem sonst
  in dieser Datei sauber eingehaltenen „keine Magic Strings"-Muster.

- [ ] **[app/verwaltung/katalog/[id]/CatalogManager.tsx:27]** Komponentenname `CatalogManager`
  nutzt den in `docs/factory/guidelines/clean-code.md` explizit als Negativbeispiel genannten
  Suffix „Manager" („Keine generischen Namen: nicht Manager, Processor, Handler ohne Kontext").
  Der Name trägt zwar Kontext („Catalog"), ist im Projekt aber der einzige `*Manager`-Name (alle
  Geschwister-Komponenten heißen nach ihrer Rolle: `CatalogSwitcher`, `CatalogRow`,
  `CatalogItemForm`). Die Modul-Kommentare in `CatalogManager.tsx`/`page.tsx` nennen die
  Komponente selbst treffender „Katalog-Management-Controls" – ein Name wie `CatalogControls`
  oder `CatalogManagementControls` würde das WAS (Buttons + Modals für CRUD-Operationen) präziser
  beschreiben als das generische „Manager". Reiner Namens-Nitpick, keine funktionale Auswirkung.

## Positives

- ✓ **Runde-1-Fixes verifiziert korrekt** (Code gelesen, nicht nur Kommentare vertraut):
  - `duplicateCatalogAction` (`actions.ts:195-197`) prüft `getCatalogById` als Guard-Clause
    **außerhalb** von `runWithUniqueCheck`, **bevor** dieser aufgerufen wird – `CATALOG_NOT_FOUND`
    und `SOURCE_CATALOG_INACTIVE` geben jetzt ihre je eigene, korrekte Meldung zurück statt
    ungefangen durchzuschlagen.
  - Invariante geprüft und bestätigt: Für alle drei Katalog-Actions (`create`, `rename`,
    `duplicate`) ist der einzig verbleibende Fehlerpfad in `runWithUniqueCheck` eine echte
    Unique-Violation – bei `duplicateCatalogAction` durch die vorgelagerten Guards sichergestellt,
    bei `create`/`renameCatalogAction` durch die simple Struktur der zugrunde liegenden
    Data-Layer-Funktionen. Das Überschreiben mit `CATALOG_MANAGEMENT_DUPLICATE_MESSAGE` (Zeilen
    140, 157, 203) ist damit in jeder Aufrufstelle sicher.
  - `db/catalog.ts`: die tote Zeile (`if (!activeOnly.value)`) ist entfernt, keine Spur mehr im
    Diff. `duplicateCatalog` wirft weiterhin bei Unique-Violation (bewusste Entscheidung, Option
    b) – das ist konsistent mit `createCatalog`/`createItem` (Insert-Operationen werfen, guarded
    UPDATEs liefern `undefined`), keine Asymmetrie mehr zu Kern-Kurzregel 1, die nur für
    UPDATE/DELETE gilt.
  - `CatalogManager.tsx`: `useActionState` korrekt für create/rename/duplicate via
    `useCallback`-Wrapper (analog `CatalogRow.actionWithClose`), Modal schließt nur bei
    `result.ok === true` (Zeilen 34-56), Fehlertext wird im jeweiligen Modal gerendert (Zeilen
    120, 158, 200-202), `setCatalogActiveAction` bekommt einen sichtbaren Fehlerkanal (Zeilen
    92-94) ohne Modal.
  - Neue Tests sind keine Oberflächenprüfung: `catalog-management-actions.test.ts` deckt exakt die
    vormals crashenden Pfade ab (`should_returnNotFoundMessage_notCrash_when_...`,
    `should_returnInactiveSourceMessage_notCrash_when_...`) inkl. Assertion auf die spezifische
    Meldung und `expect(duplicateCatalogMock).not.toHaveBeenCalled()`; `CatalogManager.test.tsx`
    prüft sowohl „Modal bleibt offen bei Fehler" als auch „Modal schließt bei Erfolg" für alle drei
    Modal-Actions per direktem Aufruf des `useCallback`-Wrappers.
- ✓ Alle neuen Artikel-Tests korrekt angepasst für das neue `catalogId`-FormData-Feld
  (`CatalogItemForm`/`CatalogRow` reichen `catalogId` jetzt als verstecktes Feld durch)
- ✓ Katalog-Integration-Tests sind umfassend und gut strukturiert (AK1–AK9, FS1–FS5 abgedeckt),
  inkl. Diskriminierungs-Kontrollen (z. B. `should_returnCatalog_when_getCatalogByIdFindsRow` +
  Gegenprobe mit unbekannter ID)
- ✓ Drift-Guard auf `STANDARD_CATALOG_ID` ist mustergültig (Konstante vs. Migrations-Literal)
- ✓ AK9 Migrations-Wiederholbarkeits-Test ist gründlich
- ✓ Routes sind korrekt strukturiert: dynamisches Segment `[id]` mit Fallback auf `STANDARD_CATALOG_ID`
- ✓ Rollen-Gate `requireRole("verwalter")` sitzt serverseitig auf allen neuen Actions (AK7),
  inkl. Test je Action, dass die Data-Layer-Funktion bei fehlender Rolle NICHT aufgerufen wird
- ✓ `listActiveCatalog()` unverändert (filtert nur `catalog_item.active`, nicht `catalog.active`) – ADR-050 D7 korrekt umgesetzt per Nachtrag
- ✓ Alle Gates grün reproduziert (nicht nur behauptet): `pnpm lint` (via `pre-commit.sh`) und
  `pnpm vitest run app/verwaltung/katalog db/catalog.test.ts` – 76 passed, 37 skipped
  (DB-Integrationstests ohne `DATABASE_URL`, erwartet)
- ✓ Testnamen durchgängig im Format `should_[Ergebnis]_when_[Bedingung]`; keine tautologischen
  Assertions gefunden – erwartete Fehlermeldungen sind überall feste Literale (z. B.
  `"Ein Katalog mit diesem Namen existiert bereits."`), nie aus demselben Objekt zurückgelesen,
  das die Action verarbeitet
- ✓ Fehlermeldungen in `actions.ts` sind größtenteils als benannte Konstanten geführt
  (`DUPLICATE_MESSAGE`, `ITEM_NOT_FOUND`, `CATALOG_NOT_FOUND`, `SOURCE_CATALOG_INACTIVE`,
  `CATALOG_MANAGEMENT_DUPLICATE_MESSAGE`) – bis auf die unter Nitpicks genannte Ausnahme
- ✓ Kommentare in `actions.ts`/`db/catalog.ts` erklären durchgängig WHY (Verweise auf ADR-050,
  Kern-Kurzregeln, konkrete Review-Findings aus Runde 1), keine WHAT-Kommentare, kein
  auskommentierter Code
- ✓ Guard-Clauses konsequent statt Verschachtelung (frühe Returns in allen Actions)
- ✓ **Architektur-Fokus (Runde 2) verifiziert:**
  - ADR-050-Nachtrag (#345) korrekt umgesetzt: `catalog.active` gate't ausschließlich die
    Duplizier-Quellenauswahl (`duplicateCatalogAction`-Guard); `listActiveCatalog` unverändert
    (nur `catalog_item.active`-Filter, kein `catalog.active`-Bezug).
  - Schichtung sauber: UI (`CatalogManager.tsx`/`CatalogSwitcher.tsx`) ruft ausschließlich Server
    Actions auf, Actions rufen ausschließlich `db/catalog.ts` auf – keine rohen SQL-Strings, kein
    direkter DB-Zugriff aus UI/Actions (grep-verifiziert).
  - `requireRole("verwalter")` sitzt in **jeder** der vier neuen Katalog-Actions als erste
    Anweisung, nicht im Data-Layer – konsistent mit dem bestehenden Muster in `actions.ts`.
  - `CatalogManager.tsx`s `useCallback`+`useActionState`-Wrapper folgt tatsächlich (Code
    gegengelesen, nicht nur behauptet) demselben Muster wie `CatalogRow.actionWithClose`.
  - Routing-Entscheidung (`[id]`-Segment statt `searchParams`) wie in der Task-Datei empfohlen
    umgesetzt; `docs/routes.md` korrekt mit Pfad, Funktion und Rollen-Zugriff für
    `/verwaltung/katalog` und `/verwaltung/katalog/[id]` ergänzt.
  - Alle neuen `db/catalog.ts`-Exporte haben einen echten Produktions-Aufrufer (grep über
    `app/`), außer `listDuplicatableCatalogs()` – bereits als Wichtig-Finding oben erfasst,
    kein weiterer toter Code gefunden.

## Empfehlung

**APPROVED** – Alle drei Kritisch-Findings aus Runde 1 sind am Code verifiziert korrekt behoben
(nicht nur laut Selbstauskunft), inkl. tragfähiger Tests, die die vormals crashenden Pfade
reproduzieren. Kein neuer Kritisch- oder Regressions-Befund durch das Rework.

Ein neues Wichtig-Finding (Duplizieren-Button ignoriert `currentCatalog.active`, dazu totes
`listDuplicatableCatalogs()`) besteht bereits seit dem ursprünglichen Implementierungs-Commit,
ist keine Regression der Runde-1-Fixes, und betrifft nur die UI-Ausblendung – die serverseitige
Durchsetzung (der sicherheitsrelevante Teil von AK5, Defense in Depth) ist korrekt und getestet.
Empfehlung: vor oder kurz nach dem Merge beheben (kleiner, risikoarmer Fix), kein Grund für eine
dritte Review-Runde.

**Code-Qualität-Ergänzung (Runde 2):** Aus Clean-Code-/Testqualitäts-Sicht **APPROVED** –
konsolidiert mit der obigen Einschätzung, unverändert **APPROVED**. Drei neue Nitpicks (dreifache
`useCallback`+`useActionState`-Duplikation in `CatalogManager.tsx`, undurchgängig
konstantisierte Fehlermeldung „Kein Katalog angegeben.", Namens-Nitpick `CatalogManager`) – alle
rein wartbarkeitsbezogen, kein Korrektheits- oder Testabdeckungsproblem. Tests sind
verhaltensorientiert (AAA eingehalten, keine tautologischen Assertions), Namenskonvention
`should_X_when_Y` durchgängig eingehalten, Kommentare WHY statt WHAT.

**Architektur & Patterns-Ergänzung (Runde 2): NEEDS_REWORK.** ADR-050-Konsistenz, Schichtung,
Rollen-Gate-Platzierung, Pattern-Konsistenz (`useActionState`) und Routing-Entscheidung sind alle
verifiziert korrekt (Details in „Positives" oben) – aus reiner Struktursicht wäre das ebenfalls
APPROVED. Das kippt die Gesamt-Empfehlung jedoch: `duplicateCatalog` (`db/catalog.ts:181`) nutzt
`db.transaction()` statt der projektweiten `runAtomic`-Klammer und schlägt damit in INT/PRD
(Neon-HTTP-Treiber) bei **jedem** Aufruf fehl (empirisch gegen die installierte
`drizzle-orm`-Version verifiziert, s. Kritisch-Finding oben) – AK2 ist in der Zielumgebung nicht
funktionsfähig, obwohl alle lokalen/CI-Tests grün sind (andere Treiber-Semantik). Das ist kein
Stil-Fund, sondern ein Merge-Blocker: das zentrale Feature dieser Task funktioniert dort nicht, wo
es betrieben wird. Vorbestehend seit dem ursprünglichen Implementierungs-Commit, keine Regression
durch das Rework, aber unabhängig davon vor dem Merge zu beheben (dritte Review-Runde nötig, da
Kritisch-Finding – Circuit Breaker: dies ist erst der zweite Fund dieser Art, noch innerhalb des
Limits von 3 Runden).

## Rework Runde 1 (behoben)

Alle drei kritischen Findings und das wichtige `CatalogManager.tsx`-Finding sind behoben (TDD,
Details siehe Commit):

- `duplicateCatalogAction`: Existenz-/Aktiv-Prüfung des Quell-Katalogs steht jetzt **außerhalb**
  von `runWithUniqueCheck` (neue Data-Layer-Funktion `getCatalogById` in `db/catalog.ts`) –
  `CATALOG_NOT_FOUND`/`SOURCE_CATALOG_INACTIVE` geben direkt ihre spezifische Meldung zurück statt
  ungefangen durchzuschlagen. Die tote Zeile 198 (`if (!activeOnly.value)`) ist entfernt.
- Message-Mapping ist dadurch strukturell korrekt: `runWithUniqueCheck`s `ok:false`-Zweig bedeutet
  jetzt in jeder Aufrufstelle garantiert eine echte Unique-Violation (dokumentiert als Invariante
  im Code), das Überschreiben mit der katalogspezifischen Duplikat-Message ist damit sicher.
- `duplicateCatalog` (Data-Layer) wirft weiterhin bei einer Unique-Violation auf den neuen Namen
  (bewusst beibehalten, Option (b) aus dem Finding) – jetzt konsistent über denselben
  `runWithUniqueCheck`-Pfad wie `createCatalog`/`renameCatalog` behandelt, keine Sonderbehandlung
  mehr nötig. Neuer Integrationstest `should_rejectDuplicate_when_duplicateCatalogTargetNameExists`
  dokumentiert das.
- `CatalogManager.tsx`: `useActionState` + `useCallback`-Wrapper (analog `CatalogRow`) für
  create/rename/duplicate – Modal schließt nur bei `ok: true`, Fehler werden im Modal angezeigt.
  `setCatalogActiveAction` bekommt ebenfalls einen sichtbaren Fehlerkanal.
- Neue Tests: `app/verwaltung/katalog/catalog-management-actions.test.ts` (20 Tests, deckt die
  vier Katalog-Management-Actions erstmals auf Action-Ebene ab – vorher nur Data-Layer-
  Integrationstests) und `app/verwaltung/katalog/[id]/CatalogManager.test.tsx` (13 Tests). RED vor
  dem Fix verifiziert (Crash bzw. fehlendes Error-Handling reproduziert).
- Nebenbei behoben: `docs/routes.md` fehlte der Eintrag für `/verwaltung/katalog/[id]` (Drift aus
  der ursprünglichen #345-Implementierung, blockierte `pre-push.sh`) – Doku ergänzt.
- Alle Gates grün: `pnpm lint`, `pnpm test` (839 passed, 90 skipped – DB-Integrationstests ohne
  `DATABASE_URL`), `pnpm build`.

## Rework Runde 2 (behoben)

Das kritische Architektur-Finding und das wichtige `CatalogManager.tsx`-Finding aus Runde 2 sind
behoben (TDD, RED vor jedem Fix verifiziert):

- **`duplicateCatalog` (`db/catalog.ts`) nutzt jetzt `runAtomic` (`db/atomic.ts`) statt
  `db.transaction()` direkt** – exakt das Muster aus `abschliessenVeranstaltung`
  (`db/veranstaltung.ts`). Die neue Katalog-Id wird vorab client-seitig per
  `crypto.randomUUID()` erzeugt (wie `catalog.id`s `$defaultFn`, `db/schema.ts`), die aktiven
  Quell-Artikel werden vorab gelesen (unkritischer Snapshot-Read, keine Atomarität nötig), und
  `runAtomic` bekommt eine synchron gebaute Query-Liste (Katalog-Insert + ein Insert je aktivem
  Artikel). Läuft damit auch gegen den Neon-HTTP-Treiber (INT/PRD), der keine interaktive
  `.transaction()` unterstützt.
  - RED-Nachweis: Ein neuer, modulweit gemockter Test
    (`db/catalog.duplicateCatalog-driver.test.ts`) mit einem Fake-`db`, dessen `.transaction()`
    wirft, statt still durchzulaufen – gegen die alte Implementierung schlug der Test exakt mit
    diesem Fehler fehl (`db.transaction() darf hier nicht aufgerufen werden`). Nach dem Fix:
    grün, `runAtomic` wird genau einmal aufgerufen, `db.transaction()` nie. Ein reiner
    Integrationstest hätte die Regression nicht gezeigt (node-postgres unterstützt
    `.transaction()` echt) – deshalb der gezielte Mock-Test statt eines weiteren
    Integrationstests.
  - Bestehende Integrationstests (`should_copyOnlyActiveArticles_when_duplicateCatalogIsCalled`,
    `should_rejectDuplicate_when_duplicateCatalogTargetNameExists` u. a.) unverändert und grün
    (mocklos, testen Verhalten statt DB-API).
  - Zusätzlich end-to-end gegen eine echte, lokale Postgres-DB verifiziert (node-postgres, via
    `colima start` + `pnpm db:up` + `pnpm db:migrate`, `DATABASE_URL` gesetzt): `duplicateCatalog`
    kopiert dort korrekt nur aktive Artikel in einen neu erzeugten Katalog. Dabei ein
    **vorbestehendes, von dieser Task unabhängiges** Testhygiene-Problem gefunden und per
    Vergleich mit der alten Implementierung (identischer Fehlschlag bei `db.transaction()`)
    verifiziert: Das `afterEach` in `db/catalog.test.ts` trackt nur über `track()`/`trackCatalog()`
    angelegte Zeilen; die von `duplicateCatalog` selbst erzeugten `catalog_item`-Kopien werden nie
    registriert, wodurch das spätere `DELETE` des Kopie-Katalogs an der FK scheitert. Dieses
    Cleanup-Verhalten ist mit der alten `db.transaction()`-Implementierung identisch reproduzierbar
    – keine Regression durch diesen Fix, außerhalb des Scopes dieser Runde, separat geflaggt.
- **`CatalogManager.tsx`: „Duplizieren"-Button erscheint nur noch bei `currentCatalog.active`**
  (AK5, erster Teil). „Umbenennen"/„Deaktivieren"/„Reaktivieren" bleiben bei einem inaktiven
  Katalog weiterhin sichtbar (AK4).
  - RED-Nachweis: Neuer Test `should_hideDuplicateButton_when_currentCatalogIsInactive` schlug
    vor dem Fix fehl (Button war im DOM), danach grün; zusätzliche Assertion, dass Umbenennen/
    Reaktivieren weiterhin sichtbar bleiben.
- **`listDuplicatableCatalogs()` entfernt** (toter Code, Option a): `CatalogSwitcher.tsx` zeigt
  laut AK4 bewusst alle Kataloge inkl. inaktiver, es gibt keinen zweiten UI-Ort für eine reine
  „nur aktive Kataloge"-Auswahl – die einzige Duplizier-Quelle ist `currentCatalog` selbst, dessen
  `.active`-Flag jetzt direkt im Button-Fix genutzt wird. Funktion + ihr Test
  (`should_listOnlyActiveCatalogs_when_listDuplicatableCatalogsIsCalled`) entfernt.
- Alle Gates grün: `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm test` (841 passed,
  89 skipped – DB-Integrationstests ohne `DATABASE_URL`), `pnpm build`, `scripts/checks/pre-push.sh`
  vollständig (inkl. Routen-Doku-Drift, `@import`-Kontext-Grenze). Zusätzlich einmalig gegen eine
  echte lokale DB (node-postgres) verifiziert wie oben beschrieben.
