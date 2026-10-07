# Spec: Listenseiten – Liste zuerst, Anlegen per Button (#373)

> Teil der UX-Überarbeitung (UX-6), Übersicht in `docs/ux/ux-issue-entwuerfe.md`. Baut auf den
> UI-Bausteinen aus #368 auf (`PageHeader` mit `action`, `Dialog`, `Button`, `Badge`, `Card`).
> Abgrenzung: #374 (Seitenkopf/Zurück-Link – erledigt), #372 (Bestätigen/Rückmelden),
> #375 (Wording-Glossar), #181 (Theke-QR/Link/Druck – Folgearbeit).

## Kontext

Auf dem Handy (375 px) belegen die Anlege-Formulare den ersten Bildschirm; die eigentliche Liste
beginnt darunter:

- `/veranstaltung`: „Veranstaltung anlegen" und „Stehende Theke einrichten" stehen vor der Liste.
- `/verwaltung/katalog/[id]`: „Artikel anlegen" steht vor den Artikeln; 24 Artikel sind hohe
  Einzelkarten mit je zwei Buttons ohne Gruppierung (≈ 6 Bildschirme); die Katalogwahl ist eine
  Radiobutton-Gruppe, die beim Anklicken sofort navigiert.
- `/verwaltung/teilnehmer`: gleiches Muster wie bei der Veranstaltungsliste.

Veranstaltungen lassen sich ohne Öffnen nicht unterscheiden, obwohl seit #346 der Katalog je
Veranstaltung wählbar ist.

## Entscheidungen aus der Klärung

- **Anlegen per Dialog** (nicht eigene Seite): „+ Neu" im Seitenkopf öffnet den vorhandenen
  `Dialog`-Baustein; keine neuen Routen für das Anlegen.
- **Stehende Theke bekommt eine eigene Verwaltungsseite `/verwaltung/theke`**, Zugriff nur
  `verwalter`; neuer Navigationseintrag „Theke". Veranstalter ohne Rolle `verwalter` verlieren damit
  den UI-Weg zum Einrichten (bewusst, Rollenmodell der Verwaltung). Die Action
  `ensureThekeAction` bleibt unverändert (erlaubt weiter `verwalter` und `veranstalter`).
- **Abgeschlossene Veranstaltungen: alle, eingeklappt** (kein Paging).
- **Katalog-Artikel: gruppiert nach Kategorie**, inaktive Artikel bleiben an ihrer Sortierstelle in
  der Gruppe, nur gedämpft und mit Badge „deaktiviert".

## Scope

**Inbegriffen:**
- `/veranstaltung`: Liste zuerst, „+ Neu"-Dialog, Gruppen „Offen"/„Abgeschlossen", Katalog + Kasse
  je Zeile.
- Neue Seite `/verwaltung/theke` (Einrichten der stehenden Theke), Navigationseintrag, `docs/routes.md`.
- `/verwaltung/katalog/[id]`: Artikel kompakt als Zeilen nach Kategorie, Bearbeiten-Dialog,
  Anlegen per „+ Artikel", Katalogwahl als Auswahlliste.
- `/verwaltung/teilnehmer`: Liste zuerst, „+ Neu"-Dialog.
- Leere Zustände mit passender Anlege-Aktion.
- Nachziehen von Tests, E2E-Helfern, Capture-Spec, Anleitungs-Screenshots/-Texten.

