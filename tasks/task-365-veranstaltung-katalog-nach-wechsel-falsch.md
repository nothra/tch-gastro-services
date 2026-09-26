# Task 365: veranstaltung-katalog-nach-wechsel-falsch

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
Bug-Report (Ralf, 2026-09-26): Neuer Katalog angelegt, neue Veranstaltung angelegt und
für diese Veranstaltung auf den neuen Katalog gewechselt (Katalog-Wechsel je Veranstaltung,
#346). Symptome:

1. Beim Teilen/Öffnen des öffentlichen Veranstaltungslinks wird die Veranstaltung noch mit
   dem **alten** (ursprünglichen) Katalog angezeigt – nicht mit dem neu gewählten.
2. Beim Erfassen eines Verzehr-Artikels über diesen Link erscheint die Fehlermeldung
   "Artikel nicht gefunden".

Vermutung: Die öffentliche Teilnehmer-Ansicht/Server-Action löst den Katalog der
Veranstaltung nicht aus der aktuellen `catalogId` der Veranstaltung auf (z. B. gecachter/
alter Wert, falscher Join, oder Lookup über eine andere Quelle als die Veranstaltungs-
Entität selbst). Dadurch stimmen angezeigte Artikel-IDs und die beim Erfassen erwartete
`catalogId` nicht überein → "Artikel nicht gefunden".

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [ ] GIVEN eine Veranstaltung, deren Katalog nach dem Anlegen auf einen anderen Katalog
      gewechselt wurde, WHEN der öffentliche Veranstaltungslink geöffnet wird, THEN werden
      die Artikel des **aktuell zugeordneten** Katalogs angezeigt (nicht des ursprünglichen).
- [ ] GIVEN dieselbe Ausgangslage, WHEN ein Teilnehmer über den öffentlichen Link einen
      Artikel des aktuellen Katalogs im Verzehr erfasst, THEN wird der Artikel gefunden und
      korrekt gespeichert (keine "Artikel nicht gefunden"-Fehlermeldung).

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `fix/365-veranstaltung-katalog-nach-wechsel-falsch`
Erstellt: 2026-09-26 13:23
