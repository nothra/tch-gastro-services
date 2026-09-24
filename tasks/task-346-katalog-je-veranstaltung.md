# Task 346: katalog-je-veranstaltung

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Slice 3 von 3 (nach #59, #345): `veranstaltung` bekommt einen eigenen Katalogbezug
(`catalogId`, Pflicht-FK, Default `STANDARD_CATALOG_ID`). Ab jetzt gilt je Veranstaltung eine
eigene Preisliste – hier landet der fachliche Nutzen des Gesamt-Features. Details, Kontext und
Abgrenzung: [spec-346](../docs/specs/spec-346-katalog-je-veranstaltung.md).

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [x] AK1 – Katalog bei Anlage wählbar (nur aktive Kataloge, Standard vorbelegt)
- [x] AK2 – Gewählter Katalog bestimmt den Preis (live + Freeze)
- [x] AK3 – Katalogwechsel möglich, solange kein Verzehr (`menge > 0`) erfasst ist
- [x] AK4 – Katalogwechsel mit bereits erfasstem Verzehr wird serverseitig abgelehnt
- [x] AK5 – Abgeschlossene Veranstaltung bleibt unveränderlich (Regressions-AK, ADR-033 D2)
- [x] AK6 – Deaktivierter Katalog nicht neu wählbar, bestehende Zuordnung bleibt gültig
- [x] AK7 – Theke bleibt unverändert am Standard-Katalog (kein eigener Katalog in dieser Slice)
- [x] AK8 – Rollen-Gate (`requireRole("veranstalter")`) greift serverseitig für den Wechsel

Vollständige GIVEN-WHEN-THEN-Formulierungen und Fehlerszenarien (FS1–FS4):
[spec-346](../docs/specs/spec-346-katalog-je-veranstaltung.md).

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
**ADR:** Kein neuer ADR-Trigger (Spec-002-Kategorien geprüft: keine neue Technologie, kein
neues Architekturmuster, kein Schnittstellen-Vertrag zwischen Teams/Services; die
Persistenz-Strategie für einen Pflicht-FK mit stabilem Default ist mit ADR-050 D2/D3/D6 bereits
entschieden). Stattdessen Nachtrag an
[ADR-050](../docs/adr/050-katalog-als-template-entitaet.md#nachtrag-2026-09-24-346-d3-realisiert--veranstaltungcatalogid-ersetzt-standard_catalog_id-in-den-aufrufpfaden)
(2026-09-24, #346), der D3 als jetzt realisiert dokumentiert. Details unten sind daraus
übernommen.

- **Schema:** `veranstaltung.catalog_id` (`text`, FK auf `catalog.id`) braucht einen **echten
  SQL-`DEFAULT 'standard'`** im Drizzle-Schema (nicht nur `$defaultFn`) – dann emittiert
  `drizzle-kit generate` ein einziges
  `ALTER TABLE veranstaltung ADD COLUMN catalog_id text NOT NULL DEFAULT 'standard'
  REFERENCES catalog(id)`, das auch auf der nicht-leeren Tabelle sofort durchläuft (kein
  nullable→backfill→NOT-NULL-Expand wie bei ADR-050 D6 nötig, weil dort kein DB-Default
  deklariert war).
- Lesepfade, die von `STANDARD_CATALOG_ID` auf `veranstaltung.catalogId` umzustellen sind:
  `app/veranstaltung/[id]/verzehr/page.tsx` (`listActiveCatalog`),
  `app/veranstaltung/actions.ts` (`applyVerzehrAdjust` → `getCatalogItem`).
  `app/theke/[token]/page.tsx` bleibt unverändert (AK7, Spalten-Default greift dort weiter).
- Neue Wechsel-Action + UI analog `StatusToggle.tsx`-Pattern (`useActionState`, eigenes
  verstecktes Feld) auf der Detailseite `app/veranstaltung/[id]/page.tsx`. Guarded UPDATE:
  `WHERE id = ? AND status = 'offen'`, Rückgabewert auswerten (Kern-Kurzregel „guarded UPDATE").
- Sperre "kein Verzehr erfasst" prüft `menge > 0` über `listPositionen`, nicht bloße
  Zeilen-Existenz (eine Position kann auf `menge = 0` zurückgesetzt sein, s. spec-346 AK4).
- Ziel-Katalog der Wechsel-Action gegen `catalog.active = true` prüfen, bevor geschrieben wird
  (dieselbe Filterung wie bei der Anlage, FS1) – serverseitig, nicht nur über die
  Dropdown-Optionsliste.
- `VeranstaltungForm.tsx` braucht die Liste aktiver Kataloge als Prop aus
  `app/veranstaltung/page.tsx` (`listCatalogs()` gefiltert auf `active`, analog #345).

### Umsetzungs-Notizen /implement (2026-09-24)

- **Typecheck-Gate-Lücke (Lesson #137) hat zugeschlagen.** Lint und `pnpm test` waren grün,
  während `tsc --noEmit` fünf Fehler meldete: `catalogId` ist Pflichtfeld von `Veranstaltung`
  bzw. `VeranstaltungData`, und fünf Fixtures kannten es noch nicht
  (`app/api/veranstaltung/[id]/bericht/route.test.ts`,
  `app/veranstaltung/[id]/auslagen/page.test.tsx`,
  `app/veranstaltung/[id]/kassieren/page.test.tsx`, `db/auslage.test.ts`, `db/verzehr.test.ts`).
  Ergänzt – jeweils mit einer Zeile Begründung, warum der Wert für den jeweiligen Test
  fachlich neutral ist (Bericht rechnet auf eingefrorenen Preisen, Auslagen sind
  katalog-unabhängig, Kassieren rechnet auf erfassten Positionen).
- **Migration gegen die echte, befüllte DB verifiziert:** `pnpm db:migrate` läuft in einem
  Schritt durch und bestätigt damit die Annahme aus den Technischen Notizen (echter
  SQL-`DEFAULT` statt nullable→backfill→NOT-NULL-Expand). Danach alle 95 DB-Integrationstests
  aus `db/veranstaltung|catalog|verzehr|auslage.test.ts` mit gesetzter `DATABASE_URL` grün –
  im normalen `pnpm test`-Lauf sind sie mangels `DATABASE_URL` übersprungen.

### Oberflächen-Verifikation (Schritt 4, nicht in den pre-push-Gates verankert)

Gegen den lokal gestarteten Dev-Server mit einem **Wegwerf**-Playwright-Spec durchgespielt
(bewusst nicht committet: er legt Daten an, analog zur Begründung des flag-gegateten
`e2e/anleitung-veranstalter.spec.ts`). Abgedeckt und grün:

- **AK1** – Veranstaltung über das Formular mit einem zweiten, nicht vorbelegten Katalog
  angelegt; die Detailseite trägt exakt dessen Id im Wechsel-Select.
- **AK2** – die Verzehrerfassung dieser Veranstaltung zeigt den nur in Katalog B existierenden
  Artikel mit dessen Preis.
- **AK3** – Wechsel auf den Standard-Katalog ohne erfassten Verzehr wird übernommen und
  schlägt sofort in der Erfassung durch (Artikel aus Katalog B verschwindet).
- **AK4** – nach einer Position mit `menge > 0` lehnt die Action den Wechsel mit der
  erwarteten Meldung ab.
- **AK6** – ein deaktivierter Katalog verschwindet aus der Auswahlliste des Anlage-Formulars.

Der bestehende `pnpm test:e2e`-Lauf bleibt unverändert grün (8 bestanden, 3 vorbestehend per
Env-Flag übersprungen) – das neue Pflichtfeld bricht den bisherigen Anlage-Weg nicht.

Nicht über den Browser, sondern nur über Tests abgedeckt: **AK5** (Preis-Freeze-Regression,
bestehende Mechanik) und **AK8** (Rollen-Gate) – beide brauchen einen Rollen-/Abschluss-Zustand,
den der Seed-Admin nicht hergibt (er trägt beide Rollen).

### /test (2026-09-24)

- **Coverage:** `pnpm test:coverage` – 90,78 % Statements / 97,17 % Branches / 90,49 % Lines
  gesamt (Schwelle 80 %), neuer Code aus #346 (`app/veranstaltung/actions.ts`, `schema.ts`,
  `KatalogWechsel.tsx`, `[id]/page.tsx`) praktisch bei 100 % – keine Lücken gegenüber AK1–AK8/
  FS1–FS4 (per Review-Runde 1 einzeln gegen die Spec verifiziert).
- **DB-Integrationstests** (`DATABASE_URL` gesetzt, 95 Tests in `db/veranstaltung|catalog|
  verzehr|auslage.test.ts`) grün. Dabei ein Fund: die im Umsetzungs-Notizen-Abschnitt erwähnte
  Wegwerf-Playwright-Verifikation hatte reale, nicht `__test__`-präfixierte Zeilen (3 Kataloge
  „E2E346 Zweitkatalog …", je ein Artikel, 1 Veranstaltung) in der lokalen Dev-DB hinterlassen
  und nie aufgeräumt – das brach `should_assignEveryPreexistingItemToStandardCatalog_when_
  migrated` in `db/catalog.test.ts` (vorbestehender Test aus #59, nicht durch #346 verändert;
  Migration 0013 rührt `catalog_item` nicht an). Nutzer hat die 5 Zeilen nach Verifikation
  fehlender Fremdreferenzen (`veranstaltung_zeile`/`auslage`/`veranstaltung_ereignis` = 0
  Treffer) manuell gelöscht; Suite danach grün (43 bzw. 95 von 95 Tests).
- Keine fehlenden Tests identifiziert, keine Produktionscode-Änderung in diesem Schritt.

### /refactor (2026-09-24)

Review-Nitpicks durchgegangen: die meisten sind bewusst nicht behoben (YAGNI bei nur zwei
`KatalogWechsel`/`StatusToggle`-Instanzen; `inputClass`-Duplikation ist vorbestehendes,
projektweites Muster – guter `/codify`-Kandidat, aber kein Scope dieser Task; TOCTOU-Fenster
und Edge-Case „alle Kataloge deaktiviert" sind funktional korrekt/kein Bug). Ein Fund war eine
reine Struktur-Verbesserung ohne Verhaltensänderung:

- `app/veranstaltung/schema.test.ts`: Testname `should_reject_when_catalogIdMissing` →
  `should_reject_when_catalogIdBlank` (der Input war Whitespace, nicht ein fehlendes Feld).

Keine sonstigen Refactorings – der Code aus `/implement` war bereits sauber (Review-Runde 2:
keine kritischen/wichtigen Findings zu Clean Code/Testqualität). Tests vor und nach dem
Refactoring identisch grün (`pnpm test`, DB-Integrationstests).

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
_Keine offenen Fragen mehr – ADR-Bedarf durch /architecture geklärt (siehe Technische Notizen)._

## Review-Findings
<!-- Wird durch /review befüllt -->
Drei Runden (Logik/Korrektheit, Code-Qualität, Architektur/Konsistenz) – **APPROVED**, keine
kritischen oder wichtigen Findings, nur optionale Nitpicks. Details: [review-346](review-346.md).

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/346-katalog-je-veranstaltung`
Erstellt: 2026-09-23 19:29
