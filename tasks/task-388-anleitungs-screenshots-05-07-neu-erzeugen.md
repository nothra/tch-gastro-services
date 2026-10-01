# Task 388: anleitungs-screenshots-05-07-neu-erzeugen

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Die Anleitungs-Bilder `05`–`07` (und bei Abweichung `10`–`12`) zeigen noch das Layout vor #369. Mit der Capture-Spec
(`CAPTURE_ANLEITUNG=1`) gegen eine frisch geseedete lokale DB neu erzeugen. Spec: `docs/specs/spec-388-anleitungs-screenshots-05-07-neu-erzeugen.md`.
Herkunft: `docs/factory/kleinfunde.md` („Anleitungs-Screenshots `05`–`07`").

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [ ] Siehe `docs/specs/spec-388-anleitungs-screenshots-05-07-neu-erzeugen.md` (AK1–AK9, FS1–FS4); kurz:
- [ ] AK1: frisch geseedete DB → Capture-Spec läuft durch, zwölf Bilder geschrieben
- [ ] AK2: `05` zeigt Kacheln und Teilnehmerliste
- [ ] AK3: `06` zeigt den Dialog „Teilnehmer hinzufügen"
- [ ] AK4: `07` zeigt den Dialog „Link & QR teilen"
- [ ] AK5: `10`–`12` nur bei sichtbarer Abweichung ersetzt, Entscheidung je Bild notiert
- [ ] AK6: `01`–`04`, `08`, `09` unverändert (byte-identisch zu `main`)
- [ ] AK7: Alt-/Umgebungstext nur angeglichen, wenn er nicht mehr passt
- [ ] AK8: Bilder zeigen nur Demo-Daten, keine Zugangsdaten/Klarnamen
- [ ] AK9: Kleinfund-Eintrag entfernt, Gates grün

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

## Offene Fragen
Q1 entschieden (Ralf, 2026-10-01): lokale Dev-DB wird zurückgesetzt und neu geseedet – zerstört den Bestand, auch für die parallele Session #370.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `docs/388-anleitungs-screenshots-05-07-neu-erzeugen`
Erstellt: 2026-10-01 02:27
