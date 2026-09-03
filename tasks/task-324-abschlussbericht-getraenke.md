# Task 324: abschlussbericht-getraenke

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Zusätzliche Abschlussbericht-Variante „nur Getränke" für abgeschlossene Veranstaltungen:
weist ausschließlich den Verzehr-Umsatz Getränke (Einnahmenseite) und die
Auslagenerstattung der Kategorie `getraenke` (Ausgabenseite) aus – ohne Spende,
Kassenveränderung und Erhalten/Einnahmen (kategorieübergreifende Größen). Der bestehende
vollständige Abschlussbericht (#185) bleibt unverändert; die Variante kommt zusätzlich dazu,
in beiden Formaten (xlsx/pdf). Details: [spec-324](../docs/specs/spec-324-abschlussbericht-getraenke.md).

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
Siehe [spec-324](../docs/specs/spec-324-abschlussbericht-getraenke.md) → Akzeptanzkriterien
AC1–AC15 (u. a. Kategorie-Filter Getränke, exakt zwei Summen, Ausschluss Spende/Kassenveränderung/
Erhalten, Wegfall von Teilnehmerzeilen ohne Getränke, gruppierte UI-Sektion, fail-closed Gates).

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
Für `/architecture` (siehe spec-324 → „Offene Fragen"):
- Aufruf-Mechanik: Query-Parameter an bestehender Route vs. eigene Route
- Modell-Schnitt: `berichtModell` um Umfangs-Parameter erweitern vs. abgeleitete Projektion
- Renderer-Anpassung (`berichtXlsx`/`berichtPdf`) für den reduzierten Umfang

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/324-abschlussbericht-getraenke`
Erstellt: 2026-09-03 10:27
