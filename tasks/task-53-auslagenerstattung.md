# Task 53: auslagenerstattung

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Feature F6 – **Auslagenerstattung als eigener Vorgang**. Der Veranstalter (vormals Abrechner)
erfasst je Veranstaltung Auslagen-Einträge (je einem Teilnehmer + einer Kategorie Getränke/Essen/
Sonstiges zugeordnet, Betrag > 0, optionale Notiz) und erstattet sie als **separate
Barauszahlung** aus der der Veranstaltung zugeordneten Kasse. Auslagen mindern **nicht** den Verzehr
(keine Netto-Verrechnung beim Kassieren); auf Veranstaltungs-Ebene gehen die Erstattungen als Ausgaben
je Kategorie in die Kassenabrechnung ein. Einträge sind korrigier-, lösch- und in der
Erstattung rücknehmbar, solange die Veranstaltung offen ist.

Kanonische Quelle: **`docs/specs/spec-53-auslagen.md`**.

## Akzeptanzkriterien
<!-- Von /requirements befüllt; kanonisch in docs/specs/spec-53-auslagen.md -->
- [ ] Auslage erfassen: offene Veranstaltung → Eintrag `offen`, einem Teilnehmer + einer Kategorie
      zugeordnet, ohne den Verzehr-Gesamt zu verändern.
- [ ] Erstattung bestätigen: `offen` → `erstattet`.
- [ ] Erstattung zurücknehmen (Veranstaltung offen): `erstattet` → `offen`.
- [ ] Eintrag korrigieren (Veranstaltung offen): Teilnehmer/Kategorie/Betrag/Notiz änderbar,
      serverseitig validiert, ohne Verzehr-Änderung.
- [ ] Eintrag löschen (Veranstaltung offen): raus aus Übersicht, Summen und Kassenabrechnung.
- [ ] Übersicht: Summen je Kategorie + gesamt, getrennt nach „offen"/„erstattet".
- [ ] Kassieren (F8): Verzehr-Gesamt unabhängig von den Auslagen (keine Netto-Verrechnung).
- [ ] Gesamtabrechnung (F8): Erstattungen als Ausgaben je Kategorie für die zugeordnete Kasse.
- [ ] Betrag-Validierung (Zod): nur gültiger EUR-Betrag > 0 mit ≤ 2 Nachkommastellen.
- [ ] Pflichtfelder (Zod): Kategorie und Teilnehmer erforderlich.
- [ ] Abgeschlossene Veranstaltung: erfassen/ändern/löschen/erstatten/zurücksetzen gesperrt.
- [ ] IDOR-Schutz: Mutationen schließen `veranstaltungId` im WHERE ein (nicht nur Eintrags-ID).

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

## Offene Fragen
<!-- Detail siehe spec-53 „Offene Fragen (für /architecture)" -->
- [ ] Datenmodell (eigene Entität je Veranstaltung) + Hard- vs. Soft-Delete → /architecture.
- [ ] Statusmodell `offen` ⇄ `erstattet` als Boolean/Enum ohne Historie → /architecture.
- [ ] Vormerkung Kassenbuch #57 (nur je Veranstaltung im MVP) → /architecture.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/53-auslagenerstattung`
Erstellt: 2026-07-18 01:08
