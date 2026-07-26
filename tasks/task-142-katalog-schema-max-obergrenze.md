# Task 142: katalog-schema-max-obergrenze

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig (/test: Coverage schema.ts 100%, Whitespace-Grenzfall ergänzt)
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [x] Codify ausgeführt
- [x] Fertig / PR erstellt

## Beschreibung
`catalogItemSchema` (`app/verwaltung/katalog/schema.ts`) validiert `name` und `size`
(beides `text`-Spalten) sowie `sortOrder` (`integer`/int4) ohne Obergrenze. Einzige
aktuelle Fehlergrenze wäre ein DB-seitiger Overflow/eine unbegrenzt lange Zeile –
kein Nutzerfeedback. Siehe Spec: `docs/specs/spec-142-katalog-schema-max-obergrenze.md`.

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [x] GIVEN ein Katalogartikel-Formular WHEN `name` genau 50 Zeichen lang ist THEN wird die Eingabe akzeptiert
- [x] GIVEN ein Katalogartikel-Formular WHEN `name` 51 Zeichen oder mehr lang ist THEN schlägt die Validierung mit der Meldung "Bezeichnung ist zu lang." fehl
- [x] GIVEN ein Katalogartikel-Formular WHEN `size` genau 50 Zeichen lang ist THEN wird die Eingabe akzeptiert
- [x] GIVEN ein Katalogartikel-Formular WHEN `size` 51 Zeichen oder mehr lang ist THEN schlägt die Validierung mit der Meldung "Größe ist zu lang." fehl
- [x] GIVEN ein Katalogartikel-Formular WHEN `sortOrder` genau 2147483647 ist THEN wird die Eingabe akzeptiert
- [x] GIVEN ein Katalogartikel-Formular WHEN `sortOrder` größer als 2147483647 ist THEN schlägt die Validierung mit einer domänenspezifischen Meldung fehl

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
Siehe `tasks/review-142.md`. Empfehlung: APPROVED (keine Kritisch-/Wichtig-Findings,
4 optionale Nitpicks; 2 davon in /test bzw. /refactor behoben).

Siehe `tasks/security-142.md`. Ergebnis: PASSED (keine Kritisch-/Wichtig-Findings).

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->
Siehe `tasks/codify-142.md`. Neue Lesson in `docs/factory/lessons/code-style.md`:
Magic-Number-Konsistenz-Findings brauchen projektweiten Grep vor „kein Fix nötig".

## Implementierungs-Notizen
Kein ADR-Trigger (reine Zod-`.max()`-Härtung, keine der vier Kategorien betroffen).
`name`/`size` je `.max(50, ...)`, `sortOrder` `.max(2_147_483_647, "Sortierung ist zu
hoch.")`. 6 neue Grenzwert-Tests (Positiv+Negativ je Feld) in `schema.test.ts`, TDD
Red→Green verifiziert. Pre-Push-Gates grün (664 Tests, Typecheck, Format, Routen-Doku).

## Refactor-Notizen
`/refactor` fand beim erneuten Review-Nitpick "Magic Number 50/2_147_483_647
dupliziert" einen tatsächlichen Bestand: `lib/money.ts` exportiert bereits `INT4_MAX`
(genutzt in `app/veranstaltung/schema.ts`), das inline-Literal `2_147_483_647` in
`app/verwaltung/katalog/schema.ts` war davon unabhängig dupliziert – sowohl im
bestehenden `priceCents`-Refine als auch im neuen `sortOrder`-Max. Beide durch
`INT4_MAX`-Import ersetzt (reines Refactoring, kein neues Verhalten – 665 Tests vor
und nach der Änderung identisch grün). Die `name`/`size`-Grenze (50 Zeichen) bleibt
bewusst als Inline-Literal, da keine vergleichbare zentrale Konstante existiert und
beide Grenzen semantisch unabhängig sind (eigene Fehlermeldungen je Feld).

## PR-Shepherd-Notizen
PR-Shepherd 2026-07-26: Merge freigegeben – alle Gates grün. Keine offenen
Review-Kommentare, Branch bereits aktuell zu `main` (0 hinter, `mergeStateStatus:
CLEAN`), CI komplett grün (lint, test, CodeQL, Analyze, issue-sync, pr-closes-issue),
keine Approval-Anforderung ausstehend.

---
Branch: `improvement/142-katalog-schema-max-obergrenze`
Erstellt: 2026-07-25 21:01
