# Task 373: listenseiten-liste-zuerst-anlegen-per-button

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Listenseiten zeigen die Liste zuerst; Anlegen läuft über „+ Neu" im Seitenkopf als Dialog.
Veranstaltungen gruppiert (Offen / Abgeschlossen eingeklappt) mit Katalog + Kasse je Zeile;
„Stehende Theke" zieht auf `/verwaltung/theke` um; Katalog-Artikel kompakt nach Kategorie mit
Bearbeiten-Dialog; Katalogwahl als Auswahlliste. Spec: `docs/specs/spec-373-listenseiten-liste-zuerst.md`.

## Akzeptanzkriterien
Wortlaut (GIVEN/WHEN/THEN) und Fehlerszenarien stehen in der Spec; hier die Kurzform.
- [ ] **AK1** „+ Neu"/„+ Artikel" im Seitenkopf öffnet Anlege-Dialog; Erfolg schließt, Fehler bleibt im Dialog (AK1.1–1.6)
- [ ] **AK2** Veranstaltungen „Offen" / „Abgeschlossen" (eingeklappt, alle) (AK2.1–2.4)
- [ ] **AK3** Stehende Theke auf `/verwaltung/theke` (nur `verwalter`), Nav-Eintrag, `docs/routes.md` (AK3.1–3.5)
- [ ] **AK4** Artikel kompakt als Zeilen nach Kategorie, Bearbeiten/Deaktivieren im Dialog, inaktive gedämpft (AK4.1–4.6)
- [ ] **AK5** Katalogwahl als Auswahlliste im Seitenkopfbereich (AK5.1–5.2)
- [ ] **AK6** Leere Zustände mit Anlege-Aktion (AK6.1–6.2)
- [ ] **AK7** Veranstaltungszeile zeigt Katalog und Kasse (AK7.1–7.3)
- [ ] **AK8** Teilnehmerliste zuerst, Anlegen per Dialog (AK8.1)

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

## Offene Fragen
- [ ] Platzierung der Katalog-Management-Aktionen (`CatalogControls`) im neuen Layout (Vorschlag: Buttonzeile unter der Auswahlliste)
- [ ] Abstimmung #181 (QR/Link/Druck) mit `/verwaltung/theke`

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/373-listenseiten-liste-zuerst-anlegen-per-button`
Erstellt: 2026-10-07 18:41
