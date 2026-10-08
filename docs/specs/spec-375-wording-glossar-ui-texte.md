# Spec: Wording-Glossar für UI-Texte (#375)

> Teil der UX-Überarbeitung (UX-8), Übersicht in `docs/ux/ux-issue-entwuerfe.md`. Läuft parallel
> zu #368 und fließt in #369–#374 ein (u. a. #372 AK5: „Meldungstexte nach dem Glossar").

## Kontext

Die UI-Texte benutzen für dieselbe Sache unterschiedliche Wörter. Befund aus dem Code (`app/`):

- **Anlegen / Hinzufügen / Erfassen / Einrichten:** „Veranstaltung anlegen" neben „Teilnehmer
  hinzufügen", „Gast hinzufügen" mit Busy-Text „Anlegen …", „Verzehr erfassen", „Theke einrichten".
- **Entfernen vs. Löschen:** Teilnehmerzeile „Entfernen" (`ZeilenMenue.tsx`), Auslage und
  Veranstaltung „Löschen" (`AuslageRow.tsx`, `actions.ts`).
- **Aktivieren vs. Reaktivieren:** „Aktivieren" bei Teilnehmer und Katalogliste, „Reaktivieren"
  in `CatalogControls.tsx`.
- **Einheit:** „Erhalten (EUR)", „Betrag (EUR)", „Preis (EUR)" neben „0,00 €".
- **Auswahl-Platzhalter:** „Bitte wählen…" (`IdentityGate.tsx`) vs. „Bitte wählen …" (`AuslageForm.tsx`).
- **Pfeile:** „← Verzehr erfassen", „Nächste Person →", „←" im `PageHeader` – ohne festgelegte Regel.
- **Anglizismus:** „Walk-in" in Kommentaren und im Dialog „Teilnehmer hinzufügen".
- **Anrede:** „Wer bist du?" an der Theke, sonst Sachsätze („nur Verwalter dürfen …").

