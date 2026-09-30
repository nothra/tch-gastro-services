# Spec: Veranstaltungs-Detailseite neu ordnen (#369)

> Teil der UX-Überarbeitung (UX-2), Übersicht in `docs/ux/ux-issue-entwuerfe.md`.
> Baut auf den UI-Bausteinen aus #368 auf (`app/components/ui/`: `Button`, `Field`, `Card`,
> `Badge`, `Notice`, `PageHeader`). Überschneidung: #307 (Link kompakter), #181 (QR drucken),
> #371 (Kassieren), #372 (Bestätigen).

## Kontext

`/veranstaltung/[id]` stapelt bis zu 10 Blöcke und 6 Formulare; auf dem Handy sind das rund
drei Bildschirme. Die drei täglichen Arbeitsschritte (Verzehr, Auslagen, Kassieren) beginnen erst
unten auf dem ersten Bildschirm, die Teilnehmerliste ganz unten. „Abschließen" steht oben und
wirkt ohne Rückfrage. Der Veranstalter soll beim Öffnen sofort sehen, wo die Veranstaltung steht,
und mit einem Tipp in den nächsten Arbeitsschritt kommen.

## Entscheidungen aus der Klärung

- **Abschließen / Wieder öffnen** zieht in diesem Issue **minimal** ans Ende der Kassieren-Seite
  um (Button, ohne Bestätigung, Verhalten unverändert). Bestätigung und Offen-Hinweis folgen in
  #371 (AK5 dort).
- **Bestätigung bei „Entfernen"** entsteht hier als schlanker, wiederverwendbarer
  `ConfirmDialog`-Baustein (natives `<dialog>`). #372 übernimmt ihn und rollt ihn auf die
  übrigen Dialoge aus – #369 migriert die bestehenden Dialoge **nicht**.

## Scope

**Inbegriffen:**
- Neue Seitenstruktur der Detailseite (Kopf → Kacheln → Teilnehmerliste → Einstellungen).
- Ein gemeinsamer „+ Teilnehmer"-Dialog (Stammteilnehmer **und** neuer Gast).
- Teilnehmerzeile als Tipp-Ziel mit Zeilenmenü; „Entfernen" mit Bestätigung.
- Bereich „Einstellungen" (eingeklappt) mit Katalog, Stammdaten, Link & QR, Löschen.
- Umzug von „Abschließen"/„Wieder öffnen" ans Ende von Kassieren.
- Abschlussbericht-Darstellung bei abgeschlossenen Veranstaltungen.
- `ConfirmDialog`-Baustein und ein Dialog-Baustein für „+ Teilnehmer"/„Link & QR".

