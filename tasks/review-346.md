# Review: Task 346

## Kritische Findings (müssen behoben werden)
_Keine._

## Wichtige Findings (sollten behoben werden)
_Keine._

## Nitpicks (optional)
- [ ] `app/veranstaltung/actions.ts` `setVeranstaltungCatalogAction` – enges TOCTOU-Fenster zwischen `assertKatalogWaehlbar` (Zielkatalog aktiv?) und dem folgenden guarded UPDATE. Sehr eng, keine Datenintegritätsverletzung (FK bleibt gültig); kein Fix nötig.
- [ ] `app/veranstaltung/KatalogWechsel.tsx` – Platzhalter-Option für einen inzwischen deaktivierten, aber zugeordneten Katalog trägt weiterhin dessen `catalogId` als `value`. Ein Submit ohne bewusste Auswahl schlägt serverseitig korrekt mit `CATALOG_INACTIVE` fehl, die Meldung ist für einen Nutzer ohne Änderungsabsicht aber etwas unintuitiv. Rein kosmetisch.
- [ ] `app/veranstaltung/schema.test.ts:63` – Testname `should_reject_when_catalogIdMissing` prüft eigentlich einen Whitespace-Wert (`"   "`), nicht ein fehlendes Feld; `should_reject_when_catalogIdBlank` wäre präziser. Führt zum selben (richtigen) Fehlerzweig.
- [ ] `inputClass`-Tailwind-Konstante ist jetzt sechsfach dupliziert (`AddTeilnehmerForm.tsx`, `ThekeSetup.tsx`, `VeranstaltungForm.tsx`, `AuslageForm.tsx`, `KassiereZeileForm.tsx`, neu `KatalogWechsel.tsx`). Vorbestehendes Projektmuster, durch diesen PR nur um eine weitere Kopie erweitert – guter `/codify`-Kandidat für einen gemeinsamen `lib/ui`-Export, aber nicht Scope dieses PRs.
- [ ] `KatalogWechsel.tsx` vs. `StatusToggle.tsx` – strukturell fast identisch (Form mit hidden `id`, `useActionState`, Error-/Success-Absatz). Bei nur zwei Instanzen vertretbares YAGNI; beim dritten ähnlichen Formular lohnt ein gemeinsamer `ActionForm`/`ActionFeedback`-Baustein.
- [ ] `app/veranstaltung/VeranstaltungForm.tsx:20-22` – wären irgendwann alle Kataloge deaktiviert, hätte das Select keine Optionen und `catalogId=""` würde gesendet; Server fängt das über die Zod-Meldung ab, das Formular bietet dem Nutzer aber keine erklärende UI. Nur erreichbar, wenn sämtliche Kataloge deaktiviert werden – Edge-Case, nicht blockierend.
- [ ] `db/catalog.ts:17-24` – `STANDARD_CATALOG_ID`-Re-Export-Kommentar und Original-Kommentar in `db/schema.ts` sind inhaltlich fast identisch (minimal redundant), bewusst begründet (stabiler Importpfad).

## Positives
- Alle Akzeptanzkriterien AK1–AK8 und Fehlerszenarien FS1–FS4 aus der Spec sind im Diff verifiziert korrekt umgesetzt (nicht nur behauptet), jeweils mit eigenem, unterscheidbarem Test belegt.
- Geteilte Helper-Funktion `assertKatalogWaehlbar` verhindert Divergenz zwischen Anlage- und Wechsel-Pfad; keine Duplikation der Katalog-Existenz-/Aktiv-Prüfung.
- Guarded-UPDATE-Pattern (`setVeranstaltungCatalog`) korrekt mit `T | undefined`-Rückgabetyp, TOCTOU-Kommentar, Aufrufer wertet `undefined` explizit aus (Kern-Kurzregel 1).
- Verzehr-Sperre prüft `menge > 0` über `listPositionen`, nicht bloße Zeilen-Existenz – mit dediziertem Test für den Grenzfall (Position vorhanden, `menge = 0`).
- IDOR-Schutz eingehalten: `getCatalogItem` bindet weiter an den Parent-Key (jetzt `veranstaltung.catalogId` statt Konstante).
- Migration `0013_katalog_je_veranstaltung.sql`: echter SQL-`DEFAULT 'standard'` in einem Schritt (keine nullable→backfill→NOT-NULL-Sequenz), wie in den technischen Notizen gefordert; Drift-Guard in `db/catalog.test.ts` erweitert.
- ADR-050-Nachtrag (2026-09-24, #346) ist inhaltlich deckungsgleich mit dem tatsächlichen Code – kein ADR/Code-Drift.
- Kein Mehrfach-Write-Antipattern: `setVeranstaltungCatalog` ist ein einzelnes atomares UPDATE, `runAtomic`/`db.transaction()`-Frage stellt sich hier nicht.
- Schichtgrenzen sauber: Business-Regeln in `actions.ts`, Data-Layer bleibt regel-neutral; RBAC ausschließlich serverseitig (`requireRole("veranstalter")`).
- Keine Routen-Änderung in diesem PR → kein Pflegebedarf für `docs/routes.md`.
- Tests durchgängig AAA, `should_X_when_Y`-Namensschema, keine tautologischen Assertions; Verzehr-Grenztest nutzt bewusst einen Nicht-Standard-Katalog als Fixture, damit die Assertion nicht zufällig grün wird.

## Empfehlung
APPROVED
