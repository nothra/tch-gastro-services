# Task 404: teilnehmer-anlegen-statt-neuer-gast

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Dialog „Teilnehmer hinzufügen" verschlanken; „Neuer Gast" wird zum eigenen Schritt „Teilnehmer anlegen" (gleiches Formular wie die Verwaltung). Spec: `docs/specs/spec-404-teilnehmer-anlegen-statt-neuer-gast.md`.

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [ ] AK1 Kein „Gast"/„Neuer Gast" mehr in der UI
- [ ] AK2 Dialog nur Suche, Mehrfachauswahl, „Hinzufügen"/„Abbrechen"
- [ ] AK3.1 Absprung „Teilnehmer anlegen" → eigener Schritt mit Zurück
- [ ] AK3.2 Zurück behält Auswahl/Suche
- [ ] AK3.3 Ohne Treffer: „„<Suchtext>" als Teilnehmer anlegen" übernimmt Namen
- [ ] AK4.1 Gleiche Felder/Komponente wie Verwaltung + Hinweis „direkt hinzugefügt"
- [ ] AK4.2 Anlegen + Hinzufügen, Meldung „Teilnehmer angelegt und hinzugefügt"
- [ ] AK4.3 Duplikat-Warnung „Trotzdem anlegen" (ADR-022)
- [ ] AK4.4 Ablehnung: Dialog bleibt offen, Fehler am Namensfeld, nichts angelegt
- [ ] AK5 Label „Name" überall; „Stammteilnehmer" entfällt
- [ ] AK6 `TeilnehmerFields` von beiden Stellen genutzt; Kleinfund aufgelöst
- [ ] AK7 Auslöser „Teilnehmer hinzufügen"
- [ ] AK8 `docs/ux/glossar.md` angepasst

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

## Offene Fragen
Keine. Entschieden: Q1 Auswahl bleibt beim Zurück · Q2 Dialog schließt nach Anlegen · Q3 Duplikat-Warnung auch in der Veranstaltung · Q4 „Alle aktiven Teilnehmer sind bereits hinzugefügt."

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/404-teilnehmer-anlegen-statt-neuer-gast`
Erstellt: 2026-10-09 16:18
