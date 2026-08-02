# Review: Task 261

## Kritische Findings (müssen behoben werden)
- (keine)

## Wichtige Findings (sollten behoben werden)
- [ ] [scripts/checks/tests/run-tests.sh:1105] Der Regressions-Guard
      `grep -qE 'done \|\| true' "$PIPELINE"` ankert nicht an der konkreten
      Codify-Regelzeilen-Pipeline, sondern an einem generischen Kommando-Fragment
      (`done || true`), das theoretisch überall im Skript auftauchen könnte. Zum
      Vergleich: der bestehende K-1-Guard eine Zeile darüber (Zeile 1090) ankert exakt
      an der vollständigen betroffenen Konstruktion inkl. `$codify_file`
      (`grep -c "^- " "$codify_file" 2>/dev/null || true`). Nach der bereits
      codifizierten Lesson „Reihenfolge-Guards: Kommando ≠ Prosa-Erwähnung … Anker ist
      die exakte Aufruf-Zeile, nie ein Kommando-Fragment" (`lessons/factory-workflow.md`,
      aus #114, Rezidiv aus #265) sollte der Guard enger an die tatsächliche
      Codify-Regelzeilen-Pipeline gebunden werden (z. B. inkl. `head -3` oder
      Kontextzeile) – sonst würde ein späterer, unabhängiger `done || true` an anderer
      Stelle im Skript diesen Test unbemerkt grün laufen lassen, auch wenn der
      Codify-Block selbst nicht mehr abgesichert wäre. (Übereinstimmend in Runde 2 und
      Runde 3 gefunden.)

## Nitpicks (optional)
- [ ] [scripts/checks/tests/run-tests.sh:1104] Kommentar-Nummerierung kollidiert: Zeile
      1090 trägt bereits `(2) run-pipeline.sh rule_count …`, Zeile 1104 nutzt für den
      neuen, dritten Assertion-Block erneut `(2) …`. Für die fortlaufende Lesbarkeit
      der `(1)/(2)/…`-Kommentarliste (beginnend Zeile 1074) sollte das `(3)` heißen.
- [ ] [scripts/checks/tests/run-tests.sh:1095] `ZERO2` ist im Kontext des bereits
      vorhandenen `ZERO` (Zeile 1080) verständlich, aber generisch benannt; ein
      sprechenderer Name (z. B. `ZERO_WHILE_LOOP`) würde den Unterschied zur ersten
      Fixture (einfache Zuweisung vs. Pipe-Konstrukt) besser transportieren.
- [ ] [scripts/checks/tests/run-tests.sh:1095] Das Fehlerszenario „Datei existiert, ist
      aber leer (0 Bytes)" aus der Spec wird durch eine Header-only-Datei (1 Zeile ohne
      `^- `-Treffer) abgedeckt, nicht durch eine literal 0-Byte-Datei. Funktional
      identisch (grep liefert in beiden Fällen Exit 1) und deckungsgleich mit dem
      etablierten K-1-Muster (Zeile 1080) – daher nur ein Nitpick, kein Gap in der
      Testaussage.

## Positives
- Der Fix (`done || true` in `scripts/run-pipeline.sh:390`) ist korrekt: `||` bindet als
  List-Operator an die gesamte vorangehende Pipeline (`grep | head | while … done`),
  nicht nur an die `while`-Schleife, und schluckt damit exakt den von der Spec
  beschriebenen pipefail-Exit-Code. Laufzeit-verifiziert (0-Treffer bricht ohne Fix ab,
  mit Fix nicht; 1–3- und >3-Treffer-Fälle bleiben unverändert exit 0).
- Strukturell identisch mit dem bereits etablierten `|| true`-Idiom der
  `rule_count`-Berechnung zwei Zeilen darüber (Zeile 383) – gleiches Muster, gleicher
  Kommentar-Stil, WHY statt WHAT.
- Kein Architektur-/Fehlerbehandlungs-Verstoß: Das Schlucken des Exit-Codes bleibt auf
  die rein informative Ausgabe-Pipeline von `pipeline_summary()` beschränkt;
  `verify_final_state()` (ADR-040-Backstop) läuft danach unverändert und wird durch den
  Fix wieder erreichbar, nicht inhaltlich verändert.
- Spec-Abgrenzung eingehalten: `rule_count` unverändert, `verify_final_state()`/ADR-040
  nicht angefasst, `docs/routes.md` korrekt nicht betroffen (keine Routen-Änderung).
- Der neue K-2-Testblock liefert einen echten Laufzeit-Beweis (nicht nur
  Textmuster-Grep) inklusive einer scharfen Gegenprobe (schlägt ohne Fix nachweislich
  fehl) – erfüllt die Negativ-Test-Schärfe-Regel aus `lessons/testing.md`.
- Test-Isolation sauber: eigene `mktemp`-Datei, kein geteilter State mit dem K-1-Block,
  Cleanup via `rm -f`.
- Die strukturelle Ähnlichkeit zum K-1-Block ist gegen die #240-Lesson („keine parallele
  Schleife mit identischem Rumpf") geprüft und gerechtfertigt: unterschiedlicher
  Testgegenstand (einfache `grep -c`-Zuweisung vs. `grep | head | while`-Pipeline), von
  der Spec explizit als Analogie gefordert.
- Task-Datei dokumentiert Root Cause, Fix-Kurzform und einen vorausschauenden
  Codify-Hinweis wie von der Konvention gefordert.
- Volle Testsuite lokal grün: 780/780 (Bash-Suite) sowie `pnpm test`/Typecheck/Format
  ohne Regression.

## Empfehlung
NEEDS_REWORK
