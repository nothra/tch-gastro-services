# Task 116: katalog-kategorie-essen

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Getränke-Katalog (F2/#49, gemergt) um die Kategorie `essen` erweitern. Essen ist keine
Eigenschaft der Veranstaltung mehr (ADR-023 §D4/§D7), sondern ein Katalogartikel mit festem
Preis. Additiver `catalog_category`-Enum-Wert `essen`; Katalog-UI/Validierung/Tests so
erweitern, dass Essen-Artikel mit Name + festem Preis pflegbar und (in F5/#52) auswählbar sind.
UI von „Getränke-Katalog" auf „Katalog" umbenennen. spec-49 aktualisieren.

Spec: `docs/specs/spec-116-katalog-kategorie-essen.md`.

**Entscheidungen (/requirements 2026-07-16):** kein Seeding (Kategorie startet leer, Verwalter
pflegt); UI-Umbenennung „Getränke-Katalog" → „Katalog" (nur Text, Route bleibt).

## Akzeptanzkriterien
<!-- Von /requirements befüllt -->
- [ ] GIVEN Verwalter WHEN er einen Artikel mit Kategorie `essen` anlegt THEN erscheint er im Katalog in Kategorie `essen`.
- [ ] GIVEN Anlege-/Bearbeiten-Formular WHEN Kategorie gewählt wird THEN steht `essen` (Label „Essen") neben `getraenk`/`kaffee` zur Auswahl.
- [ ] GIVEN ein Essen-Artikel WHEN die Liste angezeigt wird THEN trägt die Zeile das Label „Essen".
- [ ] GIVEN Kategorie-Eingabe an der Server-Grenze WHEN sie nicht `getraenk`/`kaffee`/`essen` ist THEN Zod-Ablehnung.
- [ ] GIVEN bestehende Artikel WHEN Migration `0000 → … → n` gegen Wegwerf-DB läuft THEN grün, Bestand unverändert.
- [ ] GIVEN Katalog-Seite WHEN geöffnet THEN Titel/Überschrift lautet „Katalog" (nicht „Getränke-Katalog").
- [ ] GIVEN spec-49 WHEN gelesen THEN nennt `essen` als gültige Kategorie; kein Ausschluss-Satz mehr.

## Fehlerszenarien
- [ ] Ungültiger/negativer Preis bei Essen-Artikel → Validierungsfehler an der Server-Grenze.
- [ ] Doppelte Bezeichnung+Größe eines Essen-Artikels → Hinweis (Unique gilt kategorie-übergreifend).
- [ ] Unbekannter Kategorie-Wert im Request → Zod-Ablehnung, kein Insert/Update.

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
- Additiver Enum-Wert → Migration im Muster von `0007` (kein Drop-and-recreate, #48).
- `CATEGORY_LABEL` in `app/verwaltung/katalog/CatalogFields.tsx` ist kanonische Quelle und
  treibt das `<select>` – `essen: "Essen"` ergänzen deckt UI-Auswahl + Zeilen-Label ab.
- Zod-Meldung in `schema.ts` („… muss Getränk oder Kaffee sein.") mitziehen.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
- Keine offenen Fragen (siehe Spec).

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/116-katalog-kategorie-essen`
Erstellt: 2026-07-16 06:55
