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

**Code-Qualität-Ergänzung (Runde 3): APPROVED.** Fokus auf den zweiten Fix-Zyklus
(`db/catalog.ts`-`runAtomic`-Umbau, `db/catalog.duplicateCatalog-driver.test.ts`,
`CatalogManager.tsx`-Button-Fix, `CatalogManager.test.tsx`-Erweiterung, Entfernung von
`listDuplicatableCatalogs()`) sowie stichprobenartig die Gesamttestqualität nach beiden
Fix-Zyklen. Kein neues Qualitätsproblem gefunden – die drei aus Runde 2 bekannten, bewusst
nicht behobenen Nitpicks (Hook-Duplikation, unkonstantisierte Meldung, Namens-Nitpick
`CatalogManager`) werden hier nicht erneut aufgeführt.

- ✓ **`db/catalog.ts` – `runAtomic`-Umbau (Zeilen 163–211):** lesbar und fokussiert geblieben,
  keine neue Verschachtelung. Klare drei Schritte (ID vorab erzeugen → Quell-Artikel lesen →
  `runAtomic` mit synchron gebauter Query-Liste), jeder Schritt einzeln kommentiert (WHY, nicht
  WHAT). Die Funktion ist mit den Kommentaren ca. 40 Zeilen lang, der reine Code-Anteil deutlich
  kürzer (~15 Zeilen) – im Rahmen der Orientierungsgröße aus `clean-code.md`. Kein Guard-Clause-
  Bedarf, da keine Fehlerzweige neu hinzugekommen sind. Der einzige nicht ganz triviale Ausdruck
  (`results[0] as Catalog[]`) ist mit einem Positions-Kommentar versehen, der die Query-Reihenfolge
  erklärt – nachvollziehbar, kein Type-Smell (Rückgabetyp von `runAtomic` ist bewusst `unknown[]`,
  siehe `db/atomic.ts`).
- ✓ **`db/catalog.duplicateCatalog-driver.test.ts`:** Testname
  `should_useRunAtomic_notDbTransaction_when_duplicatingCatalog` folgt dem Format und beschreibt
  präzise, was bewiesen wird. Der Modul-Header-Kommentar (Zeilen 1–16) erklärt nachvollziehbar,
  warum diese Datei als gezielter Mock-Test nötig ist und warum sie **nicht** in
  `db/catalog.test.ts` (echtes DB-Integrationstest-Setup) gehört – vermeidet künftige
  „warum zwei Testdateien für dieselbe Funktion"-Verwirrung. Mocking bleibt auf die externe
  Grenze beschränkt (`./index`, `./atomic`) – kein Mocken interner Logik. Der Fake-Executor
  (`makeExec`) ist zweckgebunden minimal (nur `insert` wird gebraucht) und zeichnet Aufrufe zur
  Inspektion auf, statt Verhalten vorzutäuschen; kein übermäßiges Mocking, das den Test brüchig
  machen würde. Assertions sind konkret (Query-Reihenfolge, `catalogId`-Verknüpfung über die
  vorab erzeugte ID, `toHaveBeenCalledTimes`/`not.toHaveBeenCalled()` als Kausalitätsbeleg) statt
  oberflächlich.
- ✓ **`CatalogManager.tsx`-Button-Fix (Zeilen 96–106):** `{currentCatalog.active && (...)}` ist
  klar lesbar, folgt exakt demselben Bedingungs-Rendering-Muster wie der bestehende
  `currentCatalog &&`-Block direkt darüber (Zeile 72) – keine neue Stil-Variante eingeführt. Der
  Kommentar (Zeilen 96–98) erklärt WHY (AK5, Review-Finding-Bezug) statt WHAT. Keine neuen
  Anzeichen der aus Runde 2 bekannten Hook-Duplikation: Der Fix ändert nur die Sichtbarkeits-
  Bedingung des Buttons, fasst keinen der drei `useCallback`-Wrapper an und fügt keinen vierten
  hinzu.
