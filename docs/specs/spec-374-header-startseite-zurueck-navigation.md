# Spec: Header, Startseite und Zurück-Navigation (#374)

> Teil der UX-Überarbeitung (UX-7), Übersicht in `docs/ux/ux-issue-entwuerfe.md`. Baut auf den
> UI-Bausteinen aus #368 auf (`PageHeader`, `Button`/`ButtonLink`, `Card`, `Badge`). Überschneidung:
> #373 (Listenseiten – Layout/„+ Neu"), #372 (Bestätigen/Rückmelden).

## Kontext

Der Header zeigt nur die E-Mail-Adresse und „Abmelden" – keinen App-Namen und keinen Weg zur
Startseite. Die Startseite ist ein Menü aus drei Kacheln; der Veranstalter muss für „Was läuft
gerade?" erst in die Liste. `PublicHeader` existiert, wird aber nirgends eingebunden; Gäste auf
`/theke/[token]` sehen keinen Header. `PageHeader` mit Zurück-Link ist seit #369/#371 auf
Detailseite, Kassieren und `/verwaltung/katalog/[id]` im Einsatz; Verzehr, Auslagen, Veranstaltungs-
liste und Teilnehmerverwaltung haben noch eigene `<h1>`/„← Zur Veranstaltung"-Links. Die
Arbeitsschritt-Kacheln „Verzehr" und „Auslagen" sind Nomen neben dem Verb „Kassieren".

## Entscheidungen aus der Klärung

