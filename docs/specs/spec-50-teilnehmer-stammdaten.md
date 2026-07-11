# Spec: Teilnehmer-Stammdaten (Personen & Familien)

> Feature F3 · Issue #50 · Epic [Digitale Veranstaltungs-Abrechnung](README-montagsrunde.md)

## Kontext

Eine Abrechnungszeile gehört zu einem Teilnehmer – das kann eine **Einzelperson** oder
eine **Familie** sein (z. B. „Familie Müller"). Die ~14 regelmäßigen Teilnehmer der
Montagsrunde sollen nicht jeden Abend neu eingetippt werden, sondern aus einer
gepflegten Liste ausgewählt werden. Teilnehmer können Mitglieder oder Nicht-Mitglieder
sein. Teilnehmer haben **kein** Benutzerkonto.

## Scope

**Inbegriffen:**
- Teilnehmer anlegen, bearbeiten, deaktivieren (nicht hart löschen).
- Felder: Anzeigename, Typ (`person` | `familie`), Kennzeichen `mitglied` (ja/nein),
  aktiv/inaktiv.
- Liste der Teilnehmer sortierbar/durchsuchbar für die Auswahl beim Abend (F4).

**Nicht inbegriffen:**
- Kontaktdaten, Adressen, Mitgliedsbeiträge (nicht Teil der Gastro-Abrechnung).
- Verknüpfung Familie ↔ enthaltene Personen (Familie ist **eine** Abrechnungseinheit).
- Import aus einer bestehenden Mitgliederverwaltung.
- Teilnehmer-Konten/Login (siehe F7).

## Akzeptanzkriterien

- [ ] GIVEN ein angemeldeter Verwalter WHEN er einen Teilnehmer vom Typ `person` oder
      `familie` mit Anzeigename und Mitglied-Kennzeichen anlegt THEN erscheint dieser in
      der Stammdatenliste und ist beim Anlegen eines Abends auswählbar.
- [ ] GIVEN ein bestehender Teilnehmer WHEN der Verwalter Name oder Mitglied-Kennzeichen
      ändert THEN gilt die Änderung für künftige Abende; abgeschlossene Abende zeigen
      weiterhin den Namen wie zum Abrechnungszeitpunkt.
- [ ] GIVEN ein Teilnehmer, der nicht mehr kommt WHEN der Verwalter ihn deaktiviert THEN
      ist er für neue Abende nicht mehr wählbar, bleibt aber in alten Abrechnungen
      erhalten.
- [ ] GIVEN eine leere oder nur aus Leerzeichen bestehende Namenseingabe WHEN gespeichert
      wird THEN wird sie serverseitig (Zod) abgelehnt.
- [ ] GIVEN ein Abrechner (ohne Verwalter-Rolle) WHEN er Stammdaten bearbeiten will THEN
      wird die Aktion serverseitig abgelehnt (siehe F1).

## Fehlerszenarien

- [ ] Zwei Teilnehmer mit identischem Anzeigenamen → erlaubt, aber Warnhinweis
      (Namensgleichheit kommt vor); Unterscheidung über eindeutige ID.
- [ ] Deaktivieren eines Teilnehmers, der in einem **offenen** Abend geführt wird →
      bleibt in diesem Abend, nur für neue Abende gesperrt.

## Offene Fragen

- [ ] Dürfen Nicht-Mitglieder dieselben Preise wie Mitglieder? (Annahme MVP: **ja**,
      gleiche Preise; Kennzeichen dient nur der Info/Auswertung.) → bestätigen.
- [ ] Braucht es beim Abend eine Möglichkeit, spontan einen **neuen** Teilnehmer
      anzulegen (Walk-in), oder reicht Vorpflege durch den Verwalter? → siehe F4/F5.
