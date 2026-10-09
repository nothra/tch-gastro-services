# Spec: Teilnehmer hinzufügen verschlanken – „Teilnehmer anlegen" statt „Neuer Gast" (#404)

## Kontext
Teil des UI-Feinschliffs nach der UX-Überarbeitung (#368–#375). Der Dialog „Teilnehmer hinzufügen"
der Veranstaltungs-Detailseite (`app/veranstaltung/TeilnehmerHinzufuegenDialog.tsx`) trägt zwei
Formulare mit zwei Hauptaktionen: Auswahl mit „Hinzufügen" und darunter „Neuer Gast" mit „Gast
hinzufügen". Fachlich legt der zweite Bereich einen ganz normalen Teilnehmer an und fügt ihn zur
Veranstaltung hinzu (`createWalkInAction` → `createTeilnehmer` + `addZeile`). In der Verwaltung
heißt dieselbe Funktion „Teilnehmer anlegen"; auch die Feld-Labels weichen ab („Anzeigename" vs.
„Name"), und „Stammteilnehmer" steht nicht im Glossar (`docs/ux/glossar.md`).
Ersetzt den Punkt „Neuen Gast anlegen" aus #401 (Wording-Sammelfix).

Ist-Stand (geprüft): `TeilnehmerFields` ist seit #373 bereits auf den UI-Bausteinen
(`Field`/`SelectField`); der Walk-in-Bereich nutzt es trotzdem nicht (Kommentar am `GastBereich`,
Eintrag in `docs/factory/kleinfunde.md`). Die Duplikat-Warnung (ADR-022, `confirmDuplicate`) gibt es
nur im Verwaltungs-Formular, `createWalkInAction` kennt sie nicht.

## Scope
**Inbegriffen:**
- Dialog „Teilnehmer hinzufügen" auf Suche + Mehrfachauswahl + „Hinzufügen" (+ „Abbrechen") reduzieren.
- Eigener Dialog-Schritt „Teilnehmer anlegen" mit Rücksprung zur Auswahl, gleiches Formular wie die Verwaltung.
- Duplikat-Warnung (ADR-022) auch beim Anlegen aus der Veranstaltung.
- Wording: „Gast"/„Neuer Gast" entfällt; Label „Name" einheitlich; „Stammteilnehmer" entfällt in der UI; Auslöser „Teilnehmer hinzufügen".
- `docs/ux/glossar.md` anpassen.

**Nicht inbegriffen:**
- Änderungen an der Selbstbedienung/Theke (Teilnehmer ohne Konto wählen nur ihren Namen).
- Neue Felder oder andere Validierung am Teilnehmer (Zod-Schema unverändert).
- Weitere Wording-Punkte aus #401 außer der „Gast"-Zeile.
- Interne Bezeichner (`createWalkInAction`, `GastBereich`, Walk-in in ADRs/Specs) – nur sichtbare UI-Texte; Umbenennung interner Namen nur, soweit der Umbau sie ohnehin berührt.

## Akzeptanzkriterien
- [ ] **AK1** GIVEN irgendeine Seite der App WHEN sie gerendert wird THEN kommt „Gast"/„Neuer Gast" nirgends als UI-Text vor; die Funktion heißt überall „Teilnehmer anlegen".
- [ ] **AK2** GIVEN die Detailseite einer offenen Veranstaltung WHEN der Dialog „Teilnehmer hinzufügen" öffnet THEN enthält er nur Suche, Mehrfachauswahl und die Aktion „Hinzufügen" (plus „Abbrechen") sowie den Absprung aus AK3 – kein Namensfeld, keinen Typ, keine Mitglied-Checkbox.
- [ ] **AK3.1** GIVEN der Auswahl-Schritt WHEN der Nutzer den Absprung „Teilnehmer anlegen" wählt THEN wechselt der Dialog zum Schritt „Teilnehmer anlegen" mit Zurück zur Auswahl.
- [ ] **AK3.2** GIVEN der Schritt „Teilnehmer anlegen" WHEN der Nutzer „Zurück" wählt THEN erscheint wieder die Auswahl; zuvor gesetzte Auswahl/Suche bleibt erhalten (entschieden, Q1).
- [ ] **AK3.3** GIVEN die Suche liefert keinen Treffer WHEN der Absprung angezeigt wird THEN lautet er „„<Suchtext>" als Teilnehmer anlegen" und übernimmt den Suchtext als vorbelegten Namen.
- [ ] **AK4.1** GIVEN der Schritt „Teilnehmer anlegen" WHEN er angezeigt wird THEN enthält er dieselben Felder wie die Verwaltung (Name, Typ, Mitglied; dieselbe Komponente) und einen Hinweis, dass die Person direkt zur Veranstaltung hinzugefügt wird.
- [ ] **AK4.2** GIVEN gültige Eingaben, kein Namens-Duplikat WHEN der Nutzer „Anlegen" bestätigt THEN wird der Teilnehmer angelegt und der Veranstaltung hinzugefügt, der Dialog schließt, die Meldung „Teilnehmer angelegt und hinzugefügt" erscheint.
- [ ] **AK4.3** GIVEN ein Teilnehmer mit gleichem Namen existiert bereits WHEN der Nutzer bestätigt THEN erscheint dieselbe nicht-blockierende Duplikat-Warnung wie in der Verwaltung, der Button heißt „Trotzdem anlegen", Eingaben bleiben stehen; erst der Zweitversuch legt an und fügt hinzu (ADR-022).
- [ ] **AK4.4** GIVEN eine Ablehnung (ungültiger Name, Veranstaltung nicht offen/nicht gefunden) WHEN bestätigt THEN bleibt der Dialog im Schritt offen und zeigt den Fehler am Namensfeld; es entsteht weder Teilnehmer noch Zeile.
- [ ] **AK5** GIVEN Verwaltung und Anlege-Schritt WHEN das Namensfeld gerendert wird THEN lautet das Label überall „Name"; „Stammteilnehmer" kommt in der UI nicht mehr vor (u. a. Gruppenbezeichnung, Leer-/Kein-Treffer-Texte, formuliert nach Glossar).
- [ ] **AK6** GIVEN `TeilnehmerFields` WHEN Verwaltung (anlegen/bearbeiten) und Anlege-Schritt rendern THEN nutzen beide dieselbe, auf UI-Bausteinen/Tokens basierende Komponente; die Nachbildung im `GastBereich` und der zugehörige `kleinfunde.md`-Eintrag entfallen.
- [ ] **AK7** GIVEN die Detailseite WHEN der Auslöser gerendert wird THEN heißt er „Teilnehmer hinzufügen" (statt „+ Teilnehmer"), Tap-Ziel ≥ 44 px bleibt.
- [ ] **AK8** GIVEN `docs/ux/glossar.md` WHEN der PR fertig ist THEN: Begriff „Neuer Gast" gestrichen; „Feste Texte für den Teilnehmer-Dialog" auf „Teilnehmer anlegen" umgestellt; Abgrenzung anlegen ↔ hinzufügen ohne „Gast"; die #401-Zeile „Neuen Gast anlegen statt Gast hinzufügen" entfällt; „Stammteilnehmer" nirgends als erlaubter Begriff.

## Fehlerszenarien
- [ ] Veranstaltung zwischenzeitlich abgeschlossen/gelöscht → Fehler im Schritt, nichts wird angelegt (wie bisher `NOT_OFFEN`/`NOT_FOUND`).
- [ ] Name leer/zu lang → Zod-Meldung am Namensfeld, Längengrenze `TEILNEHMER_NAME_MAX` bleibt am Eingabefeld.
- [ ] Doppelklick/zweiter Submit während Läuft → kein zweiter Teilnehmer (Busy-Zustand wie bisher).
- [ ] Rollenprüfung bleibt serverseitig (`requireRole("veranstalter")`).

## Entscheidungen (ehemals offene Fragen, 2026-10-09)
- [x] **Q1** Auswahl und Suchtext bleiben beim Wechsel Auswahl → Anlegen → Zurück erhalten (AK3.2).
- [x] **Q2** Nach erfolgreichem Anlegen schließt der Dialog (AK4.2).
- [x] **Q3** Duplikat-Warnung „Trotzdem anlegen" gilt auch beim Anlegen aus der Veranstaltung (AK4.3).
- [x] **Q4** Ersatztext: „Alle aktiven Teilnehmer sind bereits hinzugefügt."; der Kein-Treffer-Text folgt demselben Muster ohne „Stamm…" (AK5).

## Offene Fragen
_Keine._
