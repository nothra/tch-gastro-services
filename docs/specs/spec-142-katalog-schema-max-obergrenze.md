# Spec: Katalog-Schema – Obergrenzen für `name`, `size`, `sortOrder`

## Kontext

`app/verwaltung/katalog/schema.ts` (`catalogItemSchema`) validiert Katalogartikel
(Getränke/Kaffee/Essen), bevor sie über `app/verwaltung/katalog/actions.ts` in die
Drizzle-Tabelle `catalog_item` (`db/schema.ts`) geschrieben werden. `name` und `size`
sind Postgres-`text`-Spalten (unbegrenzt) – die DB setzt keine Längengrenze, aktuell
tut das auch Zod nicht. `sortOrder` ist eine `integer`-Spalte (int4, max. 2 147 483 647)
mit `.min(0)`, aber ohne `.max()`.

Damit ist der einzige derzeitige Fehlerpfad für überlange Eingaben ein DB-seitiger
Overflow/eine unbegrenzt lange Zeile – kein nutzbares Validierungsfeedback. Das
widerspricht der projektweiten Regel „Zod: Felder auf `int4`/`text` bekommen eine
Obergrenze" (`docs/factory/PROJECT-CONTEXT.md`, Kern-Kurzregel #4 / `lessons/db-drizzle.md`).

Gefunden als Out-of-Scope-Hinweis im Security-Review von Task #137 (Verzehr-Erfassung
liest `size` nur lesend – der fehlende Guard ist eine Vorbedingung, kein durch #137
eingeführter Defekt).

## Scope

**Inbegriffen:**
- `.max()`-Obergrenze für `name` (50 Zeichen) in `catalogItemSchema`
- `.max()`-Obergrenze für `size` (50 Zeichen) in `catalogItemSchema`
- `.max()`-Obergrenze für `sortOrder` (int4-Maximum 2 147 483 647) in `catalogItemSchema`
  (gleiche Fehlerklasse, gleiche Datei – bewusst mit in diesen Task aufgenommen)
- Domänenspezifische deutsche Fehlermeldungen je Feld
- Je Grenze ein Positiv- (Grenzwert genau erreicht) und ein Negativ-Test (Grenzwert
  überschritten)

**Nicht inbegriffen:**
- Keine Änderung der DB-Spaltentypen (`text`/`integer` bleiben wie sie sind)
- Keine Änderung an `priceCents` oder `category` (bereits bzw. inhärent begrenzt)
- Keine Änderung an anderen Katalog-Schemas/-Tabellen außerhalb von `catalogItemSchema`
- Keine UI-Änderungen (z. B. Live-Zeichenzähler im Formular) – reine Validierungs-Härtung

## Akzeptanzkriterien

- [ ] GIVEN ein Katalogartikel-Formular WHEN `name` genau 50 Zeichen lang ist THEN wird die Eingabe akzeptiert
- [ ] GIVEN ein Katalogartikel-Formular WHEN `name` 51 Zeichen oder mehr lang ist THEN schlägt die Validierung mit der Meldung "Bezeichnung ist zu lang." fehl
- [ ] GIVEN ein Katalogartikel-Formular WHEN `size` genau 50 Zeichen lang ist THEN wird die Eingabe akzeptiert
- [ ] GIVEN ein Katalogartikel-Formular WHEN `size` 51 Zeichen oder mehr lang ist THEN schlägt die Validierung mit der Meldung "Größe ist zu lang." fehl
- [ ] GIVEN ein Katalogartikel-Formular WHEN `sortOrder` genau 2147483647 ist THEN wird die Eingabe akzeptiert
- [ ] GIVEN ein Katalogartikel-Formular WHEN `sortOrder` größer als 2147483647 ist THEN schlägt die Validierung mit einer domänenspezifischen Meldung fehl

## Fehlerszenarien

- [ ] `name` leer bleibt weiterhin durch die bestehende `.min(1, "Bezeichnung ist erforderlich.")`-Regel abgedeckt (keine Regression)
- [ ] `size` bleibt optional (bestehendes `.optional().transform(...)`-Verhalten bleibt erhalten, Obergrenze gilt nur wenn ein Wert übergeben wird)
- [ ] `sortOrder` unterhalb 0 bleibt weiterhin durch die bestehende `.min(0)`-Regel abgedeckt (keine Regression)

## Offene Fragen

_Keine – im Requirements-Gespräch geklärt: `sortOrder` wird in diesem Task mitgefixt,
Obergrenzen `name`/`size` je 50 Zeichen._