- **Konto-Menü als Aufklapp-Menü** rechts (E-Mail + „Abmelden" darin), nicht dauerhaft sichtbar.
- **„Offene Veranstaltungen" = Liste** aller offenen Veranstaltungen (nicht nur die jüngste).
- **AK4 umfasst** Verzehr, Auslagen, Veranstaltungsliste und Teilnehmerverwaltung – nur Seitenkopf
  und Zurück-Link; das Listen-Layout (Liste zuerst, „+ Neu") bleibt #373.
- **`PublicHeader` wird eingebunden** (nicht entfernt), mit Wortmarke ohne Link auf geschützte Bereiche.
- Kacheln der Detailseite: **„Verzehr erfassen"**, **„Auslagen erfassen"**, „Kassieren" bleibt.

## Scope

**Inbegriffen:**
- Header (`AppNav`): Wortmarke als Startlink, Navigation, Konto-Menü.
- Startseite für Veranstalter: Liste offener Veranstaltungen über den Bereichs-Kacheln.
- `PublicHeader` auf `/theke/[token]`.
- `PageHeader` samt Zurück-Link auf allen Unterseiten; Vorwärts-Aktionen als Button ohne Pfeil.
- Umbenennung der Kacheln; Nachziehen von Tests, E2E und Anleitungs-Screenshots/-Texten.

**Nicht inbegriffen:**
- Listen-Layout, „+ Neu"-Dialoge, Gruppierung (#373).
- Einheitliche Bestätigung/Rückmeldung (#372); Wording-Glossar (#375).
- Neue Rollen, geänderte Zugriffsregeln, neue Routen.
- Der personenbezogene Wechsel „← Verzehr erfassen" in der Kassierzeile (#308) bleibt unverändert.

## Akzeptanzkriterien

### Header (AK1)

- [ ] **AK1.1** GIVEN ein angemeldeter Nutzer auf beliebiger Seite WHEN der Header gerendert wird
  THEN steht links die Wortmarke „TCH Gastro Services" als Link auf `/`, danach die rollengefilterte
  Navigation (Quelle bleibt `lib/navigation.ts`, ADR-031).
- [ ] **AK1.2** GIVEN der Header WHEN er gerendert wird THEN zeigt er rechts einen Konto-Knopf
  (Touch-Ziel ≥ 44 px), der die E-Mail nicht dauerhaft anzeigt.
- [ ] **AK1.3** GIVEN das Konto-Menü ist zu WHEN der Nutzer den Knopf betätigt THEN öffnet sich ein
  Menü mit der E-Mail-Adresse und „Abmelden"; Escape und Klick außerhalb schließen es, der Fokus
  kehrt auf den Knopf zurück.
- [ ] **AK1.4** GIVEN das Menü ist offen WHEN „Abmelden" ausgelöst wird THEN wird die Session
  beendet (bestehende `signOutAction`).
- [ ] **AK1.5** GIVEN ein Besucher ohne Session WHEN eine Seite mit `AppHeader` gerendert wird THEN
  rendert der Header nichts (unverändert, `/login` bleibt sauber).
- [ ] **AK1.6** GIVEN 375 px Breite WHEN der Header gerendert wird THEN laufen Wortmarke, Hamburger
  und Konto-Knopf ohne horizontalen Überlauf; der bestehende Navigations-Drawer funktioniert
  unverändert.

### Startseite (AK2)

- [ ] **AK2.1** GIVEN ein Nutzer mit Rolle `veranstalter` und mindestens einer offenen Veranstaltung
  WHEN er `/` öffnet THEN steht über den Bereichs-Kacheln der Abschnitt „Offene Veranstaltungen"
  mit je einer Zeile (Bezeichnung, Datum, Kasse), die auf `/veranstaltung/[id]` verlinkt.
- [ ] **AK2.2** GIVEN mehrere offene Veranstaltungen WHEN die Liste erscheint THEN ist sie nach Datum
  absteigend sortiert, bei gleichem Datum nach Anlage-Reihenfolge (neueste zuerst).
- [ ] **AK2.3** GIVEN Rolle `veranstalter`, aber keine offene Veranstaltung WHEN `/` geöffnet wird
  THEN steht statt der Liste ein Leer-Hinweis mit Button „Veranstaltung anlegen" (Ziel `/veranstaltung`).
- [ ] **AK2.4** GIVEN ein Nutzer ohne Rolle `veranstalter` (z. B. nur `verwalter`) WHEN er `/` öffnet
  THEN erscheint der Abschnitt „Offene Veranstaltungen" nicht und es wird keine Veranstaltung geladen.
- [ ] **AK2.5** GIVEN die Startseite WHEN sie gerendert wird THEN folgen die rollengefilterten
  Bereichs-Kacheln unterhalb der Liste (bzw. des Leer-Hinweises).
- [ ] **AK2.6** GIVEN die Startseite WHEN sie gerendert wird THEN nutzt sie die UI-Bausteine und
  Token-Klassen aus ADR-052 (kein rohes Tailwind-Grau, kein `dark:`).

### Gäste-Header (AK3)

- [ ] **AK3.1** GIVEN ein Gast ohne Session WHEN er `/theke/[token]` mit gültigem Token öffnet THEN
  steht oben der `PublicHeader` mit dem Veranstaltungs-/Thekennamen als Kontext und dem Einstieg „Anmelden".
- [ ] **AK3.2** GIVEN der `PublicHeader` WHEN er gerendert wird THEN enthält er keinen Link auf
  geschützte Bereiche und kein Personal-Menü (ADR-031).
- [ ] **AK3.3** GIVEN ein ungültiger oder abgelaufener Token WHEN `/theke/[token]` gerendert wird THEN
  erscheint der `PublicHeader` nicht mit einem Veranstaltungsnamen (kein Namensleck an Unbefugte).
- [ ] **AK3.4** GIVEN `/login` WHEN sie gerendert wird THEN erscheint dort kein `PublicHeader`.

### Zurück-Navigation (AK4)

- [ ] **AK4.1** GIVEN `/veranstaltung/[id]/verzehr` und `/veranstaltung/[id]/auslagen` WHEN sie
  gerendert werden THEN nutzen sie `PageHeader` mit Zurück-Link „Zur Veranstaltung" auf
  `/veranstaltung/[id]`; Titel und Meta (Datum · Kasse · Status) bleiben inhaltlich erhalten.
- [ ] **AK4.2** GIVEN `/veranstaltung` und `/verwaltung/teilnehmer` WHEN sie gerendert werden THEN
  nutzen sie `PageHeader` (Titel `h1`) ohne Zurück-Link, da Top-Level-Bereiche über die Navigation
  erreichbar sind. Das übrige Layout bleibt unverändert (#373).
- [ ] **AK4.3** GIVEN `/verwaltung/katalog` (Index) WHEN gerendert THEN nutzt sie `PageHeader`
  ohne Zurück-Link, soweit sie es nicht schon tut.
- [ ] **AK4.4** GIVEN der Zurück-Link in `PageHeader` WHEN er erscheint THEN zeigt der Pfeil immer
  nach links (`←`); in Link-Texten steht kein `→`.
- [ ] **AK4.5** GIVEN die Verzehr-Seite WHEN die Aktion „Kassieren" je Person erscheint THEN ist sie
  ein Button (`ButtonLink`) mit Label „Kassieren" ohne Pfeil im Text.
- [ ] **AK4.6** GIVEN eine Veranstaltung existiert nicht oder der Nutzer hat keine Rolle WHEN eine
  Unterseite geöffnet wird THEN bleibt das Verhalten unverändert (404 bzw. „Kein Zugriff" ohne Datenleck).
- [ ] **AK4.7** GIVEN ein sehr langer Veranstaltungsname bei 375 px WHEN der `PageHeader` gerendert
  wird THEN bricht er um, ohne Überlauf.

### Kacheln (AK5)

- [ ] **AK5.1** GIVEN `/veranstaltung/[id]` WHEN die Arbeitsschritt-Kacheln gerendert werden THEN
  heißen sie „Verzehr erfassen", „Auslagen erfassen" und „Kassieren" (in dieser Reihenfolge) und
  verlinken unverändert auf `/verzehr`, `/auslagen`, `/kassieren`.
- [ ] **AK5.2** GIVEN 375 px Breite WHEN die drei Kacheln nebeneinander stehen THEN brechen die
  längeren Titel um, ohne Überlauf; Kennzahlen bleiben lesbar.
- [ ] **AK5.3** GIVEN eine abgeschlossene Veranstaltung WHEN die Kacheln erscheinen THEN tragen sie
  dieselben Titel, aber keine Kennzahl (unverändert, spec-369 AK6).
- [ ] **AK5.4** GIVEN die Implementierung und das Review sind erfolgreich abgeschlossen WHEN die
  Anleitung des Veranstalters (`docs/anleitung/veranstalter/`) aktualisiert wird THEN stehen dort die
  neuen Namen (Kacheln, Header, Konto-Menü, Startseite), und die Screenshots sind neu erzeugt
  (analog #388). Das geschieht als letzter Schritt im selben PR, **nach** `/review`.

### Querschnitt

- [ ] **AK6** GIVEN der gesamte Umbau WHEN `pnpm lint`, Tests und `routes-doc-check` laufen THEN
  sind sie grün; `docs/routes.md` ist nachgezogen, falls sich Zugriff/Funktion einer Route ändert
  (Startseite zeigt jetzt Veranstaltungsdaten für `veranstalter`).
- [ ] **AK7** GIVEN `docs/ux/ux-issue-entwuerfe.md` WHEN dieser PR gemergt wird THEN steht der
  Eintrag UX-7/#374 im Stand des Issues (inkl. AK5 und Stand-Abgleich).

## Fehlerszenarien

- [ ] Datenbankfehler beim Laden der offenen Veranstaltungen: Startseite zeigt Bereichs-Kacheln
  weiter und einen Hinweis „Veranstaltungen konnten nicht geladen werden" statt eines Seitenabsturzes.
- [ ] Abgelaufene Session beim Öffnen des Konto-Menüs/Abmelden: führt zur Login-Seite, kein Fehler.
- [ ] Konto-Menü ohne JavaScript: „Abmelden" bleibt erreichbar (kein Funktionsverlust gegenüber heute).
- [ ] Nutzer mit leerer E-Mail: Menü zeigt „Angemeldet" (bestehender Fallback).

## Offene Fragen

_Keine._ Geklärt: Anleitungs-Screenshots und -Texte werden im selben PR nach erfolgreicher
Implementierung und Review aktualisiert (AK5.4); Sortierung der Startseiten-Liste bei gleichem Datum
nach Anlage-Zeit (AK2.2, neueste zuerst).
