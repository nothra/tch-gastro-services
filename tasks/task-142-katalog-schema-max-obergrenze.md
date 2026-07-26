# Task 142: katalog-schema-max-obergrenze

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
`catalogItemSchema` (`app/verwaltung/katalog/schema.ts`) validiert `name` und `size`
(beides `text`-Spalten) sowie `sortOrder` (`integer`/int4) ohne Obergrenze. Einzige
aktuelle Fehlergrenze wäre ein DB-seitiger Overflow/eine unbegrenzt lange Zeile –
kein Nutzerfeedback. Siehe Spec: `docs/specs/spec-142-katalog-schema-max-obergrenze.md`.

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [ ] GIVEN ein Katalogartikel-Formular WHEN `name` genau 50 Zeichen lang ist THEN wird die Eingabe akzeptiert
- [ ] GIVEN ein Katalogartikel-Formular WHEN `name` 51 Zeichen oder mehr lang ist THEN schlägt die Validierung mit der Meldung "Bezeichnung ist zu lang." fehl
- [ ] GIVEN ein Katalogartikel-Formular WHEN `size` genau 50 Zeichen lang ist THEN wird die Eingabe akzeptiert
- [ ] GIVEN ein Katalogartikel-Formular WHEN `size` 51 Zeichen oder mehr lang ist THEN schlägt die Validierung mit der Meldung "Größe ist zu lang." fehl
- [ ] GIVEN ein Katalogartikel-Formular WHEN `sortOrder` genau 2147483647 ist THEN wird die Eingabe akzeptiert
- [ ] GIVEN ein Katalogartikel-Formular WHEN `sortOrder` größer als 2147483647 ist THEN schlägt die Validierung mit einer domänenspezifischen Meldung fehl

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
Reine Zod-Schema-Änderung (`.max()` je Feld), keine Migration nötig (Spaltentypen
bleiben `text`/`integer`). Vermutlich kein ADR-Trigger – `/architecture` bei Bedarf
entscheiden lassen.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
Keine – im Requirements-Gespräch geklärt.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `improvement/142-katalog-schema-max-obergrenze`
Erstellt: 2026-07-25 21:01
