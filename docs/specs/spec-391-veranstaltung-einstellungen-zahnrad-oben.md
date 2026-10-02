# Spec: Einstellungen per Zahnrad im Seitenkopf, „Link & QR teilen" eigenständig

> Issue #391 · Vorgänger: [spec-369](spec-369-veranstaltung-detailseite-neu-ordnen.md) (#369).
> Diese Spec **ersetzt** spec-369 AK1 (Reihenfolge), AK21 (Inhalt/Ort der Einstellungen) und
> AK22 (Ort von „Link & QR teilen"). Alle übrigen AK aus spec-369 gelten unverändert.

## Kontext

Seit #369 steht der eingeklappte Bereich „Einstellungen" ganz unten auf der Detailseite einer
Veranstaltung – direkt unter der Teilnehmerliste. Er sieht aus wie eine weitere
Teilnehmerzeile (gleiche Karte, gleiche Höhe, fetter Text) und wird deshalb leicht übersehen
oder für einen Teilnehmer gehalten. Zudem steckt „Link & QR teilen" – eine Aktion, die der
Veranstalter zu Beginn **jeder** Veranstaltung braucht – zwei Taps tief in diesem Bereich.

Ziel: Einstellungen sind als solche erkennbar (Zahnrad-Symbol) und oben im Seitenkopf
erreichbar; „Link & QR teilen" ist eine eigene, direkt erreichbare Aktion im Seitenkopf.

Primärer Nutzer: Rolle `veranstalter`, überwiegend am Smartphone.

## Scope

**Inbegriffen:**
- Zahnrad-Schaltfläche im Seitenkopf der Detailseite (neben dem Status-Badge), die einen
  Dialog „Einstellungen" öffnet.
- Der Dialog „Einstellungen" enthält – je nach Zustand – Katalog wechseln,
  Bezeichnung/Datum/Kasse bearbeiten und Veranstaltung löschen (Verhalten unverändert).
- Teilen-Schaltfläche (Symbol) im Seitenkopf neben dem Zahnrad, die den bestehenden Dialog
  „Link & QR teilen" öffnet.
- Entfernen des eingeklappten Bereichs „Einstellungen" am Seitenende.
- Nachziehen der Veranstalter-Anleitung (`docs/anleitung/veranstalter/anleitung.md`), der
  Capture-Spec `e2e/anleitung-veranstalter.spec.ts` und der davon betroffenen Screenshots sowie
  der bestehenden E2E-Tests/-Helfer, die den alten Bereich bedienen.

**Nicht inbegriffen:**
- Fachliche Änderungen an Katalogwechsel, Bearbeiten, Löschen oder am Inhalt des
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
- [ ] **AK2** GIVEN eine offene Veranstaltung WHEN der Seitenkopf gerendert wird THEN stehen in
  seiner Aktionszone von links nach rechts: Status-Badge, Teilen-Schaltfläche,
  Zahnrad-Schaltfläche.
- [ ] **AK3** GIVEN die Zahnrad- und die Teilen-Schaltfläche WHEN sie dargestellt werden THEN
  zeigen sie je ein Symbol ohne sichtbaren Text, haben einen zugänglichen Namen
  („Einstellungen" bzw. „Link & QR teilen") und eine Tippfläche von mindestens 44 × 44 px.

### Dialog „Einstellungen"

- [ ] **AK4** GIVEN eine offene Veranstaltung WHEN das Zahnrad getippt wird THEN öffnet ein
  Dialog mit dem Titel „Einstellungen"; vorher ist keiner seiner Inhalte auf der Seite sichtbar.
- [ ] **AK5** GIVEN eine datierte offene Veranstaltung WHEN der Dialog „Einstellungen" offen ist
  THEN enthält er in dieser Reihenfolge: Katalog wechseln, Bezeichnung/Datum/Kasse bearbeiten,
  Veranstaltung löschen (zerstörerische Aktion zuletzt, #352 AK4/AK8) – und **nicht**
  „Link & QR teilen".
- [ ] **AK6** GIVEN die stehende Theke (offen, ohne Datum) WHEN der Dialog „Einstellungen" offen
  ist THEN enthält er nur „Katalog wechseln" (weder Bearbeiten noch Löschen, #352).
- [ ] **AK7** GIVEN der Dialog „Einstellungen" WHEN Katalog gewechselt, Stammdaten gespeichert
  oder die Veranstaltung gelöscht wird THEN verhalten sich diese Funktionen wie bisher
  (Validierung, Fehlermeldungen, Bestätigungsdialog und Ablehnungsregeln aus spec-346/spec-352);
  nach erfolgreichem Speichern zeigt die Seite die geänderten Werte (z. B. neue Bezeichnung im
  Seitenkopf).
- [ ] **AK8** GIVEN der Dialog „Einstellungen" ist offen WHEN „Schließen" getippt, Escape
  gedrückt oder außerhalb geschlossen wird THEN schließt der Dialog und der Fokus kehrt auf die
  Zahnrad-Schaltfläche zurück (gleiche Dialog-Grundlage wie „+ Teilnehmer", spec-369 AK30).
- [ ] **AK9** GIVEN im Dialog „Einstellungen" wird „Veranstaltung löschen" bestätigt WHEN die
  Löschung abgelehnt wird (erfasster Verzehr, Kassiertes oder Auslagen) THEN bleibt die
  Ablehnungsmeldung für den Nutzer sichtbar (nicht durch Schließen eines Dialogs verdeckt).

### „Link & QR teilen"

- [ ] **AK10** GIVEN eine offene Veranstaltung WHEN die Teilen-Schaltfläche getippt wird THEN
  öffnet der bestehende Dialog „Link & QR teilen" mit Selbstbedienungs-Link (mit Kopieren) und
  QR-Code; nach dem Schließen kehrt der Fokus auf die Teilen-Schaltfläche zurück. Der QR-Code
  wird weiterhin serverseitig erzeugt (kein `qrcode` im Client-Bundle, #307).
- [ ] **AK11** GIVEN eine offene Veranstaltung WHEN die Detailseite geöffnet wird THEN ist
  „Link & QR teilen" mit **einem** Tap erreichbar (ohne vorher einen anderen Bereich oder
  Dialog zu öffnen).

### Abgeschlossene Veranstaltung

- [ ] **AK12** GIVEN eine abgeschlossene Veranstaltung WHEN die Detailseite geöffnet wird THEN
  zeigt der Seitenkopf weder Zahnrad noch Teilen-Schaltfläche (unverändert: keine
  Einstellungen, kein Teilen bei abgeschlossenen Veranstaltungen, spec-369 AK7/AK21).

### Darstellung und Doku

- [ ] **AK13** GIVEN die neuen Schaltflächen und der Dialog WHEN sie gestylt sind THEN
  verwenden sie nur Tokens und Bausteine aus `app/components/ui/` (keine rohen
  Tailwind-Farbklassen, kein `dark:`, ADR-052); die Symbole sind im hellen und dunklen
  Farbschema erkennbar.
- [ ] **AK14** GIVEN ein schmaler Bildschirm (375 px) und eine lange Veranstaltungsbezeichnung
  WHEN der Seitenkopf gerendert wird THEN bricht der Titel um, und Badge, Teilen- und
  Zahnrad-Schaltfläche bleiben vollständig sichtbar und bedienbar (kein horizontales Scrollen).
- [ ] **AK15** GIVEN die Veranstalter-Anleitung WHEN sie gelesen wird THEN beschreibt sie das
  Zahnrad im Seitenkopf als Ort der Einstellungen und das Teilen-Symbol als Weg zu
  „Link & QR teilen"; die betroffenen Screenshots zeigen den neuen Stand.

## Fehlerszenarien

- [ ] **FS1** Kein Zugriff (nicht `veranstalter`) → unveränderte Meldung „Kein Zugriff"; alle
  Actions prüfen Rolle und Status weiterhin serverseitig.
- [ ] **FS2** Die Veranstaltung wird in einer anderen Sitzung abgeschlossen, während der Dialog
  „Einstellungen" offen ist → eine Schreibaktion im Dialog wird serverseitig abgelehnt und zeigt
  die bestehende Fehlermeldung der Action (kein stiller Erfolg).
- [ ] **FS3** Speichern im Dialog schlägt fehl (Validierung/Server) → der Dialog bleibt offen,
  die Fehlermeldung steht im Dialog, eingegebene Werte gehen nicht verloren.

## Offene Fragen

- [ ] **Q1 (für /architecture):** Der Löschen-Bestätigungsdialog (`ConfirmDialog`) öffnet
  künftig aus einem bereits offenen Dialog heraus. Verschachteln oder „Einstellungen" vorher
  schließen? Randbedingungen: AK8 (Fokusrückgabe), AK9 (Ablehnungsmeldung sichtbar),
  spec-369 AK30 (eine Dialog-Grundlage).
- [ ] **Q2 (für /architecture):** Woher kommen die Symbole (Zahnrad, Teilen)? Im Projekt gibt es
  bislang keine Icon-Bibliothek – eigene Inline-SVGs oder neue Abhängigkeit.
- [ ] **Q3 (für /architecture):** Schließt der Dialog „Einstellungen" nach erfolgreichem
  Speichern von Stammdaten bzw. Katalogwechsel automatisch, oder bleibt er offen? (Nutzersicht
  ist durch AK7/FS3 festgelegt; die Wahl beeinflusst nur den Ablauf.)
