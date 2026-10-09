# Spec: Teilnehmer-Verwaltung im Artikel-Muster (#405)

> Issue #405 · Teil des UI-Feinschliffs nach #368–#375. Baut auf den Bausteinen aus #403
> (`ListenZeile`, `Aufklapper`, spec-403/ADR-059) auf. Klickbares Mockup (privat): Ansicht
> „Teilnehmer“ im Artifact aus dem Issue.

## Kontext

Die Teilnehmer-Stammdatenliste (`/verwaltung/teilnehmer`, Rolle `verwalter`) weicht vom Rest der
App ab:

- **Graue statt weiße Kacheln:** `TeilnehmerRow` setzt kein `bg-surface`; dazu rohe Zink-/Cyan-
  Farben, `rounded` statt `rounded-lg`, eigene `<button>`s. Veranstaltungszeilen sind weiß.
- **Anderes Bearbeiten-Muster als im Katalog:** Bearbeiten klappt inline auf, „Bearbeiten“ und
  „Deaktivieren“ stehen in jeder Zeile, Deaktivieren wirkt sofort ohne Erklärung. Artikel öffnen
  per Tipp auf die Zeile einen Dialog (spec-373 AK4.2–AK4.5).
- **Deaktivierte Teilnehmer stehen gemischt in der Liste**, nur verblasst, ohne Badge.
- **Fehler als roher Text** statt `Notice`; die Duplikat-Warnung beim Anlegen ist ein rohes
  `<p className="text-warning">`.

Ziel: Die Teilnehmerliste folgt dem Muster, das Artikel und Veranstaltungen schon haben. Es
ändern sich Darstellung und Bedienung, **nicht** Daten, Berechtigungen, Validierung oder Routen.

Primärer Nutzer: Rolle `verwalter`, überwiegend am Smartphone.

## Scope

**Inbegriffen:**
- Teilnehmerzeilen als weiße Karten mit Pfeil, ganze Zeile antippbar (Baustein `ListenZeile`).
- Dialog „Teilnehmer bearbeiten“ (Name, Typ, Mitglied; Speichern/Abbrechen; abgesetzt
  Deaktivieren/Aktivieren mit Erklärsatz).
- Aufteilung der Liste in die Aufklapper „Aktiv“ und „Deaktiviert“.
- Fehler-/Erfolgs-/Warnmeldungen über `Notice`; neue Art `warnung` am Baustein `Notice`.
- Leerzustand-Text laut Glossar.
- `app/verwaltung/teilnehmer/` vollständig im Farb-Gate (`eslint/ui-token-files.mjs`).

**Nicht inbegriffen:**
- Anlege-Dialog „Teilnehmer anlegen“ in seiner Funktion (nur die Warn-Darstellung ändert sich,
  AK4), Felder und Validierung (`schema.ts`), Server Actions, Datenmodell.
