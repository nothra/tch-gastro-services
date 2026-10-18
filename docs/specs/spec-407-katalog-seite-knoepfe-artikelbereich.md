# Spec: Katalog-Seite – Katalog-Knöpfe unter der Auswahl, umrandeter Artikelbereich (#407)

> Issue #407 · Teil des UI-Feinschliffs nach #368–#375. Baut auf den Bausteinen aus #403/#405
> (`ListenZeile` mit Dialog-Auslöser, `Aufklapper`, `Notice`, ADR-059/060) und dem Dialog-Muster
> aus spec-372/373 auf. Klickbares Mockup (privat): Ansicht „Katalog“ im Artifact aus dem Issue.

## Kontext

Die Katalog-Seite (`/verwaltung/katalog/[id]`, Rolle `verwalter`) weicht vom Rest der App ab:

- **Zwei Primär-Knöpfe:** „+ Artikel“ (Seitenkopf) und „+ Katalog anlegen“ sind beide primär,
  daneben stehen drei weitere Knöpfe (Umbenennen, Duplizieren, Deaktivieren). Unklar ist, was
  den Katalog betrifft und was die Artikel.
- **Verstreute Katalog-Aktionen:** drei Einzel-Knöpfe mit je eigenem Dialog; Deaktivieren hat
  einen zusätzlichen Bestätigungsdialog.
- **Andere Listenoptik:** Artikel stehen als einzige Liste der App in einer Sammelkarte mit
  Trennlinien statt als Karten-Zeilen (`ListenZeile`).
- **Textreste:** „(inaktiv)“ in der Katalogwahl, Dialogtitel „Neuen Katalog anlegen“, Busy-Text
  „Speichern …“ bei „Anlegen“ – abweichend vom Glossar (`docs/ux/glossar.md`).

Ziel: eine klare Zweiteilung – oben **Katalog** (auswählen, bearbeiten, anlegen), darunter in
einem eigenen Bereich dessen **Artikel** (mit dem einzigen Primär-Knopf der Seite). Es ändern
sich Darstellung, Anordnung und Texte, **nicht** Daten, Berechtigungen, Validierung, Server
Actions oder Routen.

Primärer Nutzer: Rolle `verwalter`, überwiegend am Smartphone.

## Scope

**Inbegriffen:**
- Reihenfolge der Seite: Titel, Katalog-Auswahl, darunter „Katalog bearbeiten“ und „Katalog
  anlegen“ als Neben-Knöpfe.
- Ein Dialog „Katalog bearbeiten“, der Umbenennen, Duplizieren und Deaktivieren/Aktivieren bündelt.
- „Katalog anlegen“ im Standard-Anlege-Dialog; Wegfall des eigenen Dialog-Nachbaus.
- Umrandeter Artikelbereich mit Überschrift und Anzahl, „+ Neu“ als einziger Primär-Knopf.
- Artikel als `ListenZeile` (Preis, Pfeil), gruppiert nach Kategorie, deaktivierte verblasst + Badge.
- Textkorrekturen laut Glossar (AK5).

**Nicht inbegriffen:**
- Felder, Validierung und Server Actions für Artikel und Katalog (`schema.ts`, `actions.ts`),
  Datenmodell, Routen, Berechtigungen.
- Der Dialog „Artikel bearbeiten“ (Felder, Speichern, abgesetztes Deaktivieren/Aktivieren) – er
  bleibt wie in spec-373 AK4.2–AK4.5; nur die Zeile, die ihn öffnet, ändert sich.
- Kategorie-Reihenfolge, Sortierung und Gruppierungslogik der Artikel (bleiben aus spec-373).
- Neue Funktionen wie Suche, Filter, Löschen von Katalogen/Artikeln, Artikel verschieben.
- Katalog-Wechsel auf der Veranstaltungsseite (`KatalogWechsel`).

## Akzeptanzkriterien

### Seitenaufbau (AK1)

- [ ] **AK1.1** GIVEN `/verwaltung/katalog/[id]` WHEN die Seite rendert THEN steht von oben nach
  unten: Seitentitel „Katalog“, die Katalog-Auswahl, **direkt darunter** die Knöpfe „Katalog
  bearbeiten“ und „Katalog anlegen“, danach der Artikelbereich (AK3).
