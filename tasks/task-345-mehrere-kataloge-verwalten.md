# Task 345: mehrere-kataloge-verwalten

## Status
- [x] In Bearbeitung → Implementierung abgeschlossen
- [x] Review bestanden → Runde 3: APPROVED (Backend/Logik, Code-Qualität, Architektur)
- [x] Tests vollständig → 841 Tests grün (89 DB-Integrationstests ohne `DATABASE_URL` übersprungen)
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

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

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/345-mehrere-kataloge-verwalten`
Erstellt: 2026-09-19 12:44