- ✓ **Testqualität-Stichprobe nach beiden Fix-Zyklen** (`catalog-management-actions.test.ts`,
  `CatalogManager.test.tsx`, `db/catalog.test.ts`-Erweiterungen, siehe Code-Auszüge oben): AAA
  durchgängig eingehalten (Arrange über Mocks/Fixtures, Act als expliziter Aufruf, Assert danach,
  keine Logik dazwischen); keine tautologischen Assertions gefunden – erwartete Werte sind Literale
  oder aus der Arrange-Phase unabhängig konstruiert, nie ein erneuter Zugriff auf das Ergebnis der
  Act-Zeile; Testnamen durchgängig `should_[Ergebnis]_when_[Bedingung]`, auch die drei ganz neuen
  Tests (`should_useRunAtomic_notDbTransaction_when_duplicatingCatalog`,
  `should_hideDuplicateButton_when_currentCatalogIsInactive`). `CatalogManager.test.tsx`s neuer
  Sichtbarkeits-Test prüft zusätzlich die Gegenprobe (Umbenennen/Reaktivieren bleiben sichtbar) –
  echte Diskriminierungs-Kontrolle statt reiner Abwesenheits-Behauptung.
- ✓ **`listDuplicatableCatalogs()` sauber entfernt:** projektweiter Grep (`grep -rn
  "listDuplicatableCatalogs"`) liefert keinen einzigen Treffer mehr – weder Import, noch
  Kommentar-Referenz, noch verwaister Test. Kein Restcode.
- ✓ Gates erneut selbst reproduziert (nicht nur laut Bericht übernommen): `bash
  scripts/checks/pre-commit.sh` (Lint) grün; `pnpm vitest run app/verwaltung/katalog
  db/catalog.test.ts db/catalog.duplicateCatalog-driver.test.ts` – 78 passed, 36 skipped
  (DB-Integrationstests ohne `DATABASE_URL`, erwartet).

**Backend/Logik-Ergänzung (Runde 3): APPROVED.** Gegenprüfung des `runAtomic`-Fixes speziell auf
Korrektheit der Data-Layer-Logik (Details siehe eigener Abschnitt „Backend/Logik-Ergänzung (Runde 3)"
unten). Kernergebnisse: `duplicateCatalog` ruft nachweislich nur noch `runAtomic` auf (kein
`db.transaction()` mehr im Code); die an `runAtomic` übergebene Query-Liste ist synchron gebaut und
frei von Cross-Query-Abhängigkeiten (neue Katalog-Id vorab per `crypto.randomUUID()` erzeugt,
Quell-Artikel vorab als unkritischer Snapshot gelesen); die Unique-Violation-Propagation zur
Server-Action (`runWithUniqueCheck`/`isUniqueViolation`) ist unverändert und funktioniert
weiterhin, da `runAtomic` Fehler ungefangen durchreicht. Der neue Treiber-Test
(`db/catalog.duplicateCatalog-driver.test.ts`) wurde **empirisch** gegenverifiziert: die alte
Implementierung (Commit `6913168`) temporär eingesetzt und isoliert gegen genau diesen Test
laufen lassen – schlägt exakt mit der erwarteten Meldung fehl (RED), nach Wiederherstellung der
aktuellen Fassung grün (GREEN). Der `CatalogManager.tsx`-Button-Fix umschließt nachweislich nur den
Duplizieren-Button, „Umbenennen"/„Deaktivieren"/„Reaktivieren" bleiben bei inaktivem Katalog
sichtbar (AK4). `listDuplicatableCatalogs()` ist projektweit ohne Restspur entfernt. AK2 (identischer
Name/Größe/Preis/Kategorie/Sortierung je kopiertem Artikel) bleibt erfüllt. Der in Runde 2
geflaggte FK-Cleanup-Nebenfund im Test-`afterEach` ist plausibel vorbestehend – dasselbe
Registrierungsproblem (`duplicateCatalog`-Inserts laufen nicht über den `track()`-Helfer) besteht
identisch in der alten wie der neuen Implementierung, unabhängig vom `runAtomic`-Wechsel. Kein
neues Kritisch- oder Wichtig-Finding.

