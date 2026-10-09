# Task 405: teilnehmer-verwaltung-artikel-muster

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Teilnehmer-Verwaltung (`/verwaltung/teilnehmer`) im Muster von Artikel/Veranstaltung: weiße
Listenzeilen, Bearbeiten-Dialog mit Aktiv/Deaktiviert, Aufklapper „Aktiv“/„Deaktiviert“, `Notice`
(neue Art „warnung“), Farb-Gate. Spec: `docs/specs/spec-405-teilnehmer-verwaltung-artikel-muster.md`.

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [x] AK1 Zeile: weiße Karte (ListenZeile-Optik), ganze Zeile antippbar, Pfeil, Untertitel „Person/Familie · Mitglied/kein Mitglied“
- [x] AK2 Dialog „Teilnehmer bearbeiten“: Felder, Speichern (Busy „Speichern …“)/Abbrechen, abgesetzt Deaktivieren/Aktivieren mit Wirkungssatz
- [x] AK3 Aufklapper „Aktiv“ (offen) / „Deaktiviert“ (zu, verblasst, Badge), nur bei Einträgen, Fokus nach Gruppenwechsel
- [x] AK4 Meldungen über `Notice`; neue Art „warnung“ (Duplikat-Warnung)
- [x] AK5 Leerzustand „Noch keine Teilnehmer angelegt.“
- [x] AK6 `app/verwaltung/teilnehmer/` als Verzeichnis im Farb-Gate

## Technische Notizen
ADR: [ADR-060](../docs/adr/060-listenzeile-dialog-ausloeser-notice-warnung.md) (Q2 entschieden).
- `ListenZeile`: diskriminierte Union `href` | `onOeffnen` (+ `id`, `ausloeserRef`), neuer Slot `anhang`
  für den Dialog; Link-Konsumenten unverändert. Ein Markup, kein zweiter Baustein.
- `Notice`: Art `warnung` (`role="status"`, Zeichen ⚠, Token `warning`); `DuplikatWarnung` nutzt sie.
- `TeilnehmerRow` nach Muster `CatalogRow` (`useFormularDialog`, zwei Formulare, stabile Zeilen-`id`
  `teilnehmer-<id>` als Ersatz-Fokusziel); Gruppen per `Aufklapper` in der Server-Page.
- Tests: ListenZeile-Button-Betrieb, Notice `warnung`, Gruppen-Logik (Aktiv/Deaktiviert, leere Gruppe
  entfällt), Fokus nach Gruppenwechsel (Playwright), Farb-Gate-Verzeichniseintrag.
- Lessons laden: `frontend-react.md` (Dialog/Fokus), `testing.md` (Gate-Pfadlisten).

### Umsetzung (/implement, 2026-10-09)
- ADR-Trigger-Check: kein neuer Trigger – die API-Änderung an `ListenZeile` und `Notice` ist durch
  ADR-060 gedeckt.
- `ListenZeile`: Props vorab destrukturiert (statt `props.x`), sonst meldet `react-hooks/refs`
  jeden Prop-Zugriff, weil `props` einen Ref trägt; deshalb `never`-Gegenstücke für alle
  Betriebsart-Props. Typ-Wächter-Test mit `@ts-expect-error` (wird von `tsc` geprüft).
- **Fokus in zugeklappter Gruppe (AK3.5):** „Deaktiviert" startet zu, eine dorthin gewanderte Zeile
  ist im Browser nicht fokussierbar – der Fokus fiel auf `<body>`. `useErsatzFokus` fokussiert
  dann das `<summary>` des zugeklappten Aufklappers („Deaktiviert (n)"); ADR-060 D3 nachgezogen.
  Unit-Test mit beiden Richtungen (zu → Kopf, offen → Zeile), Playwright-Nachweis plus
  Gegenprobe (Fallback entfernt → E2E rot).
- Farb-Gate: Gegenprobe in `color-gate-wiring.test.ts` von `TeilnehmerRow.tsx` (jetzt gelistet) auf
  den ungelisteten Nachbarn `AuslageForm.tsx` umgestellt (Lesson #371); `kleinfunde.md`-Eintrag
  auf den Auslagen-Rest gekürzt, Glossar-Anker (`TeilnehmerRow`, `CatalogRow`) nachgezogen.
- E2E: `listenseiten.spec.ts` und die Capture-Spec `anleitung-veranstalter.spec.ts` warteten auf
  die entfallene Überschrift „Teilnehmer (n)" → umgestellt; Anleitungs-Bilder zeigen die
  Verwaltungsseite nicht, kein Neu-Capture nötig. Neue Opt-in-Spec
  `e2e/teilnehmer-verwaltung.spec.ts` (`E2E_405=1`).
- Oberflächentests gegen lokalen Dev-Server (eigener Port 3405, `localhost`, migrierte + geseedete
  DB): `teilnehmer-verwaltung.spec.ts`, `listenseiten.spec.ts` (4 Tests), `teilnehmer-anlegen.spec.ts`
  (Duplikat-Warnung jetzt als `Notice`) – alle grün.

## Offene Fragen
- [x] Q1 Wortlaut der Wirkungssätze (Spec)
- [x] Q2 ListenZeile braucht Button-Variante → /architecture (Nachtrag ADR-059) → ADR-060
- [x] Q3 Rolle der Warnung (status vs. alert)

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/405-teilnehmer-verwaltung-artikel-muster`
Erstellt: 2026-10-09 18:07
