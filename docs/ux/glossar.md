# Wording-Glossar für UI-Texte

> **Verbindlich** für jeden sichtbaren Text der App: Labels, Buttons, Dialogtitel, Meldungen,
> Platzhalter, Leerzustände. Ergebnis von UX-8 (#375, Spec
> [`spec-375`](../specs/spec-375-wording-glossar-ui-texte.md)); Übersicht der UX-Issues in
> [`ux-issue-entwuerfe.md`](ux-issue-entwuerfe.md).
>
> **Nicht** betroffen: Bezeichner im Code, Code-Kommentare, Betreiber-Doku unter `docs/`. Ein
> Lint-Gate für die Wortwahl gibt es nicht – `/implement` und `/review` prüfen neue Texte gegen
> diese Datei.

---

## Verben je Aktionstyp

Ein Aktionstyp, ein Verb. Das Verb steht im Button, im Dialogtitel und im Busy-Text.

| Aktionstyp | Verb | Beispiel | Nicht verwenden |
|---|---|---|---|
| Neues Objekt erzeugen | **anlegen** | „Veranstaltung anlegen", „Katalog anlegen", „Artikel anlegen", „Teilnehmer anlegen" (Stammdaten), „Neuen Gast anlegen", „Theke anlegen" | einrichten, erstellen, erfassen, neu hinzufügen |
| Bestehendes Objekt einer Veranstaltung zuordnen | **hinzufügen** | „Teilnehmer hinzufügen" | anlegen, erfassen, aufnehmen |
| Mengen oder Beträge eintragen | **erfassen** | „Verzehr erfassen", „Auslagen erfassen", „Auslage erfassen" | eintragen, buchen, hinzufügen |
| Zuordnung lösen, Objekt bleibt bestehen | **entfernen** | Teilnehmerzeile aus der Veranstaltung „Entfernen" | löschen |
| Objekt dauerhaft verwerfen | **löschen** | „Veranstaltung löschen", Auslage „Löschen" | entfernen, verwerfen |
| Sichtbarkeit/Wählbarkeit umschalten | **deaktivieren** / **aktivieren** | Teilnehmer, Artikel, Katalog „Deaktivieren" ⇄ „Aktivieren" | reaktivieren, ausblenden, sperren |
| Bestehende Werte ändern | **speichern** | „Speichern", „Änderungen speichern" | übernehmen, sichern |

