# Task 365: veranstaltung-katalog-nach-wechsel-falsch

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
<!-- Was soll implementiert werden? -->
Bug-Report (Ralf, 2026-09-26): Neuer Katalog angelegt, neue Veranstaltung angelegt und
für diese Veranstaltung auf den neuen Katalog gewechselt (Katalog-Wechsel je Veranstaltung,
#346). Symptome:

1. Beim Teilen/Öffnen des öffentlichen Veranstaltungslinks wird die Veranstaltung noch mit
   dem **alten** (ursprünglichen) Katalog angezeigt – nicht mit dem neu gewählten.
2. Beim Erfassen eines Verzehr-Artikels über diesen Link erscheint die Fehlermeldung
   "Artikel nicht gefunden".

Vermutung: Die öffentliche Teilnehmer-Ansicht/Server-Action löst den Katalog der
Veranstaltung nicht aus der aktuellen `catalogId` der Veranstaltung auf (z. B. gecachter/
alter Wert, falscher Join, oder Lookup über eine andere Quelle als die Veranstaltungs-
Entität selbst). Dadurch stimmen angezeigte Artikel-IDs und die beim Erfassen erwartete
`catalogId` nicht überein → "Artikel nicht gefunden".

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [x] GIVEN eine Veranstaltung, deren Katalog nach dem Anlegen auf einen anderen Katalog
      gewechselt wurde, WHEN der öffentliche Veranstaltungslink geöffnet wird, THEN werden
      die Artikel des **aktuell zugeordneten** Katalogs angezeigt (nicht des ursprünglichen).
- [x] GIVEN dieselbe Ausgangslage, WHEN ein Teilnehmer über den öffentlichen Link einen
      Artikel des aktuellen Katalogs im Verzehr erfasst, THEN wird der Artikel gefunden und
      korrekt gespeichert (keine "Artikel nicht gefunden"-Fehlermeldung).

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

Root Cause [2026-09-26]: `app/theke/[token]/page.tsx:26` (vor dem Fix) – die öffentliche
Selbstbedienungs-Route (F7, Token-Link) lud die Katalog-Artikel hart codiert aus
`STANDARD_CATALOG_ID` statt aus `veranstaltung.catalogId`. Bei #346 ("Katalog je
Veranstaltung") wurde die authentifizierte F5-Seite (`app/veranstaltung/[id]/verzehr/page.tsx:56`)
korrekt auf `veranstaltung.catalogId` umgestellt, das Pendant in der öffentlichen Route
wurde dabei übersehen. Die Verzehr-Erfassungs-Action (`app/veranstaltung/actions.ts`,
`applyVerzehrAdjust`) prüft dagegen bereits korrekt gegen die tatsächliche `catalogId` der
Veranstaltung (frisch aus der DB via `getVeranstaltungByToken`) – dadurch zeigte die Liste
Artikel-IDs aus dem Standard-Katalog an, die beim Erfassen gegen den neuen Katalog
nachgeschlagen wurden und dort nicht existierten → "Artikel nicht gefunden". Kein
Caching-Problem (kein `unstable_cache`/React `cache()`/ISR beteiligt, `revalidatePath`
bereits korrekt verdrahtet) – ein reiner Query-Fehler durch einen bei #346 vergessenen
zweiten Aufrufort.

Fix: `app/theke/[token]/page.tsx:26` – `listActiveCatalog(STANDARD_CATALOG_ID)` →
`listActiveCatalog(veranstaltung.catalogId)` (analog zur authentifizierten F5-Seite), dazu
den stale gewordenen Kommentar korrigiert. Für die stehende Theke (`typ: "theke"`) bleibt
das Verhalten unverändert, da `ensureThekeForKasse` die `catalogId`-Spalte nie setzt und sie
dort beim Standard-Katalog bleibt (#346 AK7).

Reproduktionstest: neuer Testfall
`should_loadCatalogFromVeranstaltung_when_catalogWasSwitchedAwayFromStandard` in
`app/theke/[token]/page.test.tsx` (Wiring-Assertion mit einer vom Standard abweichenden
`catalogId`, analog zu `KATALOG_B_ID` in `app/veranstaltung/[id]/verzehr/page.test.tsx`).
Zusätzlich einen stale gewordenen Test-Kommentar korrigiert und den nicht mehr benötigten
`STANDARD_CATALOG_ID`-Export aus dem `@/db/catalog`-Mock entfernt.

Security-Review: Siehe `tasks/security-365.md`. Ergebnis: PASSED, keine Blocker/wichtigen
Findings, ein informativer Hinweis zur Threat-Model-Einordnung (kein privater/öffentlicher
Katalog-Unterschied in diesem Projekt).

Test-Vollständigkeit: Siehe `tasks/coverage-365.md`. 100 % Coverage auf dem einzigen
geänderten Produktionscode (`app/theke/[token]/page.tsx`), beide Akzeptanzkriterien
testabgedeckt. Kein Produktionscode in diesem Schritt geändert.

Refactoring: Nur der optionale Nitpick aus `tasks/review-365.md` behoben (Kommentar-Ergänzung
in `app/theke/[token]/page.tsx` mit Querverweis auf den bestehenden Theke-Test). Kein neues
Verhalten, Tests vor/nach identisch grün. Sonst keine Struktur-/Naming-/Duplikations-Findings
am 1-Zeilen-Produktionscode-Diff dieser Task.

Hinweis auf Prozess: `/codify` und `/pr-shepherd` (Merge) wurden bislang bewusst nicht
ausgeführt. PR #366 bleibt offen/Draft zur manuellen Freigabe.

Hinweis für `/codify`: Bei einem Feature, das eine bestehende Mechanik an mehreren
Aufruforten (hier: authentifizierte + öffentliche Seite derselben Domäne) ändert, per Grep
prüfen, ob alle Aufrufer der alten Konstante/Mechanik mitgezogen wurden – nicht nur den einen
getesteten Pfad. Passt zum bestehenden Lesson-Muster in `lessons/code-style.md` ("Fix für
falschen Kommentar … per Grep auf kopierte Geschwister-Stellen … ausweiten").

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
Keine.

## Review-Findings
<!-- Wird durch /review befüllt -->
Siehe `tasks/review-365.md`. Ergebnis: APPROVED (3 Runden). Ein Wichtig-Finding (ADR-050
nannte den öffentlichen Token-Pfad nicht als migrierten Lesepfad) wurde im selben Zyklus
behoben. Ein optionaler Nitpick (Kommentar-Querverweis auf bestehenden Theke-Test) offen,
nicht blockierend.

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `fix/365-veranstaltung-katalog-nach-wechsel-falsch`
Erstellt: 2026-09-26 13:23
