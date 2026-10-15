# Task 406: auslagen-ui-grundlage-angleichen

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [ ] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Auslagen-Seite an die UI-Grundlage angleichen: Liste zuerst, „+ Neu“-Dialog, ListenZeile mit Badge,
⋯-Menü, Löschen mit Rückfrage (bleibt erhalten), Bausteine/Tokens/Glossar. Spec: `docs/specs/spec-406-auslagen-ui-grundlage-angleichen.md`.

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [x] AK1 Seitenaufbau: Übersicht über Liste, „+ Neu“ → Dialog „Auslage erfassen“, Leerzustand
- [x] AK2 Zeile als `ListenZeile` mit Badge offen/erstattet; Tipp → „Auslage bearbeiten“
- [x] AK3 ⋯-Menü: Als erstattet markieren / Erstattung zurücknehmen, Bearbeiten, Löschen
- [x] AK4 Löschen mit `ConfirmDialog` (bleibt erhalten), Toast „Auslage gelöscht“
- [x] AK5 Bausteine `Field`/`SelectField`/`Notice`/`Button`/`PageHeader` statt Eigenbau
- [x] AK6 Texte nach Glossar (Toast, Busy, Platzhalter, Kein-Zugriff, „Betrag (€)“)
- [x] AK7 Dateien im Farb-Gate (`eslint/ui-token-files.mjs`)
- [x] Fehlerszenarien F1–F5 (u. a. F2: abgeschlossene Veranstaltung = nur lesen)

## Technische Notizen
ADR-061 (`docs/adr/061-aktionsmenue-baustein-listenzeile-kennzeichen-auslagen.md`):
- `AktionsMenue` + `MenueEintrag` als Baustein unter `app/components/ui/`; `ZeilenMenue` darauf umstellen (Tests unverändert grün).
- `ListenZeile`: neuer Slot `kennzeichen` (Betrag + Badge, nicht verblasst).
- Erstatten = Formular im Menü-Popup, Fehler als `Notice` dort; Löschen weiter über `ConfirmDialog`.
- Nur-lesen (abgeschlossene Veranstaltung): reine Anzeigekarte statt `ListenZeile`.
- TDD-Reihenfolge, Farb-Gate-Einträge und Fokus-Lessons siehe ADR „Implementierungs-Hinweise".

### Umsetzung (/implement, 2026-10-15)
- Kein neuer ADR-Trigger: alle Entscheidungen stehen in ADR-061.
- `AktionsMenue` ruft die Render-Funktion über eine innere Komponente auf (`MenueEintraege`):
  `schliessen` fasst die Auslöser-Ref an, direkt im Render übergeben meldet `react-hooks/refs`.
- `ZeilenMenue` nutzt jetzt `useBestaetigung` (Kleinfund auf `AbschlussAktion` verkleinert).
- `AuslageForm.tsx` enthält `AuslageFormular` (Erfassen + Bearbeiten); `AuslageErfassen.tsx` ist
  die Client-Hülle für `AnlegeDialog` (Seite ist Server Component). ADR-061 D4 angeglichen.