**Gesamt-Empfehlung Runde 3 (alle drei Foki – Backend/Logik, Code-Qualität, Architektur &
Patterns): APPROVED.** Alle drei Review-Perspektiven dieser Runde kommen unabhängig voneinander
zu demselben Ergebnis: Der `runAtomic`-Fix aus Runde 2 ist vollständig, korrekt und ohne
Regression umgesetzt. Damit sind alle bisherigen Kritisch-Findings (Runde 1 + Runde 2) verifiziert
behoben; offen bleiben nur nicht-blockierende Nitpicks (Runde 2/3, s. o.) und der bereits
eingeordnete, vorbestehende FK-Cleanup-Nebenfund – kein Grund für eine vierte Review-Runde oder
eine Eskalation an den Menschen.

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

## Backend/Logik-Ergänzung (Runde 3)

Gegenprüfung des Runde-2-Fixes (`runAtomic`-Umstellung in `duplicateCatalog`) – Code direkt
gelesen und der neue Treiber-Test empirisch (nicht nur am Kommentar) verifiziert.

**1. `db/catalog.ts` – `duplicateCatalog` nutzt jetzt tatsächlich `runAtomic`:**
- Zeile 181 (`const results = await runAtomic((exec) => [...])`) – kein `db.transaction()`-Aufruf
  mehr im gesamten `duplicateCatalog`-Rumpf, verifiziert per Lesen der Funktion.
- **Query-Liste ist synchron gebaut:** Der Callback `(exec) => [exec.insert(catalog).values(...).returning(),
  ...sourceItems.map(item => exec.insert(catalogItems).values({...}))]` enthält kein `await`
  zwischen den Statements – alle Query-Builder-Objekte werden vor der Ausführung durch
  `runAtomic`/`.batch()` bzw. der `for`-Schleife in `db/atomic.ts` synchron aufgebaut. Keine
  Abhängigkeit eines Statements vom *Ausführungsergebnis* eines anderen: Die neue Katalog-Id
  (`newCatalogId = globalThis.crypto.randomUUID()`) wird **vor** dem `runAtomic`-Aufruf
  client-seitig erzeugt (konsistent mit `catalog.id`s `$defaultFn` in `db/schema.ts:93-94`, das
  denselben `crypto.randomUUID()`-Mechanismus nutzt) und direkt in `values({ id: newCatalogId, … })`
  sowie in jedem Artikel-Insert (`catalogId: newCatalogId`) verwendet. Damit ist `runAtomic`s
  Fördervoraussetzung erfüllt (keine voneinander abhängigen Statements innerhalb einer
  `.batch()`-Transaktion).
- **Snapshot-Read der Quell-Artikel liegt außerhalb der atomaren Klammer:** `const sourceItems =
  await db.select()...` (Zeilen 176-179) läuft **vor** `runAtomic`, ist also kein Teil der
  Atomarität. Unkritisch für den Use-Case: FS3 verlangt nur, dass ein leerer Quell-Katalog
  dupliziert werden kann (kein Lost-Update-Risiko, da die Kopie unabhängige neue Zeilen erzeugt
  und der Quell-Katalog durch das Duplizieren nicht verändert wird).
- **Unique-Violation-Propagation gegengelesen (Data-Layer + Action):** `duplicateCatalog` fängt
  keinen Fehler ab – wirft `runAtomic`/der zugrunde liegende Treiber bei einer Verletzung von
  `catalog.name UNIQUE` (Postgres SQLSTATE `23505`), läuft der Fehler ungefangen bis zur
  aufrufenden Action durch (identisch zum alten `db.transaction()`-Verhalten, das ebenfalls keinen
  Catch hatte). `duplicateCatalogAction` (`actions.ts:202-204`) übergibt den Aufruf an
  `runWithUniqueCheck`, das per `isUniqueViolation` (`error.code === "23505"`) genau diesen Fall
  abfängt und `CATALOG_MANAGEMENT_DUPLICATE_MESSAGE` zurückgibt – unverändert seit Rework Runde 1,
  durch die Umstellung auf `runAtomic` nicht betroffen, da `runAtomic` Fehler unverändert
  durchreicht (weder der `.batch()`-Zweig noch der `.transaction()`-Fallback-Zweig in
  `db/atomic.ts` fangen/transformieren Exceptions). Zusätzlich testseitig auf Action-Ebene
  abgesichert: `catalog-management-actions.test.ts` mockt `duplicateCatalog` direkt mit einem
  `Object.assign(new Error("dup"), { code: "23505" })`-Reject (Zeile 54/259) – dieser Test ist
  vom internen `runAtomic`-vs-`db.transaction()`-Detail unabhängig und bleibt unverändert grün.
