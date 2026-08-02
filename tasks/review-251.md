# Review: Task 251

## Kritische Findings (müssen behoben werden)
- [x] [scripts/checks/tests/run-tests.sh:2325-2336 (erste Fassung, inzwischen behoben)]
      Neue jq-Schleife für die 16 #88-`Edit(...)`-Allow-Einträge war rumpfidentisch zur direkt
      darüberliegenden #224-AK1-Schleife (identischer Prüfausdruck
      `jq -e --arg v "$entry" '.permissions.allow | index($v) != null' "$SETTINGS"`, nur andere
      Werteliste). Verstößt gegen das kodifizierte #240-Learning in
      `docs/factory/lessons/testing.md:343-368` ("Neue Regressions-Assertion-Schleife gegen
      bereits vorhandene Schleife mit identischem Rumpf abgleichen, bevor eine parallele
      Schleife angelegt wird") sowie gegen Spec-AK4 ("kein struktureller Duplikat-Rumpf").
      Präzedenzfall im selben File: die #240-AK1-Schleife (Zeile ~2338) vereint bereits zwei
      unterschiedliche Eintragsgruppen (11 Verzeichnis- + 7 Extension-Einträge) in einer Liste
      statt zwei getrennter Schleifen – exakt das hier zunächst verfehlte Muster.
      **Behoben:** Die 16 Einträge sind jetzt in die bestehende #224-AK1-Werteliste gemergt
      (kombinierter Assert-Präfix `#224/#251:`, Präzedenz: `#91/#240:` bei der
      deny-Symmetrie-Assertion). Verifiziert: volle Suite weiterhin 641 grün/0 rot; Negativ-Test
      (Eintrag in Testkopie gestrichen) färbt weiterhin exakt die 2 zugehörigen Assertionen rot.

## Wichtige Findings (sollten behoben werden)
- [x] [committen] Der Merge-Fix lag nach Runde 3 zunächst nur unkommittiert im Working Tree vor
      (Review-Runde-3-Finding). Behoben durch Commit + Push über `factory-commit.sh` im Anschluss
      an diese Review-Runde.

## Nitpicks (optional)
- [ ] [scripts/checks/tests/run-tests.sh:2393-2399] Grep-Fallback-Schleife dupliziert die
      16-Werte-Liste wörtlich gegenüber der gemergten jq-Schleife (zwei unabhängige
      Ausführungspfade – jq vs. grep – benötigen dieselben Literale). Ein gemeinsames
      Bash-Array (`EDIT_88_ENTRIES=(...)`), das von beiden Schleifen iteriert wird, würde
      Drift-Risiko bei künftigen #88-Änderungen eliminieren. Entspricht aber dem bestehenden
      Stil im File (auch die #240-Listen für allow/deny sind nicht als Array faktorisiert) –
      rein optional, kein Blocker.

## Positives
- Alle 4 Akzeptanzkriterien der Spec sind erfüllt und wurden durch echte Positiv-/Negativ-/
  jq-Fallback-Läufe verifiziert (nicht nur behauptet) – inkl. korrektem Nachweis, dass der
  Grep-Fallback strukturell außerhalb des `HAS_JQ`-Conditionals liegt und somit unabhängig von
  jq läuft (AK3).
- Die 16 Zielwerte sind exakt gegen `.claude/settings.json` gegengezählt: keine Dubletten, keine
  fehlenden Einträge, kein Substring-Kollisionsrisiko (z. B. `Edit(*.ts)` vs. `Edit(*.tsx)`
  kollidieren wegen der schließenden Klammer nicht).
- `grep -qF --` korrekt mit End-of-Options-Marker abgesichert (Clean-Code-Guideline zu
  variablen Suchwerten).
- Reiner Test-Coverage-Task ohne Scope-Überschreitung: `.claude/settings.json` selbst
  unverändert, keine Berührung von `app/**`/`lib/**`/`db/**`, kein ADR-Trigger.
- Task-Datei dokumentiert die Verifikation und den Review-Fix nachvollziehbar in den
  Technischen Notizen.

## Empfehlung
APPROVED
