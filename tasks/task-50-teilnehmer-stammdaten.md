# Task 50: teilnehmer-stammdaten

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
<!-- Was soll implementiert werden? -->
Feature F3: Stammdaten-Verwaltung für **Teilnehmer** (Einzelperson oder Familie) durch den
**Verwalter**. Teilnehmer werden angelegt, bearbeitet und deaktiviert (kein Hard-Delete) und
sind später beim Anlegen eines Abends (F4) auswählbar. Felder: Anzeigename, Typ
(`person` | `familie`), Kennzeichen `mitglied` (ja/nein), aktiv/inaktiv. Kein Teilnehmer-Konto.

Kanonische Spec: [docs/specs/spec-50-teilnehmer-stammdaten.md](../docs/specs/spec-50-teilnehmer-stammdaten.md).

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [ ] GIVEN ein angemeldeter Verwalter WHEN er einen Teilnehmer vom Typ `person` oder `familie`
      mit Anzeigename und Mitglied-Kennzeichen anlegt THEN erscheint dieser in der
      Stammdatenliste und ist beim Anlegen eines Abends auswählbar.
- [ ] GIVEN ein bestehender Teilnehmer WHEN der Verwalter Name oder Mitglied-Kennzeichen ändert
      THEN gilt die Änderung für künftige Abende; abgeschlossene Abende zeigen weiterhin den
      Namen wie zum Abrechnungszeitpunkt.
- [ ] GIVEN ein Teilnehmer, der nicht mehr kommt WHEN der Verwalter ihn deaktiviert THEN ist er
      für neue Abende nicht mehr wählbar, bleibt aber in alten Abrechnungen erhalten.
- [ ] GIVEN eine leere oder nur aus Leerzeichen bestehende Namenseingabe WHEN gespeichert wird
      THEN wird sie serverseitig (Zod) abgelehnt.
- [ ] GIVEN ein Abrechner (ohne Verwalter-Rolle) WHEN er Stammdaten bearbeiten will THEN wird die
      Aktion serverseitig abgelehnt (siehe F1).
- [ ] GIVEN ein offener Abend WHEN der **Abrechner** einen bisher unbekannten Teilnehmer
      (Walk-in) mit Anzeigename und Typ anlegt THEN wird dieser in den Stammdaten angelegt **und**
      dem Abend als Zeile hinzugefügt.
- [ ] GIVEN die Preisberechnung eines Verzehrs WHEN der Teilnehmer Nicht-Mitglied ist THEN gelten
      dieselben Preise wie für Mitglieder (Kennzeichen `mitglied` ist nur Info/Auswertung).

### Fehlerszenarien
- [ ] Zwei Teilnehmer mit identischem Anzeigenamen → erlaubt, aber Warnhinweis; Unterscheidung
      über eindeutige ID.
- [ ] Deaktivieren eines Teilnehmers, der in einem **offenen** Abend geführt wird → bleibt in
      diesem Abend, nur für neue Abende gesperrt.

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
Keine offenen Produktfragen (Spec bestätigt). Datenmodell/Namensgleichheit → `/architecture`.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/50-teilnehmer-stammdaten`
Erstellt: 2026-07-14 19:01
