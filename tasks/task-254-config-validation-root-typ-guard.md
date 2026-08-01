# Task 254: config-validation-root-typ-guard

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
`scripts/checks/config-validation-check.sh` setzt implizit voraus, dass der
Override-Root (`factory.config.yml`) ein YAML-Mapping ist. Ohne expliziten
Root-Typ-Check liefert `leaf_paths()` bei einem Nicht-Map-Root (Skalar, Bool,
Sequence, Mehrdokument-YAML) keine oder irreführende Pfade — das Gate schlägt
nur zufällig fehl, mit einer irreführenden Folgemeldung (Regel 4b) statt der
eigentlichen Ursache. Ergänzt einen expliziten, frühen Root-Typ-Guard plus
einen eigenständigen Mehrdokument-Guard für den Override. Details:
[spec-254](../docs/specs/spec-254-config-validation-root-typ-guard.md).

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [ ] GIVEN Skalar-Root im Override WHEN Gate läuft THEN exit ≠ 0 mit
      expliziter "kein Mapping"-Meldung (nicht die irreführende
      max_turns-Meldung aus Regel 4b)
- [ ] GIVEN Boolean-Root im Override WHEN Gate läuft THEN dieselbe explizite
      "kein Mapping"-Meldung
- [ ] GIVEN Sequence-Root im Override WHEN Gate läuft THEN dieselbe explizite
      "kein Mapping"-Meldung
- [ ] GIVEN Mehrdokument-YAML im Override (zwei gültige Mapping-Dokumente via
      `---`) WHEN Gate läuft THEN eigene, unterscheidbare Meldung zur
      Mehrdokument-Struktur
- [ ] GIVEN gültiger Override (ein Dokument, Mapping-Root) WHEN Gate läuft
      THEN unverändertes Verhalten (keine Regression bei Regeln 1–6)
- [ ] GIVEN kein Override-File vorhanden WHEN Gate läuft THEN neue Checks
      werden übersprungen (wie bei bestehenden Override-only-Regeln)

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

## Offene Fragen
Keine — geklärt: Guard nur für Override (nicht Defaults); Mehrdokument
bekommt eigene Meldung.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/254-config-validation-root-typ-guard`
Erstellt: 2026-08-01 21:32
