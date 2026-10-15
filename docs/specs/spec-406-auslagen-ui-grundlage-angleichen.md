# Spec: Auslagen an die UI-Grundlage angleichen (#406)

> Issue #406 · Teil des UI-Feinschliffs nach #368–#375. Baut auf den Bausteinen aus #403
> (`ListenZeile`, `Aufklapper`, spec-403/ADR-059) und #405 (`ListenZeile` als Dialog-Auslöser,
> ADR-060) auf. Klickbares Mockup (privat): Ansicht „Auslagen“ im Artifact aus dem Issue.

## Kontext

Der Auslagen-Bereich (`/veranstaltung/[id]/auslagen`, Rolle `veranstalter`) ist der einzige
Veranstalter-Bereich, der nicht auf die UI-Grundlage (#368) umgestellt ist:

- **Formular vor der Liste.** Das Erfassen-Formular steht dauerhaft über der Liste; alle anderen
  Listenseiten zeigen die Liste zuerst, Neues entsteht per „+ Neu“ im Dialog (spec-373).
- **Status nur als Text.** „offen zu erstatten“/„erstattet“ steht im Untertitel, nicht als Badge.
- **Bearbeiten klappt inline auf**, „Als erstattet markieren“, „Bearbeiten“ und „Löschen“ stehen
  als drei Buttons in jeder Zeile (bei vier Auslagen zwölf Buttons am Handy).
- **Kein Baustein genutzt, rohe Zink-Farben:** `AuslageRow`, `AuslageForm`, `AuslagenSummary` und
  `auslagen/page.tsx` verwenden eigene `<select>`/`<input>` und rohe Farben/`dark:`.
- **Texte weichen vom Glossar ab** (spec-375): „Auslage erfasst.“ mit Punkt, Busy „Speichern …“
  beim Erfassen, Platzhalter „Bitte wählen...“, Kein-Zugriff-Text „… Auslagen erstatten.“.

> **Abweichung vom Issue-Text (Ist-Stand geprüft):** Das Issue nennt „Löschen ohne Rückfrage“
> als Problem. Das ist seit #372 (spec-372 AK1/AK8) **bereits behoben** – `AuslageRow` fragt über
> `ConfirmDialog variant="danger"`. Hier ist nur noch sicherzustellen, dass die Bestätigung beim
> Umbau **erhalten bleibt** (AK4), nicht neu zu bauen.

Ziel: Die Auslagen-Seite folgt dem Muster der Veranstaltungsliste und der Artikel. Es ändern sich
Darstellung und Bedienung, **nicht** Daten, Berechtigungen, Validierung, Server-Actions oder Routen.

Primärer Nutzer: Rolle `veranstalter`, überwiegend am Smartphone, an der Theke.

## Scope

**Inbegriffen:**
- Reihenfolge der Seite: Seitenkopf mit „+ Neu“, Summen-Übersicht, Auslagenliste.
- Dialog „Auslage erfassen“ (Anlege-Muster wie „Veranstaltung anlegen“, `AnlegeDialog`).
- Auslagenzeilen als `ListenZeile` mit Status-Badge; Tipp öffnet den Dialog „Auslage bearbeiten“.
- Zeilenmenü ⋯ mit „Als erstattet markieren“/„Erstattung zurücknehmen“, „Bearbeiten“, „Löschen“.
- Löschen mit Rückfrage (bestehende Bestätigung bleibt, jetzt aus dem Menü ausgelöst).
- Felder über `Field`/`SelectField`, Meldungen über `Notice`, Buttons über `Button`/`IconButton`.
- Texte nach Glossar (siehe AK6); Summen-Übersicht und Seitentexte tokenisiert.
- `AuslageRow`, `AuslageForm`, `AuslagenSummary` und `auslagen/page.tsx` im Farb-Gate.

**Nicht inbegriffen:**
- Datenmodell, `schema.ts`, Server-Actions (`createAuslageAction`, `updateAuslageAction`,
  `setAuslageStatusAction`, `removeAuslageAction`) – Verhalten und Fehlertexte unverändert.
- Berechnungen der Summen (`auslagenSummen`), Kategorien, Erstattungslogik (ADR-028).
- Neue Sortierung, Suche, Filter oder Aufteilung der Liste in Aufklapper.
- Anzeige/Bedienung bei **abgeschlossener** Veranstaltung über „nur lesen“ hinaus (Q3).
- Auslagen-Bereiche anderer Seiten (Kassieren, Bericht, Detailseite).

## Akzeptanzkriterien

### Seitenaufbau und Erfassen (AK1)

- [ ] **AK1.1** GIVEN eine offene Veranstaltung WHEN die Auslagen-Seite lädt THEN steht unter dem
  Seitenkopf zuerst die Summen-Übersicht, danach die Auslagenliste; **kein** Erfassen-Formular
  mehr auf der Seite (Q2: Übersicht über der Liste).
- [ ] **AK1.2** GIVEN eine offene Veranstaltung WHEN die Seite lädt THEN zeigt der Seitenkopf rechts
  den Button „+ Neu“ (Baustein `PageHeader` `action`, wie in der Veranstaltungsliste).
- [ ] **AK1.3** GIVEN „+ Neu“ WHEN er gedrückt wird THEN öffnet der Dialog „Auslage erfassen“
  (`AnlegeDialog`) mit den Feldern Teilnehmer, Kategorie, Betrag (€) und Notiz (optional) sowie
  „Erfassen“ und „Abbrechen“.
- [ ] **AK1.4** GIVEN gültige Eingaben WHEN „Erfassen“ gedrückt wird THEN steht der Button
  währenddessen im Busy-Zustand „Erfassen …“, bei Erfolg schließt der Dialog, ein Toast
  „Auslage erfasst“ erscheint, und die neue Auslage steht in der Liste; die Summen stimmen.
- [ ] **AK1.5** GIVEN eine abgelehnte Eingabe (z. B. kein Teilnehmer, Betrag ≤ 0 oder zu hoch)
  WHEN „Erfassen“ gedrückt wird THEN bleibt der Dialog offen, die Eingaben bleiben stehen
  (Lesson #373: kein `<form action>`-Reset), und die Fehlermeldung der Action steht als
  `Notice` (Art `fehler`) im Dialog.
- [ ] **AK1.6** GIVEN der geöffnete Dialog WHEN „Abbrechen“ gedrückt oder `Esc` betätigt wird THEN
  wird nichts gespeichert, und der Fokus kehrt zum Auslöser „+ Neu“ zurück.
- [ ] **AK1.7** GIVEN die Veranstaltung hat keine Teilnehmerzeile WHEN „+ Neu“ gedrückt wird THEN
  zeigt der Dialog statt des Formulars den bisherigen Hinweis, dass zuerst Teilnehmer
  hinzugefügt werden müssen (Wortlaut der bisherigen Meldung, nur als `Notice`/Glossar-Text).
- [ ] **AK1.8** GIVEN keine Auslage vorhanden WHEN die Seite lädt THEN erscheint der Leerzustand
  „Noch keine Auslagen erfasst.“ (Baustein `Leerzustand`) mit der Aktion „Auslage erfassen“, die
  denselben Dialog öffnet (Muster `imLeerzustand`, spec-373).

### Zeile (AK2)

- [ ] **AK2.1** GIVEN die Auslagenliste WHEN sie gerendert wird THEN ist jede Auslage eine Karte
  (`ListenZeile`, weiß `bg-surface`, `rounded-lg`) mit Teilnehmer als Titel, „Kategorie · Notiz“
  als Untertitel (ohne „ · “-Rest, wenn keine Notiz) und dem Betrag (`formatCents`) deutlich
  lesbar in der Zeile.
- [ ] **AK2.2** GIVEN eine Auslage mit Status offen WHEN die Zeile gerendert wird THEN trägt sie das
  Badge „offen“ (Art `warnung`); bei Status erstattet das Badge „erstattet“ (Art `erfolg`).
  Der Status ist **nur als Text im Badge** erkennbar, nie nur als Farbe; er steht nicht mehr
  im Untertitel.
- [ ] **AK2.3** GIVEN eine Auslage WHEN die Zeile angetippt wird (Maus, Touch, `Enter`/`Leertaste`)
  THEN öffnet der Dialog „Auslage bearbeiten“; das Tipp-Ziel ist ein Button, **kein** Link,
  und mindestens 44 px hoch.
- [ ] **AK2.4** GIVEN lange Namen oder lange Notizen WHEN die Zeile gerendert wird THEN brechen
  Titel und Untertitel um, ohne Betrag, Badge oder ⋯-Knopf aus dem Bild zu schieben.
- [ ] **AK2.5** GIVEN die Zeilen-Komponente WHEN sie geprüft wird THEN enthält sie keine eigenen
  Button-/Zeilen-Styles und keine rohen Farbklassen (AK7).
- [ ] **AK2.6** GIVEN die Liste WHEN sie gerendert wird THEN bleibt die bisherige Reihenfolge
  (`listAuslagen`) unverändert.

### Dialog „Auslage bearbeiten“ (AK2a)

- [ ] **AK2a.1** GIVEN der Dialog „Auslage bearbeiten“ THEN enthält er die Felder Teilnehmer,
  Kategorie, Betrag (€) und Notiz, vorbelegt mit den aktuellen Werten (Betrag als
  EUR-Eingabewert), sowie „Speichern“ und „Abbrechen“.
- [ ] **AK2a.2** GIVEN gültige Eingaben WHEN „Speichern“ gedrückt wird THEN steht der Button im
  Busy-Zustand „Speichern …“, bei Erfolg schließt der Dialog, ein Toast „Gespeichert“ erscheint,
  und die Zeile zeigt die neuen Werte; die Summen stimmen.
- [ ] **AK2a.3** GIVEN eine abgelehnte Eingabe WHEN „Speichern“ gedrückt wird THEN bleibt der
  Dialog offen, die Eingaben bleiben stehen, und die Meldung steht als `Notice` (Art `fehler`)
  im Dialog.
- [ ] **AK2a.4** GIVEN der Dialog WHEN „Abbrechen“ gedrückt oder per `Esc` geschlossen wird THEN
  werden keine Änderungen gespeichert, und der Fokus kehrt zur Zeile zurück.

### Zeilenmenü ⋯ (AK3)

- [ ] **AK3.1** GIVEN eine Auslage in einer offenen Veranstaltung WHEN die Zeile gerendert wird THEN
  steht rechts neben dem Tipp-Ziel (nicht darin) ein ⋯-Knopf mit zugänglichem Namen
  (z. B. „Aktionen für <Teilnehmer>“), Tippfläche ≥ 44 px.
- [ ] **AK3.2** GIVEN der geöffnete Menüpunkt-Satz einer Auslage mit Status offen THEN enthält er
  „Als erstattet markieren“, „Bearbeiten“ und „Löschen“; bei Status erstattet statt des ersten
  „Erstattung zurücknehmen“.
- [ ] **AK3.3** GIVEN „Als erstattet markieren“/„Erstattung zurücknehmen“ WHEN er gewählt wird THEN
  wirkt die Aktion **ohne Bestätigungsdialog** (reversibel, spec-372), das Menü schließt, und der
  Toast meldet „Auslage erstattet“ bzw. „Erstattung zurückgenommen“; Badge (AK2.2) und
  Summen-Übersicht aktualisieren sich.
- [ ] **AK3.4** GIVEN die Erstattungs-Aktion WHEN sie abgelehnt wird THEN steht die Meldung der
  Action als `Notice` (Art `fehler`) sichtbar an der Zeile bzw. im Menü, sie verpufft nicht
  stumm (bisher FS2).
- [ ] **AK3.5** GIVEN das Menü WHEN es geöffnet ist THEN schließt es per `Esc` und Außenklick, der
  Fokus kehrt zum ⋯-Knopf zurück; „Bearbeiten“ öffnet den Dialog aus AK2a mit Fokus-Rückgabe
  auf die Zeile.
- [ ] **AK3.6** GIVEN die Aktionen in der Zeile WHEN die Liste gerendert wird THEN stehen
  „Als erstattet markieren“, „Bearbeiten“ und „Löschen“ **nicht** mehr als eigene Buttons
  in der Zeile.

### Löschen mit Rückfrage (AK4)

- [ ] **AK4.1** GIVEN „Löschen“ im Menü WHEN er gewählt wird THEN öffnet ein `ConfirmDialog` mit
  `variant="danger"`, Titel „Auslage löschen?“; der Text nennt Teilnehmer, Kategorie und Betrag
  und weist darauf hin, dass es nicht rückgängig zu machen ist (bisheriger Wortlaut bleibt).
- [ ] **AK4.2** GIVEN die Bestätigung WHEN „Löschen“ gedrückt wird THEN steht der Button im
  Busy-Zustand „Löschen …“ und ist gesperrt; bei Erfolg schließt der Dialog, die Zeile
  verschwindet, ein Toast „Auslage gelöscht“ erscheint, die Summen stimmen.
- [ ] **AK4.3** GIVEN die Bestätigung WHEN die Action ablehnt THEN bleibt der Dialog offen und die
  Meldung steht als `Notice` im Dialog; bei „Abbrechen“/`Esc` bleibt die Auslage erhalten.
- [ ] **AK4.4** GIVEN die gelöschte Zeile samt Auslöser ist verschwunden THEN landet der Fokus auf
  einem sinnvollen Ersatzziel (Überschrift/Liste, bisherige `AUSLAGEN_LISTE_ID`-Logik,
  Lesson #371/#373); vor der Hydration sendet der Auslöser nichts ab (kein Form-Submit).

### Bausteine statt Eigenbau (AK5)

- [ ] **AK5.1** GIVEN `app/veranstaltung/AuslageRow.tsx`, `AuslageForm.tsx`, `AuslagenSummary.tsx`
  und `[id]/auslagen/page.tsx` THEN verwenden sie für Eingaben `Field`/`SelectField`, für
  Meldungen `Notice`, für Schaltflächen `Button`/`IconButton`, für Seitenkopf `PageHeader` und
  für die Zeile `ListenZeile` – keine eigenen `<select>`/`<input>`-/Button-Styles, keine
  rohen Farbwörter, kein `dark:` (ADR-052).
- [ ] **AK5.2** GIVEN die Summen-Übersicht WHEN sie gerendert wird THEN sind Tabelle und Texte mit
  Token-Klassen (`text-muted`, `border-line-subtle` …) gestaltet; Inhalt, Spalten und Beträge
  bleiben unverändert (reine Tokenisierung).
- [ ] **AK5.3** GIVEN die Aktionen der Seite WHEN sie als Server-Actions laufen THEN bleiben IDOR-
  Bindung (`veranstaltungId` serverseitig gebunden, Codify #51), Rollen-Check und Validierung
  unverändert.

### Texte nach Glossar (AK6)

- [ ] **AK6.1** GIVEN der Erfolg-Toast nach dem Erfassen THEN lautet er „Auslage erfasst“ (ohne
  Punkt); „Gespeichert“, „Auslage erstattet“, „Erstattung zurückgenommen“ und „Auslage gelöscht“
  bleiben unverändert.
- [ ] **AK6.2** GIVEN der Button „Erfassen“ im Anlege-Dialog WHEN er läuft THEN lautet der Busy-Text
  „Erfassen …“ (beim Bearbeiten bleibt „Speichern …“).
- [ ] **AK6.3** GIVEN die Teilnehmer-Auswahl THEN lautet der Platzhalter „Bitte wählen …“ (mit
  Leerzeichen vor „…“).
- [ ] **AK6.4** GIVEN ein Nutzer ohne Rolle `veranstalter` WHEN er die Seite aufruft THEN lautet der
  Hinweis „Kein Zugriff – nur Veranstalter dürfen Auslagen erfassen.“ (bisher „… erstatten.“,
  Q1).
- [ ] **AK6.5** GIVEN der Betrag-Feldname THEN lautet er „Betrag (€)“ (statt „Betrag (EUR)“,
  Glossar-Abweichung `AuslageForm.tsx`).
- [ ] **AK6.6** GIVEN `docs/ux/glossar.md` WHEN der PR fertig ist THEN sind die auf diese Dateien
  zeigenden Abweichungs-Zeilen („Ist→Soll“-Liste) erledigt bzw. entfernt (Anker per Grep geprüft).

### Farb-Gate (AK7)

- [ ] **AK7.1** GIVEN `eslint/ui-token-files.mjs` WHEN `pnpm lint` läuft THEN stehen
  `AuslageRow.tsx`, `AuslageForm.tsx`, `AuslagenSummary.tsx`, `[id]/auslagen/page.tsx` sowie
  jede neu angelegte Komponenten-Datei dieser Auslagen-Umstellung in der Liste, und lint lehnt
  rohe Farbklassen/`dark:` dort ab.

## Fehlerszenarien

- [ ] **F1** GIVEN eine Auslage wurde parallel gelöscht WHEN „Speichern“, Erstatten oder „Löschen“
  gedrückt wird THEN bleibt der Dialog offen bzw. erscheint die bisherige Fehlermeldung der
  Action als `Notice` (unverändertes Action-Verhalten).
- [ ] **F2** GIVEN die Veranstaltung ist **abgeschlossen** WHEN die Seite lädt THEN ist die Liste
  nur lesbar: kein „+ Neu“, kein ⋯-Menü, Zeilen nicht antippbar (keine Button-Rolle); Badge,
  Betrag und Summen-Übersicht bleiben sichtbar (Q3). Die Server-Actions lehnen weiterhin
  Schreibzugriffe auf abgeschlossene Veranstaltungen ab.
- [ ] **F3** GIVEN keine Berechtigung (`veranstalter` fehlt) WHEN die Seite aufgerufen wird THEN
  erscheint nur der Kein-Zugriff-Hinweis (AK6.4); die Actions prüfen die Rolle serverseitig
  weiter (unverändert).
- [ ] **F4** GIVEN der Dialog ist offen WHEN die Seite durch eine Server-Aktion neu rendert THEN
  gehen im Formular getippte Eingaben bei einer Ablehnung nicht verloren.
- [ ] **F5** GIVEN ein Statuswechsel, der die Zeile neu mountet WHEN er erfolgreich ist THEN
  geht der Fokus nicht verloren (Ersatzziel, Lesson #371/#373).

## Entschiedene Annahmen (aus dem Issue abgeleitet)

- Dialog-Titel „Auslage erfassen“ bleibt (Glossar: erfassen = Mengen/Beträge eintragen, nicht
  „anlegen“); Einstiegs-Button „+ Neu“ wie überall.
- „Bearbeiten“ steht zusätzlich im ⋯-Menü, weil Tipp auf die Zeile dasselbe tut (Issue AK3);
  für Tastatur-/Screenreader-Nutzende ist das ein zweiter, explizit benannter Weg.
- Notiz („Zweck“ im Datenmodell) heißt in der UI weiter „Notiz“ bzw. wie bisher im Formular
  beschriftet; Datenfeldname `zweck` ändert sich nicht.

## Offene Fragen

> **Entschieden mit Ralf:**

- [x] **Q1 Kein-Zugriff-Text:** „Auslagen erfassen“ statt „erstatten“ (Issue; Seite heißt
  „Auslagen erfassen“) – hier übernommen (AK6.4).
- [x] **Q2 Platz der Summen-Übersicht:** **über** der Liste (Ralf, 2026-10-15); neues Erfassen
  ausschließlich per „+ Neu“-Dialog analog zur Veranstaltungsliste.
- [x] **Q3 Abgeschlossene Veranstaltung:** nur lesen – kein „+ Neu“, kein ⋯, Zeile nicht
  antippbar (Ralf, 2026-10-15; entspricht dem heutigen Verhalten).

> **Für `/architecture` (kein Requirement, aber Entscheidungsbedarf):**

- [ ] **Q4 Zeilenmenü:** `ZeilenMenue` ist feature-lokal mit **einem** Konsumenten (ADR-053 D2:
  „ein projektweites Menü-Muster ist noch nicht belegt“). Mit den Auslagen entsteht der
  **zweite** Konsument mit abweichenden Einträgen. Ist jetzt der Zeitpunkt, ein route-neutrales
  Menü-Muster zu schaffen, oder bleibt es bei einer zweiten feature-lokalen Variante?
- [ ] **Q5 Betrag in der Zeile:** `ListenZeile` hat keinen Slot für einen Betrag rechts neben dem
  Titelblock (nur `zustand`-Badge und `aktion`). Betrag im Untertitel, im Titel oder neuer Slot?
- [ ] **Q6 Badge-Art `warnung`:** `Badge` kennt `warnung` (laut Issue) – prüfen, dass das Verblassen
  (`zustand`) **nicht** für „offen/erstattet“ missbraucht wird (Status ≠ Deaktiviert); wahrscheinlich
  eigener `Badge`-Aufruf neben `ListenZeile`.
- [ ] **Q7 ADR-Trigger:** Falls Q4/Q5 die API geteilter Bausteine ändern, ADR nötig (Muster ADR-059/060).
