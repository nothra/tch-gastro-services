# Task 244: e2e-block-212-w3-isoliert-klaeren

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Issue #244 klärt, ob der in Task #239 beobachtete Bash-Suite-Fehlschlag im Block
„#212 W3: Verifikations-Interrupt end-to-end" ein realer Defekt oder umgebungs-/
sandboxbedingt ist. Untersuchung (siehe `docs/specs/spec-244-e2e-block-212-w3-isoliert-klaeren.md`):
isolierter Wiederholungslauf (5/5 grün), volle Suite (555 grün/0 rot) und CI-Historie
(alle relevanten Läufe `success`) zeigen: **environmental, nicht reproduzierbar** – kein
Code-Fix nötig. Scope (mit dem Entwickler abgestimmt): nur dokumentieren – Issue-Kommentar
+ Lesson-Eintrag, keine Code-/Testcode-Änderung.

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
Siehe `docs/specs/spec-244-e2e-block-212-w3-isoliert-klaeren.md` für Kontext/Belege.

- [x] GIVEN der isolierte `#212 W3`-E2E-Block WHEN er 5× hintereinander außerhalb der
      Gesamt-Suite ausgeführt wird THEN sind alle 5 Läufe grün (kein Flackern).
- [x] GIVEN die volle Bash-Suite (`run-tests.sh`) auf dem aktuellen Branch WHEN sie
      ausgeführt wird THEN ist das Ergebnis 0 rot.
- [x] GIVEN die CI-Läufe (`factory-ci.yml`) für #239, #238 und den eigenen Draft-PR
      WHEN ihre `conclusion` geprüft wird THEN zeigen alle `success`.
- [ ] GIVEN die obigen Befunde WHEN sie als Kommentar auf Issue #244 gepostet werden
      THEN referenziert der Kommentar konkret die drei Belege und schließt das Issue
      ohne Code-Fix.
- [x] GIVEN `docs/factory/lessons/factory-workflow.md` WHEN das Learning aus #244
      ergänzt wird THEN gibt es einen neuen Abschnitt (Smell + Regel) plus eine
      passende Index-Zeile in `docs/factory/PROJECT-CONTEXT.md`.

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
Kein ADR-Trigger – reine Klassifizierungs-/Dokumentations-Entscheidung, keine
Architektur- oder Code-Änderung. `/architecture` kann übersprungen werden.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
Keine – Scope wurde interaktiv mit dem Entwickler geklärt (Option „nur dokumentieren,
kein Code-Fix").

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `fix/244-e2e-block-212-w3-isoliert-klaeren`
Erstellt: 2026-08-01 06:33
