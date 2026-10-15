# Task 406: auslagen-ui-grundlage-angleichen

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Auslagen-Seite an die UI-Grundlage angleichen: Liste zuerst, „+ Neu“-Dialog, ListenZeile mit Badge,
⋯-Menü, Löschen mit Rückfrage (bleibt erhalten), Bausteine/Tokens/Glossar. Spec: `docs/specs/spec-406-auslagen-ui-grundlage-angleichen.md`.

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [ ] AK1 Seitenaufbau: Übersicht über Liste, „+ Neu“ → Dialog „Auslage erfassen“, Leerzustand
- [ ] AK2 Zeile als `ListenZeile` mit Badge offen/erstattet; Tipp → „Auslage bearbeiten“
- [ ] AK3 ⋯-Menü: Als erstattet markieren / Erstattung zurücknehmen, Bearbeiten, Löschen
- [ ] AK4 Löschen mit `ConfirmDialog` (bleibt erhalten), Toast „Auslage gelöscht“
- [ ] AK5 Bausteine `Field`/`SelectField`/`Notice`/`Button`/`PageHeader` statt Eigenbau
- [ ] AK6 Texte nach Glossar (Toast, Busy, Platzhalter, Kein-Zugriff, „Betrag (€)“)
- [ ] AK7 Dateien im Farb-Gate (`eslint/ui-token-files.mjs`)
- [ ] Fehlerszenarien F1–F5 (u. a. F2: abgeschlossene Veranstaltung = nur lesen)

## Technische Notizen
ADR-061 (`docs/adr/061-aktionsmenue-baustein-listenzeile-kennzeichen-auslagen.md`):
- `AktionsMenue` + `MenueEintrag` als Baustein unter `app/components/ui/`; `ZeilenMenue` darauf umstellen (Tests unverändert grün).
- `ListenZeile`: neuer Slot `kennzeichen` (Betrag + Badge, nicht verblasst).
- Erstatten = Formular im Menü-Popup, Fehler als `Notice` dort; Löschen weiter über `ConfirmDialog`.
- Nur-lesen (abgeschlossene Veranstaltung): reine Anzeigekarte statt `ListenZeile`.
- TDD-Reihenfolge, Farb-Gate-Einträge und Fokus-Lessons siehe ADR „Implementierungs-Hinweise".

## Offene Fragen
- Q4–Q7 entschieden in ADR-061.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/406-auslagen-ui-grundlage-angleichen`
Erstellt: 2026-10-15 22:01
