# Task 264: env-isolation-run-tests

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Die vier realen (non-dry-run) `run-pipeline.sh`-Aufrufe in
`scripts/checks/tests/run-tests.sh` (`#101` Lint-Gate, `#212 AK8`, `#212 W3` × 2) erben
`PR_SHEPHERD`/`FACTORY_STAGE` aus der aufrufenden Shell, statt deterministisch aus ihrem
eigenen Setup zu entscheiden. Ist `PR_SHEPHERD=true` in der Shell exportiert, löst das
ungewollt Phase 7 (`pr-shepherd`) im Wegwerf-Testrepo aus, die dort abbricht (kein
`.claude/commands/pr-shepherd.md`) – 4 Assertionen schlagen fehl, ohne dass der aktuelle
Diff sie berührt (beobachtet in #262). Siehe `docs/specs/spec-264-env-isolation-run-tests.md`
für Recherche-Details (u. a.: `--dry-run`-Aufrufe sind nachweislich nicht betroffen).

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [ ] GIVEN die aufrufende Shell hat `PR_SHEPHERD=true`/`FACTORY_STAGE=3` exportiert WHEN
      der `#212 AK8`-Block läuft THEN bleiben alle Assertions grün (Phase 7 wird nicht
      ungewollt ausgelöst).
- [ ] GIVEN die aufrufende Shell hat `PR_SHEPHERD=true`/`FACTORY_STAGE=3` exportiert WHEN
      der `#212 W3`-Block (Negativ-Fall) läuft THEN bleiben die vier zugehörigen Assertions
      identisch zum unbelasteten Fall.
- [ ] GIVEN die aufrufende Shell hat `PR_SHEPHERD=true`/`FACTORY_STAGE=3` exportiert WHEN
      der `#212 W3`-Block (Positiv-Gegenprobe) läuft THEN erscheint weiterhin das
      Erfolgs-Banner.
- [ ] GIVEN die aufrufende Shell hat `PR_SHEPHERD=true` exportiert WHEN der
      `#101`-Lint-Gate-Block läuft THEN bleibt das Ergebnis unverändert.
- [ ] GIVEN einer der vier realen `run-pipeline.sh`-Aufrufe WHEN der Code gelesen wird THEN
      neutralisiert er `PR_SHEPHERD`/`FACTORY_STAGE` explizit für den Kindprozess (z. B.
      `env -u PR_SHEPHERD -u FACTORY_STAGE`).
- [ ] GIVEN ein neuer Regressionstest, der die Env-Isolation verhaltensbasiert beweist WHEN
      er ohne die Härtung liefe THEN würde er rot ausschlagen (keine Tautologie).

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
Keine ADR nötig – reine Test-Infrastruktur-Härtung, keine Architekturentscheidung
(Empfehlung aus der Spec: `env -u PR_SHEPHERD -u FACTORY_STAGE` inline an jeder der vier
Aufrufstellen statt einer eigenen Helper-Funktion).

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
- [ ] Inline vs. Helper-Funktion für die vier Aufrufstellen – Empfehlung: inline (siehe Spec).

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `test/264-env-isolation-run-tests`
Erstellt: 2026-08-03 00:02
