# Task 373: listenseiten-liste-zuerst-anlegen-per-button

## Status
- [x] In Bearbeitung
- [x] Review bestanden
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
- [ ] **Mensch, vor dem Merge:** Anleitungs-Screenshots 02/03/04 und `anleitung.pdf` neu erzeugen.
  Die Capture-Spec ist umgestellt, braucht aber eine frisch zurückgesetzte und geseedete DB
  (Kommando im Kopf von `e2e/anleitung-veranstalter.spec.ts`) – die geteilte Dev-DB wurde bewusst
  nicht zurückgesetzt. Bis dahin zeigen Bild 02 noch drei Kacheln (ohne „Theke") und die Bilder
  03/04 noch das alte Formular. Bildunterschrift und „Stand" im Text sind bereits nachgezogen.

## Technische Notizen
- Formular-Dialoge laufen über `app/components/FormularDialog.tsx` (`onSubmit` + `startTransition`
  statt `<form action>`): React setzt ein per `action` abgeschicktes Formular auch nach einer
  Ablehnung zurück – die Eingaben wären weg (AK1.4).
- `setCatalogItemActiveAction` hat jetzt einen Meldungskanal (`useActionState`-Signatur); der
  No-Match des guarded UPDATE meldet „Artikel nicht gefunden." (Fehlerszenario zweiter Tab).
- `CatalogItemForm` entfällt, ersetzt durch `ArtikelAnlegen` (Dialog).
- E2E: die fünffach kopierte Veranstaltungs-Anlage liegt jetzt in `e2e/helpers/listenseiten.ts`.
- Rework Iteration 1: Fokus nach Erfolg mit Zweigwechsel geht auf ein Ersatzziel
  (`useFormularDialog(ersatzFokusId)`): aus dem Leerzustand auf den Seitenkopf-Auslöser
  (`AnlegeDialog imLeerzustand` ersetzt `variant="secondary"`), bei Kategoriewechsel auf die
  umgezogene Katalogzeile (W1). `useSchliessendeAction` liegt jetzt route-neutral in
  `app/components/`, `useDialogFormular` baut darauf auf; ADR-053 D1 nachgezogen (W2).

## Offene Fragen
- [x] Platzierung der Katalog-Management-Aktionen (`CatalogControls`): bleibt als Buttonzeile unter
  der Auswahlliste im Seitenkopfbereich, Verhalten unverändert (entschieden in /implement)
- [ ] Abstimmung #181 (QR/Link/Druck) mit `/verwaltung/theke` – beim Start von #181

## Review-Findings
<!-- Wird durch /review befüllt -->
- Iteration 1 (2026-10-07): NEEDS_REWORK – 0 kritisch, 3 wichtig (W1 Fokusverlust nach Erfolg aus
  Leerzustand, W2 `useDialogFormular` dupliziert `useSchliessendeAction` mit falscher Begründung,
  W3 Anleitung: Bild 02/Unterschrift/Stand fehlen in der Vor-Merge-Checkbox), 14 Nitpicks.
  Details: `tasks/review-373.md`. Out-of-Scope: Issue #398, ein `kleinfunde.md`-Eintrag.
- Rework 1 (2026-10-07): W1–W3 behoben (W1 mit Tests für Leerzustand → Seitenkopf und
  Kategoriewechsel → umgezogene Zeile, je Mutationsbeleg). Nitpicks erledigt: Escape-Fokus-Test,
  Feature-Pfad im Kommentar, ungenutzter Generic, `joinClasses`, Meldungskonstante, Spec-Wortlaut
  „zweiter Tab", E2E-Kommentar `Math.max`. Bewusst offen: Duplikat-Bestätigung nach
  Namensänderung, zwei Meldungen in `CatalogRow`, `CatalogSwitcher`-Rücksprung, bedingte
  E2E-Prüfungen, Link-Teilstring im E2E-Helfer, AK7.2-Test, Test für werfende Action (eine
  werfende Action landet bei `useActionState` in der Error Boundary, der Zustand danach ist
  nicht sinnvoll prüfbar). E2E erneut grün: `listenseiten` 4/4, `veranstaltung-detailseite` 6/6.
- Iteration 2 (2026-10-07): APPROVED – W1–W3 bestätigt behoben, 0 kritisch, 0 wichtig,
  3 Nitpicks (doppelter `FormAction`-Typ, nicht durchgesetzte Seitenkopf-Id, unverifizierter
  Fokusfall beim Umsortieren innerhalb einer Gruppe). Details: `tasks/review-373.md`.

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/373-listenseiten-liste-zuerst-anlegen-per-button`
Erstellt: 2026-10-07 18:41
