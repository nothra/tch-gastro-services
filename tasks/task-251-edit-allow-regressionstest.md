# Task 251: edit-allow-regressionstest

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Regressionstest ergänzen, der das Fortbestehen der 16 ursprünglichen #88-`Edit(...)`-Allow-
Einträge in `.claude/settings.json` prüft (z. B. `Edit(app/**)`, `Edit(lib/**)`,
`Edit(scripts/**)`, `Edit(*.ts)`, `Edit(*.md)`). Aktuell deckt keine Assertion in
`scripts/checks/tests/run-tests.sh` diese Einträge ab – nur die #224/#240-spezifischen
(YAML, `pnpm-lock`, `.claude/**`, `.env*`). Kein neues Verhalten, reine Testabdeckung.

Spec: [docs/specs/spec-251-edit-allow-regressionstest.md](../docs/specs/spec-251-edit-allow-regressionstest.md)

## Akzeptanzkriterien
- [x] GIVEN `.claude/settings.json` enthält alle 16 ursprünglichen #88-`Edit(...)`-Allow-Einträge
      WHEN `run-tests.sh` läuft THEN erzeugt eine geparste (`jq`) Schleife je Eintrag eine eigene
      grüne Assertion.
- [x] GIVEN einer der 16 Einträge fehlt versehentlich WHEN `run-tests.sh` läuft THEN schlägt
      genau die zugehörige Assertion fehl (kein pauschaler Sammel-Check).
- [x] GIVEN `jq` ist nicht verfügbar WHEN `run-tests.sh` läuft THEN prüft ein Grep-Fallback
      (analog #91/#240) dieselben 16 Einträge textbasiert.
- [x] GIVEN die neue Schleife wird geschrieben WHEN implementiert wird THEN vorher gegen die
      bestehende #224-AK1-Schleife abgeglichen (kein struktureller Duplikat-Rumpf).

## Technische Notizen
- **Review-Runde-1-Finding (behoben):** Erste Fassung legte eine eigene, rumpfidentische
  Schleife neben die #224-AK1-Schleife (gleicher jq-Prüfausdruck, nur andere Werteliste) – exakt
  das in `lessons/testing.md:343` kodifizierte #240-Learning ("Neue Regressions-Assertion-
  Schleife gegen bereits vorhandene Schleife mit identischem Rumpf abgleichen, bevor eine
  parallele Schleife angelegt wird"). Korrigiert: die 16 #88-Einträge sind jetzt in die
  bestehende #224-AK1-Werteliste gemergt (kombinierter Assert-Präfix `#224/#251:`, Präzedenz:
  `#91/#240:` bei der deny-Symmetrie-Assertion). Präzedenzfall im selben File: die #240-AK1-
  Schleife vereint ebenfalls zwei unterschiedliche Eintragsgruppen (11 Verzeichnis- + 7
  Extension-Einträge) in einer Liste statt zwei getrennten Schleifen.
- Grep-Fallback bleibt eine eigenständige neue Schleife (kein Merge-Ziel vorhanden – einzige
  weitere `for entry in ...`-Schleifen im File sind jq-basiert), bewusst außerhalb des
  `if [ "$HAS_JQ" -eq 1 ]`-Blocks platziert (läuft immer), analog zum bestehenden #91/#240-Muster.
- Verifikation (nach dem Merge-Fix erneut ausgeführt):
  - Positiv: volle Suite grün (641/0).
  - Negativ: `Edit(scripts/**)` in einer Testkopie von `.claude/settings.json` gestrichen →
    genau die 2 zugehörigen Assertionen (`#224/#251:` jq + `#251:` Grep) wurden rot, alle
    anderen 639 blieben grün.
  - jq-Fallback: temporäre Kopie von `run-tests.sh` mit `HAS_JQ=0` erzwungen (im selben
    Verzeichnis, sonst bricht die `BASH_SOURCE`-relative `FACTORY_ROOT`-Auflösung) → jq-Block
    zeigt „übersprungen (jq fehlt)“, alle 16 Grep-Fallback-Assertionen bleiben grün (594/0).
  - **`/test`-Ergänzung:** Spec-Fehlerszenario 2 ("Eintrag wird umbenannt statt entfernt, z. B.
    `Edit(app/**)` → `Edit(app/*)`, exakte Assertion statt Fuzzy-Match") war bisher nur durch
    Design (exaktes `jq index($v)` + `grep -qF`), nicht durch einen Lauf belegt. In einer
    Testkopie `Edit(app/**)` → `Edit(app/*)` umbenannt (nicht gestrichen) → genau die 2
    zugehörigen Assertionen (`#224/#251:` jq + `#251:` Grep) wurden rot, alle anderen 639
    blieben grün – kein Substring-/Fuzzy-Match auf den nun vorhandenen `Edit(app/*)`-String.
    Kein Code-Änderungsbedarf, reine Verifikation. Keine zusätzliche Vitest-Coverage betroffen
    (Task ändert keine `.ts`/`.tsx`-Produktionsdateien).

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

## Review-Findings
Siehe [tasks/review-251.md](review-251.md) – Empfehlung: APPROVED. Ein Kritisch-Finding
(rumpfidentische Duplikat-Schleife statt Merge in #224-AK1) wurde vor dem Review-Abschluss
behoben; ein Nitpick (16-Werte-Liste zwischen jq- und Grep-Pfad dupliziert) bleibt optional
offen, entspricht dem bestehenden Dateistil.

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/251-edit-allow-regressionstest`
Erstellt: 2026-08-02 07:53
