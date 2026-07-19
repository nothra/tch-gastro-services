# Spec: Teilnehmer-Stammdaten (Personen & Familien)

> Feature F3 · Issue #50 · Epic [Digitale Veranstaltungs-Abrechnung](README-montagsrunde.md)

## Kontext

Eine Abrechnungszeile gehört zu einem Teilnehmer – das kann eine **Einzelperson** oder
eine **Familie** sein (z. B. „Familie Müller"). Die ~14 regelmäßigen Teilnehmer der
Montagsrunde sollen nicht bei jeder Veranstaltung neu eingetippt werden, sondern aus einer
gepflegten Liste ausgewählt werden. Teilnehmer können Mitglieder oder Nicht-Mitglieder
sein. Teilnehmer haben **kein** Benutzerkonto.

## Scope

**Inbegriffen:**
- Teilnehmer anlegen, bearbeiten, deaktivieren (nicht hart löschen).
- Felder: Anzeigename, Typ (`person` | `familie`), Kennzeichen `mitglied` (ja/nein),
  aktiv/inaktiv.
- Liste der Teilnehmer sortierbar/durchsuchbar für die Auswahl bei der Veranstaltung (F4).

**Nicht inbegriffen:**
- Kontaktdaten, Adressen, Mitgliedsbeiträge (nicht Teil der Gastro-Abrechnung).
- Verknüpfung Familie ↔ enthaltene Personen (Familie ist **eine** Abrechnungseinheit).
- Import aus einer bestehenden Mitgliederverwaltung.
- Teilnehmer-Konten/Login (siehe F7).

## Akzeptanzkriterien

- [ ] GIVEN ein angemeldeter Verwalter WHEN er einen Teilnehmer vom Typ `person` oder
      `familie` mit Anzeigename und Mitglied-Kennzeichen anlegt THEN erscheint dieser in
      der Stammdatenliste und ist beim Anlegen einer Veranstaltung auswählbar.
- [ ] GIVEN ein bestehender Teilnehmer WHEN der Verwalter Name oder Mitglied-Kennzeichen
      ändert THEN gilt die Änderung für künftige Veranstaltungen; abgeschlossene Veranstaltungen zeigen
      weiterhin den Namen wie zum Abrechnungszeitpunkt.
- [ ] GIVEN ein Teilnehmer, der nicht mehr kommt WHEN der Verwalter ihn deaktiviert THEN
      ist er für neue Veranstaltungen nicht mehr wählbar, bleibt aber in alten Abrechnungen
      erhalten.
- [ ] GIVEN eine leere oder nur aus Leerzeichen bestehende Namenseingabe WHEN gespeichert
      wird THEN wird sie serverseitig (Zod) abgelehnt.
- [ ] GIVEN ein Veranstalter (ohne Verwalter-Rolle) WHEN er Stammdaten bearbeiten will THEN
      wird die Aktion serverseitig abgelehnt (siehe F1).

## Fehlerszenarien

- [ ] Zwei Teilnehmer mit identischem Anzeigenamen → erlaubt, aber Warnhinweis
      (Namensgleichheit kommt vor); Unterscheidung über eindeutige ID.
- [ ] Deaktivieren eines Teilnehmers, der in einer **offenen** Veranstaltung geführt wird →
      bleibt in dieser Veranstaltung, nur für neue Veranstaltungen gesperrt.

## Gesetzte Entscheidungen (2026-07-11)

- **Nicht-Mitglieder zahlen dieselben Preise** wie Mitglieder. Das Kennzeichen
  `mitglied` dient nur der Info/Auswertung, nicht der Preisbildung.
- **Walk-in:** Der **Veranstalter** darf während einer offenen Veranstaltung einen **neuen**
  Teilnehmer anlegen (er landet in den Stammdaten und in der Veranstaltung). Selbstbedienungs-Nutzer
  (F7) können **keine** neuen Teilnehmer anlegen, nur aus der Liste wählen.

## Zusätzliche Akzeptanzkriterien

- [ ] GIVEN eine offene Veranstaltung WHEN der **Veranstalter** einen bisher unbekannten Teilnehmer
      (Walk-in) mit Anzeigename und Typ anlegt THEN wird dieser in den Stammdaten
      angelegt **und** der Veranstaltung als Zeile hinzugefügt.
- [ ] GIVEN die Preisberechnung eines Verzehrs WHEN der Teilnehmer Nicht-Mitglied ist
      THEN gelten dieselben Preise wie für Mitglieder.

## Offene Fragen

- [ ] Keine offenen Produktfragen mehr. (Datenmodell/Namensgleichheit → /architecture.)
