# Task 420: auslagen-seite-buttons-benennung-angleichen

## Status
- [x] In Bearbeitung
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
- [x] AK1.1 Leerzustand: genau ein Auslöser „+ Neu“ im Kopf, kein Button in der Karte
- [x] AK1.2 Mit Auslagen: „+ Neu“ einziger Auslöser (unverändert)
- [x] AK1.3 Abgeschlossene Veranstaltung: kein Auslöser (unverändert)
- [x] AK1.4 Dialog aus dem Leerzustand: Verhalten wie spec-406 AK1.3–1.6
- [x] AK2.1 Glossar-Regel: „+ Neu“ im Kopf; anlegen für Objekte, erfassen für Beträge/Mengen
- [x] AK2.2 Auslagen-, Teilnehmer-, Artikel-Dialog gegen die Regel geprüft, konform
- [x] AK2.3 Glossar nennt Leerzustand-Regel (Auslagen ohne Button, Teilnehmer/Artikel unverändert)
- [x] AK3.1 Ohne Teilnehmer: Warnhinweis + „Abbrechen“ + „Erfassen“
- [x] AK3.2 „Erfassen“ deaktiviert, keine Felder
- [x] AK3.3 Abbrechen/Esc schließt, Fokus zurück auf „+ Neu“
- [x] AK3.4 Button-Anordnung exakt `DialogAktionen`
- [x] AK3.5 Mit Teilnehmer: „Erfassen“ aktivierbar (Gegenprobe)
- [x] AK4.1 `docs/ux/glossar.md` mitgezogen
- [x] AK4.2 Unit-Tests und E2E (`auslagen.spec.ts`, `helpers/auslagen.ts`) angepasst
- [x] AK4.3 `docs/routes.md` unverändert; Lint und Tests grün

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
- **Kein ADR-Trigger** (Schritt 0): reine UI-/Text-Anpassung – keine Technologie, kein Muster, keine Schnittstelle, nichts Irreversibles.
- **`DialogAktionen` um `deaktiviert` erweitert** (`app/components/FormularDialog.tsx`), statt im Fall „keine Teilnehmer“ eine zweite Fußzeile nachzubauen. So ist die Anordnung exakt dieselbe (AK3.4) und bleibt es auch, wenn sich der Baustein ändert. Ohne Teilnehmer steht die Fußzeile ohne `<form>` (es gibt nichts abzusenden); der deaktivierte Button lässt sich weder per Klick noch per Tastatur auslösen.
- **`imLeerzustand` aus `AuslageErfassen` entfernt:** Nach AK1.1 gibt es keinen zweiten Auslöser mehr, der Prop wäre tot. „+ Neu“ ist damit Auslöser und Fokusziel zugleich.
- **ADR-061 D4** um „Leerzustand ohne eigenen Auslöser“ ergänzt (Lesson #211: der PR ändert eine Struktur, die die ADR beschreibt).
- **Glossar:** neuer Absatz „Auslöser und Anlege-Dialog“ mit Prüftabelle Auslage/Teilnehmer/Artikel (AK2.2) und Leerzustand-Regel (AK2.3). Befund: alle drei konform. Einzige Abweichung ist der Teilnehmer-Busy-Text „Speichern …“; der steht schon in der Abweichungsliste unter #401, also kein neuer Änderungsbedarf. Anker `AuslageForm.tsx:24` → `:23` nachgezogen (eine Import-Zeile entfiel).
- **Oberflächentest:** `E2E_406=1` `e2e/auslagen.spec.ts` lokal gegen einen eigenen Dev-Server (Port 3420, Lesson #368) grün (1 passed, 2026-10-19). Die Spec prüft jetzt zuerst den Fall ohne Teilnehmer: Leerzustand mit genau einem Button in `main`, Dialog mit Hinweis, keine Auswahlfelder, „Erfassen“ deaktiviert, Abbrechen und Escape geben den Fokus an „+ Neu“ zurück. Danach folgt der bisherige Ablauf (erste Auslage aus dem Leerzustand = AK1.4).

## Offene Fragen
- [ ] Q4 Leerzustand-Text unverändert („Noch keine Auslagen erfasst.“) oder Hinweis auf „+ Neu“? (Annahme: unverändert)

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `fix/420-auslagen-seite-buttons-benennung-angleichen`
Erstellt: 2026-10-19 03:49