**Nicht inbegriffen:**
- Umbau der Unterseiten Verzehr, Auslagen, Kassieren (#370, #371) – außer dem Umzug des
  Abschließen-Buttons.
- Bestätigung für „Abschließen", „Auslage löschen", „Katalog deaktivieren" sowie Migration der
  vier bestehenden Dialoge (#372).
- Druckansicht des Zugangs-Links (#307 Teil 2, #181). Hier nur die kompakte Darstellung.
- Neue Geschäftsregeln: Bearbeiten-/Lösch-/Katalogwechsel-Regeln (#352, #346) und die
  Abschluss-Ablehnung bei offenen Zeilen (ADR-033 D3) bleiben unverändert.
- Fachliche Änderung der Stammteilnehmer-Verwaltung.

## Begriffe

- **Kachel** – antippbare Fläche für einen Arbeitsschritt, mit Titel und einer Kurzkennzahl.
- **Stehende Theke** – dauerhafte, datumslose Veranstaltung (`typ = theke`, spec-51). Für sie
  gelten Bearbeiten und Löschen nicht (#352).

## Akzeptanzkriterien

### Aufbau und Kopf

- [ ] **AK1** GIVEN eine offene Veranstaltung WHEN die Detailseite geöffnet wird THEN erscheinen
  von oben nach unten: Seitenkopf, drei Arbeitsschritt-Kacheln, Teilnehmerliste, eingeklappter
  Bereich „Einstellungen" – und sonst nichts dazwischen.
- [ ] **AK2** GIVEN die Detailseite WHEN sie gerendert wird THEN zeigt der Kopf Titel, Datum und
  Kasse als Meta sowie den Status als Badge (nicht mehr als Fließtext), und einen
  Zurück-Link zur Veranstaltungsliste.

### Arbeitsschritt-Kacheln

- [ ] **AK3** GIVEN eine offene Veranstaltung WHEN die Kacheln angezeigt werden THEN gibt es
  genau drei – Verzehr, Auslagen, Kassieren –, jede ein Link auf die jeweilige Unterseite
  (`/veranstaltung/[id]/verzehr|auslagen|kassieren`).
- [ ] **AK4** GIVEN eine offene Veranstaltung mit erfasstem Verzehr WHEN die Kacheln angezeigt
  werden THEN nennt die Verzehr-Kachel die Verzehr-Gesamtsumme, die Auslagen-Kachel die
  Auslagensumme und die Kassieren-Kachel den Fortschritt im Format „x von n bezahlt". Die
  Zahlen stimmen mit den Unterseiten überein (gleiche Berechnung, keine zweite Formel).
- [ ] **AK5** GIVEN eine offene Veranstaltung ohne Teilnehmer, ohne Verzehr oder ohne Auslagen
  WHEN die Kacheln angezeigt werden THEN zeigen sie „0,00 €" bzw. „0 von 0 bezahlt" statt
  leerer oder fehlerhafter Werte.
- [ ] **AK6** GIVEN eine abgeschlossene Veranstaltung WHEN die Detailseite geöffnet wird THEN
  ersetzt der Abschlussbericht (Gruppen „Vollständig" und „Nur Getränke" mit je Excel und PDF,
  Links unverändert zu spec-324 AK14) die Kacheln samt Kennzahlen; die Teilnehmerliste bleibt
  schreibgeschützt sichtbar.
- [ ] **AK7** GIVEN eine abgeschlossene Veranstaltung WHEN die Detailseite geöffnet wird THEN
  ist „Wieder öffnen" erreichbar (auf der Kassieren-Seite, siehe AK26), und der Bereich
  „Einstellungen" enthält keine Schreib-Aktionen.

### Teilnehmerliste und „+ Teilnehmer"

- [ ] **AK8** GIVEN eine offene Veranstaltung WHEN die Teilnehmerliste angezeigt wird THEN steht
  die Überschrift „Teilnehmer (n)" mit der Schaltfläche „+ Teilnehmer" in derselben Zeile; die
  beiden bisherigen Formulare (Teilnehmer hinzufügen, Walk-in) sind von der Seite verschwunden.
- [ ] **AK9** GIVEN die Liste einer abgeschlossenen Veranstaltung WHEN sie angezeigt wird THEN
  gibt es keine Schaltfläche „+ Teilnehmer" und kein Zeilenmenü.
- [ ] **AK10** GIVEN eine offene Veranstaltung WHEN „+ Teilnehmer" getippt wird THEN öffnet sich
  **ein** Dialog mit zwei Bereichen: oben die Auswahl aus den noch nicht erfassten aktiven
  Stammteilnehmern, darunter „Neuer Gast".
- [ ] **AK11** GIVEN der Dialog WHEN ein Suchbegriff eingegeben wird THEN zeigt die Auswahl nur
  Stammteilnehmer, deren Name den Begriff enthält (Groß-/Kleinschreibung egal); ohne Treffer
  erscheint ein Leerzustand-Text.
- [ ] **AK12** GIVEN der Dialog WHEN mehrere Stammteilnehmer angehakt und „Hinzufügen" getippt
  werden THEN werden alle als Teilnehmerzeilen der Veranstaltung angelegt, der Dialog schließt
  sich, und die Liste zeigt sie.
- [ ] **AK13** GIVEN der Dialog WHEN bei „Neuer Gast" ein Name eingegeben und bestätigt wird THEN
  wird ein Gast angelegt wie beim bisherigen Walk-in (gleiche Validierung und Wirkung,
  spec-51), der Dialog schließt sich, und der Gast steht in der Liste.
- [ ] **AK14** GIVEN der Dialog WHEN „Hinzufügen" ohne Auswahl getippt wird THEN bleibt der
  Dialog offen und nennt den Grund („Bitte mindestens einen Teilnehmer wählen."); es wird
  nichts angelegt.
- [ ] **AK15** GIVEN der Dialog WHEN Escape gedrückt oder „Abbrechen" getippt wird THEN schließt
  er sich ohne Änderung, und der Fokus kehrt auf „+ Teilnehmer" zurück.
- [ ] **AK16** GIVEN alle aktiven Stammteilnehmer sind bereits erfasst WHEN der Dialog geöffnet
  wird THEN entfällt die Auswahl mit einem erklärenden Text, und „Neuer Gast" bleibt
  benutzbar.

### Teilnehmerzeile

- [ ] **AK17** GIVEN eine Teilnehmerzeile einer offenen Veranstaltung WHEN auf den Namen
  getippt wird THEN öffnet die Verzehr-Seite der Veranstaltung mit dieser Person
  (`?zeile=<id>`, Personenbezug aus #308, Karte der Person initial geöffnet).
- [ ] **AK18** GIVEN eine Teilnehmerzeile einer offenen Veranstaltung WHEN das Zeilenmenü
  geöffnet wird THEN bietet es „Entfernen" an; die Menü-Schaltfläche hat ein sprechendes
  `aria-label` mit dem Namen der Person und eine Touch-Fläche von mindestens 44 × 44 px.
- [ ] **AK19** GIVEN das Zeilenmenü WHEN „Entfernen" gewählt wird THEN öffnet ein
  Bestätigungsdialog, der den Namen der Person nennt, mit den Aktionen „Entfernen" (Variante
  `danger`) und „Abbrechen". Erst die Bestätigung entfernt die Zeile; Abbrechen und Escape
  ändern nichts.
- [ ] **AK20** GIVEN die Bestätigung WHEN der Server das Entfernen ablehnt (z. B. weil die
  Veranstaltung inzwischen abgeschlossen ist) THEN bleibt die Zeile bestehen, und der Dialog
  zeigt die Fehlermeldung der Action.

### Einstellungen

- [ ] **AK21** GIVEN die Detailseite WHEN sie geöffnet wird THEN ist „Einstellungen" standardmäßig
  eingeklappt; aufgeklappt enthält der Bereich, soweit für den Zustand erlaubt: Katalog wechseln
  (nur `offen`, #346), Bezeichnung/Datum/Kasse bearbeiten (nur datierte offene Veranstaltung,
  #352), „Link & QR teilen" (nur `offen`) und „Veranstaltung löschen" (nur datierte offene
  Veranstaltung, #352). Nicht erlaubte Einträge werden nicht angezeigt; ist keiner erlaubt,
  entfällt der Bereich.
- [ ] **AK22** GIVEN der Bereich „Einstellungen" WHEN „Link & QR teilen" getippt wird THEN öffnet
  ein Dialog mit Selbstbedienungs-Link (mit Kopieren-Möglichkeit) und QR-Code. Auf der
  Detailseite selbst ist weder Link noch QR sichtbar, solange der Dialog zu ist. Der QR-Code
  wird weiterhin serverseitig erzeugt (kein `qrcode` im Client-Bundle, #307).
- [ ] **AK23** GIVEN die bestehende Löschen-Funktion WHEN sie unter „Einstellungen" bedient wird
  THEN verhält sie sich unverändert (Bestätigungsdialog und Ablehnungsregeln wie in spec-352;
  Ablehnung bei erfasstem Verzehr, Kassiertem oder Auslagen).

### Abschließen / Wieder öffnen

- [ ] **AK24** GIVEN die Detailseite WHEN sie gerendert wird THEN enthält sie weder „Abschließen"
  noch „Wieder öffnen".
- [ ] **AK25** GIVEN die Kassieren-Seite einer offenen Veranstaltung WHEN sie geöffnet wird THEN
  steht am Seitenende „Abschließen" mit unverändertem Verhalten (inkl. serverseitiger
  Ablehnung „N Zeile(n) noch offen", ADR-033 D3, sichtbar als Fehlermeldung).
- [ ] **AK26** GIVEN die Kassieren-Seite einer abgeschlossenen Veranstaltung WHEN sie geöffnet
  wird THEN steht am Seitenende „Wieder öffnen" mit unverändertem Verhalten (protokolliert,
  ADR-033 D6).

### Mobil

- [ ] **AK27** GIVEN ein Viewport von 375 × 812 px und eine offene Veranstaltung mit mindestens
  drei Teilnehmern WHEN die Detailseite geladen wird THEN sind ohne Scrollen sichtbar: der Kopf,
  alle drei kompletten Kacheln und die Zeilen der ersten Teilnehmer (mindestens eine
  vollständig). E2E-Screenshot als Nachweis; der Nachweis läuft gegen die echte Seite, nicht
  gegen eine Komponente allein.
- [ ] **AK28** GIVEN die Detailseite bei 375 px WHEN sie gerendert wird THEN gibt es keinen
  horizontalen Scroll, und alle Tipp-Ziele (Kacheln, „+ Teilnehmer", Zeilenmenü,
  Dialog-Schaltflächen) sind mindestens 44 px hoch.

### Bausteine

- [ ] **AK29** GIVEN der `ConfirmDialog` WHEN er geöffnet wird THEN ist er ein natives
  `<dialog>` mit `showModal()`, schließt mit Escape, gibt den Fokus an das auslösende Element
  zurück und unterstützt die Variante `danger` für die Bestätigungs-Schaltfläche; Titel und
  Beschreibung sind per `aria-labelledby`/`aria-describedby` verknüpft.
- [ ] **AK30** GIVEN die Dialoge „+ Teilnehmer" und „Link & QR teilen" WHEN sie geöffnet werden
  THEN nutzen sie dieselbe Dialog-Grundlage wie der `ConfirmDialog` (kein zweites
  Dialog-Verhalten), mit Fokusführung und Escape.
- [ ] **AK31** GIVEN die neu gebauten Oberflächen WHEN sie gestylt sind THEN verwenden sie nur die
  Tokens und Bausteine aus #368 (keine rohen Tailwind-Farbklassen) – Kriterium aus #368 AK6.

## Fehlerszenarien

- [ ] **FS1** Zwei Geräte: Während ein Dialog offen ist, wird die Veranstaltung abgeschlossen →
  die Schreib-Action lehnt serverseitig ab, der Dialog zeigt die Meldung, nichts wird geändert.
- [ ] **FS2** Ein Stammteilnehmer wird im Dialog gewählt, ist aber inzwischen deaktiviert oder
  schon erfasst → Ablehnung ohne Teilerfolg-Verwirrung: Meldung nennt den Namen; bereits
  gültige Auswahlen werden nicht doppelt angelegt.
- [ ] **FS3** Gast-Name leer, nur Leerzeichen oder zu lang → Feldfehler im Dialog, wie beim
  bisherigen Walk-in.
- [ ] **FS4** Kein Zugriff (nicht `veranstalter`) → unveränderte Meldung „Kein Zugriff"; die
  Actions prüfen serverseitig.
- [ ] **FS5** Stehende Theke: Einstellungen zeigen weder Bearbeiten noch Löschen (#352); die
  Kacheln und Teilnehmerliste funktionieren wie bei datierten Veranstaltungen.
- [ ] **FS6** Sehr lange Teilnehmernamen und Veranstaltungsbezeichnungen brechen um und
  verdrängen weder Zeilenmenü noch Kennzahlen aus dem Bild.

## Nicht-funktionale Anforderungen

- Tastatur und Screenreader: Dialoge fokussieren beim Öffnen sinnvoll, Escape schließt,
  Zeilenmenü per Tastatur bedienbar.
- Keine Geschäftslogik im Client: Kennzahlen und Validierung kommen aus dem Server bzw. den
  vorhandenen Berechnungen (`kassierSummen`, `auslagenSummen`).
- Unveränderte Routen (Pfade und Zugriff); `docs/routes.md` ist nur zu ändern, falls sich Pfad
  oder Zugriff ändern.

## Offene Fragen

- [ ] **Q1 (für /architecture, ADR-Trigger prüfen):** Wo liegt der gemeinsame Dialog-Baustein
  (`app/components/ui/`), und wie teilen sich `ConfirmDialog` und die Formular-Dialoge ihre
  Grundlage? Zeilenmenü: eigener Baustein oder `<details>`? Wie wird der
  „+ Teilnehmer"-Dialog mit Server Actions und `useActionState` verdrahtet?
- [ ] **Q2 (für /architecture):** Mehrfachauswahl „Hinzufügen" – eine neue Action, die mehrere
  Zeilen atomar anlegt, oder wiederholte Einzelaufrufe? Teilerfolg-Verhalten siehe FS2.
  (Lesson `db-drizzle.md`: Mehrfach-Write nutzt `db.transaction()` nur, wenn der Treiber es
  trägt.)
- [ ] **Q3 (für /architecture):** Wie kommt die Kurzkennzahl „x von n bezahlt" ohne zweite
  Berechnung aus den bestehenden Summen-Modulen auf die Detailseite?
- [ ] **Q4:** Dialog „Link & QR teilen" vs. #307 Teil 2/#181 (Druck): Dieser Dialog liefert die
  kompakte Darstellung; die Druckbarkeit bleibt in #307/#181. Reicht diese Abgrenzung, oder
  soll #307 nach diesem Issue als erledigt (Teil 1) geführt werden?
- [ ] **Q5:** Inhalt der Kacheln bei abgeschlossener Veranstaltung: Der Bericht ersetzt sie
  (AK6). Sollen die Unterseiten (Verzehr, Auslagen, Kassieren) als Nachschlage-Ansicht trotzdem
  erreichbar bleiben, und wenn ja wo? (Vorschlag: über die Kassieren-Seite, die „Wieder öffnen"
  ohnehin enthält; noch zu bestätigen.)