**Abgrenzung anlegen ↔ hinzufügen:** In der Verwaltung wird ein Teilnehmer **angelegt** (neuer
Stammdatensatz). In einer Veranstaltung wird ein vorhandener Teilnehmer **hinzugefügt**. Ein Gast,
den es noch nicht gibt, wird **angelegt** („Neuen Gast anlegen") – er landet dabei zugleich in der
Veranstaltung.

**Weitere feste Verben** (eigene Vorgänge, kein Synonym für die Tabelle oben): „Kassieren",
„Abschließen", „Öffnen" (Veranstaltung wieder öffnen), „Umbenennen", „Duplizieren",
„Katalog wechseln", „Teilen", „Anmelden", „Abmelden", „Abbrechen".

---

## Meldungen

| Art | Muster | Beispiele |
|---|---|---|
| Erfolg nach Änderung | **„Gespeichert"** | „Gespeichert" |
| Erfolg nach anderer Aktion | **„<Objekt> <Partizip>"** | „Veranstaltung angelegt", „Teilnehmer entfernt", „Auslage gelöscht", „Katalog gewechselt" |
| Abgelehnte Aktion (fachliche Regel verhindert sie) | **„<Aktion> nicht möglich: <Grund>."** | „Löschen nicht möglich: für diese Veranstaltung ist bereits Geld kassiert." (`app/veranstaltung/actions.ts`) |
| Feld-Validierung (Eingabe fehlt oder ist ungültig) | Sachsatz, Feld vorn: **„<Feld> ist erforderlich."**, **„<Feld> ist zu lang."**, **„<Feld> muss …"**; Auswahl: **„Bitte <Objekt> wählen."** | „Bezeichnung ist erforderlich.", „Betrag ist zu hoch.", „Bitte einen Katalog wählen." (`app/**/schema.ts`) |
| Objekt existiert nicht (mehr) | **„<Objekt> nicht gefunden."** | „Veranstaltung nicht gefunden.", „Katalog nicht gefunden." |
| Fehlende Rolle (Seiten-Hinweis) | **„Kein Zugriff – nur <Rolle> dürfen <Tätigkeit>."** | „Kein Zugriff – nur Veranstalter dürfen Verzehr erfassen." |
| Busy (Button während der Aktion) | **„<Verb> …"** – Verb des Buttons, Leerzeichen vor „…" | „Anlegen …", „Löschen …", „Entfernen …", „Speichern …" |

- **Satzzeichen:** Erfolgsmeldungen sind Kurzformen **ohne** Schlusspunkt. Alle Fehler-Arten
  (abgelehnte Aktion, Feld-Validierung, nicht gefunden, kein Zugriff) sind ein Satz **mit**
  Schlusspunkt.
- **Doppelpunkt nur bei „nicht möglich":** Das Muster „<Aktion> nicht möglich" trennt den Grund mit
  Doppelpunkt, nie mit Gedankenstrich. Der Zugriffs-Hinweis „Kein Zugriff – …" ist ein eigenes
  Muster und behält seinen Gedankenstrich.
- **Busy-Text folgt dem Button:** Der Button „Anlegen" zeigt „Anlegen …", nicht „Speichern …";
  „Kassieren" zeigt „Kassieren …".
- Erfolg erscheint über `role="status"`, Fehler über `role="alert"` (Mechanik: #372).

---

## Anrede

**Überall Du** – an der Theke, beim Veranstalter und in der Verwaltung. „Sie" kommt nicht vor.

| | Beispiel |
|---|---|
| ✅ Positiv | „Wer bist du?", „Für wen möchtest du einen Verzehr erfassen?", „Wähle zuerst einen Teilnehmer." |
| ❌ Negativ | „Wer sind Sie?", „Bitte wählen Sie einen Teilnehmer.", „Ihre Änderungen wurden gespeichert." |

**Sachsätze ohne Ansprache sind erlaubt** und oft kürzer: „Kein Zugriff – nur Veranstalter dürfen
Verzehr erfassen.", „Noch keine Veranstaltung angelegt." Dazu zählt auch die Bitte im Infinitiv
ohne Pronomen („Bitte einen Katalog wählen.") – sie ist erlaubt und muss nicht zu „Wähle …"
umgeschrieben werden. Neue Texte mit direkter Ansprache nutzen den Imperativ in Du-Form.

---

## Einheiten und Zahlen

- **Beträge:** „0,00 €" – Dezimalkomma, Leerzeichen, Eurozeichen hinter der Zahl (Formatierung über
  `formatCents`, `lib/money`).
- **Feld-Labels mit Einheit:** „Betrag (€)", „Erhalten (€)", „Preis (€)" – **nie** „(EUR)".

---

## Platzhalter und Zeichen

- **Auswahl-Platzhalter:** „Bitte wählen …" (mit Leerzeichen vor „…").
- **Auslassungszeichen:** immer „…" (ein Zeichen, U+2026), nie „...". Vor „…" steht ein Leerzeichen,
  wenn es ein ganzes Wort abschließt („Anlegen …", „Bitte wählen …").
- **Pfeile:**
  - „←" nur für den **Zurück-Link**, **vor** dem Ziel: „← Zur Veranstaltung", „← Verzehr erfassen".
  - „→" nur für eine **Weiter-Aktion**, **nach** dem Ziel: „Nächste Person →".
  - Keine anderen Pfeil-Stellungen („Kassieren →" als Link, „Zurück ←").
- **Anführungszeichen** in Texten: deutsche „…".

---

## Begriffe

| Begriff | Bedeutung | Nicht verwenden |
|---|---|---|
| **Neuer Gast** | Ein Gast, der nicht in der Teilnehmerliste steht und vom Veranstalter direkt in der Veranstaltung angelegt wird. | Walk-in, Laufkundschaft, Spontangast |
| **Veranstaltung** | Abzurechnende Zusammenkunft (siehe `PROJECT-CONTEXT.md` → Fachdomäne). | Abend, Event |
| **Teilnehmer** | Person oder Familie, eine Abrechnungszeile. | Gast (außer „Neuer Gast"), Kunde |

**Feste Texte für den Teilnehmer-Dialog** auf der Veranstaltungs-Detailseite:

- Dialogtitel: „Teilnehmer hinzufügen"
- Bereich für vorhandene Teilnehmer, Button: „Hinzufügen" (Busy „Hinzufügen …")
- Bereich für den neuen Gast, Überschrift „Neuer Gast", Button: **„Neuen Gast anlegen"**
  (Busy „Anlegen …")

---

## Ausnahmen

- **Code-Bezeichner** (`createWalkInAction`, `WalkInForm` u. ä.) dürfen „Walk-in" behalten – sie
  sind kein UI-Text. Ein Umbenennen ist kein Teil dieses Glossars. Dasselbe gilt für
  Code-Kommentare, die „Walk-in" nennen – im sichtbaren UI-Text kommt „Walk-in" bereits nicht mehr
  vor (Stand `31e5fbf`).
- **Abgeschlossene Specs und ADRs** zitieren Texte im damaligen Wortlaut, z. B. „Bitte wählen…"
  (`spec-194`), „Walk-in" (`spec-369`, ADR-022), „Stehende Theke einrichten" (`spec-373`),
  „Deaktivieren/Reaktivieren" (`spec-345`, ADR-022). Sie sind Historie und werden nicht nachgezogen.
  Für jede neue oder geänderte UI gilt dieses Glossar, auch wenn eine ältere Spec den alten Text
  wörtlich nennt.

---

## Abweichungsliste (Stand 2026-10-09)

Ist-Texte in `app/`, die vom Glossar abweichen, mit Ziel-Issue. Arbeitsvorlage – eine Zeile wird
beim Umsetzen gestrichen. Zeilenangaben gegen den Stand von #372 (Review-Rework) geprüft.

Die Zeilen mit Ziel #372 sind mit #372 umgesetzt und gestrichen; dabei sind auch die
Katalog-Dialoge (Busy-Texte) und „Theke eingerichtet." (jetzt Toast „Theke angelegt") mit erledigt.
Alles Übrige sammelt **#401**.

| Datei | Ist | Soll | Ziel |
|---|---|---|---|
| `app/veranstaltung/KatalogWechsel.tsx:47` | Busy „Speichern …" (Button „Katalog wechseln") | „Wechseln …" | #401 |
| `app/veranstaltung/TeilnehmerHinzufuegenDialog.tsx:207` | Button „Gast hinzufügen" | „Neuen Gast anlegen" | #401 |
| `app/veranstaltung/TeilnehmerHinzufuegenDialog.tsx:97` | „Alle aktiven Stammteilnehmer sind bereits erfasst." | „… sind bereits hinzugefügt." | #401 |
| `app/veranstaltung/actions.ts:339` (Text aus `nichtsAngelegt`, `:96–99`) | „Bereits erfasst: <Namen>. Es wurde niemand hinzugefügt." | „Hinzufügen nicht möglich: <Namen> bereits hinzugefügt. Es wurde niemand hinzugefügt." | #401 |
| `app/veranstaltung/actions.ts:335` (Text aus `nichtsAngelegt`, `:96–99`) | „Nicht mehr wählbar: <Namen>. Es wurde niemand hinzugefügt." | „Hinzufügen nicht möglich: <Namen> nicht mehr wählbar. Es wurde niemand hinzugefügt." | #401 |
| `app/veranstaltung/actions.ts:93` | „Bereits erfasst: jemand aus der Auswahl wurde gerade auf einem anderen Gerät erfasst. Es wurde niemand hinzugefügt." | „Hinzufügen nicht möglich: jemand aus der Auswahl wurde gerade auf einem anderen Gerät hinzugefügt. Es wurde niemand hinzugefügt." | #401 |
| `app/veranstaltung/VeranstaltungAnlegen.tsx:77` | Busy „Speichern …" (Button „Anlegen") | „Anlegen …" | #401 |
| `app/verwaltung/teilnehmer/TeilnehmerAnlegen.tsx:49` | Busy „Speichern …" (Button „Anlegen") | „Anlegen …" | #401 |
| `app/verwaltung/katalog/ArtikelAnlegen.tsx:48` | Busy „Speichern …" (Button „Anlegen") | „Anlegen …" | #401 |
| `app/veranstaltung/KassiereZeileForm.tsx:67` | Busy „Speichern …" (Button „Kassieren") | „Kassieren …" | #401 |
| `app/veranstaltung/AuslageForm.tsx:142` | Busy „Speichern …" (Button „Auslage erfassen") | „Erfassen …" (beim Bearbeiten bleibt „Speichern …") | #401 |
| `app/veranstaltung/KassiereZeileForm.tsx:53` | „Erhalten (EUR)" | „Erhalten (€)" | #401 |
| `app/veranstaltung/AuslageForm.tsx:112` | „Betrag (EUR)" | „Betrag (€)" | #401 |
| `app/verwaltung/katalog/CatalogFields.tsx:45` | „Preis (EUR)" | „Preis (€)" | #401 |
| `app/theke/[token]/IdentityGate.tsx:177` | „Bitte wählen…" | „Bitte wählen …" | #401 |
| `app/verwaltung/theke/ThekeSetup.tsx:24` | „… ein erneutes Einrichten legt nicht doppelt an." | „… ein erneutes Anlegen legt nicht doppelt an." | #401 |
| `app/verwaltung/theke/ThekeSetup.tsx:35` | Button „Einrichten" / Busy „Einrichten …" | „Anlegen" / „Anlegen …" | #401 |
| `app/verwaltung/theke/page.tsx:14` | „… nur Verwalter dürfen die Theke einrichten." | „… die Theke anlegen." | #401 |

