# Task 345: mehrere-kataloge-verwalten

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Rolle `verwalter` kann mehrere Kataloge (Preislisten) parallel pflegen: anlegen, umbenennen,
deaktivieren/reaktivieren und – als eigentliche Template-Mechanik – einen bestehenden Katalog
samt aktiven Artikeln und Preisen duplizieren. `app/verwaltung/katalog/` bekommt dafür einen
Katalog-Umschalter. Slice 2 von 3 (nach #59, vor #346) – der laufende Betrieb (Theke,
Verzehrerfassung) bleibt unverändert auf den Standard-Katalog fest verdrahtet.

Details, Scope-Abgrenzung und Fehlerszenarien: [spec-345](../docs/specs/spec-345-mehrere-kataloge-verwalten.md).

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [ ] AK1 – Katalog anlegen (Namenskonflikt wird abgelehnt)
- [ ] AK2 – Katalog duplizieren (nur aktive Artikel, unabhängig editierbar)
- [ ] AK3 – Katalog umbenennen (Rename-Sicherheit bleibt, Namenskonflikt wird abgelehnt)
- [ ] AK4 – Katalog deaktivieren/reaktivieren (bleibt sichtbar & editierbar)
- [ ] AK5 – Deaktivierter Katalog ist keine Duplizier-Quelle mehr (serverseitig durchgesetzt)
- [ ] AK6 – Katalog-Umschalter steuert Artikel-Pflege (Parent-Key-Bindung)
- [ ] AK7 – Rollen-Gate greift serverseitig für alle neuen Actions
- [ ] AK8 – Duplikat-Regel je Katalog bleibt unangetastet

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

## Offene Fragen
- [ ] `/architecture` prüfen: verdient die enger gefasste Auslegung von ADR-050 D7 (active gate't
      nur die Duplizier-Quellenauswahl, nicht Theke/Verzehr) eine ADR-Ergänzung? (spec-345,
      Abschnitt „Offene Fragen")

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/345-mehrere-kataloge-verwalten`
Erstellt: 2026-09-19 12:44
