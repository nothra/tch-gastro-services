# Task 352: veranstaltung-bearbeiten-loeschen

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Veranstalter kann Metadaten (Bezeichnung, Kasse, Datum) einer offenen, datierten Veranstaltung
bearbeiten und eine Veranstaltung löschen, sofern noch kein Verzehr (menge > 0) und keine
Auslagenerstattung erfasst wurde. Hard-Delete, kein Soft-Delete. Die stehende Theke (Typ
`theke`) ist nicht Teil dieses Features. Details: [spec-352](../docs/specs/spec-352-veranstaltung-bearbeiten-loeschen.md).

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [ ] GIVEN eine Veranstaltung im Status `offen` WHEN der Veranstalter Bezeichnung, Kasse
      und/oder Datum ändert und speichert THEN werden die neuen Werte übernommen.
- [ ] GIVEN eine Veranstaltung im Status `offen` WHEN Bezeichnung leer oder Datum ungültig/leer
      ist THEN wird das Speichern serverseitig abgelehnt.
- [ ] GIVEN eine Veranstaltung im Status `abgeschlossen` WHEN ein Bearbeiten-Request eintrifft
      THEN wird er serverseitig abgelehnt.
- [ ] GIVEN eine Veranstaltung ohne Verzehr-Position mit `menge > 0` und ohne `auslage`-Zeile
      WHEN der Veranstalter sie löscht THEN wird sie inkl. ihrer Zeilen endgültig entfernt.
- [ ] GIVEN eine Veranstaltung mit mind. einer Verzehr-Position mit `menge > 0` WHEN ein
      Lösch-Request eintrifft THEN wird er serverseitig abgelehnt.
- [ ] GIVEN eine Veranstaltung mit mind. einer `auslage`-Zeile WHEN ein Lösch-Request eintrifft
      THEN wird er serverseitig abgelehnt.
- [ ] GIVEN eine Veranstaltung mit Teilnehmer-Zeilen, aber ohne Verzehr/Auslage WHEN sie
      gelöscht wird THEN ist das Löschen erlaubt.
- [ ] GIVEN der Veranstalter klickt "Löschen" WHEN der Bestätigungsdialog erscheint THEN wird
      erst nach expliziter Bestätigung gelöscht.
- [ ] GIVEN eine erfolgreich gelöschte Veranstaltung THEN wird zur Übersicht weitergeleitet.
- [ ] GIVEN eine Veranstaltung vom Typ `theke` WHEN Bearbeiten/Löschen versucht wird THEN wird
      serverseitig abgelehnt.
- [ ] GIVEN eine Rolle ohne `veranstalter` WHEN Bearbeiten/Löschen versucht wird THEN wird
      serverseitig abgelehnt.

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

**Kein neuer ADR-Trigger.** Die Umsetzung wendet ausschließlich bereits etablierte Muster an
(guarded UPDATE, `menge > 0`-Verzehr-Check, Action-Struktur) – keine neue Architektur-
Entscheidung, kein neuer Cross-Cutting-Concern. Entscheidungen daher hier statt in einer neuen
ADR dokumentiert.

**Data-Layer (`db/veranstaltung.ts`):**
- `updateVeranstaltungMeta(id, { bezeichnung, datum, kasse })`: guarded UPDATE analog
  `setVeranstaltungCatalog` – `WHERE id = ... AND typ = 'veranstaltung' AND status = 'offen'`,
  `.returning()`. `undefined` bei No-Match (falsche Id, falscher Typ, abgeschlossen).
- `deleteVeranstaltung(id)`: guarded DELETE – `WHERE id = ... AND typ = 'veranstaltung' AND
  status = 'offen'`, `.returning()`. Cascade auf `veranstaltung_zeile` (und darüber
  `verzehr_position`) ist bereits FK-seitig vorhanden (`onDelete: "cascade"`), `auslage`
  ebenso – die fachliche Verzehr-/Auslage-Sperre läuft **vor** dem DELETE in der Action (s. u.),
  nicht als DB-Constraint.

**Action (`app/veranstaltung/actions.ts`), Prüfreihenfolge identisch zu
`setVeranstaltungCatalogAction`:**
1. `requireRole("veranstalter")`
2. Veranstaltung laden → `NOT_FOUND` falls fehlend
3. `ziel.typ !== "veranstaltung"` → ablehnen (Theke ausgeschlossen, spec-352 Scope)
4. `ziel.status !== "offen"` → `NOT_OFFEN`
5. **Nur beim Löschen zusätzlich:** `listPositionen(id).some(p => p.menge > 0)` → Fehler
   (dieselbe Prüfung, dieselbe Konstante `VERZEHR_BEREITS_ERFASST` wie beim Katalogwechsel);
   `listAuslagen(id).length > 0` → neue Fehlermeldung (Auslage erfasst)
6. Guarded UPDATE/DELETE aufrufen, `undefined`-Rückgabe auswerten (TOCTOU-Fall, kein stiller
   Erfolg) – **bewusst kein transaktionaler `NOT EXISTS`-Subquery**: dieselbe
   Race-Toleranz wie beim bereits gemergten Katalogwechsel (#346), keine Verschärfung nur für
   dieses Feature (Konsistenz > punktuelle Perfektion).
7. Löschen: bei Erfolg `redirect(LIST_PATH)` statt `revalidatePath` (Detailseite existiert
   danach nicht mehr).

**Zod-Schema (`app/veranstaltung/schema.ts`):** neues `veranstaltungMetaSchema` = dieselben drei
Feldregeln wie `veranstaltungSchema` (bezeichnung/datum/kasse), aber **ohne** `catalogId`
(Katalogwechsel bleibt eigener Weg, #346) – analog zum bestehenden Schnitt
`katalogWechselSchema` neben `veranstaltungSchema`.

**UI (`app/veranstaltung/[id]/page.tsx`):** neue Komponenten `VeranstaltungMetaForm.tsx` (Edit,
analog `KatalogWechsel.tsx`) und `VeranstaltungLoeschen.tsx` (Button + Bestätigungsdialog nach
dem vorhandenen `<dialog open>`-Muster aus
[`CatalogControls.tsx`](../app/verwaltung/katalog/%5Bid%5D/CatalogControls.tsx) – kein neues
Dialog-Pattern erfinden). Beide nur rendern, wenn
`veranstaltung.typ === "veranstaltung" && veranstaltung.status === "offen"`.

## Offene Fragen
_Keine offenen architektonischen Fragen mehr._

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/352-veranstaltung-bearbeiten-loeschen`
Erstellt: 2026-09-23 19:28