**Beim Umsetzen mitziehen** (kein UI-Text, aber an den Wortlaut gebunden): `e2e/helpers/detailseite.ts:23`
(„Gast hinzufügen"), `e2e/listenseiten.spec.ts:149` („Preis (EUR)") sowie die Unit-Tests neben den
Komponenten (per Grep auf den Ist-Text).

**Bereits konform** (im Spec-Kontext genannt, keine Änderung nötig):

| Datei | Text | Regel |
|---|---|---|
| `app/veranstaltung/ZeilenMenue.tsx:125` | „Entfernen" (Teilnehmerzeile) | Zuordnung lösen = entfernen |
| `app/veranstaltung/AuslageRow.tsx:131` | „Löschen" (Auslage) | dauerhaft verwerfen = löschen |
| `app/veranstaltung/[id]/VeranstaltungLoeschen.tsx:96` | „Löschen …" (Veranstaltung) | dauerhaft verwerfen = löschen |
| `app/veranstaltung/OffeneVeranstaltungen.tsx:28` | „Veranstaltung anlegen" | neues Objekt = anlegen |
| `app/veranstaltung/TeilnehmerHinzufuegenDialog.tsx:48` | „Teilnehmer hinzufügen" | zuordnen = hinzufügen |
| `app/veranstaltung/[id]/ArbeitsschrittKacheln.tsx:12` | „Verzehr erfassen" | Mengen eintragen = erfassen |
| `app/verwaltung/teilnehmer/TeilnehmerRow.tsx:78`, `app/verwaltung/katalog/CatalogRow.tsx:89` | „Aktivieren" | umschalten = (de)aktivieren |
| `app/veranstaltung/AuslageForm.tsx:86` | „Bitte wählen …" | Platzhalter mit Leerzeichen |
| `app/veranstaltung/[id]/kassieren/page.tsx:236` | „← Verzehr erfassen" | Zurück-Link, Pfeil vor dem Ziel |
| `app/_verzehr/VerzehrEinzelansicht.tsx:156` | „Nächste Person →" | Weiter-Aktion, Pfeil nach dem Ziel |
| `app/theke/[token]/IdentityGate.tsx:235` | „Wer bist du?" | Anrede Du |
