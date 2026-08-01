# Spec: #212-W3-E2E-Block – real vs. environmental klären

## Kontext

Issue #244 beobachtet, dass `scripts/checks/tests/run-tests.sh` in der Sandbox-Session
von Task #239 reproduzierbar mit 4 roten Fällen endete – ausschließlich im Block
„#212 W3: Verifikations-Interrupt end-to-end" (~Zeile 3009 ff.). Task #239 selbst hat
bereits belegt (siehe `tasks/review-239.md`), dass der eigene Diff diesen Block nicht
berührt und `factory-commit.sh` vom kopierten Datei-Satz des Blocks nicht referenziert
wird. Offen blieb die Einordnung: **realer Defekt** im E2E-Block/`verify-final-state.sh`
oder **Umgebungs-/Sandbox-Artefakt** der ursprünglichen Session?

## Untersuchung (im Rahmen von `/requirements` durchgeführt)

- **Isolierter Repro** des exakten `#212 W3`-Blocks (gleicher Fixture-Aufbau, gleiche
  `run-pipeline.sh`-Aufrufe) außerhalb der Gesamt-Suite: **5 von 5 Wiederholungsläufen
  grün** – Interrupt-Fall meldet korrekt „Endzustand nicht verifiziert"
  (`INCOMPLETE_OUTCOME` im `interrupt-log.jsonl`), Positiv-Gegenprobe zeigt korrekt das
  Erfolgs-Banner.
- **Volle Bash-Suite** (`bash scripts/checks/tests/run-tests.sh`) auf diesem Branch
  (basiert auf aktuellem `main` nach #239/#238/#224/#228): **555 grün, 0 rot** – der im
  Issue beschriebene Block ist darin enthalten und läuft grün mit.
- **CI-Historie** (`gh run list --workflow=factory-ci.yml`): Sämtliche Läufe für
  `fix/239-factory-commit-push-nachholen`, `fix/238-eslint-config-test-flaky-timeout`
  und der eigene Draft-PR-Lauf für #244 zeigen `conclusion: success`.

**Verdict:** Der Fehlschlag war **umgebungs-/sandboxbedingt** in der ursprünglichen
Agenten-Session von Task #239 – kein Code-Defekt in `verify-final-state.sh` oder im
`#212-W3`-Testblock. Er ist auf aktuellem Stand weder isoliert noch in der vollen Suite
noch in CI reproduzierbar.

## Scope

**Inbegriffen:**
- Befund + Belege (siehe oben) als Kommentar auf Issue #244 dokumentieren; Issue als
  „kein Defekt bestätigt / environmental" schließen.
- Neuer Lesson-Eintrag in `docs/factory/lessons/factory-workflow.md` (+ Index-Zeile in
  `docs/factory/PROJECT-CONTEXT.md`): Vorgehen zur real-vs-environmental-Klärung bei
  einem als „pre-existing, scheinbar unabhängig" gemeldeten Bash-Suite-Fehlschlag, wenn
  er bei erneutem Lauf nicht mehr reproduziert (isolierter Wiederholungslauf + volle
  Suite + CI-Historie als Belege, bevor geschlossen wird).

**Nicht inbegriffen (bewusst laut Entscheidung des Entwicklers):**
- Keine Code- oder Testcode-Änderung an `verify-final-state.sh`, `run-pipeline.sh` oder
  dem `#212-W3`-Testblock.
- Keine zusätzliche Diagnose-Härtung (z. B. mitgeschriebene Pipeline-Logs bei künftigem
  Fehlschlag).
- Keine künstliche Ressourcen-Restriktion (Disk/Memory/parallele Last), um die
  Sandbox-Hypothese direkt statt indirekt zu bestätigen.

## Akzeptanzkriterien

- [x] GIVEN der isolierte `#212 W3`-E2E-Block WHEN er 5× hintereinander außerhalb der
      Gesamt-Suite ausgeführt wird THEN sind alle 5 Läufe grün (kein Flackern).
- [x] GIVEN die volle Bash-Suite (`run-tests.sh`) auf dem aktuellen Branch WHEN sie
      ausgeführt wird THEN ist das Ergebnis 0 rot.
- [x] GIVEN die CI-Läufe (`factory-ci.yml`) für #239, #238 und den eigenen Draft-PR
      WHEN ihre `conclusion` geprüft wird THEN zeigen alle `success`.
- [ ] GIVEN die obigen Befunde WHEN sie als Kommentar auf Issue #244 gepostet werden
      THEN referenziert der Kommentar konkret die drei Belege (isolierter Wiederholungslauf,
      volle Suite, CI-Historie) und schließt das Issue ohne Code-Fix.
- [ ] GIVEN `docs/factory/lessons/factory-workflow.md` WHEN das Learning aus #244
      ergänzt wird THEN gibt es einen neuen Abschnitt mit Smell + Regel, plus eine
      passende Index-Zeile in `docs/factory/PROJECT-CONTEXT.md` (Gruppe
      `factory-workflow.md`, Trigger analog zu den bestehenden Zeilen dieser Datei).

## Fehlerszenarien

- Keine – dieser Task behebt keinen Code-Fehler, sondern schließt eine offene
  Klassifizierungsfrage ab.

## Offene Fragen

_Keine – Scope wurde mit dem Entwickler abgestimmt (Option „nur dokumentieren, kein
Code-Fix")._
