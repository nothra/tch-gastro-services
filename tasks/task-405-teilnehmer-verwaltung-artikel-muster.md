# Task 405: teilnehmer-verwaltung-artikel-muster

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Teilnehmer-Verwaltung (`/verwaltung/teilnehmer`) im Muster von Artikel/Veranstaltung: weiße
Listenzeilen, Bearbeiten-Dialog mit Aktiv/Deaktiviert, Aufklapper „Aktiv“/„Deaktiviert“, `Notice`
(neue Art „warnung“), Farb-Gate. Spec: `docs/specs/spec-405-teilnehmer-verwaltung-artikel-muster.md`.

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [ ] AK1 Zeile: weiße Karte (ListenZeile-Optik), ganze Zeile antippbar, Pfeil, Untertitel „Person/Familie · Mitglied/kein Mitglied“
- [ ] AK2 Dialog „Teilnehmer bearbeiten“: Felder, Speichern (Busy „Speichern …“)/Abbrechen, abgesetzt Deaktivieren/Aktivieren mit Wirkungssatz
- [ ] AK3 Aufklapper „Aktiv“ (offen) / „Deaktiviert“ (zu, verblasst, Badge), nur bei Einträgen, Fokus nach Gruppenwechsel
- [ ] AK4 Meldungen über `Notice`; neue Art „warnung“ (Duplikat-Warnung)
- [ ] AK5 Leerzustand „Noch keine Teilnehmer angelegt.“
- [ ] AK6 `app/verwaltung/teilnehmer/` als Verzeichnis im Farb-Gate

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

## Offene Fragen
- [ ] Q1 Wortlaut der Wirkungssätze (Spec)
- [ ] Q2 ListenZeile braucht Button-Variante → /architecture (Nachtrag ADR-059)
- [ ] Q3 Rolle der Warnung (status vs. alert)

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/405-teilnehmer-verwaltung-artikel-muster`
Erstellt: 2026-10-09 18:07
