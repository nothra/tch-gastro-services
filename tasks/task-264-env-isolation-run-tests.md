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

**Nicht-ADR 2026-08-03:** Env-Isolation der vier `run-pipeline.sh`-Testaufrufe gegen
`PR_SHEPHERD`/`FACTORY_STAGE` – bewusst kein ADR (Begründung: geprüft gegen die vier
ADR-Trigger-Kategorien aus Spec-002/ADR-002 – keine Technologiewahl, kein
Architekturmuster-Wechsel, kein neuer/geänderter Schnittstellen-Vertrag, keine
irreversible Konsequenz. Reine, lokal reversible Test-Infrastruktur-Härtung innerhalb
einer bestehenden Datei, kein Produktionscode betroffen).

**Implementierungs-Hinweise für `/implement`:**

1. **Muster je Aufrufstelle:** An jeder der vier realen `run-pipeline.sh`-Aufrufstellen in
   `scripts/checks/tests/run-tests.sh` das aufgerufene Kommando um
   `env -u PR_SHEPHERD -u FACTORY_STAGE` ergänzen – die bestehenden Env-Var-Zuweisungen
   (z. B. `FACTORY_LINT_COMMAND=...`, `PATH=...`) bleiben unverändert davor stehen, `env`
   übernimmt sie automatisch mit in den Kindprozess:
   ```bash
   # vorher:
   g101_out=$(cd "$TMP_G101" && PATH="$TMP_G101/bin:$PATH" \
     FACTORY_LINT_COMMAND="touch '$MARKER_G101'; false" \
     bash "$TMP_G101/scripts/run-pipeline.sh" 101 2>&1 || true)
   # nachher:
   g101_out=$(cd "$TMP_G101" && PATH="$TMP_G101/bin:$PATH" \
     FACTORY_LINT_COMMAND="touch '$MARKER_G101'; false" \
     env -u PR_SHEPHERD -u FACTORY_STAGE \
     bash "$TMP_G101/scripts/run-pipeline.sh" 101 2>&1 || true)
   ```
   Betroffene Zeilen (Stand Requirements-Phase, siehe Spec-Tabelle): ~2624–2626 (`#101`),
   ~3395–3397 (`#212 AK8`), ~3440–3442 und ~3452–3454 (`#212 W3`, Negativ- und Positiv-Fall).
   Kurzer WHY-Kommentar an jeder Stelle (Verweis auf #264), kein Duplikat des Spec-Texts.
2. **Kein Helper nötig** (s. offene Frage unten, jetzt entschieden): vier Stellen mit je
   unterschiedlichem Env-Var-Umfeld – eine Funktion müsste variable Zusatz-Zuweisungen
   durchreichen und würde die Aufrufstelle nicht lesbarer machen. Inline ist hier weniger
   Indirektion, nicht mehr Duplikation (nur ein wiederholtes Flag-Paar).
3. **Regressionstest (AC „keine Tautologie"):** Neuer Abschnitt direkt nach dem `#212 W3`-
   Block (nach Zeile ~3461, vor der `#212 AK9`-Überschrift), der die Positiv-Gegenprobe aus
   `#212 W3` **erneut** ausführt – diesmal mit `PR_SHEPHERD=true` und `FACTORY_STAGE=3` in der
   Shell des Testrunners **exportiert** (`export PR_SHEPHERD=true FACTORY_STAGE=3` direkt vor
   dem Aufruf, `unset PR_SHEPHERD FACTORY_STAGE` direkt danach, damit nachfolgende Blöcke in
   `run-tests.sh` nicht kontaminiert werden). Assertion: weiterhin Exit 0 +
   „Pipeline erfolgreich abgeschlossen". Das ist die divergenzerzeugende Aktion, die vor der
   Härtung tatsächlich rot ausschlägt (`lessons/testing.md` „Positions-/Zustand-Freeze-Test
   braucht eine echte divergenzerzeugende Aktion" – ohne `export` vorher wäre der Test blind).
   Kann das bestehende `$TMP_E2E`-Scaffold aus dem Positiv-Fall wiederverwenden (neuer
   `git push`, kein neuer Setup-Block nötig), oder ein eigenes kleines Scaffold aufsetzen,
   falls das Original-Scaffold in der vorherigen Assertion bereits final committet/aufgeräumt
   wurde – Detail für `/implement`.
4. **Verifikation der Härtung selbst:** Vor dem finalen Commit einmal manuell
   `PR_SHEPHERD=true FACTORY_STAGE=3 bash scripts/checks/tests/run-tests.sh` laufen lassen
   (oder gezielt die vier betroffenen Blöcke), um zu bestätigen, dass keine der vier
   Aufrufstellen mehr auf die exportierten Variablen reagiert.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
_Keine offenen Fragen mehr – Inline-Ansatz entschieden (s. Technische Notizen)._

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `test/264-env-isolation-run-tests`
Erstellt: 2026-08-03 00:02
