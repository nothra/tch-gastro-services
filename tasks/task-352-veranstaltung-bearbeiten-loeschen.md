# Task 352: veranstaltung-bearbeiten-loeschen

## Status
- [x] In Bearbeitung
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
- [x] GIVEN eine Veranstaltung im Status `offen` WHEN der Veranstalter Bezeichnung, Kasse
      und/oder Datum ändert und speichert THEN werden die neuen Werte übernommen.
- [x] GIVEN eine Veranstaltung im Status `offen` WHEN Bezeichnung leer oder Datum ungültig/leer
      ist THEN wird das Speichern serverseitig abgelehnt.
- [x] GIVEN eine Veranstaltung im Status `abgeschlossen` WHEN ein Bearbeiten-Request eintrifft
      THEN wird er serverseitig abgelehnt.
- [x] GIVEN eine Veranstaltung ohne Verzehr-Position mit `menge > 0` und ohne `auslage`-Zeile
      WHEN der Veranstalter sie löscht THEN wird sie inkl. ihrer Zeilen endgültig entfernt.
- [x] GIVEN eine Veranstaltung mit mind. einer Verzehr-Position mit `menge > 0` WHEN ein
      Lösch-Request eintrifft THEN wird er serverseitig abgelehnt.
- [x] GIVEN eine Veranstaltung mit mind. einer `auslage`-Zeile WHEN ein Lösch-Request eintrifft
      THEN wird er serverseitig abgelehnt.
- [x] GIVEN eine Veranstaltung mit Teilnehmer-Zeilen, aber ohne Verzehr/Auslage WHEN sie
      gelöscht wird THEN ist das Löschen erlaubt.
- [x] GIVEN der Veranstalter klickt "Löschen" WHEN der Bestätigungsdialog erscheint THEN wird
      erst nach expliziter Bestätigung gelöscht.
- [x] GIVEN eine erfolgreich gelöschte Veranstaltung THEN wird zur Übersicht weitergeleitet.
- [x] GIVEN eine Veranstaltung vom Typ `theke` WHEN Bearbeiten/Löschen versucht wird THEN wird
      serverseitig abgelehnt.
- [x] GIVEN eine Rolle ohne `veranstalter` WHEN Bearbeiten/Löschen versucht wird THEN wird
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

## Umsetzungsnotizen (/implement, 2026-09-24)

**Abweichung von der Architektur-Notiz:** Die Verzehr-Prüfung wurde nicht kopiert, sondern als
geteilter Helfer `hatErfasstenVerzehr()` aus `setVeranstaltungCatalogAction` herausgezogen – zwei
Kopien derselben `menge > 0`-Bedingung wären lautlos divergiert. Die **Meldung** bleibt beim
Aufrufer: `VERZEHR_BEREITS_ERFASST` spricht vom Katalogwechsel und wäre beim Löschen fachlich
falsch, deshalb eigene Konstanten `LOESCHEN_VERZEHR_ERFASST`/`LOESCHEN_AUSLAGE_ERFASST`.
Analog teilen sich Anlage und Bearbeiten die Feldgruppe `veranstaltungStammdaten` im Zod-Schema
und die beiden Schreibwege die guarded WHERE-Bedingung `datierteOffeneVeranstaltung()`.

**Gates (alle grün):** `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, volle Vitest-Suite
**1065/1065** (inkl. der 105 DB-Integrationstests, die nur mit gesetzter `DATABASE_URL` laufen –
davon 38 in `db/veranstaltung.test.ts`), Routen-Doku-Drift-Check. `docs/routes.md` bleibt
unverändert: die Task fügt Komponenten hinzu, keine Route.

**Oberflächen-Verifikation (Schritt 4 des Skills):** neue Playwright-Spec
`e2e/veranstaltung-bearbeiten-loeschen.spec.ts`, 2/2 grün gegen den lokalen Dev-Server. Sie deckt
ab, was jsdom nicht belegen kann: den echten Server-Action-Roundtrip samt Persistenz über ein
Neuladen (AK1), den zweistufigen Bestätigungsdialog (AK8), den Hard-Delete inklusive **404 auf
der Detailroute** danach (AK4) und die Weiterleitung als echten Dokumentwechsel (AK9, in jsdom
nur als „Not implemented: navigation to another Document" sichtbar). Hinter dem Env-Flag
`E2E_VERANSTALTUNG_352=1`, weil sie Daten anlegt – dieselbe Konvention wie
`wechsel-verzehr-kassieren.spec.ts`. Beide Tests räumen ihre Veranstaltung am Ende selbst ab und
nutzen das `__test__`-Präfix der DB-Integrationstests (#346).

**Mutationsbeleg zur AK8-Assertion:** Der erste Mutationsversuch (`Abbrechen` auf
`type="submit"`, `onClick` behalten) blieb **grün** – das `onClick` unmountet das Formular im
selben Event, die Mutation war verhaltensneutral und hätte einen Scheinbeleg geliefert. Erst die
echte Mutation (`type="submit"` **ohne** `onClick`) machte den Test rot, und zwar exakt auf der
AK8-Zeile. Die Assertion hat damit belegte Trennschärfe, nicht nur eine grüne Zeile.

**Telemetrie-Lücke (ADR-049):** Dieser `/implement`-Schritt lief als manueller Stage-2-Aufruf,
nicht über `run-pipeline.sh`. Die OTEL-Instrumentierung hängt am Pipeline-Wrapper, nicht am
Skill-Begriff – für diesen Schritt existieren daher keine Token-/Kosten-Ist-Werte, und sie lassen
sich nicht rückwirkend erheben (bekanntes Muster aus #346).

**Stolperstein bestätigt (#337):** Der E2E-Lauf startet `next dev`, und das hängt einen
`<!-- BEGIN:nextjs-agent-rules -->`-Block an `CLAUDE.md` an. Zweimal aufgetreten, beide Male
verworfen – vor dem Commit gehört ein Blick auf `git status`, nicht nur auf den erwarteten Diff.

## Offene Fragen
_Keine offenen architektonischen Fragen mehr._

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/352-veranstaltung-bearbeiten-loeschen`
Erstellt: 2026-09-23 19:28
