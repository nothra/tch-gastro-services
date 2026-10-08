# Spec: Einheitliches Bestätigen und Rückmelden (#372)

> Teil der UX-Überarbeitung (UX-5), Übersicht in `docs/ux/ux-issue-entwuerfe.md`.
> Baut auf den Bausteinen aus #368 auf (`Dialog`, `ConfirmDialog`, `Notice`, `Button`, `IconButton`).
> Überschneidung: #306 (Lade-Feedback), #375 (Wording-Glossar).

## Kontext

Das Issue wurde vor den UX-Folgearbeiten geschrieben; der Ist-Stand ist weiter:

- **Schon erledigt:** Teilnehmer entfernen (`ZeilenMenue`, #369), Veranstaltung löschen
  (`VeranstaltungLoeschen`, #352/#391) und Veranstaltung abschließen/wieder öffnen
  (`AbschlussAktion`, #371) fragen über den `ConfirmDialog` nach. `StatusToggle` gibt es nicht mehr.
- **Noch offen:**
  - **Auslage löschen** (`AuslageRow`) löscht ohne Rückfrage; der Button ist grau, die Zeile nutzt
    noch rohe `zinc`-Klassen und `dark:`.
  - **Katalog deaktivieren** (`CatalogControls`) wirkt ohne Rückfrage.
  - Die **drei Katalog-Modals** (anlegen, umbenennen, duplizieren; `CatalogModal` in
    `CatalogControls`) sind ein altes, selbstgebautes Modal ohne Escape, Fokusführung und
    verknüpfte Beschriftung.
  - **Rückmeldungen** sind uneinheitlich: „Gespeichert.", „Änderungen gespeichert.", „Katalog
    gewechselt.", „Theke eingerichtet.", „Link kopiert." stehen als Inline-`Notice` jeweils am
    eigenen Formular; viele Schreibaktionen melden gar nichts (Auslagen, Katalog-/Artikel-Aktionen,
    Teilnehmer-Stammdaten, Entfernen, Löschen). Wo Dialog und Zeile verschwinden, hat eine
    Inline-Meldung keinen Platz mehr.
  - Beim **Löschen einer Veranstaltung** erfährt der Nutzer erst nach „Endgültig löschen", dass
    Verzehr, Kassiertes oder Auslagen das Löschen sperren.

## Entscheidungen aus der Klärung

- **Rückmeldung = Toast, app-weit.** Eine kurze, selbst verschwindende Meldung, die das Schließen
  eines Dialogs und einen Seitenwechsel (z. B. Redirect nach dem Löschen) überlebt. Ein Mechanismus
  für alle Erfolge; Fehler bleiben `role="alert"` (AK4 des Issues).
- **Nicht ausführbar nur bei „Veranstaltung löschen".** „Abschließen" behält den Hinweis auf offene
  Zeilen (spec-371 FS1); die serverseitige Prüfung bleibt in beiden Fällen die Entscheidung.
- **#375 (Glossar) kommt zuerst.** Diese Task startet die Umsetzung erst, wenn
  `docs/ux/glossar.md` auf `main` steht; die Meldungstexte folgen dann dem Glossar (AK5).
- **Umfang der Umstellung:** Auslage löschen und Katalog deaktivieren bekommen eine Bestätigung,
  die drei Katalog-Modals wechseln auf die gemeinsame `Dialog`-Grundlage, `AuslageRow` wechselt auf
  Bausteine und Token-Klassen.

## Scope

**Inbegriffen:**
- Bestätigung für **Auslage löschen** und **Katalog deaktivieren** (Gefahr-Variante bei Löschen).
- Die drei Katalog-Modals auf der gemeinsamen Dialog-Grundlage (Escape, Fokus-Rückgabe,
  verknüpfte Beschriftung).
- `AuslageRow` auf `Button`/Token-Klassen; Aufnahme in `eslint/ui-token-files.mjs`.
- Ein Toast-Mechanismus für Erfolgsrückmeldungen aller Schreibaktionen der Liste in AK10.
- „Veranstaltung löschen": Sperrgrund beim Öffnen des Dialogs statt nach dem Absenden.

**Nicht inbegriffen:**
- Lade-Feedback bei laufenden Requests (#306).
- Das Wording-Glossar selbst (#375) – hier nur Anwendung.
- **Verzehr-Mengen ±** (`adjustVerzehrAction`, `adjustVerzehrByTokenAction`): die sichtbare Zahl
  ist die Rückmeldung; ein Toast je Tipp wäre Lärm. (Bitte bestätigen, siehe Offene Fragen.)
- Reversible Aktionen ohne Bestätigung: Artikel deaktivieren/aktivieren, Teilnehmer
  deaktivieren/aktivieren, Erstattung ⇄ zurücknehmen, Katalog reaktivieren.
- Rückmeldung für „Link kopiert." (Zwischenablage, keine Schreibaktion; bleibt wie bisher am
  Auslöser).
- Neue Rollen, Rechte oder Server-Regeln: Gates und Fehlertexte der Actions bleiben.

## Akzeptanzkriterien

### Bestätigen

- [ ] **AK1** – GIVEN eine offene Veranstaltung mit einer Auslage WHEN die Nutzerin „Löschen" an
  der Auslage antippt THEN öffnet sich ein Bestätigungsdialog mit Gefahr-Variante, der Teilnehmer,
  Kategorie und Betrag der Auslage nennt; erst „Löschen" im Dialog entfernt sie.
- [ ] **AK2** – GIVEN der Bestätigungsdialog zu einer Auslage ist offen WHEN die Nutzerin
  „Abbrechen" wählt oder Escape drückt THEN bleibt die Auslage unverändert, der Dialog schließt und
  der Fokus kehrt zum „Löschen"-Auslöser zurück.
- [ ] **AK3** – GIVEN ein Katalog ist aktiv und ausgewählt WHEN die Verwalterin „Deaktivieren"
  antippt THEN öffnet sich ein Bestätigungsdialog, der den Katalognamen und die Folge nennt (nicht
  mehr für neue Veranstaltungen wählbar); erst die Bestätigung deaktiviert den Katalog.
- [ ] **AK4** – GIVEN ein Katalog ist inaktiv WHEN die Verwalterin „Reaktivieren" antippt THEN
  wirkt die Aktion sofort ohne Dialog (reversibel).
- [ ] **AK5** – GIVEN die Katalogverwaltung WHEN die Verwalterin „Katalog anlegen", „Umbenennen"
  oder „Duplizieren" öffnet THEN erscheint der jeweilige Dialog auf der gemeinsamen Dialog-
  Grundlage: Escape schließt ihn, der Hintergrund ist inert, der Titel ist mit dem Dialog verknüpft,
  der Fokus kehrt zum Auslöser zurück, und die Eingabe-Beschriftungen sind mit ihren Feldern
  verknüpft.
- [ ] **AK6** – GIVEN ein Dialog aus AK1/AK3/AK5 läuft die Action WHEN sie noch nicht beendet ist
  THEN sind Bestätigen, Abbrechen und Escape gesperrt (kein Schließen während des Schreibens);
  bei einer Ablehnung steht die Meldung (`role="alert"`) im Dialog, und der Dialog bleibt offen.
- [ ] **AK7** – GIVEN eine Lösch-/Entfernen-Bestätigung (Auslage, Veranstaltung, Teilnehmer)
  WHEN sie dargestellt wird THEN ist der Bestätigen-Button in der Gefahr-Variante; „Katalog
  deaktivieren" ebenso. Der „Löschen"-Auslöser an der Auslage ist als Gefahr gestylt, nicht grau.
- [ ] **AK8** – GIVEN `AuslageRow` WHEN die Zeile gerendert wird THEN nutzt sie ausschließlich
  Bausteine und Token-Klassen (keine rohen Farbklassen, kein `dark:`), und `pnpm lint` lehnt dort
  rohe Farbklassen ab.

### Nicht ausführbar – sofort im Dialog

- [ ] **AK9** – GIVEN eine offene Veranstaltung mit erfasstem Verzehr, bar Kassiertem oder
  mindestens einer Auslage WHEN die Nutzerin „Veranstaltung löschen" antippt THEN nennt der Dialog
  **beim Öffnen** den Grund (welche der drei Sperren zutrifft; bei mehreren bis zur Klärung
  von Q5 die erste in der Reihenfolge Verzehr → Kassiert → Auslage wie heute am Server), zeigt **keinen** Bestätigen-Button
  und bietet nur „Schließen" an.
- [ ] **AK10** – GIVEN eine offene Veranstaltung ohne Verzehr, Kassiertes und Auslagen WHEN die
  Nutzerin „Veranstaltung löschen" antippt THEN zeigt der Dialog die Bestätigung wie bisher
  (Name der Veranstaltung, „kann nicht rückgängig gemacht werden").
- [ ] **AK11** – GIVEN die Löschbarkeit hat sich seit dem Laden der Seite geändert (z. B. erfasst
  ein anderes Gerät Verzehr) WHEN die Nutzerin „Endgültig löschen" bestätigt THEN lehnt der Server
  weiterhin ab und die Ablehnung erscheint im Dialog (Absicherung bleibt, spec-352).

### Rückmeldung (Toast)

- [ ] **AK12** – GIVEN eine erfolgreiche Schreibaktion aus der folgenden Liste WHEN sie
  abgeschlossen ist THEN erscheint genau **ein** Toast mit `role="status"` und einem Text nach dem
  Glossar: Veranstaltung anlegen/ändern/löschen/Katalog wechseln/abschließen/wieder öffnen,
  Teilnehmerzeile hinzufügen/entfernen/Neuer Gast anlegen, Kassieren, Auslage anlegen/ändern/
  löschen/Erstattung umschalten, Theke einrichten, Teilnehmer-Stammdaten anlegen/ändern/
  (de)aktivieren, Katalog anlegen/umbenennen/duplizieren/(de)aktivieren, Artikel
  anlegen/ändern/(de)aktivieren.
- [ ] **AK13** – GIVEN eine Aktion löst ein Weiterleiten aus (Veranstaltung löschen) WHEN die
  Zielseite erscheint THEN steht der Toast „… gelöscht" dort sichtbar (überlebt den Seitenwechsel).
- [ ] **AK14** – GIVEN ein Toast ist sichtbar WHEN einige Sekunden vergangen sind ODER die
  Nutzerin ihn schließt THEN verschwindet er; er nimmt dem Screenreader die Ansage nicht vorweg
  (kein Verschwinden, bevor er angesagt werden kann) und verdeckt keine Bedienelemente der
  Seite dauerhaft.
- [ ] **AK15** – GIVEN zwei Aktionen kurz nacheinander WHEN beide erfolgreich sind THEN sieht die
  Nutzerin beide Meldungen nacheinander oder gestapelt, keine geht verloren.
- [ ] **AK16** – GIVEN eine Schreibaktion wird abgelehnt WHEN die Meldung erscheint THEN steht sie
  als `role="alert"` am Ort der Aktion (im Dialog bzw. am Formular), nicht als Toast.
- [ ] **AK17** – GIVEN die bisherigen Inline-Erfolgsmeldungen (`„Gespeichert.“`,
  `„Änderungen gespeichert.“`, `„Katalog gewechselt.“`, `„Theke eingerichtet.“`,
  `„Gespeichert“` der Kassieren-Zeile) WHEN die Umstellung abgeschlossen ist THEN gibt es sie
  nicht mehr als zweite Meldung neben dem Toast. Die Kassieren-Rückmeldung mit Betrag und Spende
  (spec-371) bleibt inhaltlich erhalten.
- [ ] **AK18** – GIVEN die Meldungstexte aus AK12 und die Dialogtexte aus AK1–AK3/AK9 WHEN sie
  ausgegeben werden THEN folgen Verben, Anrede, Einheiten und Schreibweise `docs/ux/glossar.md`
  (#375).

## Fehlerszenarien

- [ ] **FS1** – Der Server lehnt „Auslage löschen" ab oder die Auslage ist schon weg (anderes
  Gerät): Der Nutzer sieht eine Ablehnung im Dialog (heute stumm: die Action ist `void` und kehrt
  ohne Meldung zurück), nicht einen Erfolgs-Toast.
- [ ] **FS2** – Die Veranstaltung ist inzwischen abgeschlossen, während der Auslage-/Teilnehmer-
  Dialog offen ist: Ablehnung im Dialog (Abgeschlossen-Meldung), Auslage bleibt unverändert.
- [ ] **FS3** – Katalog deaktivieren schlägt fehl (nicht gefunden): Ablehnung im Dialog, kein
  Toast, Katalog unverändert.
- [ ] **FS4** – Die Löschbarkeits-Prüfung beim Laden der Seite selbst schlägt fehl (DB-Fehler):
  die Seite verhält sich wie bei jedem Ladefehler; der Löschen-Dialog bietet im Zweifel **nicht**
  die Bestätigung an (fail-closed).
- [ ] **FS5** – Sehr langer Name (Veranstaltung, Katalog, Teilnehmer) im Dialogtext oder Toast:
  bricht um, verschiebt weder Buttons noch den Seitenrand (375 px).
- [ ] **FS6** – Toast bei geöffnetem modalem Dialog (z. B. Erfolg schließt den Dialog): der
  Toast erscheint nach dem Schließen sichtbar und wird nicht vom inerten Hintergrund
  verschluckt.
- [ ] **FS7** – JavaScript im Browser (Hydration) noch nicht fertig: der Auslöser „Löschen" an der
  Auslage darf nicht mehr ohne Bestätigung absenden (kein verbliebener Direkt-Submit).

## Offene Fragen

- [ ] **Q1** – Verzehr-Mengen ±: wie oben ohne Toast (Zahl ist die Rückmeldung)? Bitte bestätigen.
- [ ] **Q2** – Wie lange bleibt ein Toast stehen (Vorschlag ca. 4–5 s, Fehler nie als Toast), und
  soll er unten (Daumen, über der Bedienung) oder oben (über dem Seitenkopf) erscheinen? Bei 375 px
  entscheidend, damit er Kassieren-/Erfassen-Buttons nicht verdeckt.
- [ ] **Q3** – Blockiert #375 hart (Task-Start erst nach Merge) oder darf `/implement` parallel
  beginnen und die Texte nachziehen? Entscheidung hier: hart (Antwort der Klärung); falls #375
  lange offen bleibt, neu entscheiden.
- [ ] **Q4** – „Katalog deaktivieren": nennt der Dialog zusätzlich, wie viele offene
  Veranstaltungen den Katalog noch nutzen? (Heute keine Sperre; bestehende Zuordnung bleibt
  sichtbar, spec-346 AK6.) Vorschlag: nein, nur die Folge in einem Satz.
- [ ] **Q5** – Reihenfolge mehrerer Sperrgründe beim Löschen (AK9): nur den ersten nennen oder alle
  zutreffenden? Vorschlag: alle zutreffenden, damit der Nutzer weiß, was er alles zurücknehmen muss.
