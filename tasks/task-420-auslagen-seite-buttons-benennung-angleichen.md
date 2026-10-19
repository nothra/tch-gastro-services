# Task 420: auslagen-seite-buttons-benennung-angleichen

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Auslagen-Seite: Leerzustand ohne eigenen Auslöser („+ Neu“ im Kopf ist einziger Auslöser), Dialog ohne Teilnehmer mit „Abbrechen“ + deaktiviertem „Erfassen“, Glossar-Regel zur Benennung. Spec: `docs/specs/spec-420-auslagen-seite-ausloeser-angleichen.md`. Dialogtexte „erfassen“ bleiben (Q1).

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [ ] AK1.1 Leerzustand: genau ein Auslöser „+ Neu“ im Kopf, kein Button in der Karte
- [ ] AK1.2 Mit Auslagen: „+ Neu“ einziger Auslöser (unverändert)
- [ ] AK1.3 Abgeschlossene Veranstaltung: kein Auslöser (unverändert)
- [ ] AK1.4 Dialog aus dem Leerzustand: Verhalten wie spec-406 AK1.3–1.6
- [ ] AK2.1 Glossar-Regel: „+ Neu“ im Kopf; anlegen für Objekte, erfassen für Beträge/Mengen
- [ ] AK2.2 Auslagen-, Teilnehmer-, Artikel-Dialog gegen die Regel geprüft, konform
- [ ] AK2.3 Glossar nennt Leerzustand-Regel (Auslagen ohne Button, Teilnehmer/Artikel unverändert)
- [ ] AK3.1 Ohne Teilnehmer: Warnhinweis + „Abbrechen“ + „Erfassen“
- [ ] AK3.2 „Erfassen“ deaktiviert, keine Felder
- [ ] AK3.3 Abbrechen/Esc schließt, Fokus zurück auf „+ Neu“
- [ ] AK3.4 Button-Anordnung exakt `DialogAktionen`
- [ ] AK3.5 Mit Teilnehmer: „Erfassen“ aktivierbar (Gegenprobe)
- [ ] AK4.1 `docs/ux/glossar.md` mitgezogen
- [ ] AK4.2 Unit-Tests und E2E (`auslagen.spec.ts`, `helpers/auslagen.ts`) angepasst
- [ ] AK4.3 `docs/routes.md` unverändert; Lint und Tests grün

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

## Offene Fragen
- [ ] Q4 Leerzustand-Text unverändert („Noch keine Auslagen erfasst.“) oder Hinweis auf „+ Neu“? (Annahme: unverändert)

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `fix/420-auslagen-seite-buttons-benennung-angleichen`
Erstellt: 2026-10-19 03:49
