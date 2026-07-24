# Review: Task 201

## Kritische Findings (müssen behoben werden)

- [ ] **[factory.defaults.yml:77-79] AK1 nicht umgesetzt – die zu entfernenden Einträge existieren noch.**
  `skills.requirements`, `skills.architecture` und `skills.release-notes` stehen unverändert in der
  Config (`{ tier: light, max_turns: 6 }`). Der Kern-Deliverable des Tasks (Entfernen der drei inerten
  Phase-1-Einträge, Fallback auf `default`) hat **nicht** stattgefunden. Ohne diese Änderung sind AK1,
  AK2 und AK5 nicht erfüllt.

- [ ] **[scripts/checks/tests/run-tests.sh:2666] AK4 verletzt – der #201-Test ist ROT, die Suite ist nicht grün.**
  Der neue Test (`ph1_ok`, Zeilen 2656–2666) assertiert `.skills | has("requirements") == false` usw.,
  während die Einträge in `factory.defaults.yml` noch vorhanden sind. Ergebnis:
  `✗ #201 AK1/AK2: requirements/architecture/release-notes ohne eigenen Eintrag → effektiv default-light, max_turns 10`.
  Der Test wurde geschrieben (korrekt antizipiert), die zugehörige Config-Änderung fehlt aber – der Branch
  ist damit in einem widersprüchlichen, roten Zustand. AK4 fordert „`run-tests.sh` vollständig grün".

- [ ] **[docs/adr/038-groessenabhaengige-modell-tier-wahl.md:62] AK6 nicht umgesetzt – ADR-Kommentar verweist weiter auf die (zu entfernenden) Einträge.**
  Zeile 62 listet unverändert `# test/refactor/codify/pr-shepherd/requirements/architecture/release-notes:
  unverändert (light, kein tier_by_size)`. Nach dem Entfernen der drei Einträge beschreibt der Kommentar
  einen nicht mehr existierenden Zustand (Doku-Drift, F3). Muss die effektive Auflösung über `default`
  beschreiben, ohne `requirements`/`architecture`/`release-notes` als eigene Skill-Einträge zu nennen.

## Wichtige Findings (sollten behoben werden)

- [ ] **[scripts/checks/tests/run-tests.sh] Der Task ist derzeit rein test-seitig „halb geliefert".**
  Effektiv wurde nur die Testhälfte von AK4 committet/geändert; die drei substanziellen Deliverables
  (Config-Entfernung AK1, ADR-Nachzug AK6, und die daraus folgenden AK2/AK5) fehlen komplett. Beim
  Rework müssen `factory.defaults.yml` und ADR-038 im selben PR nachgezogen werden, damit Test und
  Config wieder konsistent (und grün) sind.

## Nitpicks (optional)

- [ ] Der `#197 AK7`-Test (Zeile 2654) wurde korrekt um `requirements/architecture/release-notes`
  bereinigt und die Kommentare (2643–2644, 2656–2659) sind präzise und gut begründet – das ist der
  saubere Teil der Änderung. Kein Handlungsbedarf, nur zur Abgrenzung notiert.

## Positives

- Die Test-Aufspaltung ist gut modelliert: `#197 AK7` prüft weiterhin die pipeline-getriebenen Skills,
  der neue `#201`-Block prüft separat die effektive `default`-Auflösung der Phase-1-Skills über
  `.skills.<s>.<feld> // .default.<feld>` inkl. `has()`-Abwesenheitsprüfung **und** Tier/max_turns –
  genau der in der Spec beschriebene Kontrakt.
- Kommentare erklären das WHY (pipeline-inert, kein stilles Heavy-Upgrade) und referenzieren die
  kanonischen Quellen (ADR-038, `cfg_skill_field`).
- F1 verifiziert: kein verstecktes Skript-/Test-Coupling an `skills.{requirements,architecture,release-notes}`
  außerhalb von `run-tests.sh` (repo-weiter Grep über `scripts/` ohne relevante Treffer).

## Hinweis zu #212 W3 (nicht dieser Task)

Die Suite meldet zusätzlich 5 rote `#212 W3`-Tests (Endzustands-Verifikation mit realem `git push`).
Diese Dateien (`verify-final-state.sh`, Push-Verhalten) werden von diesem Branch **nicht** berührt
(`git diff origin/main...HEAD` = nur spec/task/run-tests.sh) – es sind vorbestehende, umgebungsbedingte
Fehler (kein Remote-Push im Sandbox-Worktree), nicht durch Task 201 verursacht. Für AK4 ist jedoch
bereits der **#201-Test selbst rot** – das genügt zur Ablehnung, unabhängig von #212.

## Empfehlung

NEEDS_REWORK

**Begründung:** Die eigentliche Implementierung fehlt. Nur die Testseite wurde geändert; sie ist rot,
weil `factory.defaults.yml` (AK1/AK2/AK5) und `docs/adr/038-…:62` (AK6) nicht nachgezogen wurden. Zum
Grün-Werden müssen die drei Skill-Einträge aus `factory.defaults.yml` entfernt und der ADR-Kommentar
angepasst werden (F3). Danach `bash scripts/checks/tests/run-tests.sh` erneut laufen lassen.
