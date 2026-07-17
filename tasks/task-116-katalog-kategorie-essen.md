# Task 116: katalog-kategorie-essen

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
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
- [x] GIVEN Verwalter WHEN er einen Artikel mit Kategorie `essen` anlegt THEN erscheint er im Katalog in Kategorie `essen`. — Enum + Zod + Row-Label; Test `page.test.tsx:should_renderEssenLabel_when_itemCategoryIsEssen`, `schema.test.ts:should_acceptCategory_when_essen`.
- [x] GIVEN Anlege-/Bearbeiten-Formular WHEN Kategorie gewählt wird THEN steht `essen` (Label „Essen") neben `getraenk`/`kaffee` zur Auswahl. — `CatalogFields.test.tsx:should_offerAllThreeCategories…` + `…labelEssenOption…`.
- [x] GIVEN ein Essen-Artikel WHEN die Liste angezeigt wird THEN trägt die Zeile das Label „Essen". — `CATEGORY_LABEL` in `CatalogRow`; Test `page.test.tsx:should_renderEssenLabel…`.
- [x] GIVEN Kategorie-Eingabe an der Server-Grenze WHEN sie nicht `getraenk`/`kaffee`/`essen` ist THEN Zod-Ablehnung. — `schema.test.ts:should_rejectCategory_when_notInEnum`.
- [~] GIVEN bestehende Artikel WHEN Migration `0000 → … → n` gegen Wegwerf-DB läuft THEN grün, Bestand unverändert. — Migration `0008` (additiver `ALTER TYPE … ADD VALUE 'essen'`, Muster wie `0007`) + drizzle-kit-Snapshot vorhanden. Live-Lauf gegen Wegwerf-DB in dieser Session blockiert (siehe Blocker unten); Nachweis über CI-Migrate-Step / `/post-merge-verify`.
- [x] GIVEN Katalog-Seite WHEN geöffnet THEN Titel/Überschrift lautet „Katalog" (nicht „Getränke-Katalog"). — `page.tsx` `<h1>Katalog`; Test `page.test.tsx:should_renderSeededItemsWithFormattedPrice…` prüft Titel + Abwesenheit „Getränke-Katalog".
- [x] GIVEN spec-49 WHEN gelesen THEN nennt `essen` als gültige Kategorie; kein Ausschluss-Satz mehr. — `spec-49` Zeilen 16/20-27.

## Fehlerszenarien
- [x] Ungültiger/negativer Preis bei Essen-Artikel → Validierungsfehler an der Server-Grenze. — `schema.test.ts:should_rejectPrice_when_negative` (kategorie-unabhängig, gilt auch für `essen`).
- [x] Doppelte Bezeichnung+Größe eines Essen-Artikels → Hinweis (Unique gilt kategorie-übergreifend). — bestehende `catalog_item_name_size_unique` unverändert; Kategorie ist nicht Teil des Index.
- [x] Unbekannter Kategorie-Wert im Request → Zod-Ablehnung, kein Insert/Update. — `schema.test.ts:should_rejectCategory_when_notInEnum`.

## Blocker
Blocker [2026-07-17]: AC „Migration gegen Wegwerf-DB grün" nicht live verifizierbar – die
dafür nötigen `docker`-Kommandos (throwaway Postgres) sind in dieser Session nicht
freigegeben. Die Migration `0008` ist rein additiv (`ALTER TYPE … ADD VALUE 'essen'`, PG12+
transaktionssicher, Muster wie `0007`) und der drizzle-kit-Snapshot ist konsistent (alle drei
Enum-Werte). Was der Mensch tun muss: entweder `docker`-Ausführung freigeben und
`pnpm db:migrate` gegen eine Wegwerf-DB laufen lassen, oder den Nachweis dem CI-Migrate-Step /
`/post-merge-verify` überlassen.

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
Nicht-ADR [2026-07-17]: Additiver `catalog_category`-Wert `essen` – bewusst kein neuer ADR.
Trigger-Kategorie 4 (Datenmigration) berührt, aber die Modell-Entscheidung ist bereits in
ADR-023 §D4/§D7 getroffen und in spec-116 als gesetzte Entscheidung dokumentiert. Reiner
additiver Enum-Wert (kein Drop-and-recreate, #48).
- Additiver Enum-Wert → Migration im Muster von `0007` (kein Drop-and-recreate, #48).
- `CATEGORY_LABEL` in `app/verwaltung/katalog/CatalogFields.tsx` ist kanonische Quelle und
  treibt das `<select>` – `essen: "Essen"` ergänzen deckt UI-Auswahl + Zeilen-Label ab.
- Zod-Meldung in `schema.ts` („… muss Getränk oder Kaffee sein.") mitziehen.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
- Keine offenen Fragen (siehe Spec).

## Review-Findings
<!-- Wird durch /review befüllt -->
Review [2026-07-17]: `tasks/review-116.md` → NEEDS_REWORK. Ein Wichtig-Finding:
Zod-Fehlermeldung („Kategorie muss Getränk, Kaffee oder Essen sein.") war ungetestet
(spec-116 fordert alle drei Kategorien in der Meldung).
- [x] Behoben: dedizierter Test `schema.test.ts:should_nameAllThreeCategoriesInMessage_when_categoryInvalid`
  prüft die Meldung gegen ein festes Literal via `firstIssueMessage` (Muster testing-standards).
  Negativ-Nachweis geführt (Meldung mutiert → nur dieser Test rot). Nitpicks: nicht behoben
  (kein Merge-Blocker, bewusst so belassen laut Review).

Review [2026-07-17, Runde 2]: `tasks/review-116.md` → **APPROVED**. Alle drei Personas
(Logik/Korrektheit · Code-Qualität · Architektur) empfehlen APPROVED; 32/32 Katalog-Tests grün.
Keine kritischen und keine in-scope Wichtig-Findings. Ein Wichtig-Finding **out-of-scope**:
`docs/factory/PROJECT-CONTEXT.md:36,38-39` beschreibt noch das alte Essen-Modell (Essenpreis je
Veranstaltung) – vorbestehend, außerhalb spec-116-Scope → Follow-up-Issue (autonome Anlage über
Seam in dieser Session durch Berechtigungsgrenze blockiert; Kommando in review-116.md notiert).

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/116-katalog-kategorie-essen`
Erstellt: 2026-07-16 06:55
