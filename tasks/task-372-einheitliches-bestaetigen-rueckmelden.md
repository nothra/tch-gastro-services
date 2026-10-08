# Task 372: einheitliches-bestaetigen-rueckmelden

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Bestätigung für Auslage löschen und Katalog deaktivieren, die drei Katalog-Modals auf die
gemeinsame Dialog-Grundlage, ein app-weiter Toast für Erfolgsrückmeldungen, und der Sperrgrund beim
Öffnen von „Veranstaltung löschen". Spec: `docs/specs/spec-372-einheitliches-bestaetigen-rueckmelden.md`.
Teilnehmer entfernen, Veranstaltung löschen und Abschließen nutzen den `ConfirmDialog` schon.

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [ ] AK1/AK2 Auslage löschen mit Bestätigung (danger, Abbrechen/Escape, Fokus-Rückgabe)
- [ ] AK3/AK4 Katalog deaktivieren mit Bestätigung, Reaktivieren ohne
- [ ] AK5 Katalog anlegen/umbenennen/duplizieren auf der gemeinsamen Dialog-Grundlage
- [ ] AK6 Dialoge sperren Schließen während laufender Action; Ablehnung im Dialog
- [ ] AK7 Gefahr-Variante bei allen Lösch-/Entfernen-Bestätigungen und beim Auslöser
- [ ] AK8 `AuslageRow` nur Bausteine/Token-Klassen, im Farb-Gate
- [ ] AK9–AK11 „Veranstaltung löschen": Sperrgrund beim Öffnen, keine Bestätigung; Server prüft weiter
- [ ] AK12–AK17 Toast `role="status"` je erfolgreicher Schreibaktion, Fehler `role="alert"` am Ort
- [ ] AK18 Texte nach `docs/ux/glossar.md` (#375)
- [ ] FS1–FS7 Fehlerszenarien der Spec

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

## Offene Fragen
- **Abhängigkeit:** #375 (Glossar) zuerst umsetzen; `/implement` erst danach starten.
- Q1–Q5 der Spec (Verzehr ±, Toast-Dauer/Position, Blocker-Härte #375, Katalog-Dialogtext, Sperrgründe).

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/372-einheitliches-bestaetigen-rueckmelden`
Erstellt: 2026-10-08 21:03