- [ ] **AK1.2** GIVEN die beiden Katalog-Knöpfe THEN sind beide **Neben-Knöpfe**
  (`variant="secondary"`), stehen nebeneinander (umbrechend bei schmaler Breite) und haben eine
  Tippfläche ≥ 44 px hoch.
- [ ] **AK1.3** GIVEN der Seitenkopf THEN enthält er keine Aktion mehr (kein „+ Artikel“ neben
  dem Titel).
- [ ] **AK1.4** GIVEN die gesamte Seite THEN gibt es **genau einen** Primär-Knopf: „+ Neu“ im
  Artikelbereich (AK3.2).
- [ ] **AK1.5** GIVEN der Katalog zur URL-`id` ist nicht auflösbar (`currentCatalog` fehlt) WHEN
  die Seite rendert THEN erscheint „Katalog anlegen“, aber **nicht** „Katalog bearbeiten“; kein
  Absturz (bisheriges Verhalten von `CatalogControls`).

### Katalog bearbeiten / anlegen (AK2)

- [ ] **AK2.1** GIVEN „Katalog bearbeiten“ WHEN der Knopf gedrückt wird THEN öffnet ein Dialog mit
  dem Titel „Katalog bearbeiten“ (Baustein `Dialog`: Escape schließt, Hintergrund inert, Fokus
  kehrt zum Knopf zurück).
- [ ] **AK2.2** GIVEN der geöffnete Dialog THEN bietet er **Umbenennen** (Feld mit dem aktuellen
  Namen vorbelegt, Button „Umbenennen“), **Duplizieren** (Feld „Name der Kopie“, Button
  „Duplizieren“) und **Deaktivieren** bzw. **Aktivieren** – jeweils mit den bisherigen Meldungen
  (Toasts „Katalog umbenannt“, „Katalog dupliziert“, „Katalog deaktiviert“, „Katalog
  aktiviert“) und den bisherigen Fehlermeldungen als `Notice` (Art `fehler`) im Dialog.
- [ ] **AK2.3** GIVEN die drei Bereiche im Dialog WHEN eine Aktion abgelehnt wird (z. B. Name
  vergeben) THEN bleibt der Dialog offen, getippte Eingaben bleiben stehen, und die Meldung
  erscheint beim betroffenen Bereich; die Felder der **anderen** Bereiche werden nicht
  mitgesendet.
- [ ] **AK2.4** GIVEN eine laufende Aktion im Dialog THEN sind die übrigen Aktionen des Dialogs
  (und „Abbrechen“/Schließen) gesperrt, damit nicht doppelt abgesendet wird (Muster
  „Artikel bearbeiten“, spec-373 AK4.5/F-Sperre).
