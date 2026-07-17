# Spec: Getränke-Katalog um Kategorie `essen` erweitern

> Feature F2-Erweiterung · Issue #116 · Epic [Digitale Veranstaltungs-Abrechnung](README-montagsrunde.md)
> Erweitert das gemergte F2/#49 ([spec-49](spec-49-getraenke-katalog.md)); Modell-Entscheidung
> in [ADR-023](../adr/023-veranstaltung-datenmodell.md) §D4/§D7.

## Kontext

Aus der Requirements-Schärfung von #51 (2026-07-15): **Essen ist keine Eigenschaft der
Veranstaltung mehr.** Es gibt keinen Essenpreis je Abend und keine spontane Preiseingabe.
Stattdessen sind Essen-Positionen **Katalogartikel mit festem Preis** – eine neue Kategorie
`essen` neben den bestehenden `getraenk` und `kaffee`. Bei der Verzehr-Erfassung (F5/#52) wählt
man ein Essen wie jeden anderen Katalogartikel aus.

Warum ein eigenes Issue: F2/#49 (das `catalog_category`-Enum, [spec-49](spec-49-getraenke-katalog.md))
ist bereits gemergt. `essen` erweitert dieses Enum um genau einen Wert – ein reiner Enum-Wert-Zusatz,
**nicht** der Wert-Wechsel/Drop-and-recreate-Fall aus #48.

## Scope

**Inbegriffen:**
- `catalog_category` um den Wert `essen` erweitern (nur additiv).
- Essen-Artikel im Katalog pflegbar machen (anlegen, bearbeiten, deaktivieren/aktivieren) –
  über **dieselben** Felder wie Getränke/Kaffee: Bezeichnung, Größe (optional), fester Preis in
  EUR (≤ 2 Nachkommastellen), Sortierung, aktiv/inaktiv. Beispiele:
  „Essen Montagsrunde 6 €", „Essen Montagsrunde 6,50 €", „Bratwurst mit Brötchen 4 €".
- Kategorie `essen` in der Anlege-/Bearbeiten-UI **auswählbar** und im Listeneintrag
  **korrekt beschriftet** (Kategorie-Label „Essen").
- Server-Validierung (Zod) akzeptiert `essen` als gültige Kategorie; Fehlermeldung bei
  ungültiger Kategorie nennt alle drei gültigen Kategorien.
- **UI-Umbenennung** von „Getränke-Katalog" auf „Katalog" (Seitentitel/Überschrift), da der
  Katalog jetzt auch Speisen enthält. Nur Anzeigetext – **keine** Route-Änderung
  (`/verwaltung/katalog` bleibt).
- spec-49 aktualisieren: `essen` als gültige Kategorie dokumentieren, den Widerspruch
  „Essen ist **nicht** hier" / „Essen gehört NICHT hierher" entfernen.

**Nicht inbegriffen:**
- **Kein Seeding** von Essen-Referenzartikeln. Die Kategorie startet leer; der Verwalter legt
  Essen-Artikel selbst an. (Die Beispiele im Issue sind Illustration, kein Startbestand.)
- Die **Auswahl/Erfassung** eines Essens beim Verzehr – gehört zu F5/#52 (spec-52).
- Route-/Verzeichnis-Umbenennung von `/verwaltung/katalog`.
- Preis-Historie, veranstaltungstyp-abhängige Preise, Bestandsverwaltung (wie spec-49).
- Kategorie-abhängige Gruppierung/Filterung in der Katalog-Liste (die Liste bleibt eine
  flache, nach Sortierung geordnete Ansicht – wie heute).

## Akzeptanzkriterien

- [ ] GIVEN ein angemeldeter Verwalter WHEN er einen Artikel mit Bezeichnung, Preis und
      Kategorie `essen` anlegt THEN erscheint der Artikel im Katalog in der Kategorie `essen`.
- [ ] GIVEN ein Verwalter im Anlege-/Bearbeiten-Formular WHEN er die Kategorie wählt THEN steht
      `essen` (Label „Essen") neben `getraenk` und `kaffee` zur Auswahl.
- [ ] GIVEN ein Essen-Artikel im Katalog WHEN die Liste angezeigt wird THEN trägt seine Zeile
      das Kategorie-Label „Essen".
- [ ] GIVEN eine Kategorie-Eingabe an der Server-Grenze WHEN sie nicht `getraenk`, `kaffee`
      oder `essen` ist THEN wird sie serverseitig (Zod) abgelehnt.
- [ ] GIVEN bestehende Getränke-/Kaffee-Artikel WHEN die Migration `0000 → … → n` gegen eine
      Wegwerf-DB läuft THEN läuft sie grün durch und die bestehenden Artikel bleiben unverändert.
- [ ] GIVEN die Katalog-Seite WHEN sie geöffnet wird THEN lautet Seitentitel/Überschrift
      „Katalog" (nicht mehr „Getränke-Katalog").
- [ ] GIVEN spec-49 WHEN sie gelesen wird THEN nennt sie `essen` als gültige Kategorie und
      enthält keinen Satz mehr, der Essen aus dem Katalog ausschließt.

## Fehlerszenarien

- [ ] Ungültiger/negativer Preis bei einem Essen-Artikel → Validierungsfehler an der
      Server-Grenze (wie bei Getränk/Kaffee, spec-49).
- [ ] Doppelte Kombination Bezeichnung+Größe eines Essen-Artikels → Hinweis, kein stiller
      Duplikat-Eintrag (bestehende Unique-Regel `catalog_item_name_size_unique` gilt
      kategorie-übergreifend).
- [ ] Unbekannter Kategorie-Wert im Request (manipuliertes FormData) → Zod-Ablehnung,
      kein Insert/Update.

## Gesetzte Entscheidungen (2026-07-16, /requirements)

- **Kein Seeding von Essen-Artikeln.** Kategorie startet leer; Verwalter pflegt selbst.
- **UI-Umbenennung „Getränke-Katalog" → „Katalog".** Nur Anzeigetext, Route bleibt
  `/verwaltung/katalog`.
- **`essen` ist ein additiver Enum-Wert** (nicht Drop-and-recreate, #48) – Modell bereits
  in ADR-023 §D4/§D7 entschieden.

## Offene Fragen

- [ ] Keine offenen Fragen.