- **`db/atomic.ts` gelesen:** Für node-postgres (DEV/Test) läuft `runAtomic` durch
  `db.transaction(async (tx) => { for (...) results.push(await query); return results; })` – eine
  echte interaktive Transaktion mit Rollback bei einem Fehler in der Schleife (identisches
  Rollback-Verhalten wie die alte Implementierung). Für neon-http (INT/PRD) läuft es über
  `.batch()`, das laut Neon/Drizzle-Dokumentation die übergebenen Statements atomar in einer
  serverseitigen Transaktion ausführt (alle-oder-keine). Für den Duplizier-Use-Case ausreichend:
  Der neue Katalog wird nur dann sichtbar, wenn auch alle Artikel-Inserts erfolgreich waren – kein
  Szenario mit halb-befülltem Katalog. Diese generelle Treiber-Garantie war bereits Gegenstand der
  Runde-2-Architektur-Bewertung (etabliertes Muster aus `abschliessenVeranstaltung`); hier nur auf
  den Katalog-Anwendungsfall gegengeprüft, kein neuer Befund.

**2. Neuer Test `db/catalog.duplicateCatalog-driver.test.ts` – empirisch nachvollzogen, nicht nur
   gelesen:**
- **RED mit der alten Implementierung empirisch reproduziert:** Alte `duplicateCatalog`-Fassung
  (Commit `6913168`, `db.transaction(async (tx) => {...})`) temporär in den Arbeitsbaum kopiert und
  isoliert gegen genau diesen Test laufen lassen → schlägt exakt mit der erwarteten Meldung fehl
  (`db.transaction() darf hier nicht aufgerufen werden – Neon-HTTP unterstützt das nicht …`,
  geworfen aus `dbTransactionMock`). Nach Wiederherstellen der aktuellen Fassung: grün. Der Test
  ist damit keine Attrappe, sondern eine echte Unterscheidung zwischen den beiden
  Implementierungen.
- Der Mock ist nicht oberflächlich: Er zeichnet nicht nur „wurde `runAtomic` aufgerufen" auf,
  sondern inspiziert die an `runAtomic` übergebene Query-Liste inhaltlich (Reihenfolge
  Katalog-Insert vor Artikel-Insert, `itemValues.catalogId === newCatalogValues.id`, kopierte
  Felder `name`/`size`/`priceCents`/`category`) – eine echte Verhaltensprüfung, keine reine
  Aufruf-Zähl-Prüfung.
- **Bestehende Integrationstests weiterhin aussagekräftig:** `db/catalog.test.ts` unverändert
  (`describe.skipIf(!hasDb)`), läuft in dieser Sandbox mangels `DATABASE_URL` übersprungen (36
  Skips, konsistent mit dem in Runde 2 dokumentierten Verhalten) – lokal nachvollzogen, nicht nur
  behauptet. Volle Zielsuite (`db/catalog.duplicateCatalog-driver.test.ts db/catalog.test.ts
  app/verwaltung/katalog`) läuft grün: 78 passed, 36 skipped.

