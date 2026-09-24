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
- [x] AK12 (nachgetragen aus Review-Runde 1): GIVEN eine Veranstaltung mit mind. einer Zeile mit
      gesetztem `erhaltenCents` WHEN ein Lösch-Request eintrifft THEN wird er serverseitig
      abgelehnt – auch ohne Verzehr und ohne Auslage.

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

**Runde 1 (`tasks/review-352.md`): NEEDS_REWORK** – 1 kritisch, 2 wichtig, 3 Nitpicks.
Rework in dieser Task erledigt; Details und Mutationsbelege je Fund im Abschnitt „Rework-Runde 1"
desselben Reports. Kurzfassung:

- **Kritisch:** Die Lösch-Sperre ignorierte bereits **kassiertes Geld**. `kassiereZeile` verlangt
  keinen Verzehr – eine reine Spende hinterlässt eine Zeile mit `erhaltenCents`, aber keine
  Position mit `menge > 0` und keine Auslage, und fiel damit durch beide bestehenden Sperren. Der
  Hard-Delete hätte den Betrag per Cascade unwiederbringlich entfernt. Behoben durch eine dritte
  Sperre (`erhaltenCents !== null`) plus **AK12/FS6 in der Spec** – die Lücke saß auch im
  Spec-Wortlaut, nicht nur im Code (Lesson #253: eine im selben PR entstandene Spec ist selbst
  prüfpflichtig).
- **Wichtig:** `updateVeranstaltungMetaAction` revalidierte die drei Unterseiten nicht, die die
  Bezeichnung anzeigen; der Cascade-Integrationstest deckte nur zwei der vier Kind-Tabellen ab.
- **Nitpicks 1 + 3 behoben** (veraltete Status-Meldungen), **Nitpick 2 bewusst abgelehnt**: eine
  neutrale No-Match-Meldung nur an den #352-Stellen wäre inkonsistent zu
  `setVeranstaltungCatalogAction` – genau die Konsistenz, mit der der Report die Einstufung als
  Nitpick begründet. Eine Änderung an allen drei Stellen berührt #346 und gehört nicht hierher.

**Runde 2 (`tasks/review-352.md`): NEEDS_REWORK** – 0 kritisch, 1 wichtig, 2 Nitpicks. Rework in
dieser Task erledigt; Details und Mutationsbelege im Abschnitt „Rework-Runde 2" desselben Reports.
Kurzfassung:

- **Wichtig:** Der Revalidierungs-Sweep aus Runde 1 ließ ausgerechnet die Route aus, bei der das
  Caching real greift: `/theke/<token>` rendert Bezeichnung, Datum und Kasse und ist die einzige
  betroffene Route **ohne** Auth-Gate, also full-route-cache-fähig. Folge: Der bereits an die
  Teilnehmer verteilte QR-Link zeigte nach einer Korrektur dauerhaft den alten Stand, und nach dem
  Hard-Delete lieferte er die gelöschte Veranstaltung weiter aus. Behoben in **beiden** Actions.
- **Nitpick 1 umgesetzt** (`disabled={pending}` am Abbrechen-Button – bei einem unumkehrbaren
  Hard-Delete wiegt die irreführende Beschriftung schwerer als die Musterkonsistenz zu
  `CatalogControls`), **Nitpick 2 behoben** (Zahlwort-Drift im E2E-Dateikopf, an beiden Stellen).
  **Nitpick 2 der Runde 1 bleibt abgelehnt.**

**Abweichung vom vorgeschlagenen Fix-Weg:** Der Report empfahl, `assertVeranstaltungAenderbar` das
geladene `ziel` zurückgeben zu lassen. Das war nicht nötig – `updateVeranstaltungMeta` und
`deleteVeranstaltung` liefern ihre Zeile schon per `.returning()`, inklusive `token`. Der Token
stammt damit aus dem tatsächlich geschriebenen bzw. entfernten Datensatz, und der Guard bleibt der
rückgabefreie Vor-Check, als den ihn sein Kommentar beschreibt.

**Testnachweis mit Reihenfolge statt Präsenz:** Der `redirect`-Mock in `actions.test.ts` wirft
bewusst kein NEXT_REDIRECT. Eine bloße „wurde aufgerufen"-Assertion auf die Theke-Revalidierung im
Lösch-Pfad wäre deshalb auch dann grün, wenn die Zeile hinter dem `redirect` stünde – wo sie in
Produktion nie liefe. Der neue Test vergleicht daher `invocationCallOrder`; der Mutationslauf
(Zeile hinter den `redirect` verschoben) macht genau diesen Vergleich rot.

**Runde 3 (`tasks/review-352.md`): NEEDS_REWORK** – 0 kritisch, 3 wichtig, 6 Nitpicks. Drei
Personas, jede Fremd-Behauptung vom Orchestrator an Datei/Zeile nachgeprüft, zwei Funde
zusätzlich per eigener Messung belegt. Kurzfassung der Wichtig-Findings:

- **`VeranstaltungMetaForm.tsx:73`** – der `onClick`-Reset am Submit-Button ist von keinem Test
  ausgeführt (einzige unabgedeckte Zeile der Datei), und er feuert auch dann, wenn die
  HTML-Constraint-Validierung die Absendung abbricht. Browser-Probe: bei leerem Pflichtfeld
  `["click"]` ohne `submit`. Folge: eine alte „Änderungen gespeichert."-Meldung erscheint über
  einem leeren Pflichtfeld wieder – derselbe Zustand, den Nitpick 3 der Runde 1 beseitigen
  sollte, nur auf einem zweiten Pfad. Beides löst dieselbe Zeile: Reset an `onSubmit` des
  Formulars statt an `onClick` des Buttons, plus der fehlende Test.
- **`actions.ts:187-189`** – die Begründung „keine Fachsperre beim Bearbeiten" trägt für
  `bezeichnung`/`datum`, aber nicht für `kasse` (Geldtopf, nicht Etikett). Dasselbe
  `erhaltenCents`, das 30 Zeilen weiter das Löschen sperrt, lässt sich hier umhängen. AK1 nennt
  die Kasse ausdrücklich als bearbeitbar – deshalb **dokumentieren statt sperren**; eine Sperre
  widerspräche der Spec und braucht eine Nutzer-Entscheidung.
- **`actions.ts:242-266`** – die drei Lösch-Sperren sind Vor-Checks, der guarded DELETE trägt
  sie nicht. Der nebenläufige Schreiber ist unauthentifiziert (`adjustVerzehrByTokenAction` hat
  bewusst kein `requireRole`), und unter `neon-http` ist jede der vier Vor-Abfragen ein eigener
  Roundtrip. Die Entscheidung in den Technischen Notizen oben bleibt möglich, muss aber die
  **Unumkehrbarkeit** adressieren statt auf die Konsistenz zu einem reversiblen UPDATE (#346)
  zu verweisen.

**Circuit Breaker:** Das war die dritte Review-Runde. Der Rework dazu ist der letzte innerhalb
des CLAUDE.md-Limits – eine Runde 4 findet nicht statt; offene Punkte gehen danach an den
Menschen bzw. in den Tracker.

**Out-of-Scope (in `docs/factory/kleinfunde.md` verankert):** drei verbliebene Inline-Literale
`"Keine Veranstaltung angegeben."` neben der von #352 eingeführten Konstante.

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/352-veranstaltung-bearbeiten-loeschen`
Erstellt: 2026-09-23 19:28