Ohne verbindliche Festlegung driftet jede neue UI-Arbeit (#369–#374) wieder auseinander.

## Entscheidungen aus der Klärung

- **Anrede: überall Du.** Wo die App die Person direkt anspricht (Fragen, Hinweise, Fehlermeldungen
  an die handelnde Person), steht Du – in Theke **und** Verwaltung/Veranstalter. Sachsätze ohne
  Ansprache („Nur Verwalter dürfen die Theke einrichten") bleiben zulässig; es gibt kein „Sie".
- **Ersatz für „Walk-in": „Neuer Gast".** Gemeint: ein Gast, der nicht in der Teilnehmerliste steht
  und vom Veranstalter angelegt wird. Button-/Dialogtext „Neuen Gast anlegen".

## Scope

**Inbegriffen:**
- Neue Datei `docs/ux/glossar.md` mit den verbindlichen Wortregeln (siehe AK1).
- Eine Verweiszeile in `docs/factory/PROJECT-CONTEXT.md` → „Projektspezifische Coding-Konventionen",
  damit `/implement` und `/review` das Glossar laden (AK2).
- Im Glossar eine **Abweichungsliste** (Ist-Text → Soll-Text, mit Datei) als Arbeitsvorlage für
  #369–#374.
- Login-Seite: Nachweis, dass Labels sichtbar sind (AK3).

**Nicht inbegriffen:**
- Umschreiben bestehender UI-Texte im Code: das geschieht in den jeweiligen UX-Issues (#369–#374)
  bzw. in einem Folge-Issue für nicht abgedeckte Stellen (`/implement` legt es über den
  Issue-Seam an, falls Abweichungen übrig bleiben).
- Neue UI-Bausteine, Layout, Farben (#368).
- Englisch-/Mehrsprachigkeit; Texte der Betreiber-Doku (`docs/`) außerhalb der App-UI.
- Ein automatisches Gate (Lint) für Wortwahl.

## Akzeptanzkriterien

### AK1 – Glossar `docs/ux/glossar.md`

- [ ] **AK1.1 Verb je Aktionstyp.** GIVEN die Datei `docs/ux/glossar.md` WHEN sie gelesen wird
  THEN enthält sie eine Tabelle „Aktionstyp → Verb → Beispiel → Nicht verwenden" mit mindestens:
  - **neues Objekt erzeugen = „anlegen"** (Veranstaltung, Katalog, Artikel, Neuer Gast);
    „einrichten", „erstellen", „erfassen" sind dafür nicht zulässig;
  - **bestehendes Objekt einer Veranstaltung zuordnen = „hinzufügen"** (Teilnehmer hinzufügen);
  - **Mengen/Beträge eintragen = „erfassen"** (Verzehr erfassen, Auslagen erfassen);
  - **Zuordnung lösen, Objekt bleibt bestehen = „entfernen"** (Teilnehmerzeile aus Veranstaltung);
  - **Objekt dauerhaft verwerfen = „löschen"** (Veranstaltung, Auslage);
  - **Sichtbarkeit/Wählbarkeit umschalten = „deaktivieren" / „aktivieren"** – nie „reaktivieren".
- [ ] **AK1.2 Meldungsmuster.** GIVEN das Glossar WHEN der Abschnitt „Meldungen" gelesen wird THEN
  legt er fest: Erfolg = „Gespeichert" (Änderung) bzw. „<Objekt> <Partizip>" („Auslage gelöscht",
  „Teilnehmer entfernt", „Veranstaltung angelegt"); Fehler = „<Aktion> nicht möglich: <Grund>"
  (bestehendes Muster aus `actions.ts`); Busy-Text = „<Verb> …" mit Leerzeichen vor dem Auslassungs-
  zeichen („Anlegen …").
- [ ] **AK1.3 Anrede.** GIVEN das Glossar WHEN der Abschnitt „Anrede" gelesen wird THEN steht dort
  „überall Du" (Theke, Veranstalter, Verwaltung) mit je einem Positiv- und Negativbeispiel; „Sie"
  ist ausgeschlossen; Sachsätze ohne Ansprache sind erlaubt.
- [ ] **AK1.4 Einheiten.** GIVEN das Glossar WHEN der Abschnitt „Einheiten und Zahlen" gelesen wird
  THEN steht dort: Beträge „0,00 €" (Komma, Leerzeichen, Eurozeichen); Feld-Labels „Betrag (€)",
  „Erhalten (€)", „Preis (€)" – nie „(EUR)".
- [ ] **AK1.5 Platzhalter und Zeichen.** GIVEN das Glossar THEN legt es fest: Auswahl-Platzhalter
  „Bitte wählen …" (mit Leerzeichen); Pfeile: „←" nur als Zurück-Link **vor** dem Ziel
  („← Zur Veranstaltung"), „→" nur als Weiter-Aktion **nach** dem Ziel („Nächste Person →");
  Auslassungszeichen immer „…" (ein Zeichen), nie „...".
- [ ] **AK1.6 Ersatz für „Walk-in".** GIVEN das Glossar WHEN der Abschnitt „Begriffe" gelesen wird
  THEN führt er „Neuer Gast" als einzigen Begriff für den vom Veranstalter angelegten Gast, nennt
  „Walk-in" unter „Nicht verwenden" und enthält die Button-/Dialogtexte „Neuen Gast anlegen" und
  „Teilnehmer hinzufügen".
- [ ] **AK1.7 Abweichungsliste.** GIVEN das Glossar THEN enthält es eine Tabelle „Ist → Soll" mit
  Datei-Anker für mindestens die oben unter „Kontext" genannten Stellen (Anlegen/Hinzufügen,
  Entfernen/Löschen, Reaktivieren, „(EUR)", „Bitte wählen…", „Walk-in", „Gast hinzufügen"), jeweils
  mit dem Verweis auf das UX-Issue, das sie umsetzt (soweit zuordenbar).
- [ ] **AK1.8 Auffindbar.** GIVEN `docs/ux/ux-issue-entwuerfe.md` WHEN UX-8 gelesen wird THEN verweist
  sie auf `docs/ux/glossar.md` als Ergebnis.

### AK2 – Verweis aus PROJECT-CONTEXT

- [ ] **AK2.1** GIVEN `docs/factory/PROJECT-CONTEXT.md` WHEN „Projektspezifische Coding-Konventionen"
  gelesen wird THEN steht dort **eine** Zeile, die für UI-Texte (Labels, Buttons, Meldungen,
  Platzhalter) auf `docs/ux/glossar.md` verweist.
- [ ] **AK2.2** GIVEN der Push-Check `scripts/checks/import-context-limit-check.sh` WHEN er nach der
  Änderung läuft THEN bleibt der `@import`-Dauerkontext unter der Grenze (Ist vorher: 928 von
  1100 Zeilen; die Zeile fügt eine hinzu).

### AK3 – Login-Seite mit sichtbaren Labels

- [ ] **AK3.1** GIVEN die Login-Seite WHEN sie gerendert wird THEN haben E-Mail und Passwort ein
  sichtbares, per `getByLabelText` auffindbares Label (nicht nur einen Platzhalter). *Stand heute
  bereits erfüllt (`Field` aus #368, `app/login/page.tsx`; Test `app/login/page.test.tsx:35`).*
  Es entsteht kein neuer Code; die Prüfung wird in der Task-Datei als „erfüllt durch #368" vermerkt.
  Fehlt der Test-Nachweis beim Umsetzen, wird er ergänzt.

## Fehlerszenarien

- [ ] Das Glossar widerspricht einer bestehenden Spec/ADR (z. B. Labeltext, den eine Spec wörtlich
  festlegt) → die Abweichung steht im Glossar unter „Ausnahmen" mit Verweis, statt still zu gelten.
- [ ] Der Verweis in `PROJECT-CONTEXT.md` reißt die Dauerkontext-Grenze → Zeile verdichten, nicht
  Grenze anheben (siehe AK2.2).
- [ ] Eine Abweichungs-Zeile nennt eine Datei/Zeile, die nicht (mehr) existiert → vor dem Commit
  gegen den `app/`-Baum gegenprüfen (Drift-Lesson: Anker per Grep belegen).

## Offene Fragen

- [ ] Soll die Abweichungsliste nach Abarbeitung durch #369–#374 gepflegt/gelöscht werden, oder
  bleibt sie als Historie? *Vorschlag:* beim Schließen des letzten UX-Issues entfernen
  (Entscheidung nicht blockierend für diese Task).
