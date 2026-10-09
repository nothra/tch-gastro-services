# Task 403: bausteine-listenzeile-aufklapper-veranstaltungsliste

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Zwei route-neutrale Bausteine `Aufklapper` und `ListenZeile` unter `app/components/ui/` und
Umstellung der Konsumenten aus Issue #403. Spec: [spec-403](../docs/specs/spec-403-bausteine-listenzeile-aufklapper.md).

## Akzeptanzkriterien
Volltext (GIVEN/WHEN/THEN) in der Spec; hier die Gliederung:
- [ ] AK1.1–AK1.7 – Baustein Aufklapper (eigener Pfeil, Zähler, Anzeigen/Ausblenden, Tastatur, Token-Farben)
- [ ] AK2.1–AK2.8 – Baustein ListenZeile (Karte, Hover, Varianten Link/Zeilenaktion, verblasst + Badge)
- [ ] AK3.1–AK3.6 – `/veranstaltung`: Offen aufgeklappt, Abgeschlossen zu, verblasste Zeilen mit Badge
- [ ] AK4.1–AK4.4 – Startseite, Arbeitsschritt-Kacheln, Detail-Teilnehmer (`ZeileRow`) nutzen ListenZeile
- [ ] AK5.1–AK5.4 – Kassieren/Verzehr-Aufschlüsselung nutzen Aufklapper; beide Dateien im Farb-Gate
- [ ] F1–F4 – Fehlerszenarien (ohne JS, Überlänge, Kontrast, Tastatur am ⋯-Knopf)

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

## Offene Fragen
Q1–Q5 mit Vorschlägen in der Spec (Kontrast bei `opacity-60`, Pfeil in den Kacheln,
Titel der Verzehr-Aufschlüsselung, Zähler optional, Bedarf `/architecture`).

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/403-bausteine-listenzeile-aufklapper-veranstaltungsliste`
Erstellt: 2026-10-09 14:39
