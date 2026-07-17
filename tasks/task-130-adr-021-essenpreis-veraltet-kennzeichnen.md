# Task 130: adr-021-essenpreis-veraltet-kennzeichnen

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
`docs/adr/021-geldbetraege-integer-cent.md:15` nennt „**F2** Katalogpreis, **F4** Essenpreis
je Abend" als Beispiel persistierter Geldbeträge. Das `essenpreis_cents`-Feld je Abend existiert
seit ADR-023 §D4/§D7 (umgesetzt in #116) nicht mehr – Essen ist Katalogartikel der Kategorie
`essen`. ADR-021 ist ein **historischer** Entscheidungs-Record; korrekt ist eine kurze
Superseding-/Hinweis-Notiz an dieser Stelle – **kein** Rewrite der Entscheidung selbst.
(Gefunden im /review von #127, dort out-of-scope.)

## Akzeptanzkriterien
- [x] GIVEN ADR-021 WHEN das F4-Beispiel „Essenpreis je Abend" gelesen wird THEN ist es als
  überholt gekennzeichnet (Hinweis-Notiz mit Verweis auf ADR-023 §D4/§D7 und #116).
- [x] GIVEN die Notiz WHEN sie gelesen wird THEN nennt sie die korrekte Sachlage (Essen =
  Katalogartikel Kategorie `essen`, kein `essenpreis_cents`-Feld je Abend).
- [x] GIVEN ADR-021 als historischer Record WHEN die Notiz eingefügt ist THEN bleibt die
  eigentliche Integer-Cent-Entscheidung (Decision/Rationale/Consequences) unverändert.

## Technische Notizen
- Notiz im etablierten Repo-Stil `> **Update (Datum, [ADR-NNN](…)):** …` (vgl. ADR-006/007/008).
- Kein Produktionscode, kein neues Verhalten → kein Test-First-Zyklus; Gates: Lint + `pnpm test`
  bleiben grün (reine Doku-Änderung).

## Offene Fragen
Keine.

## Review-Findings
Review: [review-130.md](review-130.md) → **APPROVED**. Keine kritischen/wichtigen Findings,
keine Nitpicks. Notiz gegen ADR-023 §D4/§D7 verifiziert; historischer ADR-Charakter gewahrt.

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `docs/130-adr-021-essenpreis-veraltet-kennzeichnen`
Erstellt: 2026-07-17 14:02
