# Task 407: katalog-seite-knoepfe-artikelbereich

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Katalog-Seite `/verwaltung/katalog/[id]` neu ordnen: „Katalog bearbeiten“ (Umbenennen, Duplizieren,
Deaktivieren/Aktivieren in einem Dialog) und „Katalog anlegen“ als Neben-Knöpfe direkt unter der
Katalog-Auswahl; Artikel in einem umrandeten Bereich mit „+ Neu“ als einzigem Primär-Knopf, als
`ListenZeile` nach Kategorie gruppiert; Texte laut Glossar. Nur Darstellung/Bedienung, keine
Änderung an Daten, Actions oder Rechten.
Spec: [`docs/specs/spec-407-katalog-seite-knoepfe-artikelbereich.md`](../docs/specs/spec-407-katalog-seite-knoepfe-artikelbereich.md)
· Abhängig von #403 (gemergt).

## Akzeptanzkriterien
Vollwortlaut (GIVEN/WHEN/THEN) in der Spec.
- [ ] **AK1** Seitenaufbau: Titel, Auswahl, darunter „Katalog bearbeiten“ + „Katalog anlegen“ (Neben-Knöpfe); kein Kopf-Primärknopf; genau ein Primär-Knopf auf der Seite (AK1.1–AK1.5)
- [ ] **AK2** Dialog „Katalog bearbeiten“ (Umbenennen/Duplizieren/(De-)Aktivieren), „Katalog anlegen“ als `FormularDialog`-Neben-Knopf, Bestätigungsschritt im selben Dialog (AK2.1–AK2.10)
- [ ] **AK3** Umrandeter Artikelbereich „Artikel <n>“ mit „+ Neu“ (Primär), Leerzustand im Bereich (AK3.1–AK3.5)
- [ ] **AK4** Artikel als `ListenZeile` (Preis, Pfeil), Kategorie-Zwischenüberschriften, deaktivierte verblasst + Badge an der Sortierstelle, Fokus-Rückgabe (AK4.1–AK4.7)
- [ ] **AK5** Texte: „Aktivieren“, „(deaktiviert)“, „Katalog anlegen“, Busy „Anlegen …“, Glossar-Tabelle nachziehen (AK5.1–AK5.4)
- [ ] **AK6** Farb-Gate bleibt grün; Doku/Anleitung/Screenshots auf verschobene Einstiege geprüft (AK6.1–AK6.2)
- [ ] Fehlerszenarien F1–F6 abgedeckt

## Technische Notizen
Entscheidung: [ADR-062](../docs/adr/062-katalog-bearbeiten-dialog-bestaetigungsschritt.md) (Accepted).
Kein Baustein ändert seine API.
- **Dateien neu:** `app/verwaltung/katalog/[id]/KatalogAnlegen.tsx` (`FormularDialog`, secondary),
  `KatalogBearbeiten.tsx` (ein `Dialog`, drei Formulare + Bestätigungsschritt), `ArtikelBereich.tsx`
  (Server: `Card`, Kopfzeile „Artikel <n>" + `ArtikelAnlegen` „+ Neu", h3 je Kategorie, Leerzustand).
- **Dateien ändern:** `page.tsx` (nur komponieren, `PageHeader` ohne Aktion), `CatalogRow.tsx`
  (`ListenZeile onOeffnen` + `anhang`, Muster `TeilnehmerRow`; Preis = `kennzeichen`, Untertitel = Größe /
  „ohne Größe"), `CatalogSwitcher.tsx` („(deaktiviert)"), `ArtikelAnlegen.tsx` (Busy „Anlegen …"),
  `FormularDialog.tsx` (nur Kommentar „Seitenkopf" → „Bereichskopf").
- **Datei löschen:** `CatalogControls.tsx` + `CatalogControls.test.tsx` (Verweise greppen, Lesson #187).
- **KatalogBearbeiten:** Schritt-Zustand im Eltern (beim Öffnen zurück auf „Bearbeiten"); Fokus je
  Richtung explizit (Lesson #404: in Bestätigung → „Abbrechen", zurück → „Deaktivieren", beim Öffnen
  keins); je Bereich eigenes `useDialogFormular`, geteilte `steuerung.gesperrt`; „Schließen" statt
  „Abbrechen" (Glossar prüfen); Duplizieren nur bei aktivem Katalog; „Aktivieren" ohne Schritt.
- **Tests:** Zeile (Button, kein Link, Fokus-Rückgabe, Kategorie-Wechsel → Fokus), Dialog
  (Bereiche senden nur eigene Felder, Sperre, Ablehnung bleibt offen, Schritt hin/zurück beide
  Richtungen, Mutationsbeleg Lesson #369), Seite (Reihenfolge, genau ein Primär-Knopf, Leerzustand im
  Bereich, `currentCatalog` fehlt). E2E ziehen nach: `bestaetigen-rueckmelden`, `listenseiten`,
  ggf. `anleitung-veranstalter` + Screenshots; Playwright-Locatoren `exact: true` (Lesson #372).
- **Glossar:** Abweichungszeile `ArtikelAnlegen.tsx` Busy als erledigt nachziehen (AK5.4).

## Offene Fragen
Siehe Spec → „Offene Fragen“ (Q1–Q6, alle von Ralf mit Default bestätigt):
- [x] Q1 Deaktivieren-Rückfrage bleibt → als Schritt im selben Dialog (ADR-062 D1)
- [x] Q2 Auslöser-Id/Fokus → `AnlegeDialog` unverändert, `FormularDialog` für „Katalog anlegen“ (ADR-062 D3)
- [x] Q3 Anzahl-Format „Artikel 24“ vs. „Artikel (24)“
- [x] Q4 Leerzustand zusätzlich mit „Artikel anlegen“?
- [x] Q5 Zähler an Kategorie-Zwischenüberschriften behalten?
- [x] Q6 Zeileninhalt: Größe als Untertitel?

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/407-katalog-seite-knoepfe-artikelbereich`
Erstellt: 2026-10-18 18:10