- [ ] **AK2.5** GIVEN ein **inaktiver** Katalog WHEN der Dialog geöffnet wird THEN heißt der
  Button „Aktivieren“ und „Duplizieren“ wird **nicht** angeboten (nur aktive Kataloge sind
  Duplizier-Quellen, #345 AK5).
- [ ] **AK2.6** GIVEN „Deaktivieren“ eines aktiven Katalogs THEN fragt die App weiterhin nach – als
  **Bestätigungsschritt im selben Dialog** (Titel „Katalog deaktivieren?“, `Abbrechen` führt zurück
  zum Bearbeiten-Schritt, ADR-062 D1; Wirkung wie bisher: „… ist danach für neue Veranstaltungen nicht mehr wählbar.“,
  spec-372 AK3); „Aktivieren“ wirkt ohne Rückfrage (reversibel, spec-372 AK4). (Q1)
- [ ] **AK2.7** GIVEN Erfolg einer Aktion im Dialog THEN schließt der Dialog und der Toast
  erscheint auch dann sichtbar (Lesson #372); der Fokus liegt danach auf einem sinnvollen
  Ziel (Auslöser „Katalog bearbeiten“), nicht auf `<body>`.
- [ ] **AK2.8** GIVEN „Katalog anlegen“ WHEN der Knopf gedrückt wird THEN öffnet der
  **Standard-Dialog** (`FormularDialog`, gleiches Verhalten wie `AnlegeDialog`, ADR-062 D3) mit dem Titel „Katalog anlegen“ (bisher: „Neuen
  Katalog anlegen“), dem Feld „Katalogname“, „Abbrechen“ und „Anlegen“; Busy-Text
  „Anlegen …“; Erfolg: Toast „Katalog angelegt“ und Wechsel auf die Seite des neuen Katalogs
  (bisheriges Verhalten).
- [ ] **AK2.9** GIVEN „Katalog anlegen“ THEN ist der Knopf ein Neben-Knopf (AK1.2) und trägt
  **nicht** die Auslöser-Id `anlegen-seitenkopf` des Primär-Knopfs „+ Neu“ (die Id ist je Seite eindeutig, AK3.2). (Q2)
- [ ] **AK2.10** GIVEN die Katalog-Seite THEN gibt es keinen eigenen Dialog-Nachbau (der im Issue
  genannte `CatalogModal` besteht seit spec-372 nicht mehr) und keine Einzeldialoge je Katalog-Aktion mehr; alle Katalog-Dialoge stehen auf `Dialog`/`FormularDialog`/`ConfirmDialog`.

### Artikelbereich (AK3)

- [ ] **AK3.1** GIVEN die Seite WHEN sie rendert THEN stehen die Artikel des gewählten Katalogs in
  einem **umrandeten Bereich** (Kartenoptik wie `Card`, Token-Klassen) mit der Überschrift
  „Artikel“ und der Anzahl aller Artikel des Katalogs (aktive **und** deaktivierte), z. B.
  „Artikel 24“. (Q3)
- [ ] **AK3.2** GIVEN der Artikelbereich THEN steht in seiner Kopfzeile rechts „+ Neu“ als
  **Primär-Knopf**; er öffnet den Dialog „Artikel anlegen“ (Felder, Validierung und Anlegen in
  **diesen** Katalog unverändert, Toast „Artikel angelegt“, Busy „Anlegen …“).
- [ ] **AK3.3** GIVEN die Überschrift „Artikel“ WHEN die Seite von einem Screenreader gelesen
  wird THEN ist der Bereich ein benannter Abschnitt (Überschrift verknüpft, wie in spec-403
  AK1.7/spec-405 AK3.7).
- [ ] **AK3.4** GIVEN ein Katalog ohne Artikel WHEN die Seite rendert THEN steht der Leerzustand
  „Noch keine Artikel in diesem Katalog.“ **innerhalb** des Bereichs (Überschrift „Artikel 0“
  und „+ Neu“ bleiben sichtbar); der Leerzustand führt die Aktion „Artikel anlegen“ als
  Neben-Knopf (Muster der anderen Listenseiten). Damit bleibt „+ Neu“ der einzige Primär-Knopf (AK1.4). (Q4)
- [ ] **AK3.5** GIVEN ein Katalog ohne Artikel, aber mit Artikeln anderer Kataloge THEN gilt der
  Leerzustand nur für den geöffneten Katalog (spec-373 AK6.2 bleibt).

### Artikelzeilen (AK4)

- [ ] **AK4.1** GIVEN Artikel verschiedener Kategorien WHEN der Bereich rendert THEN gliedern
  **kleine Zwischenüberschriften** die Artikel nach Kategorie in der Reihenfolge Getränke,
  Kaffee, Essen (Reihenfolge wie `CATEGORY_LABEL`); Kategorien ohne Artikel entfallen.
  Die Zwischenüberschrift zeigt weiterhin die Anzahl der Gruppe (z. B. „Getränke (12)“). (Q5)
- [ ] **AK4.2** GIVEN ein Artikel WHEN die Zeile rendert THEN ist sie eine `ListenZeile` im
  Dialog-Auslöser-Modus (Button, **kein** Link, `aria-haspopup="dialog"`) mit dem Artikelnamen
  als Titel, der Größe als Untertitel („ohne Größe“, wenn keine gesetzt ist), dem Preis
  (`formatCents`, Ziffern gleicher Breite) als Kennzeichen und dem Pfeil rechts; die **ganze
  Zeile** ist Tipp-Ziel (≥ 44 px). (Q6)
- [ ] **AK4.3** GIVEN die Artikelzeile WHEN sie angetippt oder per `Enter`/`Leertaste` bedient
  wird THEN öffnet der Dialog „Artikel bearbeiten“ mit unverändertem Inhalt und Verhalten
  (spec-373 AK4.2–AK4.5); `Esc`/„Abbrechen“ gibt den Fokus an die Zeile zurück.
- [ ] **AK4.4** GIVEN ein deaktivierter Artikel THEN ist seine Zeile verblasst und trägt das Badge
  „deaktiviert“ (Zustand als Text, nie nur Abblendung; Verhalten wie `ListenZeile` `zustand`);
  er steht an seiner **Sortierstelle** in der Gruppe, nicht gesondert (spec-373 AK4.4 bleibt).
- [ ] **AK4.5** GIVEN die Artikelzeile WHEN sie im Komponenten-Test geprüft wird THEN enthält
  die Zeilen-Komponente keine eigenen Button-/Zeilen-Styles und keine rohen Farbklassen.
- [ ] **AK4.6** GIVEN ein Artikel wechselt über „Speichern“ die Kategorie oder über
  Deaktivieren/Aktivieren den Zustand und die Zeile wird dadurch neu gemountet WHEN der Dialog
  schließt THEN landet der Fokus auf der umgezogenen Zeile bzw. einem Ersatzziel, nicht auf
  `<body>` (Lesson #371/#373).
- [ ] **AK4.7** GIVEN lange Artikelnamen WHEN die Zeile rendert THEN brechen Titel und Untertitel
  um, ohne Preis oder Pfeil aus dem Bild zu schieben.

### Texte (AK5)

- [ ] **AK5.1** GIVEN die Katalog-Auswahl THEN steht ein deaktivierter Katalog als
  „<Name> (deaktiviert)“ (bisher „(inaktiv)“); er bleibt wählbar und editierbar (#345 AK4).
- [ ] **AK5.2** GIVEN die Schalt-Texte für Kataloge und Artikel THEN heißen sie „Aktivieren“ /
  „Deaktivieren“ – nirgends „Reaktivieren“ in sichtbarem UI-Text (Ist-Stand: nur noch ein
  historischer Code-Kommentar in `actions.ts`, bleibt unberührt).
- [ ] **AK5.3** GIVEN die Anlege-Dialoge der Seite („Katalog anlegen“, „Artikel anlegen“) THEN
  zeigen die Absenden-Buttons im Lauf „Anlegen …“ (Busy folgt dem Button-Verb, Glossar;
  bisher beim Artikel „Speichern …“).
- [ ] **AK5.4** GIVEN alle sichtbaren Texte der Seite THEN folgen sie dem Glossar (Verb je
  Aktionstyp, Anrede, „…“-Zeichen mit Leerzeichen); die Abweichungs-Tabelle im Glossar wird
  für die hier korrigierten Stellen nachgezogen (Eintrag „`ArtikelAnlegen.tsx` Busy“).

### Farb-Gate und Doku (AK6)

- [ ] **AK6.1** GIVEN `pnpm lint` THEN bleibt `app/verwaltung/katalog/` im Farb-Gate; alle
  `*.ts`/`*.tsx` darunter enthalten keine rohen Farbklassen und kein `dark:`.
- [ ] **AK6.2** GIVEN die Änderung THEN sind `docs/routes.md` (keine Routen-Änderung → bleibt
  gleich), `docs/ux/glossar.md` (AK5.4) sowie Anleitungs-Texte/-Screenshots geprüft, die den
  Katalog-Dialog oder „+ Artikel“ im Kopf beschreiben (Lesson #391: verschobener Einstiegspunkt).

## Fehlerszenarien

- [ ] **F1** GIVEN ein Artikel/Katalog wurde parallel gelöscht oder deaktiviert WHEN eine Aktion
  abgesendet wird THEN bleibt der Dialog offen und zeigt die bisherige Fehlermeldung der
  Action als `Notice` (unverändertes Action-Verhalten, IDOR-/Soft-Delete-Prüfungen bleiben
  in den Actions).
- [ ] **F2** GIVEN keine Berechtigung (`verwalter` fehlt) WHEN die Seite aufgerufen wird THEN
  bleibt der „Kein Zugriff“-Hinweis; die Server Actions prüfen die Rolle weiter serverseitig.
- [ ] **F3** GIVEN der Dialog ist offen WHEN eine Server-Aktion die Seite neu rendert (Katalog
  umbenannt, Artikel geändert) THEN gehen im Formular getippte Eingaben bei einer Ablehnung
  nicht verloren (kein `<form action>`-Reset, Lesson #373).
- [ ] **F4** GIVEN ein Katalog mit sehr vielen Artikeln in einer Kategorie THEN bleibt der
  Bereich scrollbar; keine Paging-Logik (wie spec-373).
- [ ] **F5** GIVEN der Katalog wird im Dialog umbenannt WHEN die Aktion gelingt THEN zeigt die
  Katalog-Auswahl den neuen Namen, und der geöffnete Dialog zeigt nach dem Neurendern nicht
  mehr den alten Namen als Vorbelegung.
- [ ] **F6** GIVEN der aktuelle Katalog wird deaktiviert THEN bleibt die Seite auf diesem Katalog
  (bisheriges Verhalten); Auswahl zeigt „(deaktiviert)“, Artikel-Bereich und „+ Neu“ bleiben
  bedienbar.

## Entschiedene Annahmen (aus dem Issue abgeleitet)

- Die Katalog-Funktionen (Umbenennen/Duplizieren/Deaktivieren/Aktivieren) ändern ihr Verhalten,
  ihre Texte und ihre Actions nicht – sie ziehen nur in **einen** Dialog um.
- Das „Neu“ im Bereich bleibt bewusst kurz; der Dialogtitel lautet „Artikel anlegen“.
- Der Artikel-Dialog „Artikel bearbeiten“ ist unverändert (Issue nennt ihn nicht).

## Offene Fragen

Alle sechs Defaults von Ralf bestätigt (2026-10-18); Q1/Q2 in ADR-062 entschieden.

- [x] **Q1 Deaktivieren im „Katalog bearbeiten“-Dialog:** Die Rückfrage („Katalog deaktivieren?“)
  bliebe bestehen (AK2.6). Das heißt Dialog über Dialog. *Default:* Rückfrage bleibt; wie sie
  technisch eingehängt wird, ist entschieden: Schritt im selben Dialog, kein zweiter Dialog (ADR-062 D1).
  Alternative: Deaktivieren wie beim Artikel **ohne** Rückfrage, nur mit Erklärsatz –
  widerspräche spec-372 AK3 (Katalog wirkt auf neue Veranstaltungen).
- [x] **Q2 Auslöser-Id/Fokus:** „Katalog anlegen“ nutzt den Standard-`AnlegeDialog`, der
  standardmäßig als Seitenkopf-Primär-Auslöser verdrahtet ist (Primär + feste Id, `imLeerzustand`
  schaltet auf Neben-Knopf). Die Katalog-Seite braucht beides nebeneinander (Neben-Knopf für
  Katalog, Primär für Artikel) → *Default:* AK2.9; ob `AnlegeDialog` dafür erweitert wird, ist
  entschieden: `AnlegeDialog` bleibt unverändert, „Katalog anlegen“ nutzt `FormularDialog` als Neben-Knopf (ADR-062 D3).
- [x] **Q3 Format der Anzahl:** „Artikel 24“ (Issue) vs. „Artikel (24)“ wie bei Aufklappern und
  Kategorie-Zwischenüberschriften. *Default:* „Artikel 24“ laut Issue-Wortlaut, Zahl in
  gedämpfter Optik.
- [x] **Q4 Leerzustand im Bereich:** zusätzlich zu „+ Neu“ eine zweite Anlege-Aktion „Artikel
  anlegen“? *Default:* ja, als Neben-Knopf (Konsistenz mit anderen Listenseiten); ein
  Verzicht darauf (nur Text, „+ Neu“ genügt) wäre ebenfalls AK1.4-konform.
- [x] **Q5 Zähler an den Zwischenüberschriften:** bleibt „Getränke (12)“? Das Issue nennt nur
  „kleine Zwischenüberschriften“. *Default:* Zähler bleibt (bestehendes Verhalten, spec-373 AK4.1).
- [x] **Q6 Inhalt der Zeile:** Untertitel = Größe (bzw. „ohne Größe“) behält die heutige
  Information (`Name · Größe`) bei; das Issue nennt „Preis und Pfeil“. *Default:* Größe als
  Untertitel. Alternative: „Name · Größe“ in einer Zeile ohne Untertitel.
