# Task 372: einheitliches-bestaetigen-rueckmelden

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [x] Codify ausgeführt
- [x] Fertig / PR erstellt

## Beschreibung
Bestätigung für Auslage löschen und Katalog deaktivieren, die drei Katalog-Modals auf die
gemeinsame Dialog-Grundlage, ein app-weiter Toast für Erfolgsrückmeldungen, und der Sperrgrund beim
Öffnen von „Veranstaltung löschen". Spec: `docs/specs/spec-372-einheitliches-bestaetigen-rueckmelden.md`.
Teilnehmer entfernen, Veranstaltung löschen und Abschließen nutzen den `ConfirmDialog` schon.

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [x] AK1/AK2 Auslage löschen mit Bestätigung (danger, Abbrechen/Escape, Fokus-Rückgabe)
- [x] AK3/AK4 Katalog deaktivieren mit Bestätigung, Reaktivieren ohne
- [x] AK5 Katalog anlegen/umbenennen/duplizieren auf der gemeinsamen Dialog-Grundlage
- [x] AK6 Dialoge sperren Schließen während laufender Action; Ablehnung im Dialog
- [x] AK7 Gefahr-Variante bei allen Lösch-/Entfernen-Bestätigungen und beim Auslöser
- [x] AK8 `AuslageRow` nur Bausteine/Token-Klassen, im Farb-Gate
- [x] AK9–AK11 „Veranstaltung löschen": Sperrgrund beim Öffnen, keine Bestätigung; Server prüft weiter
- [x] AK12–AK17 Toast `role="status"` je erfolgreicher Schreibaktion, Fehler `role="alert"` am Ort
- [x] AK18 Texte nach `docs/ux/glossar.md` (#375)
- [x] FS1–FS7 Fehlerszenarien der Spec

## Technische Notizen
ADR: [ADR-058](../docs/adr/058-toast-rueckmeldung-react-hot-toast-bestaetigen-sperrgruende.md) (Accepted).
- **D1** `react-hot-toast`, nur in `ui/Toaster.tsx` + `ui/meldung.ts` (`meldeErfolg`); Toaster im Root-Layout, unten mittig, 5 s, „×".
- **D2** Meldung entsteht in der Client-Hülle (`useSchliessendeAction` + Erfolgstext), nicht im Server. `removeAuslageAction`/`setAuslageStatusAction` werden State-Actions; `deleteVeranstaltungAction` gibt `{ ok: true }`, Client `router.replace` (404-Flash im E2E prüfen).
- **D3** Reine Funktion `lib/…LoeschSperren` (Seite + Action teilen sie), Prop `sperren` an `VeranstaltungLoeschen`; Sperr-Dialog auf `Dialog`, nicht in `ConfirmDialog`.
- **D4** Auslage löschen/Katalog deaktivieren → `ConfirmDialog` (danger); drei Katalog-Modals → `FormularDialog`-Hooks, `CatalogModal` samt `useCloseOnSuccess` löschen.
- Neue Abhängigkeit: `pnpm add react-hot-toast` – im `/security-review` prüfen.
- Glossar-Abweichungen mit Ziel #372 (`docs/ux/glossar.md`) im selben PR streichen.
- Reihenfolge und Risiken: ADR-058 → Implementierungs-Hinweise.

### Implementierungs-Notizen (/implement, 2026-10-09)
- **FS6-Fund im Browser:** „Einstellungen" bleibt nach dem Speichern offen (ADR-056 D3). Der Toast
  im `<body>` lag dann unter dem modalen Dialog – verdeckt, „×" nicht anklickbar, inert.
  `toBeVisible()` meldete trotzdem grün; erst ein Klick und ein Screenshot zeigten es. Lösung:
  `Toaster` rendert per Portal in den zuletzt geöffneten `dialog[open]` (`useSyncExternalStore` +
  `MutationObserver`). Nachgetragen in ADR-058 D1/Konsequenzen. Das Dialogverhalten bleibt gleich.
- Mutationsbeleg: Portal abgeschaltet → E2E FS6 rot („dialog … intercepts pointer events"),
  wiederhergestellt → grün.
- Folge des Portals: im offenen Dialog trifft `getByRole("button", { name: "Schließen" })`
  auch „Meldung schließen" (Teilstring). E2E-Locatoren auf `exact: true` umgestellt
  (`helpers/detailseite.ts`, drei Specs).
- FS5: Die Dialog-Beschreibung (`Dialog.tsx`) bricht jetzt um wie der Titel (`break-words`). Darin stehen
  Namen aus Auslage, Katalog und Löschsperre.
- **Oberflächentests:** neue Spec `e2e/bestaetigen-rueckmelden.spec.ts` (AK1–AK5, AK7, FS6;
  Schalter `E2E_372=1`). Gesamtlauf aller E2E-Specs mit allen Daten-Schaltern gegen einen eigenen
  Dev-Server (Port 3172): 38 bestanden, 1 übersprungen (Anleitungs-Screenshots, eigener Schalter).
  Unit/Integration inkl. DB (`dotenv -e .env.local`): 1648/1648 grün.
- Testdaten: die Katalog-E2E hinterlässt je Lauf einen deaktivierten Katalog
  `__test__E2E372Katalog<Zeitstempel>` (Löschen gibt es nicht).

## Offene Fragen
- **Abhängigkeit:** #375 (Glossar) zuerst umsetzen; `/implement` erst danach starten.
- Keine offenen Fragen: Q1–Q7 sind in der Spec geklärt, Q6 (Bibliothek) durch ADR-058.

## Review-Findings
<!-- Wird durch /review befüllt -->
- Iteration 1 (2026-10-09): **NEEDS_REWORK** – 0 kritisch, 8 wichtig, 15 Nitpicks → `tasks/review-372.md`.
  Out-of-Scope: Issue #402 (Hook umbenennen), drei Einträge + eine Ergänzung in `docs/factory/kleinfunde.md`.
- Rework Iteration 1 (2026-10-09): alle 8 wichtigen Findings behoben, Nitpicks behoben oder
  eingeordnet (Details: `tasks/review-372.md` → „Rework Iteration 1"). Neu: `useBestaetigung`,
  `FormularDialog`, `app/veranstaltung/loeschSperren.ts` (statt `lib/`), Fokus-Pause im Toast.
  Kleinfunde: Bestätigungs-Eintrag auf zwei Stellen reduziert, neu „Theke angelegt" (idempotent).
  Oberflächentests gegen eigenen Dev-Server (Port 3172): alle Specs 37 grün, 1 übersprungen, ein
  `page.goto`-Timeout unter Last (AK12-Test), im Einzellauf zweimal grün; 404-Zwischenbild nach
  „Veranstaltung löschen" per `MutationObserver` ausgeschlossen.
- Iteration 2 (2026-10-09): **APPROVED** – 0 kritisch, 0 wichtig, 6 Nitpicks (optional) →
  `tasks/review-372.md`. Alle acht wichtigen Findings aus Iteration 1 nachgeprüft; keine neuen
  Out-of-Scope-Funde.

## Test-Notizen (/test, 2026-10-09)
- Gesamtlauf inkl. DB (`dotenv -e .env.local`): 119 Dateien, 1668/1668 grün; Coverage 98,63 % Stmts /
  98,74 % Branch / 98,75 % Lines (Schwelle 80 %).
- Einzige Lücke im neuen Code: `Toaster.tsx` – das `disconnect` des `MutationObserver` beim Unmount.
  Neuer Test `should_stopObservingDialogs_when_toasterUnmounts`; Mutationsbeleg (Aufräumfunktion
  geleert → Test rot, wiederhergestellt → 16/16 grün).
- Übrige Restlücken (`Dialog.tsx` Z. 59, `actions.ts` Z. 625, `IdentityGate`, `db/*`) liegen in
  Code, den #372 nicht ändert.
- Kein Produktionscode geändert.

## Refactor-Notizen (/refactor, 2026-10-09)
- Erfolgs-Fokus-Vertrag (Marke zurücksetzen/setzen + Ersatz-Fokus beim Aushängen) steht jetzt einmal
  in `app/components/useErsatzFokus.ts`; `useBestaetigung` und `useFormularDialog` rufen ihn auf
  (vorher zwei wortgleiche Kopien, der Helfer lag in einer Komponenten-Datei).
- `LIST_PATH`-Alias in `app/veranstaltung/actions.ts` entfernt (direkt `VERANSTALTUNG_LISTE_PATH`).
- Typ-Test in `loeschSperren.test.ts` ehrlich benannt; ADR-058 „Konsequenzen" nennt
  `setTeilnehmerActiveAction`; kleinfunde-Anker auf `ZeilenMenue.tsx:21-96` korrigiert.
- Kein neues Verhalten. `vitest app/components app/veranstaltung`: 938/938 grün, pre-commit (Lint) grün.
  `pnpm typecheck` war in dieser Session nicht freigegeben – läuft im pre-push.
- Die gitignorete Wegwerf-Datei `playwright-372.tmp.config.ts` konnte nicht gelöscht werden
  (Freigabe fehlte) – vor dem Merge manuell entfernen.

## Security-Notizen (/security-review, 2026-10-09)
- **PASSED** – 0 kritisch, 0 wichtig, 2 Hinweise → `tasks/security-372.md`. Rollen-Guard, Zod, IDOR
  und serverseitige Lösch-Sperre am Code belegt.
- `react-hot-toast@2.6.1` (+ `goober@2.1.19`): keine Advisories laut npm-Bulk-Advisory-API (Gegenprobe
  `lodash@4.17.15` liefert Treffer); exakter Pin, keine Install-Hooks.
- Keine Out-of-Scope-Funde, keine Issues/Kleinfunde angelegt.
- Gitignorete Wegwerf-Dateien vor dem Merge entfernen: `scripts/advisory372.tmp.sh`,
  `playwright-372.tmp.config.ts`.

## Codify-Notizen
- Drei Lessons (Toast verdeckt unter modalem Dialog, Rezidiv Erfolgs-Fokus-Vertrag, `getByRole`-Teilstring) + ein Rezidiv-Nachtrag
  zu Wegwerf-Artefakten → `tasks/codify-372.md`, Index in `PROJECT-CONTEXT.md`.
- Vor dem Merge manuell löschen: `playwright-372.tmp.config.ts`, `scripts/advisory372.tmp.sh`.

PR-Shepherd 2026-10-09: Merge freigegeben – alle Gates grün (CI 11/11). Gitignorete Wegwerf-Dateien
`playwright-372.tmp.config.ts`, `scripts/advisory372.tmp.sh` lagen noch lokal (`rm` nicht freigegeben) –
nicht im PR, mit dem Worktree nach dem Merge entfernen.

---
Branch: `feature/372-einheitliches-bestaetigen-rueckmelden`
Erstellt: 2026-10-08 21:03
