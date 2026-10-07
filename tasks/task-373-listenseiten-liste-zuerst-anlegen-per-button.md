# Task 373: listenseiten-liste-zuerst-anlegen-per-button

## Status
- [x] In Bearbeitung
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
- [x] **AK1** „+ Neu"/„+ Artikel" im Seitenkopf öffnet Anlege-Dialog; Erfolg schließt, Fehler bleibt im Dialog (AK1.1–1.6)
- [x] **AK2** Veranstaltungen „Offen" / „Abgeschlossen" (eingeklappt, alle) (AK2.1–2.4)
- [x] **AK3** Stehende Theke auf `/verwaltung/theke` (nur `verwalter`), Nav-Eintrag, `docs/routes.md` (AK3.1–3.5)
- [x] **AK4** Artikel kompakt als Zeilen nach Kategorie, Bearbeiten/Deaktivieren im Dialog, inaktive gedämpft (AK4.1–4.6)
- [x] **AK5** Katalogwahl als Auswahlliste im Seitenkopfbereich (AK5.1–5.2)
- [x] **AK6** Leere Zustände mit Anlege-Aktion (AK6.1–6.2)
- [x] **AK7** Veranstaltungszeile zeigt Katalog und Kasse (AK7.1–7.3)
- [x] **AK8** Teilnehmerliste zuerst, Anlegen per Dialog (AK8.1)
- [x] Oberflächentest gegen lokalen Dev-Server: `e2e/listenseiten.spec.ts` (4/4 grün, 375 px) und
  `e2e/veranstaltung-detailseite.spec.ts` mit den umgebauten Anlege-Helfern (6/6 grün), 2026-10-07
- [ ] **Mensch, vor dem Merge:** Anleitungs-Screenshots 03/04 und `anleitung.pdf` neu erzeugen. Die
  Capture-Spec ist umgestellt, braucht aber eine frisch zurückgesetzte und geseedete DB (Kommando im
  Kopf von `e2e/anleitung-veranstalter.spec.ts`) – die geteilte Dev-DB wurde bewusst nicht
  zurückgesetzt. Bis dahin zeigen die Bilder 03/04 noch das alte Formular.

## Technische Notizen
- Formular-Dialoge laufen über `app/components/FormularDialog.tsx` (`onSubmit` + `startTransition`
  statt `<form action>`): React setzt ein per `action` abgeschicktes Formular auch nach einer
  Ablehnung zurück – die Eingaben wären weg (AK1.4).
- `setCatalogItemActiveAction` hat jetzt einen Meldungskanal (`useActionState`-Signatur); der
  No-Match des guarded UPDATE meldet „Artikel nicht gefunden." (Fehlerszenario zweiter Tab).
- `CatalogItemForm` entfällt, ersetzt durch `ArtikelAnlegen` (Dialog).
- E2E: die fünffach kopierte Veranstaltungs-Anlage liegt jetzt in `e2e/helpers/listenseiten.ts`.

## Offene Fragen
- [x] Platzierung der Katalog-Management-Aktionen (`CatalogControls`): bleibt als Buttonzeile unter
  der Auswahlliste im Seitenkopfbereich, Verhalten unverändert (entschieden in /implement)
- [ ] Abstimmung #181 (QR/Link/Druck) mit `/verwaltung/theke` – beim Start von #181

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/373-listenseiten-liste-zuerst-anlegen-per-button`
Erstellt: 2026-10-07 18:41