**Nicht inbegriffen:**
- QR/Link/Druck der stehenden Theke (#181).
- Einheitliche Bestätigung/Rückmeldung (#372), Wording-Glossar (#375).
- Änderung der Berechtigungen in Actions oder des Datenmodells; neue Rollen.
- Paging, Suche oder Filter in den Listen.
- Die Katalog-Management-Funktionen (anlegen/umbenennen/deaktivieren/duplizieren) ändern ihr
  Verhalten nicht; sie behalten ihre Dialoge und rücken nur in die neue Seitenstruktur.

## Akzeptanzkriterien

### Anlegen per Button (AK1)

- [ ] **AK1.1** GIVEN `/veranstaltung`, `/verwaltung/katalog/[id]` oder `/verwaltung/teilnehmer` WHEN
  die Seite rendert THEN steht im Seitenkopf (`PageHeader`-Aktion) ein Button „+ Neu" bzw. „+ Artikel",
  und das Anlege-Formular ist beim Laden **nicht** sichtbar; die Liste beginnt direkt unter dem Kopf.
- [ ] **AK1.2** GIVEN der Button WHEN er betätigt wird THEN öffnet ein modaler `Dialog` mit dem
  bisherigen Anlege-Formular (gleiche Felder, gleiche Validierung, gleiche Action).
- [ ] **AK1.3** GIVEN das Anlegen war erfolgreich WHEN die Action antwortet THEN schließt der Dialog,
  und der neue Eintrag steht in der Liste (Revalidierung wie bisher).
- [ ] **AK1.4** GIVEN die Action lehnt ab (Validierungs-/Serverfehler) WHEN die Antwort eintrifft THEN
  bleibt der Dialog offen und zeigt die Fehlermeldung im Dialog; eingegebene Werte gehen nicht verloren.
- [ ] **AK1.5** GIVEN der Dialog ist offen WHEN Escape oder „Abbrechen" ausgelöst wird THEN schließt er
  ohne Anlage, und der Fokus kehrt auf den Auslöser zurück; ein erneutes Öffnen startet ohne alten Fehler.
- [ ] **AK1.6** GIVEN ein Nutzer ohne die erforderliche Rolle WHEN er die Seite öffnet THEN bleibt der
  bestehende Kein-Zugriff-Hinweis; „+ Neu" erscheint nicht (Durchsetzung bleibt in den Actions).

### Veranstaltungsliste (AK2, AK7)

- [ ] **AK2.1** GIVEN Veranstaltungen mit Status `offen` und `abgeschlossen` WHEN `/veranstaltung`
  rendert THEN steht zuerst der Abschnitt „Offen (n)" mit den offenen, danach „Abgeschlossen (n)".
- [ ] **AK2.2** GIVEN der Abschnitt „Abgeschlossen" WHEN die Seite lädt THEN ist er eingeklappt
  (nur Überschrift mit Anzahl sichtbar) und lässt sich per Tipp/Tastatur aufklappen; er enthält alle
  abgeschlossenen Veranstaltungen.
- [ ] **AK2.3** GIVEN Veranstaltungen WHEN sie gelistet werden THEN gilt innerhalb jeder Gruppe die
  bisherige Reihenfolge aus `listVeranstaltungen` (unverändert, keine neue Sortierlogik).
- [ ] **AK2.4** GIVEN es gibt keine offene, aber abgeschlossene Veranstaltungen WHEN die Seite rendert
  THEN zeigt „Offen" den Leer-Hinweis mit Button „Veranstaltung anlegen" (öffnet den Dialog) und
  „Abgeschlossen" bleibt sichtbar.
- [ ] **AK7.1** GIVEN eine Veranstaltungszeile WHEN sie rendert THEN zeigt sie Bezeichnung (Link auf
  `/veranstaltung/[id]`), Datum, **Katalogname** und **Kasse**; die Status-Angabe in der Zeile entfällt,
  weil die Gruppe sie trägt.
- [ ] **AK7.2** GIVEN zwei Veranstaltungen mit gleicher Bezeichnung, aber verschiedenem Katalog WHEN die
  Liste rendert THEN sind sie ohne Öffnen an der Katalog-Angabe unterscheidbar.
- [ ] **AK7.3** GIVEN der Katalog einer Veranstaltung ist deaktiviert oder nicht auflösbar WHEN die Zeile
  rendert THEN erscheint kein Absturz; die Zeile zeigt den Katalognamen, falls vorhanden, sonst einen
  neutralen Platzhalter.

### Stehende Theke (AK3)

- [ ] **AK3.1** GIVEN `/veranstaltung` WHEN sie rendert THEN enthält sie weder das Formular noch einen
  Hinweis „Stehende Theke einrichten".
- [ ] **AK3.2** GIVEN ein Nutzer mit Rolle `verwalter` WHEN er `/verwaltung/theke` öffnet THEN sieht er
  das bisherige Formular (Kasse wählen, „Einrichten") mit identischem Verhalten (idempotent, Erfolgs-
  und Fehlermeldung); der Seitenkopf hat einen Zurück-Link zur Startseite.
- [ ] **AK3.3** GIVEN ein Nutzer ohne Rolle `verwalter` WHEN er `/verwaltung/theke` aufruft THEN
  erscheint der Kein-Zugriff-Hinweis.
- [ ] **AK3.4** GIVEN ein `verwalter` WHEN der Header gerendert wird THEN enthält die Navigation
  (Quelle `lib/navigation.ts`) den Eintrag „Theke" mit Ziel `/verwaltung/theke`; Nutzer ohne
  `verwalter` sehen ihn nicht.
- [ ] **AK3.5** GIVEN `docs/routes.md` WHEN die Änderung fertig ist THEN führt sie `/verwaltung/theke`
  mit Funktion und Zugriff `verwalter`.

### Katalog-Artikel (AK4, AK5)

- [ ] **AK4.1** GIVEN ein Katalog mit Artikeln WHEN `/verwaltung/katalog/[id]` rendert THEN erscheinen
  die Artikel in Abschnitten je Kategorie (Getränk, Kaffee, Essen – Reihenfolge wie in
  `CATEGORY_LABEL`), je mit Überschrift; leere Kategorien erscheinen nicht.
- [ ] **AK4.2** GIVEN ein Artikel WHEN er gelistet wird THEN ist er eine kompakte, antippbare Zeile mit
  Name (+ Größe, sonst „ohne Größe") und Preis (Ziffern gleicher Breite) ohne eigene Buttons; die Zeile
  hat ein Touch-Ziel ≥ 44 px.
- [ ] **AK4.3** GIVEN eine Artikelzeile WHEN sie angetippt wird THEN öffnet ein Dialog mit den
  bisherigen Bearbeitungs-Feldern, „Speichern" und „Abbrechen" sowie der Aktion „Deaktivieren"
  (bzw. „Aktivieren" bei inaktiven Artikeln).
- [ ] **AK4.4** GIVEN ein inaktiver Artikel WHEN er gelistet wird THEN steht er an seiner normalen
  Sortierstelle in der Gruppe, gedämpft dargestellt und mit Badge „deaktiviert"; Tippen öffnet
  den Dialog mit „Aktivieren".
- [ ] **AK4.5** GIVEN „Speichern" oder „Deaktivieren/Aktivieren" war erfolgreich WHEN die Action
  antwortet THEN schließt der Dialog, und die Zeile zeigt den neuen Stand; bei Fehler bleibt er offen
  mit Meldung (gleiches Verhalten wie AK1.4/AK1.5).
- [ ] **AK4.6** GIVEN 24 Artikel WHEN die Seite bei 375 px Breite gerendert wird THEN belegen sie
  deutlich weniger als bisher (Richtwert: höchstens 2 Bildschirmhöhen) und erzeugen keinen horizontalen
  Überlauf.
- [ ] **AK5.1** GIVEN `/verwaltung/katalog/[id]` WHEN sie rendert THEN steht im Seitenkopfbereich eine
  Auswahlliste (`<select>` mit Label „Katalog") mit allen Katalogen (aktive und inaktive; inaktive mit
  Kennzeichnung „(inaktiv)"), der aktuelle ist vorgewählt; die Radiobutton-Gruppe entfällt.
- [ ] **AK5.2** GIVEN die Auswahlliste WHEN ein anderer Katalog gewählt wird THEN navigiert die Seite
  zu `/verwaltung/katalog/[gewählte id]` und lädt dessen Artikel.

### Teilnehmer (AK1 ergänzt)

- [ ] **AK8.1** GIVEN `/verwaltung/teilnehmer` WHEN sie rendert THEN steht die Liste direkt unter dem
  Kopf; Anlegen läuft über den Dialog (AK1.1–AK1.5). Das Bearbeiten/Deaktivieren je Zeile
  (`TeilnehmerRow`) bleibt unverändert.

### Leere Zustände (AK6)

- [ ] **AK6.1** GIVEN keine Veranstaltung/kein Artikel/kein Teilnehmer vorhanden WHEN die Seite rendert
  THEN steht an Stelle der Liste ein Hinweistext **und** ein Button, der den jeweiligen Anlege-Dialog
  öffnet („Veranstaltung anlegen", „Artikel anlegen", „Teilnehmer anlegen").
- [ ] **AK6.2** GIVEN ein Katalog ohne Artikel, aber mit Artikeln anderer Kataloge WHEN er geöffnet wird
  THEN gilt der Leerzustand nur für diesen Katalog (Anlegen legt in diesem Katalog an).

## Fehlerszenarien

- [ ] Die Kataloge können für die Auswahl im Anlege-Dialog nicht geladen werden bzw. es gibt keinen
  aktiven Katalog → der Dialog bleibt bedienbar und zeigt die bestehende Fehlerführung der
  Anlege-Action; kein Absturz der Seite (Verhalten wie bisher).
- [ ] Doppeltes Absenden im Dialog (Doppeltipp) → die Anlege-Schaltfläche ist während der Action gesperrt,
  der Dialog nicht per Escape schließbar (`schliessbar={false}`), damit eine Ablehnung nicht verborgen bleibt.
- [ ] Artikel wird in einem zweiten Tab bereits gelöscht (bzw. gehört nicht zum Katalog) → Fehlermeldung
  der Action im Bearbeiten-Dialog statt stillem Erfolg (bestehendes guarded-UPDATE-Verhalten bleibt).
  Ein erneutes Deaktivieren eines schon deaktivierten Artikels ist dagegen ein stiller Erfolg.
- [ ] Sehr lange Bezeichnungen/Namen brechen bei 375 px um, ohne Buttons aus dem Bild zu schieben.
- [ ] Ein Katalog mit sehr vielen Artikeln in einer Kategorie bleibt scrollbar; keine Paging-Logik nötig.

## Nicht-funktionale Anforderungen

- Neue UI nutzt die Bausteine aus `app/components/ui/` und Token-Klassen (ADR-052); umgestellte Pfade
  stehen in `eslint/ui-token-files.mjs` (Farb-Gate).
- Dialoge erfüllen die A11y-Vorgaben des `Dialog`-Bausteins (Titel, Fokus-Rückgabe, Escape).
- Touch-Ziele ≥ 44 px; kein horizontaler Überlauf bei 375 px.
- E2E-Helfer, Capture-Spec und Anleitungen (`docs/anleitung/`) sind im selben PR nachgezogen
  (Anlege-Weg über „+ Neu", Theke unter Verwaltung).

## Offene Fragen

- [ ] Wohin gehören die Katalog-Management-Aktionen (`CatalogControls`: anlegen/umbenennen/
  deaktivieren/duplizieren) im neuen Layout – unter der Auswahlliste im Seitenkopfbereich, oder
  hinter einem Menü? Vorschlag: bleiben als Buttonzeile unter der Auswahlliste, Verhalten unverändert;
  /architecture oder /implement darf die konkrete Platzierung festlegen.
- [ ] Führt die Folgearbeit #181 (QR/Link/Druck) auf `/verwaltung/theke` weiter – dort ist Platz
  vorgesehen; Abstimmung beim Start von #181.