- Teilnehmerzeile der Veranstaltungs-Detailseite (`ZeileRow`, bereits #403/#404).
- Auslagen-Zeile und Katalog-Seite (eigene Issues).
- Neue Sortierung, Suche oder Filter der Liste.
- Löschen von Teilnehmern (gibt es nicht; nur Deaktivieren).

## Akzeptanzkriterien

### Zeile (AK1)

- [ ] **AK1.1** GIVEN die Teilnehmerliste WHEN sie gerendert wird THEN ist jeder Teilnehmer eine
  Karte im Look der Veranstaltungszeilen (weiß `bg-surface`, `rounded-lg`, Hover/Fokus
  wie `ListenZeile`), mit Pfeil rechts; die **ganze Zeile** ist Tipp-Ziel.
- [ ] **AK1.2** GIVEN ein Teilnehmer WHEN die Zeile gerendert wird THEN zeigt sie den Namen als
  Titel und den Untertitel „Person · Mitglied“, „Person · kein Mitglied“, „Familie ·
  Mitglied“ bzw. „Familie · kein Mitglied“.
- [ ] **AK1.3** GIVEN die Zeile WHEN sie bedient wird THEN ist sie ein Button/Tipp-Ziel, **kein**
  Link (sie führt in keine andere Seite, sondern öffnet den Dialog, AK2.1); sie ist per
  Tastatur fokussierbar (`Enter`/`Leertaste` öffnen), Tippfläche ≥ 44 px hoch.
- [ ] **AK1.4** GIVEN lange Namen WHEN die Zeile gerendert wird THEN brechen Titel und Untertitel
  um, ohne den Pfeil aus dem Bild zu schieben.
- [ ] **AK1.5** GIVEN die Zeile WHEN sie in der Zeilen-Komponente geprüft wird THEN gibt es dort
  keine eigenen Button-/Zeilen-Styles und keine rohen Farbklassen (AK6).

### Dialog „Teilnehmer bearbeiten“ (AK2)

- [ ] **AK2.1** GIVEN eine Teilnehmerzeile WHEN sie angetippt wird THEN öffnet der Dialog mit dem
  Titel „Teilnehmer bearbeiten“ (Baustein `Dialog`, Muster „Artikel bearbeiten“).
- [ ] **AK2.2** GIVEN der geöffnete Dialog THEN enthält er die Felder Name, Typ (Person/Familie)
  und Mitglied, vorbelegt mit den aktuellen Werten, sowie „Speichern“ und „Abbrechen“.
- [ ] **AK2.3** GIVEN gültige Eingaben WHEN „Speichern“ gedrückt wird THEN steht der Button
  währenddessen im Busy-Zustand „Speichern …“, bei Erfolg schließt der Dialog, ein Toast
  „Gespeichert“ erscheint, und die Zeile zeigt die neuen Werte.
- [ ] **AK2.4** GIVEN eine abgelehnte Eingabe (z. B. leerer Name, Name zu lang) WHEN „Speichern“
  gedrückt wird THEN bleibt der Dialog offen, die Eingaben bleiben stehen, und die
  Fehlermeldung steht als `Notice` (Art `fehler`) im Dialog.
- [ ] **AK2.5** GIVEN der Dialog WHEN „Abbrechen“ gedrückt oder per `Esc` geschlossen wird THEN
  werden keine Änderungen gespeichert und der Fokus kehrt zur Zeile zurück.
- [ ] **AK2.6** GIVEN ein **aktiver** Teilnehmer WHEN der Dialog geöffnet ist THEN steht unter dem
  Formular abgesetzt (Trennlinie, wie im Artikel-Dialog) der Button „Deaktivieren“ mit
  einem Satz zur Wirkung: „Deaktivierte Teilnehmer lassen sich keiner Veranstaltung mehr
  hinzufügen. Bestehende Abrechnungen bleiben unverändert.“ (Q1)
- [ ] **AK2.7** GIVEN ein **deaktivierter** Teilnehmer WHEN der Dialog geöffnet ist THEN heißt der
  Button „Aktivieren“, mit dem Satz „Der Teilnehmer lässt sich wieder Veranstaltungen hinzufügen.“ (Q1)
- [ ] **AK2.8** GIVEN „Deaktivieren“/„Aktivieren“ WHEN der Button gedrückt wird THEN wirkt es
  **ohne Bestätigungsdialog** (reversibel, spec-372), zeigt im Lauf „Deaktivieren …“ bzw.
  „Aktivieren …“, schließt den Dialog bei Erfolg und meldet per Toast „Teilnehmer
  deaktiviert“ bzw. „Teilnehmer aktiviert“; der Teilnehmer wechselt den Aufklapper (AK3.5).
- [ ] **AK2.9** GIVEN „Deaktivieren“/„Aktivieren“ WHEN die Aktion abgelehnt wird THEN bleibt der
  Dialog offen und die Meldung steht als `Notice` (Art `fehler`) im Dialog; die im
  Formular bearbeiteten (ungespeicherten) Felder werden nicht mitgesendet.
- [ ] **AK2.10** GIVEN der Dialog WHEN eine Aktion (Speichern oder Aktiv-Umschalten) läuft THEN
  ist die jeweils andere gesperrt, damit nicht doppelt abgesendet wird (wie beim Artikel).

### Aktiv / Deaktiviert (AK3)

- [ ] **AK3.1** GIVEN Teilnehmer in beiden Zuständen WHEN die Seite lädt THEN ist die Liste in die
  Aufklapper „Aktiv (n)“ und „Deaktiviert (m)“ geteilt (Baustein `Aufklapper`, Zähler =
  Anzahl der Einträge).
- [ ] **AK3.2** GIVEN die Seite WHEN sie lädt THEN ist „Aktiv“ aufgeklappt und „Deaktiviert“
  zugeklappt.
- [ ] **AK3.3** GIVEN deaktivierte Teilnehmer WHEN „Deaktiviert“ aufgeklappt wird THEN sind deren
  Zeilen verblasst und tragen das Badge „deaktiviert“ (Zustand als Text, nie nur als
  Abblendung; Verhalten wie `ListenZeile` `zustand`).
- [ ] **AK3.4** GIVEN eine Gruppe ohne Einträge WHEN die Seite lädt THEN erscheint der zugehörige
  Aufklapper **nicht** (kein „Deaktiviert (0)“, kein „Aktiv (0)“).
- [ ] **AK3.5** GIVEN ein Teilnehmer wird deaktiviert/aktiviert WHEN die Aktion erfolgreich ist
  THEN erscheint er in der anderen Gruppe, Zähler beider Aufklapper stimmen, und der Fokus
  bleibt auf der umgezogenen Zeile bzw. fällt auf ein sinnvolles Ersatzziel, falls die
  Zeile durch den Gruppenwechsel neu gemountet wird (Lesson #371/#373).
- [ ] **AK3.6** GIVEN die Gruppen WHEN sie gerendert werden THEN bleibt die bisherige Reihenfolge
  (`listTeilnehmer`) innerhalb jeder Gruppe unverändert.
- [ ] **AK3.7** GIVEN die Seite WHEN sie von einem Screenreader gelesen wird THEN sind die Gruppen
  als Abschnitte mit Namen auffindbar (Überschriften-Semantik wie in der Veranstaltungsliste,
  spec-403 AK1.7).

### Meldungen über `Notice` (AK4)

- [ ] **AK4.1** GIVEN der Baustein `Notice` WHEN er gerendert wird THEN kennt er zusätzlich die
  Art **`warnung`**: Token-Farben (`warning`/`warning-subtle`, kein rohes Farbwort),
  sichtbares Zeichen (nicht nur Farbe), `role="status"`; ohne Inhalt entsteht weiterhin
  kein Element.
- [ ] **AK4.2** GIVEN beim Anlegen eines Teilnehmers mit bereits aktivem gleichem Namen WHEN die
  Duplikat-Warnung erscheint THEN wird sie als `Notice` (Art `warnung`) angezeigt statt als
  rohes `<p>`; Wortlaut, Button „Trotzdem anlegen“ und das Überstimmen (ADR-022) bleiben
  unverändert – auch im Dialog „Teilnehmer anlegen“ der Veranstaltung (spec-404 AK4.3, die
  Komponente `DuplikatWarnung` wird dort mitverwendet).
- [ ] **AK4.3** GIVEN die Teilnehmerverwaltung WHEN eine Fehlermeldung erscheint THEN ist es eine
  `Notice` (Art `fehler`) – es gibt in `app/verwaltung/teilnehmer/` kein rohes
  `text-red-*`/`text-danger`-`<p>` mehr.

### Leerzustand (AK5)

- [ ] **AK5.1** GIVEN es gibt keinen Teilnehmer WHEN die Seite lädt THEN zeigt sie den Leerzustand
  „Noch keine Teilnehmer angelegt.“ mit der Aktion „Teilnehmer anlegen“ (bisher: „…
  erfasst.“; Glossar-Verb „anlegen“, spec-375).
- [ ] **AK5.2** GIVEN es gibt keinen Teilnehmer WHEN die Seite lädt THEN erscheint weder
  „Aktiv“ noch „Deaktiviert“.

### Farb-Gate (AK6)

- [ ] **AK6.1** GIVEN `eslint/ui-token-files.mjs` WHEN `pnpm lint` läuft THEN steht
  `app/verwaltung/teilnehmer/` als **Verzeichnis** in der Liste (ersetzt die drei bisherigen
  Einzeleinträge dieses Ordners samt dem Kommentar „`TeilnehmerRow` bleibt unverändert“),
  und alle `*.ts`/`*.tsx` darunter enthalten keine rohen Farbklassen/`dark:`.

## Fehlerszenarien

- [ ] **F1** GIVEN ein Teilnehmer wurde parallel von anderer Stelle deaktiviert/gelöscht WHEN
  „Speichern“ oder „Deaktivieren“ gedrückt wird THEN bleibt der Dialog offen und zeigt die
  bisherige Fehlermeldung der Action als `Notice` (unverändertes Action-Verhalten).
- [ ] **F2** GIVEN keine Berechtigung (`verwalter` fehlt) WHEN die Seite aufgerufen wird THEN
  bleibt der bisherige „Kein Zugriff“-Hinweis; die Server-Actions prüfen die Rolle weiter
  serverseitig (unverändert).
- [ ] **F3** GIVEN der Dialog ist offen WHEN die Seite durch eine Server-Aktion neu rendert THEN
  gehen im Formular getippte Eingaben bei einer Ablehnung nicht verloren (kein
  `<form action>`-Reset, Lesson aus #373).

## Entschiedene Annahmen (aus dem Issue abgeleitet)

- Der Titel „Teilnehmer (n)“ über der Liste entfällt zugunsten der Zähler in den Aufklappern.
- Nutzerfreundliche Tipp-Fläche = die Karte; „Bearbeiten“/„Deaktivieren“ stehen **nicht** mehr
  in der Zeile.
- Toast-Texte bleiben: „Gespeichert“, „Teilnehmer deaktiviert“, „Teilnehmer aktiviert“.

## Offene Fragen

> **Entschieden mit Ralf:**

- [x] **Q1 Wortlaut der Wirkungssätze:** wie in AK2.6/AK2.7 (Ralf bestätigt).
- [x] **Q2 `ListenZeile` ist heute nur ein Link** (`href` Pflicht). Die Teilnehmerzeile ist ein
  Dialog-Auslöser (Button). Nötig ist eine Variante „öffnet etwas“ (Button statt Link)
  – bei gleicher Karten-Optik, Pfeil, Verblassen/Badge. Das ändert die API eines geteilten
  Bausteins (ADR-059 D1) → **entschieden in `/architecture`:** ADR-060 (Union `href` | `onOeffnen`,
  Slot `anhang`).
- [x] **Q3 Rolle der Warnung:** `Notice` `warnung` mit `role="status"` (wie bisher, nicht
  unterbrechend) – übernommen (AK4.1).
