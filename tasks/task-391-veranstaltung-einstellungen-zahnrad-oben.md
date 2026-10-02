# Task 391: veranstaltung-einstellungen-zahnrad-oben

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Einstellungen der Veranstaltung vom Seitenende in den Seitenkopf holen: Zahnrad-Symbol öffnet
einen Dialog „Einstellungen" (Katalog, Stammdaten, Löschen). „Link & QR teilen" wird eine eigene
Teilen-Schaltfläche (Symbol) im Seitenkopf. Spec: `docs/specs/spec-391-veranstaltung-einstellungen-zahnrad-oben.md`
(ersetzt spec-369 AK1/AK21/AK22).

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [ ] AK1 Kein Einstellungen-Bereich mehr am Seitenende
- [ ] AK2 Seitenkopf-Aktionszone: Badge, Teilen, Zahnrad
- [ ] AK3 Symbol-Schaltflächen mit zugänglichem Namen, Tippfläche ≥ 44 px
- [ ] AK4 Zahnrad öffnet Dialog „Einstellungen"
- [ ] AK5 Datierte Veranstaltung: Katalog, Bearbeiten, Löschen (ohne Link teilen)
- [ ] AK6 Stehende Theke: nur Katalog wechseln
- [ ] AK7 Funktionen im Dialog verhalten sich unverändert
- [ ] AK8 Schließen/Escape + Fokusrückgabe aufs Zahnrad
- [ ] AK9 Ablehnungsmeldung beim Löschen bleibt sichtbar
- [ ] AK10 Teilen-Schaltfläche öffnet „Link & QR teilen", QR serverseitig
- [ ] AK11 Link & QR mit einem Tap erreichbar
- [ ] AK12 Abgeschlossen: weder Zahnrad noch Teilen
- [ ] AK13 Nur Tokens/Bausteine (ADR-052), Symbole hell/dunkel erkennbar
- [ ] AK14 375 px + langer Titel: Kopf-Aktionen bleiben sichtbar
- [ ] AK15 Anleitung + Screenshots nachgezogen
- [ ] FS1 Kein Zugriff unverändert
- [ ] FS2 Parallel abgeschlossen → Schreibaktion abgelehnt mit Meldung
- [ ] FS3 Fehler beim Speichern → Dialog bleibt offen, Werte bleiben

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

## Offene Fragen
Q1–Q3 in der Spec, alle für `/architecture` (verschachtelter Löschen-Dialog, Icon-Quelle, Schließen nach Speichern).

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/391-veranstaltung-einstellungen-zahnrad-oben`
Erstellt: 2026-10-02 23:07
