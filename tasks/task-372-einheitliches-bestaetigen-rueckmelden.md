# Task 372: einheitliches-bestaetigen-rueckmelden

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

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

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/372-einheitliches-bestaetigen-rueckmelden`
Erstellt: 2026-10-08 21:03
