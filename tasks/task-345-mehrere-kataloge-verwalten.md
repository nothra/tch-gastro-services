# Task 345: mehrere-kataloge-verwalten

## Status
- [x] In Bearbeitung → Implementierung abgeschlossen
- [x] Review bestanden → Runde 3: APPROVED (Backend/Logik, Code-Qualität, Architektur)
- [x] Tests vollständig → 870 Tests grün (89 DB-Integrationstests ohne `DATABASE_URL` übersprungen),
      Coverage der #345-Dateien 96–100 % (Statements), CatalogManager.tsx 100 % Branches
- [x] Security-Review bestanden → PASSED (keine kritischen/wichtigen Findings, siehe `tasks/security-345.md`)
- [x] Refactoring abgeschlossen
- [x] Codify ausgeführt
- [x] Fertig / PR erstellt

## Beschreibung
Rolle `verwalter` kann mehrere Kataloge (Preislisten) parallel pflegen: anlegen, umbenennen,
deaktivieren/reaktivieren und – als eigentliche Template-Mechanik – einen bestehenden Katalog
samt aktiven Artikeln und Preisen duplizieren. `app/verwaltung/katalog/` bekommt dafür einen
Katalog-Umschalter. Slice 2 von 3 (nach #59, vor #346) – der laufende Betrieb (Theke,
Verzehrerfassung) bleibt unverändert auf den Standard-Katalog fest verdrahtet.

Details, Scope-Abgrenzung und Fehlerszenarien: [spec-345](../docs/specs/spec-345-mehrere-kataloge-verwalten.md).

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [x] AK1 – Katalog anlegen (Namenskonflikt wird abgelehnt)
- [x] AK2 – Katalog duplizieren (nur aktive Artikel, unabhängig editierbar)
- [x] AK3 – Katalog umbenennen (Rename-Sicherheit bleibt, Namenskonflikt wird abgelehnt)
- [x] AK4 – Katalog deaktivieren/reaktivieren (bleibt sichtbar & editierbar)
- [x] AK5 – Deaktivierter Katalog ist keine Duplizier-Quelle mehr (serverseitig durchgesetzt)
- [x] AK6 – Katalog-Umschalter steuert Artikel-Pflege (Parent-Key-Bindung)
- [x] AK7 – Rollen-Gate greift serverseitig für alle neuen Actions
- [x] AK8 – Duplikat-Regel je Katalog bleibt unangetastet

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