- Farb-Gate: Negativ-Fixtures in `eslint/color-gate-wiring.test.ts` auf `labels.ts` bzw.
  `[id]/verzehr/page.tsx` umgestellt (Lesson #371). Kleinfund „Auslagen rohe Farben" gelöscht.
- E2E: neue Opt-in-Spec `e2e/auslagen.spec.ts` (`E2E_406=1`), Helfer `e2e/helpers/auslagen.ts`;
  `bestaetigen-rueckmelden.spec.ts` und Capture-Spec `anleitung-veranstalter.spec.ts` auf den
  neuen Einstieg umgestellt, Anleitung (Schritt 5) angepasst.
- [x] Oberflächentest: `e2e/auslagen.spec.ts` + `bestaetigen-rueckmelden.spec.ts` gegen lokalen
  Dev-Server gelaufen (2026-10-16, Rework Iteration 2: eigener `next dev -p 3106` über
  `localhost`, `db:migrate` + `db:seed`, `E2E_406=1 E2E_372=1`, Wegwerf-Config ohne `webServer`
  – 4/4 grün)
- [ ] Vor dem Merge (Mensch): Screenshot `docs/anleitung/veranstalter/bilder/09-auslagen.png`
  neu aufnehmen (Capture-Spec, `CAPTURE_ANLEITUNG=1`) – zeigt noch das Formular über der Liste

## Offene Fragen
- Q4–Q7 entschieden in ADR-061.

## Review-Findings
<!-- Wird durch /review befüllt -->
- Iteration 1 (2026-10-15): **NEEDS_REWORK** – 0 kritisch, 4 wichtig, 15 Nitpicks; Details in
  `tasks/review-406.md`. Kern: AktionsMenue schließt während laufender Erstatten-Action (AK3.4),
  Farb-Gate-Gegenprobe grün aus falschem Grund, „Drift-Anker" ohne Bindung, ADR-052/059/060
  ohne Rückverweis auf ADR-061. Out-of-Scope: Issue #419, Kleinfund `login`-Kopie ergänzt.
- Rework Iteration 1 (2026-10-16): alle 4 wichtigen Findings behoben – Sperre im `AktionsMenue`
  (`meldeLauf`, Tests mit laufender Action), Farb-Gate-Gegenprobe auf ungelistete `.tsx` + `fatal`-
  Ausschluss im Helfer, `KARTEN_CLASS` aus `ListenZeile` statt Drift-Anker (ADR-061 angepasst),
  Nachträge in ADR-052/059/060. Nitpicks erledigt: ADR-061 D1-API + Hinweis 2, Kommentarumbruch
  `page.tsx`, Test für Neustart beim Öffnen, Kennzeichen-Reihenfolge im Button-Modus, exakte Zählung
  in `page.test.tsx`, `renderFormular` + `zweck` im Erfassen-Test, Glossar-Stand + Anker
  (`AuslageRow.tsx:143`), Kleinfund-Anker `AbschlussAktion.tsx:57-87`. Bewusst offen (Hinweise ohne
  Spec-Bedarf): Menü-Label-Eindeutigkeit, `STATUS_BADGE` in `labels.ts`, Busy-Text beim Erstatten
  (vorbestehend), `role="menu"`-A11y-Runde.
- Iteration 2 (2026-10-16): **NEEDS_REWORK** – 0 kritisch, 2 wichtig, 5 Nitpicks; alle Findings aus
  Iteration 1 behoben. Offen: „Bearbeiten"/„Löschen" schließen das Menü während laufender
  Erstattung (Ablehnung verpufft, AK3.4) – Sperre auf die Einträge ausweiten; Opt-in-E2E
  `e2e/auslagen.spec.ts` nie gelaufen (Lesson #403). Details in `tasks/review-406.md`.
- Rework Iteration 2 (2026-10-16): beide wichtigen Findings behoben – `AktionsMenue` sperrt
  während eines gemeldeten Laufs alle `MenueEintrag`e über einen Kontext (Konsument verdrahtet
  kein `disabled`); Tests im Baustein (Sperre + Freigabe nach Laufende) und in `AuslageRow`
  („Bearbeiten"/„Löschen" während laufender Erstattung → Menü bleibt, kein Dialog, Ablehnung
  sichtbar; danach wieder bedienbar), RED vor GREEN belegt. E2E gelaufen (siehe Umsetzung).
  Nitpicks: JSDoc `meldeLauf` präzisiert (nur der Erfolg schließt frei), ADR-061 D1 um die
  Eintrags-Sperre ergänzt und neu umbrochen, ADR-060 Z. 41–45 neu umbrochen. Die neue Sperre
  selbst ist nur in jsdom belegt – eine verzögerte Server-Ablehnung lässt sich im E2E nicht ohne
  Eingriff in die Action erzeugen. Gitignorte Wegwerf-Dateien (`scripts/e2e406.tmp.sh`,
  `playwright-406.tmp.config.ts`, `e2e406-*.tmp.log`) konnten mangels `rm`-Freigabe nicht
  gelöscht werden – bitte manuell entfernen.
- Iteration 3 (2026-10-16): **APPROVED** – 0 kritisch, 0 wichtig, 3 Nitpicks (redundantes
  `disabled={pending}` am Erstatten-Eintrag, Wegwerf-Dateien noch im Baum, Fokus nach Ablehnung
  als Teil der offenen A11y-Runde). Beide Findings aus Iteration 2 behoben. Vitest 158/158,
  Lint grün; Typecheck in der Review-Session nicht gelaufen (pre-push prüft ihn).

## Refactoring-Notizen
- /refactor (2026-10-16): Diff gegen `origin/main` geprüft (AktionsMenue, AuslageRow, AuslageForm,
  AuslageErfassen, ZeilenMenue, Seite). Keine Änderung nötig: Funktionen kurz, Namen sprechend,
  keine Duplikation, Kommentare erklären das WHY. Bewusst belassen (Review-Nitpicks, ohne
  Mehrwert bzw. mit Verhaltensrisiko): `disabled={pending}` am Erstatten-Eintrag, `STATUS_BADGE`
  in `AuslageRow`. Vitest (ui, veranstaltung, eslint) 1115/1115 grün.

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/406-auslagen-ui-grundlage-angleichen`
Erstellt: 2026-10-15 22:01
