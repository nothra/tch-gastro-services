# Spec: Einstellungen per Zahnrad im Seitenkopf, Teilen und Löschen eigenständig

> Issue #391 · Vorgänger: [spec-369](spec-369-veranstaltung-detailseite-neu-ordnen.md) (#369).
> Diese Spec **ersetzt** spec-369 AK1 (Reihenfolge), AK21 (Inhalt/Ort der Einstellungen),
> AK22 (Ort von „Link & QR teilen") und den Ort aus AK23 („Löschen unter Einstellungen" – das
> Verhalten bleibt). Alle übrigen AK aus spec-369 gelten unverändert.

## Kontext

Seit #369 steht der eingeklappte Bereich „Einstellungen" ganz unten auf der Detailseite einer
Veranstaltung – direkt unter der Teilnehmerliste. Er sieht aus wie eine weitere
Teilnehmerzeile (gleiche Karte, gleiche Höhe, fetter Text) und wird deshalb leicht übersehen
oder für einen Teilnehmer gehalten. Zudem steckt „Link & QR teilen" – eine Aktion, die der
Veranstalter zu Beginn **jeder** Veranstaltung braucht – zwei Taps tief in diesem Bereich.

Ziel: Einstellungen sind als solche erkennbar (Zahnrad-Symbol) und oben im Seitenkopf
erreichbar; „Link & QR teilen" und „Veranstaltung löschen" sind eigene, direkt erreichbare
Aktionen im Seitenkopf (Teilen- bzw. Papierkorb-Symbol).

Primärer Nutzer: Rolle `veranstalter`, überwiegend am Smartphone.

## Scope

**Inbegriffen:**
- Zahnrad-Schaltfläche im Seitenkopf der Detailseite (neben dem Status-Badge), die einen
  Dialog „Einstellungen" öffnet.
- Der Dialog „Einstellungen" enthält – je nach Zustand – Katalog wechseln und
  Bezeichnung/Datum/Kasse bearbeiten (Verhalten unverändert).
- Teilen-Schaltfläche (Symbol) im Seitenkopf, die den bestehenden Dialog „Link & QR teilen"
  öffnet.
- Papierkorb-Schaltfläche (Symbol) im Seitenkopf, die das bestehende Löschen mit
  Bestätigungsdialog auslöst (Verhalten unverändert, spec-352).
- Entfernen des eingeklappten Bereichs „Einstellungen" am Seitenende.
- Nachziehen der Veranstalter-Anleitung (`docs/anleitung/veranstalter/anleitung.md`), der
  Capture-Spec `e2e/anleitung-veranstalter.spec.ts` und der davon betroffenen Screenshots sowie
  der bestehenden E2E-Tests/-Helfer, die den alten Bereich bedienen.

**Nicht inbegriffen:**
- Fachliche Änderungen an Katalogwechsel, Bearbeiten, Löschen (Regeln, Bestätigungstext) oder am Inhalt des
  „Link & QR teilen"-Dialogs (Link, Kopieren, QR bleiben wie sie sind).