**3. `CatalogManager.tsx` – Button-Fix verifiziert:**
- `{currentCatalog.active && (<button onClick={() => setShowDuplicateModal(true)}>Duplizieren</button>)}`
  (Zeilen 96-105) umschließt ausschließlich den Duplizieren-Button. „Umbenennen" (Zeile 71) und das
  Deaktivieren/Reaktivieren-Formular (Zeilen 79-90) liegen **außerhalb** dieser Bedingung, nur
  innerhalb des äußeren `{currentCatalog && (...)}`-Blocks – bleiben also bei einem inaktiven
  Katalog weiterhin sichtbar, wie AK4 verlangt.
- `listDuplicatableCatalogs` projektweit gegrept (`.ts`/`.tsx`): keine einzige Fundstelle mehr,
  weder in `db/catalog.ts` noch in einem Test – vollständig entfernt, keine verwaisten Referenzen.

**4. Allgemeine Nochmal-Prüfung (AK1–AK8, FS1–FS4):** Keine neuen Bugs durch die
`runAtomic`-Umstellung gefunden. AK2 („identischer Name, Größe, Preis, Kategorie und Sortierung je
Artikel") bleibt erfüllt – der Insert je Artikel kopiert exakt `name`, `size`, `priceCents`,
`category`, `sortOrder` (Zeilen 187-193), nichts fehlt/verschiebt sich gegenüber der alten
Implementierung. Anmerkung (kein Finding): Der Snapshot-Read der Quell-Artikel hat kein
`.orderBy(...)`, anders als `listCatalog`/`listActiveCatalog` – irrelevant für die Korrektheit, da
jede Zeile ihr eigenes `sortOrder`-Feld mitträgt und die Anzeige-Reihenfolge beim Lesen (`listCatalog`,
`ORDER BY sortOrder, name, size`) bestimmt wird, nicht die Insert-Reihenfolge.

**5. Nebenfund-Einordnung (FK-Constraint im Test-`afterEach`) geprüft:** Plausibel als
„vorbestehend, keine Regression" eingeordnet. Ursache liegt nicht im `runAtomic`-Wechsel: Sowohl
die alte (`tx.insert(catalogItems)`) als auch die neue Implementierung (`exec.insert(catalogItems)`)
fügen die kopierten Artikel-Zeilen ein, ohne sie im Test-Helfer `created`-Array zu registrieren
(nur `track()` registriert, `duplicateCatalog` wird nicht über `track()` aufgerufen) – das
`afterEach` löscht daher beim Duplizier-Test-Aufräumen die Artikel-Kopien nie, was den
anschließenden `DELETE` des kopierten Katalogs an dessen Pflicht-FK (`catalog_item.catalog_id`,
kein `ON DELETE`) scheitern lassen würde. Dieses Verhalten ist unabhängig davon, ob
`db.transaction()` oder `runAtomic` den Insert ausführt – identisch in beiden Fassungen
reproduzierbar. Konnte in dieser Sandbox mangels `DATABASE_URL` nicht gegen eine echte DB
nachvollzogen werden (auch `factory-ci.yml` setzt kein `DATABASE_URL`, die Integrationstests laufen
also auch dort nicht automatisiert) – die Einordnung stützt sich auf Code-Lesen, ist aber in sich
schlüssig und kein Merge-Blocker für #345.

**Empfehlung Backend/Logik (Runde 3): APPROVED.** Der `runAtomic`-Fix ist korrekt implementiert
(synchron gebaute Query-Liste, vorab erzeugte Id, unveränderte Fehler-Propagation), der neue
Treiber-Test beweist empirisch nachvollzogen echtes RED/GREEN, der UI-Button-Fix ist exakt auf die
Duplizieren-Aktion begrenzt, und `listDuplicatableCatalogs` ist vollständig entfernt. Keine
Regression in AK1–AK9/FS1–FS5 gefunden. Der geflaggte FK-Nebenfund ist plausibel vorbestehend und
kein neuer Befund dieser Runde. Kein neues Kritisch- oder Wichtig-Finding – kein Grund für eine
weitere Review-Runde oder Eskalation.

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
    – keine Regression durch diesen Fix, außerhalb des Scopes dieser Runde. Über den zentralen
    Anlage-Weg (ADR-018) als Issue [#351](https://github.com/nothra/tch-gastro-services/issues/351)
    angelegt (Labels `bug`, `test`) – reproduzierbarer funktionaler Defekt, daher Issue statt
    `kleinfunde.md` (Schwelle ADR-043).
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

## Architektur & Patterns-Ergänzung (Runde 3)

Verifikation des `runAtomic`-Fixes aus Runde 2 – dieselbe Rolle, die den Bug damals gefunden hat.
Jeder Punkt unten wurde am Code/Treiber selbst nachvollzogen, nicht aus dem Fix-Report übernommen.

**1. `runAtomic`-Signatur (`db/atomic.ts`, vollständig gelesen).** Nimmt einen **Callback**
`build: (exec: SqlExecutor) => readonly PromiseLike<unknown>[]`, keine vorgefertigte Query-Liste.
Intern: `typeof (db as Batchable).batch === "function"` entscheidet den Zweig zur Laufzeit –
neon-http hat `.batch`, node-postgres nicht. Neon-Zweig: `batch.call(db, build(db))` – der
Callback wird **einmal synchron** aufgerufen, das Ergebnis-Array ungeawaiteter Query-Builder geht
direkt in `.batch()`. Node-postgres-Zweig: `db.transaction(async (tx) => { for (const query of
build(tx)) results.push(await query); })` – hier wird sequentiell **awaited**, es gäbe also in
diesem Zweig technisch die Möglichkeit, zwischen zwei Statements Zwischenergebnisse zu lesen.
`duplicateCatalog` nutzt diese Möglichkeit nicht (siehe Punkt 2) – für `.batch()`-Tauglichkeit
ist das Pflicht, nicht optional.

**2. `duplicateCatalog` Zeile für Zeile (`db/catalog.ts:170–208`).** Keine Abhängigkeit
zwischen den Statements der Query-Liste, die `.batch()`-Semantik verletzen würde:
- Die neue Katalog-Id (`globalThis.crypto.randomUUID()`) wird **vor** `runAtomic` client-seitig
  erzeugt, nicht aus dem `.returning()`-Ergebnis des Katalog-Inserts gelesen.
- Die Quell-Artikel (`sourceItems`) werden **vor** `runAtomic` per separatem `db.select(...)`
  gelesen (unkritischer Snapshot, bewusst außerhalb der atomaren Klammer, siehe Kommentar
  Zeile 168–169).
- Die Callback-Funktion `(exec) => [...]` baut die komplette Query-Liste **synchron** – ein
  Katalog-Insert plus `sourceItems.map(...)`-Inserts, alle mit der vorab bekannten
  `newCatalogId` – ohne dass ein Query-Ergebnis eines vorherigen Query-Objekts gelesen wird.
  Genau das macht die Liste `.batch()`-tauglich.
- Grep-Befund: **kein** Restaufruf von `db.transaction()` in `db/catalog.ts` (`grep -n
  "db.transaction" db/*.ts` liefert projektweit nur noch die Definition in `db/atomic.ts`
  selbst und den erklärenden Kommentar in `db/catalog.ts`, keinen Aufruf).

**3. Empirische Treiber-Verifikation (Neon-HTTP `.batch()`), Code direkt gelesen:**
- `node_modules/drizzle-orm/neon-http/session.js`, `NeonHttpSession.batch()`: baut je Query ein
  `clientQuery(...)`-Promise, ruft dann **`this.client.transaction(builtQueries, queryConfig)`**
  auf – das ist die `.transaction()`-Methode des **`neon()`-HTTP-Clients** aus
  `@neondatabase/serverless` (nicht Drizzles eigene `PgSession.transaction()`, die im selben File
  weiterhin `throw new Error("No transactions support in neon-http driver")` wirft – dieser Pfad
  bleibt also korrekt tot für Drizzles `db.transaction()`-API, wird aber intern von `.batch()`
  **nicht** benutzt).
- `node_modules/@neondatabase/serverless/index.mjs`, `D.transaction = async (P, I) => {...}`:
  validiert, dass `P` ein Array von Query-Objekten ist, und schickt sie **in einem einzigen HTTP-
  POST** an den Neon-Fetch-Endpoint als `{queries: [...]}` – mit Headern
  `Neon-Batch-Isolation-Level`, `Neon-Batch-Read-Only`, `Neon-Batch-Deferrable`. Das sind echte
  Postgres-Transaktionsparameter (Isolation Level, Read-Only, Deferrable Constraints), keine
  bloßen Pipelining-Optionen – der Server führt die Queries serverseitig innerhalb einer
  **echten Datenbank-Transaktion** aus, nicht nur als sequentiell abgefeuerte Einzel-Statements.
- `node_modules/@neondatabase/serverless/README.md` (Abschnitt „`transaction()`"), Zitat:
  „Multiple queries can be issued via fetch request within a single, non-interactive transaction
  by using the `transaction()` function." – **„non-interactive"** heißt: kein Client-seitiges
  Verzweigen auf Zwischenergebnisse möglich (deckt sich mit Punkt 1/2), **nicht** „keine echte
  Transaktion". Kein `throw new Error(...)` in diesem Pfad, kein Fallback-auf-Sequenz-Kommentar –
  der Aufruf funktioniert tatsächlich gegen den Neon-HTTP-Endpoint.
- Ergebnis: `.batch()` auf dem Neon-HTTP-Treiber ist **keine reine Netzwerk-Optimierung ohne
  Rollback-Garantie**, sondern eine vom `neon()`-Client bereitgestellte echte, serverseitige
  Transaktion. Das ursprünglich befürchtete Szenario aus dem Auftrag (Punkt 5: „`.batch()`
  garantiert keine Atomarität, nur alle-oder-keiner als Netzwerk-Best-Effort") trifft **nicht**
  zu – ein Fehler mitten in der Artikel-Kopie (z. B. Unique-Violation auf `catalog.name` beim
  ersten Insert oder ein FK-Fehler bei einem Artikel-Insert) rollt die gesamte Batch serverseitig
  zurück, kein halb-befüllter Katalog bleibt zurück.

**4. Strukturvergleich mit `abschliessenVeranstaltung` (`db/veranstaltung.ts:175–201`).** Echte
Parallele, nicht nur oberflächlich ähnlich:
  | | `abschliessenVeranstaltung` | `duplicateCatalog` |
  |---|---|---|
  | IDs vorab bekannt | Ja (`veranstaltungId`, Parameter) | Ja (`newCatalogId`, `crypto.randomUUID()` vor `runAtomic`) |
  | Query-Liste-Aufbau | Synchron im `(exec) => [...]`-Callback | Synchron im `(exec) => [...]`-Callback |
  | Cross-Query-Abhängigkeit | Keine – jede Query nutzt nur vorab bekannte Werte/Subquery-SQL | Keine – jede Query nutzt nur `newCatalogId`/vorab gelesene `sourceItems` |
  | Ergebnis-Zugriff nach `runAtomic` | `results[1]` (Status-UPDATE, `.returning()`) per Index | `results[0]` (Katalog-Insert, `.returning()`) per Index |
  | Guarded/bedingte Query | Ja (`WHERE status = 'offen'`) | Nein nötig (reiner Insert, Uniqueness wird über Error-Pfad behandelt) |

  Beide Funktionen folgen exakt demselben Muster: IDs/Werte vorab beschaffen (Parameter bzw.
  vorab gelesen/generiert), Query-Liste synchron bauen, `runAtomic` aufrufen, Ergebnis per festem
  Index aus dem zurückgegebenen Array lesen. Kein struktureller Unterschied, der die
  `.batch()`-Tauglichkeit von `duplicateCatalog` in Frage stellen würde.

**5. Rollback-Garantie bei Teilfehler.** Siehe Punkt 3: Da `.batch()` auf dem Neon-HTTP-Treiber
intern eine echte serverseitige Transaktion ist (nicht nur `.batch()` als Drizzle-Konzept, das
theoretisch auch ohne echte Transaktion implementiert sein könnte), gilt Alles-oder-nichts auch
bei einem Fehler mitten in der Liste. Das entspricht dem bereits für `abschliessenVeranstaltung`
akzeptierten Atomaritäts-Modell (ADR-033 D3, dort ebenfalls über `runAtomic`/Neon-`.batch()`) –
keine neue, unbekannte Risikoklasse.

**6. Doku-Konsistenz `db/atomic.ts`-Kommentar-Header:** Der Header beschreibt die beiden
Treiber-Zweige explizit („neon-http … nur `.batch()`", „node-postgres … `.transaction()`, aber
KEIN `.batch()`") und benennt den Zweig-Selektor als „reine Treiber-Erkennung". Er behauptet an
keiner Stelle explizit, dass `.batch()` serverseitig atomar ist – das bleibt implizit über den
Namen `runAtomic` und den Verweis auf ADR-033. Kein Widerspruch zum Befund oben, aber eine
Ergänzung des Kommentars („`.batch()` = echte serverseitige Transaktion des `neon()`-Clients,
nicht nur Pipelining") würde die nächste Verifikation dieser Art überflüssig machen. **Kein
Blocker**, da die Aussage nicht falsch ist, nur unvollständig.

**Nebenbefund (Doku-Drift, kein Blocker):** Der Kommentar über `duplicateCatalog`
(`db/catalog.ts:163–171`) zitiert die Atomaritäts-Anforderung als „ADR-050 D4". Tatsächlich
behandelt ADR-050 D4 („Katalogbezug als expliziter, nicht optionaler Parameter") ein anderes
Thema; eine Atomaritäts-Entscheidung für `duplicateCatalog` existiert in ADR-050 nicht als
eigener D-Punkt (nur die beiläufige Erwähnung „„Duplizieren" (#345) wird ein Kopiervorgang auf
einer Tabelle" unter den D1-Alternativen). Das ist eine falsche ADR-Referenz analog dem
Codify-Lesson-Muster „Kanonische Quellen immer referenzieren" – keine Blockade für diese Runde,
da sie nur einen Kommentar betrifft und keine Verhaltens-/Test-Konsequenz hat, aber sollte
korrigiert werden (Zitat entfernen oder auf die richtige Fundstelle in ADR-050 D1
umlenken/ADR-050 um einen D8 zur Atomaritäts-Entscheidung ergänzen).

**Testabdeckung-Hinweis (bereits bekannt, keine neue Lücke):** Der `.batch()`-Zweig von
`runAtomic` läuft laut eigenem Kommentar nur produktiv/über `/post-merge-verify`, nicht in
lokalen/CI-Integrationstests (die über node-postgres laufen). Der neue Mock-Test
`db/catalog.duplicateCatalog-driver.test.ts` deckt nur ab, **dass** `runAtomic` statt
`db.transaction()` aufgerufen wird (Wiring), nicht das Rollback-Verhalten bei einem Teilfehler
in der echten Neon-`.batch()`-Transaktion – das ist identisch zum bereits akzeptierten
Coverage-Zuschnitt von `abschliessenVeranstaltung`/ADR-033 und keine neue, durch diesen PR
eingeführte Lücke.

**Empfehlung:** APPROVED. Der `runAtomic`-Fix ist vollständig und strukturell korrekt: kein
Restaufruf von `db.transaction()`, keine Cross-Query-Abhängigkeit, die `.batch()`-Semantik
verletzen würde, und – am wichtigsten für das ursprüngliche Runde-2-Finding – `.batch()` auf dem
Neon-HTTP-Treiber ist empirisch (Treiber-Quellcode + offizielle README-Beschreibung) eine echte
serverseitige Transaktion mit Rollback-Garantie, keine bloße Netzwerk-Optimierung. Die zwei
Nebenbefunde (ADR-Fehlzitat, Kommentar-Ergänzung in `db/atomic.ts`) sind nicht-blockierende
Doku-Nits, kein Grund für eine weitere Rework-Runde.