**Kein ADR-Trigger (Spec-002).** Keine neue Technologie, kein neues Architekturmuster, kein
Schnittstellen-Vertrag mit anderen Teams, keine irreversible Konsequenz: Die Tabelle `catalog`
existiert bereits seit #59 (ADR-050 D2) inkl. `active` und `sortOrder` – #345 braucht **keine
neue Migration**, nur zusätzliche CRUD-Operationen auf bereits vorhandenen Spalten, nach exakt
demselben Data-Layer-/Server-Action-/Zod-Muster wie die bestehende Artikel-Pflege. Die eine
offene Frage aus der Spec (Auslegung von ADR-050 D7) ist **kein neuer Architektur-Fork**, sondern
die Erfüllung einer in ADR-050 selbst bereits an #345 delegierten Verpflichtung – dafür genügt ein
Nachtrag an der bestehenden ADR statt einer neuen: siehe
[ADR-050, Abschnitt „Nachtrag (2026-09-20, #345)"](../docs/adr/050-katalog-als-template-entitaet.md).
Kurzfassung: `catalog.active` gate't ausschließlich die Duplizier-Quellenauswahl in der
Verwaltung; `listActiveCatalog`/Theke/Verzehr bleiben unverändert ungefiltert nach `catalog.active`.

**Routing für den Katalog-Umschalter: dynamisches Segment, kein `searchParams`.** Recherche im
Code zeigt: die einzige bestehende `searchParams`-Nutzung (`app/veranstaltung/personenbezug.ts`,
#308) trägt einen Wert **zwischen** bereits gerouteten Seiten weiter, entscheidet aber nirgends,
*was* ein Server Component lädt. Das etablierte Muster für „eins auswählen, dann dessen Daten
laden/bearbeiten" ist die dynamische Route (`app/veranstaltung/[id]/...`). Empfehlung für
`/implement`: `app/verwaltung/katalog/[id]/page.tsx` (Katalog-ID im Pfad, analog zu
`veranstaltung/[id]`), `app/verwaltung/katalog/page.tsx` redirected auf
`/verwaltung/katalog/${STANDARD_CATALOG_ID}` (= `/verwaltung/katalog/standard`) statt einen
zweiten Auswahlmechanismus (searchParams/Client-State) einzuführen. **Achtung:** neue
`page.tsx` → `docs/routes.md` im selben PR mitpflegen (Drift-Check `routes-doc-check.sh`,
Lesson aus #145).

**Voraussichtliche Data-Layer-Erweiterungen (`db/catalog.ts`, alle mit `requireRole("verwalter")`
in der jeweiligen Action, nicht im Data-Layer selbst – bestehendes Muster):**
- `listCatalogs()` – alle Kataloge (aktiv + inaktiv) für den Umschalter, sortiert
  `sortOrder, name` (analog `catalogOrder` für Artikel).
- `listDuplicatableCatalogs()` oder ein Filter-Parameter auf `listCatalogs` – nur aktive Kataloge,
  für die Quellenauswahl in „Katalog duplizieren" (AK5); dieselbe Funktion ist auch die
  serverseitige Durchsetzung in der Duplizier-Action (fremde/inaktive ID → Fehler, nicht nur
  UI-Ausblendung).
- `createCatalog(name)`, `renameCatalog(id, name)`, `setCatalogActive(id, active)` – Unique-
  Violation auf `catalog.name` (23505) über denselben `runWithUniqueCheck`-Seam wie bei Artikeln
  übersetzen (neue Nutzermeldung, z. B. „Ein Katalog mit diesem Namen existiert bereits.").
- `duplicateCatalog(sourceId, newName)` – neuen Katalog anlegen, dann alle **aktiven** Artikel aus
  `listActiveCatalog(sourceId)` mit `createItem(newId, {...})` je Zeile kopieren (kein Bulk-Insert
  nötig bei der zu erwartenden Artikelmenge, ADR-050 „Performance & Skalierung"-Nichtanforderung).
  Beide Schritte (Katalog anlegen + Artikel kopieren) gehören in **eine** Transaktion (`db.transaction`),
  damit bei einem Fehler mitten in der Kopie kein halb-befüllter Katalog zurückbleibt.

## Offene Fragen
- [x] ~~`/architecture` prüfen: verdient die enger gefasste Auslegung von ADR-050 D7 eine
      ADR-Ergänzung?~~ → Geklärt: Nachtrag an ADR-050 (2026-09-20, #345), kein neuer ADR nötig
      (kein Trigger aus Spec-002).

## Review-Findings
<!-- Wird durch /review befüllt -->

**Runde 1 (NEEDS_REWORK) – behoben, siehe `tasks/review-345.md` „Rework Runde 1":**
Die drei kritischen Findings (Error-Handling `duplicateCatalogAction`, Message-Mapping,
Transaktions-Fehlerbehandlung `duplicateCatalog`) und das wichtige Finding
(`CatalogManager.tsx` ohne `useActionState`) sind per TDD behoben. Neue Data-Layer-Funktion
`getCatalogById`, neue Tests in `catalog-management-actions.test.ts` und
`CatalogManager.test.tsx`. Wartet auf Review Runde 2.

**Runde 2 (NEEDS_REWORK, Architektur-Fokus) – behoben, siehe `tasks/review-345.md` „Rework
Runde 2":** Kritisches Finding: `duplicateCatalog` rief `db.transaction()` direkt auf – der in
INT/PRD verwendete Neon-HTTP-Treiber unterstützt das nicht, AK2 wäre dort bei jedem Aufruf
fehlgeschlagen. Umgestellt auf die projektweite `runAtomic`-Klammer (`db/atomic.ts`, Muster aus
`abschliessenVeranstaltung`), RED per gezieltem Mock-Test (`db/catalog.duplicateCatalog-driver.test.ts`)
verifiziert. Wichtiges Finding: „Duplizieren"-Button in `CatalogManager.tsx` erscheint jetzt nur
noch bei `currentCatalog.active` (AK5); totes `listDuplicatableCatalogs()` entfernt (kein
UI-Konsument, `CatalogSwitcher` zeigt bewusst alle Kataloge). Alle Gates grün, zusätzlich einmalig
gegen eine echte lokale Postgres-DB (node-postgres) end-to-end verifiziert. Dabei ein
vorbestehendes, unabhängiges Testhygiene-Problem im `afterEach` von `db/catalog.test.ts`
gefunden (fehlende Cleanup-Registrierung für von `duplicateCatalog` erzeugte Artikel-Kopien) –
keine Regression dieser Runde, separat geflaggt. Wartet auf Review Runde 3.

**Runde 3 (APPROVED) – siehe `tasks/review-345.md` „Backend/Logik-Ergänzung (Runde 3)",
„Code-Qualität-Ergänzung (Runde 3)", „Architektur & Patterns-Ergänzung (Runde 3)":** Alle drei
Review-Perspektiven verifizieren den `runAtomic`-Fix aus Runde 2 unabhängig voneinander als
vollständig und korrekt – u. a. empirisch am installierten Treiber-Code bestätigt, dass Neons
`.batch()` eine echte serverseitige Transaktion ist (kein Rollback-Risiko). Kein neues Kritisch-
oder Wichtig-Finding. Offen bleiben nur bereits akzeptierte Nitpicks (Code-Duplikation in
`CatalogManager.tsx`, zwei kleine Doku-Nits zur ADR-Referenz/`db/atomic.ts`-Kommentar) sowie der
separat geflaggte, vorbestehende FK-Cleanup-Nebenfund – kein Merge-Blocker. Review-Phase
abgeschlossen, weiter zu `/test`.

## /test-Notizen

Coverage-Analyse (`pnpm vitest run --coverage`, gescoped auf die #345-Dateien) fand sechs echte
Lücken, alle per TDD geschlossen (nur Testdateien geändert, kein Produktionscode):

- `catalogNameSchema` (`app/verwaltung/katalog/schema.ts`) hatte **keinen** eigenen Test – nur
  indirekt über Action-Tests (Ablehnungs-Test, keine Meldungs-/Grenzwert-Prüfung). Ergänzt:
  Trim-Verhalten, leer/nur-Leerzeichen (FS4), exakt 100/101 Zeichen, Meldungstexte
  (`schema.test.ts`).
- `renameCatalogAction`: FS4 (leerer Name) war für create/duplicate getestet, für rename nicht
  (`catalog-management-actions.test.ts`).
- `createCatalogItemAction`/`updateCatalogItemAction`: der `"Kein Katalog angegeben."`-Guard bei
  fehlendem `catalogId` in FormData war ungetestet; `setCatalogItemActiveAction` hatte keinen Test
  für fehlendes `id` bzw. `catalogId` (`actions.test.ts`).
- `CatalogManager.tsx`: die drei „Abbrechen"-Buttons (Create/Rename/Duplicate-Modal) und die drei
  Pending-Zustände (`disabled` + „Speichern …") waren ungetestet – Coverage zeigte 3 uncovered
  Statement- und 3 uncovered Branch-Zeilen. Ergänzt nach dem etablierten
  `AuslageForm.test.tsx`-Muster (`withStates`-Helfer um ein Pending-Flag je Action erweitert).
  Damit 100 % Branch-Coverage für die Datei.
- `CatalogSwitcher.tsx` hatte **keine eigene Testdatei** (nur indirekt über die jetzt neue
  `page.test.tsx` mitgetestet). Neue `CatalogSwitcher.test.tsx`: Listing, Checked-Zustand,
  AK4-Markierung „(inaktiv)", AK6-Navigation bei Auswahl.
- `app/verwaltung/katalog/[id]/page.tsx` hatte **keine Testdatei** (Server Component). Neue
  `page.test.tsx`: Rollen-Gate (inkl. fehlender Session), Datenzusammenstellung/Parent-Key-
  Bindung (AK6), Artikel-Rendering, und das bewusste Fehlen einer 404-Behandlung bei unbekannter
  Katalog-ID (kein AK/FS verlangt das – anders als `veranstaltung/[id]`; `CatalogManager` bekommt
  dann `currentCatalog: undefined` und zeigt nur „+ Katalog anlegen", bereits durch
  `CatalogManager.test.tsx` abgedeckt).
- `db/catalog.test.ts` (Integrationstests, real gegen lokale Postgres verifiziert):
  `should_copyOnlyActiveArticles_when_duplicateCatalogIsCalled` um Feld-Paritäts-Assertions
  (Größe/Preis/Kategorie/Sortierung) und die AK2-Unabhängigkeits-Prüfung erweitert (Kopie ändern
  beeinflusst Original nicht). `should_rejectDuplicate_when_duplicateCatalogTargetNameExists` um
  eine Rollback-Assertion erweitert (kein „geleaktes" Katalog mit dem Zielnamen, keine kopierten
  Artikel außerhalb der Quelle) – deckt den in Review Runde 3 angemerkten Rollback-Aspekt ab,
  soweit mit den bestehenden Schema-Constraints ohne Produktionscode-Änderung real testbar (ein
  Fehlschlag *nach* dem ersten Batch-Element ist mit den aktuellen Unique-Constraints strukturell
  nicht erzeugbar, da `newCatalogId` frisch/leer ist – siehe Analyse im Test-Report).

**Bekannter, bewusst nicht behobener Nebenbefund (kein neuer Fund):** Das reale-DB-Testhygiene-
Problem aus Review Runde 2 (`duplicateCatalog`-Inserts werden im `afterEach` von
`db/catalog.test.ts` nicht über `track()` registriert, FK-Fehler beim Cleanup) wurde bei einem
echten lokalen Postgres-Lauf (`DATABASE_URL` gesetzt) erneut reproduziert – identisch zum bereits
als Issue [#351](https://github.com/nothra/tch-gastro-services/issues/351) getrackten Fund, keine
Regression dieser Session. Absichtlich nicht gefixt (Scope-Grenze: Issue #351 ist explizit
ausgelagert, kein #345-Merge-Blocker). Ebenfalls beobachtet, aber unabhängig von #345 und nicht
gefixt: die lokale Dev-DB in dieser Sandbox hat keinen vollständigen Migrations-0004-Datenbestand
(`should_containSeededReferenceList_when_freshlyMigrated` schlägt lokal fehl) – reines
Umgebungs-/Seed-Problem dieser Sandbox, nicht Teil des CI-Gates (dort ohne `DATABASE_URL`
übersprungen wie alle DB-Integrationstests).

**Ergebnis:** `pnpm test` 870 grün (89 DB-Integrationstests ohne `DATABASE_URL` übersprungen,
+29 gegenüber dem Stand vor `/test`), `pnpm test:coverage` 90,63 % Statements/97,04 % Branches
projektweit; alle #345-Dateien (`actions.ts`, `schema.ts`, `CatalogManager.tsx`,
`CatalogSwitcher.tsx`, `[id]/page.tsx`, `page.tsx`) bei 100 % Statement-Coverage,
`CatalogManager.tsx` zusätzlich bei 100 % Branch-Coverage. `pnpm lint`/`typecheck`/`format:check`
und `scripts/checks/pre-push.sh` grün. Kein Produktionscode geändert.

## /refactor-Notizen

Clean-Code-Pass über die fünf in `tasks/review-345.md` als Nitpick zurückgestellten Punkte
(Runde 2/3) – reine Struktur-/Namens-/Kommentar-Änderungen, kein neues Verhalten:

1. **Hook-Duplikation behoben:** `CatalogManager.tsx` (jetzt `CatalogControls.tsx`, s. Punkt 3)
   hatte drei identische `useCallback`+`useActionState`-Kopien (create/rename/duplicate).
   Extrahiert in `useCloseOnSuccess(action, setModalOpen)` – nimmt die Server-Action und den
   `useState`-Setter (stabile Identität, damit die `useCallback`-Deps wie zuvor mit `[]` über
   Re-Renders unverändert bleiben) entgegen und kapselt Wrapper + `useActionState`. Aufrufreihenfolge
   (create, rename, duplicate, dann das separate `setActiveAction`) unverändert – wichtig, da
   `CatalogControls.test.tsx` `useActionState`-Mock-Aufrufe positionsbasiert abgreift
   (`nthWrappedAction`). Datei von 230 auf ca. 210 Zeilen, die Wiederholung ist weg.
2. **Fehlermeldungs-Konstanten:** `"Kein Katalog angegeben."` war viermal als Literal dupliziert
   (`actions.ts`). Da zwei semantisch verschiedene Fälle den Text zufällig teilten (Artikel ohne
   `catalogId`-Bezug vs. Katalog ohne eigene `id`), zwei separate Konstanten eingeführt statt
   einer gemeinsamen: `ITEM_CATALOG_REFERENCE_MISSING_MESSAGE` (Artikel-Actions) und
   `CATALOG_ID_MISSING_MESSAGE` (Katalog-Actions) – künftig unabhängig änderbar.
3. **Umbenennung `CatalogManager` → `CatalogControls`:** entfernt den in `clean-code.md` als
   Negativbeispiel genannten Suffix „Manager", passt sich an die Geschwister-Namen
   (`CatalogSwitcher`, `CatalogRow`) an. `CatalogManager.tsx`/`CatalogManager.test.tsx` per
   `git mv` zu `CatalogControls.tsx`/`CatalogControls.test.tsx` – alte Dateien vollständig entfernt
   (keine Kopie danebengelegt). Alle Importe/Referenzen mitgezogen (`page.tsx`, `page.test.tsx`
   inkl. Mock-Pfad und `data-testid`). Dabei nebenbei einen bereits vorhandenen, unabhängigen
   Lint-Warning-Fund behoben (`setCatalogActiveActionMock` unbenutzt in der Testdatei) –
   Deklaration und der dafür nur noch benötigte Import entfernt.
4. **Doku-Nit ADR-Referenz:** Der Kommentar über `duplicateCatalog` (`db/catalog.ts`) zitierte
   fälschlich „ADR-050 D4" als Beleg für die Atomaritäts-Anforderung – D4 behandelt tatsächlich
   den Pflicht-`catalogId`-Parameter. ADR-050 hat für Atomarität keinen eigenen D-Punkt (geprüft:
   kein Treffer für „atomar"/„Transaktion"/„batch" im ADR); die einzige Nähe ist die beiläufige
   Erwähnung „Duplizieren wird ein Kopiervorgang auf einer Tabelle" unter D1 Option A. Kommentar
   entsprechend umformuliert (kein falsches Zitat mehr, Atomaritäts-Begründung bleibt inline aus
   der Fachlogik hergeleitet).
5. **Doku-Ergänzung `db/atomic.ts`:** Header-Kommentar ergänzt, dass `.batch()` beim Neon-HTTP-
   Treiber eine echte serverseitige Alle-oder-keine-Transaktion ist, kein reines Netzwerk-
   Pipelining (Verifikation bereits in `tasks/review-345.md` → „Architektur & Patterns-Ergänzung
   (Runde 3)", Punkt 3 dokumentiert).

**Ergebnis:** `pnpm lint`/`typecheck`/`format:check` grün (lint jetzt 0 Warnungen, vorher 1
unabhängige), `pnpm test` unverändert 870 grün/89 skipped, `pnpm build` grün,
`scripts/checks/pre-push.sh` vollständig grün (inkl. Routen-Doku-Drift, `@import`-Kontext-Grenze).
Kein Testverhalten geändert – nur Struktur/Namen/Kommentare.

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

Vollständiger Report: [`tasks/codify-345.md`](codify-345.md). Kurzfassung:

- Neue Lesson `lessons/db-drizzle.md`: neue Mehrfach-Write-Data-Layer-Funktionen müssen
  `runAtomic` statt `db.transaction()` direkt nutzen (Ursache des Runde-2-Kritisch-Fundes,
  von lokalen/CI-Tests strukturell nicht erkennbar).
- Neue Lesson `lessons/db-drizzle.md`: serverseitig-fix → client-gelesenes FK-Feld öffnet neue
  DB-Fehlerklassen (`23503`), die der bestehende Error-Wrapper nicht abdeckt (Issue #353).
- Neue Lesson `lessons/factory-workflow.md`: „separat geflaggte" Out-of-Scope-Funde müssen im
  selben Schritt kanonisch angelegt werden (Issue/`kleinfunde.md`), nicht als Orchestrator-
  Nacharbeit.
- `agents/review-agent.md` Perspektive 3 um „Treiber-/Infrastruktur-Kompatibilität" als
  expliziten Checklistenpunkt ergänzt.
- Zwei bisher unverankerte Review-Runde-1-Nitpicks (TOCTOU-Lücke, Testpräfix-Doku) in
  `kleinfunde.md` nachgetragen.
- Sandbox-Workaround für `. scripts/lib/create-issue.sh` bereits durch bestehende Lesson (#291)
  abgedeckt, kein Nachtrag nötig. Issues #351/#353 bereits korrekt über den zentralen Weg
  angelegt.

## /security-review-Notizen

**Ergebnis: PASSED** (`tasks/security-345.md`) – keine kritischen/wichtigen Findings. AK7
(Rollen-Gate) für alle 7 Katalog-/Artikel-Actions einzeln per `grep` + Verhaltenstests
verifiziert, AK5 (Duplizier-Quelle fail-closed) und AK6 (Parent-Key-Bindung) bestätigt korrekt.
Drei Hinweise nach Schwelle (ADR-018/ADR-043) klassifiziert und verankert statt nur im Report
belassen: Issue [#353](https://github.com/nothra/tch-gastro-services/issues/353) (unbehandelte
FK-Violation `23503` bei ungültiger `catalogId`, `bug`), ein `kleinfunde.md`-Eintrag
(Kommentar-Drift `db/catalog.ts`), ein reiner Doku-Hinweis ohne Handlungsbedarf (kein
Besitzer-Konzept auf Katalogebene – fachlich korrekt gewollt).

## PR-Shepherd

PR-Shepherd [2026-09-22]: Merge freigegeben – alle Gates grün. Keine offenen Review-Kommentare
(nur der automatische Vercel-Bot-Kommentar), Branch 0 Commits hinter `origin/main` (kein Rebase
nötig), CI vollständig grün (`mergeStateStatus: CLEAN`), kein Approval erforderlich
(`required_approving_review_count: 0`), Draft-Status aufgelöst (`gh pr ready`).

---
Branch: `feature/345-mehrere-kataloge-verwalten`
Erstellt: 2026-09-19 12:44