- Druckbarkeit von Link/QR (#307 Teil 2, #181).
- Zahnrad/Teilen auf anderen Seiten (Verzehr, Auslagen, Kassieren, Listen) und Änderungen an
  Header/Startseite/Zurück-Navigation (#374).
- Einstellungen für abgeschlossene Veranstaltungen (bleiben entfallen, spec-369 AK7).

## Akzeptanzkriterien

### Seitenaufbau

- [ ] **AK1** GIVEN eine offene Veranstaltung WHEN die Detailseite geöffnet wird THEN erscheinen
  von oben nach unten: Seitenkopf, drei Arbeitsschritt-Kacheln, Teilnehmerliste – und darunter
  **kein** Bereich „Einstellungen" mehr (ersetzt spec-369 AK1).
- [ ] **AK2** GIVEN eine datierte offene Veranstaltung WHEN der Seitenkopf gerendert wird THEN
  stehen in seiner Aktionszone von links nach rechts: Status-Badge, „Veranstaltung abschließen"
  (spec-371 AK18, siehe Q5), Teilen-Schaltfläche, Zahnrad-Schaltfläche, Papierkorb-Schaltfläche
  (zerstörerische Aktion zuletzt, #352 AK4/AK8).
- [ ] **AK3** GIVEN die Teilen-, Zahnrad- und Papierkorb-Schaltfläche WHEN sie dargestellt
  werden THEN zeigen sie je ein Symbol ohne sichtbaren Text, haben einen zugänglichen Namen
  („Link & QR teilen", „Einstellungen" bzw. „Veranstaltung löschen") und eine Tippfläche von
  mindestens 44 × 44 px. Der Papierkorb ist als zerstörerische Aktion erkennbar abgesetzt
  (Gefahr-Token), ohne dass Teilen/Zahnrad so aussehen.

### Dialog „Einstellungen"

- [ ] **AK4** GIVEN eine offene Veranstaltung WHEN das Zahnrad getippt wird THEN öffnet ein
  Dialog mit dem Titel „Einstellungen"; vorher ist keiner seiner Inhalte auf der Seite sichtbar.
- [ ] **AK5** GIVEN eine datierte offene Veranstaltung WHEN der Dialog „Einstellungen" offen ist
  THEN enthält er in dieser Reihenfolge: Katalog wechseln, Bezeichnung/Datum/Kasse bearbeiten –
  und **weder** „Link & QR teilen" **noch** „Veranstaltung löschen".
- [ ] **AK6** GIVEN die stehende Theke (offen, ohne Datum) WHEN der Dialog „Einstellungen" offen
  ist THEN enthält er nur „Katalog wechseln" (kein Bearbeiten, #352).
- [ ] **AK7** GIVEN der Dialog „Einstellungen" WHEN Katalog gewechselt oder Stammdaten
  gespeichert werden THEN verhalten sich diese Funktionen wie bisher (Validierung,
  Fehlermeldungen aus spec-346/spec-352); nach erfolgreichem Speichern zeigt die Seite die
  geänderten Werte (z. B. neue Bezeichnung im Seitenkopf).
- [ ] **AK8** GIVEN der Dialog „Einstellungen" ist offen WHEN „Schließen" getippt oder Escape
  gedrückt wird THEN schließt der Dialog und der Fokus kehrt auf die Zahnrad-Schaltfläche zurück
  (gleiche Dialog-Grundlage wie „+ Teilnehmer", spec-369 AK30; Schließen per Tipp außerhalb
  bewusst nicht Teil dieser Spec, siehe Q4).

### „Link & QR teilen"

- [ ] **AK9** GIVEN eine offene Veranstaltung WHEN die Teilen-Schaltfläche getippt wird THEN
  öffnet der bestehende Dialog „Link & QR teilen" mit Selbstbedienungs-Link (mit Kopieren) und
  QR-Code; nach dem Schließen kehrt der Fokus auf die Teilen-Schaltfläche zurück. Der QR-Code
  wird weiterhin serverseitig erzeugt (kein `qrcode` im Client-Bundle, #307).
- [ ] **AK10** GIVEN eine offene Veranstaltung WHEN die Detailseite geöffnet wird THEN ist
  „Link & QR teilen" mit **einem** Tap erreichbar (ohne vorher einen anderen Bereich oder
  Dialog zu öffnen).

### „Veranstaltung löschen"

- [ ] **AK11** GIVEN eine datierte offene Veranstaltung WHEN der Papierkorb getippt wird THEN
  öffnet der bestehende Bestätigungsdialog (Variante `danger`, spec-352); erst die Bestätigung
  löscht. Abbrechen/Escape schließt ihn ohne Löschung, der Fokus kehrt auf den Papierkorb zurück.
- [ ] **AK12** GIVEN die Löschung wird bestätigt WHEN sie abgelehnt wird (erfasster Verzehr,
  Kassiertes oder Auslagen) THEN sieht der Nutzer die bestehende Ablehnungsmeldung, und die
  Veranstaltung bleibt erhalten; bei Erfolg verhält sich die Seite wie bisher (spec-352).
- [ ] **AK13** GIVEN die stehende Theke WHEN die Detailseite geöffnet wird THEN zeigt der
  Seitenkopf **keinen** Papierkorb (Löschen nur für datierte Veranstaltungen, #352); Teilen und
  Zahnrad sind vorhanden.

### Abgeschlossene Veranstaltung

- [ ] **AK14** GIVEN eine abgeschlossene Veranstaltung WHEN die Detailseite geöffnet wird THEN
  zeigt der Seitenkopf weder Teilen, Zahnrad noch Papierkorb (unverändert: keine
  Einstellungen, kein Teilen, kein Löschen bei abgeschlossenen Veranstaltungen,
  spec-369 AK7/AK21, spec-352). „Wieder öffnen" neben dem Badge bleibt (spec-371 AK22).

### Darstellung und Doku

- [ ] **AK15** GIVEN die neuen Schaltflächen und der Dialog WHEN sie gestylt sind THEN
  verwenden sie nur Tokens und Bausteine aus `app/components/ui/` (keine rohen
  Tailwind-Farbklassen, kein `dark:`, ADR-052); die Symbole sind im hellen und dunklen
  Farbschema erkennbar.
- [ ] **AK16** GIVEN ein schmaler Bildschirm (375 px) und eine lange Veranstaltungsbezeichnung
  WHEN der Seitenkopf gerendert wird THEN bricht der Titel um, und Badge, „Veranstaltung
  abschließen", Teilen-, Zahnrad- und Papierkorb-Schaltfläche bleiben vollständig sichtbar und
  bedienbar (kein horizontales Scrollen; zugleich spec-371 AK24).
- [ ] **AK17** GIVEN die Veranstalter-Anleitung WHEN sie gelesen wird THEN beschreibt sie das
  Zahnrad im Seitenkopf als Ort der Einstellungen, das Teilen-Symbol als Weg zu
  „Link & QR teilen" und den Papierkorb als Weg zum Löschen; die betroffenen Screenshots zeigen den neuen Stand.

## Fehlerszenarien

- [ ] **FS1** Kein Zugriff (nicht `veranstalter`) → unveränderte Meldung „Kein Zugriff"; alle
  Actions prüfen Rolle und Status weiterhin serverseitig.
- [ ] **FS2** Die Veranstaltung wird in einer anderen Sitzung abgeschlossen, während der Dialog
  „Einstellungen" offen ist → eine Schreibaktion im Dialog wird serverseitig abgelehnt und zeigt
  die bestehende Fehlermeldung der Action (kein stiller Erfolg).
- [ ] **FS3** Speichern im Dialog schlägt fehl (Validierung/Server) → der Dialog bleibt offen,
  die Fehlermeldung steht im Dialog, eingegebene Werte gehen nicht verloren.

## Offene Fragen

- [x] **Q1 (entschieden durch den Nutzer, 2026-10-02):** Löschen liegt nicht im Dialog
  „Einstellungen", sondern als Papierkorb-Symbol im Seitenkopf (AK11–AK13) – damit entfällt die
  Frage nach verschachtelten Dialogen. Die Ablehnungsmeldung (AK12) steht im
  Bestätigungsdialog (ADR-056 D4).
- [x] **Q2 (entschieden in ADR-056 D1/D2):** Woher kommen die Symbole (Teilen, Zahnrad, Papierkorb)? Im Projekt gibt es
  bislang keine Icon-Bibliothek – eigene Inline-SVGs oder neue Abhängigkeit.
- [x] **Q3 (entschieden in ADR-056 D3 – bleibt offen):** Schließt der Dialog „Einstellungen" nach erfolgreichem
  Speichern von Stammdaten bzw. Katalogwechsel automatisch, oder bleibt er offen? (Nutzersicht
  ist durch AK7/FS3 festgelegt; die Wahl beeinflusst nur den Ablauf.)
- [x] **Q4 (angepasst in /review-Iteration 1, 2026-10-04):** AK8 nannte ursprünglich auch
  „außerhalb schließen". Der gemeinsame `Dialog`-Baustein schließt per Tipp auf den Hintergrund
  nicht – für keinen Konsumenten (auch spec-369 AK30 kennt den Weg nicht). AK8 ist deshalb auf
  „Schließen" + Escape zurückgeführt; Hintergrund-Schließen wäre ein eigenes Thema für den
  Baustein inkl. `ConfirmDialog`-Sperre während laufender Löschung.
- [x] **Q5 (Zusammenführung mit #371, /review-Iteration 4, 2026-10-04):** #371 hat vor dieser
  Spec „Veranstaltung abschließen" bzw. „Wieder öffnen" in den Seitenkopf gebracht (spec-371
  AK18/AK22–AK24). Die Text-Schaltfläche steht direkt hinter dem Badge, vor den
  Symbol-Schaltflächen dieser Spec – Statuswechsel gehört zum Status, die Symbole sind
  Werkzeuge. AK2, AK14 und AK16 sind darauf angepasst; bei der Theke entfällt sie (spec-371 AK23).
