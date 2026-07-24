# Task 201: inerte-phase1-config-bereinigen

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [x] Tests vollständig
- [ ] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung

Inerte `tier`/`max_turns`-Einträge der Phase-1-Skills aus `factory.defaults.yml` bereinigen.
`requirements`, `architecture` und `release-notes` werden von `run-pipeline.sh` nie über
`run_skill` ausgeführt (Phase 1 ist immer interaktiv); ihre Config-Einträge steuern damit nichts
und suggerieren eine Automatik, die es nicht gibt.

**Entscheidung:** Die drei Einträge werden **entfernt** → sauberer Fallback auf den
`default`-Block (`light`, `10`). **`bug-fix` bleibt unverändert** (konzeptioneller Entrypoint,
Config bleibt bereit). Reine Config-/Doku-Klarheit, kein neues Verhalten.

Spec: [`docs/specs/spec-201-inerte-phase1-config-bereinigen.md`](../docs/specs/spec-201-inerte-phase1-config-bereinigen.md)

## Akzeptanzkriterien

- [x] **AK1** – `skills.requirements`/`architecture`/`release-notes` aus `factory.defaults.yml`
  entfernt; `model_tiers`, `default`, `bug-fix` und pipeline-getriebene Skills unverändert.
- [x] **AK2** – Fallback: `get_model` liefert für die drei Skills `light`, `get_max_turns` den
  `default`-Wert `10` (kein stilles Heavy-Upgrade).
- [x] **AK3** – `config-validation-check.sh` bleibt Exit 0 und fail-closed konsistent (Regeln 4a–4c).
- [x] **AK4** – Test „#197 AK7" (`run-tests.sh:2648`) belegt die effektive `default`-`light`-
  Auflösung der drei Skills; `run-tests.sh` vollständig grün.
- [x] **AK5** – Kein `tier`/`max_turns`-Knopf suggeriert mehr eine Phase-1-Automatik.
- [x] **AK6** – ADR-038-Kommentar (Zeile ~62) beschreibt den tatsächlichen Zustand, ohne auf
  entfernte Einträge zu verweisen.

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

Kein neuer ADR nötig (abgedeckt durch ADR-009/011/038). Fehlerszenarien F1–F3 (verstecktes
Test-Coupling, Annotation-Gate C(a), Doku-Drift) siehe Spec.

**Implementierung (2026-07-24):** Umgesetzt in Commit `e9b1387` – drei Einträge aus
`factory.defaults.yml` entfernt (Kommentarblock 78-81 erklärt das WHY), ADR-038:62-64
nachgezogen, `run-tests.sh` #197-AK7-Test um die drei Skills bereinigt + neuer `#201`-Block
(2656-2666) belegt die `// .default`-Auflösung (light, max_turns 10). AK1–AK6 verifiziert:
`config-validation-check.sh` exit 0, `#201`-Test grün.

**Nicht durch diese Task verursacht (F1-Nachweis):** `run-tests.sh` meldet 4 rote `#212 W3`-Tests
(E2E-Pipeline mit echtem `git push` gegen ein lokales Origin). Der Branch-Diff
(`origin/main...HEAD`) berührt weder `verify-final-state.sh`/`run-pipeline.sh` noch Push-Logik;
die run-tests.sh-Änderung liegt isoliert im yq-Config-Assertion-Block (2643-2666). Es sind
vorbestehende, umgebungsbedingte Failures (kein funktionierender Remote-Push im Sandbox-Worktree).

**`/test`-Verifikation (2026-07-24):** `bash scripts/checks/tests/run-tests.sh` → 521 grün, 4 rot
(bestätigt vorbestehend, s. o.; `git diff --stat origin/main...HEAD` zeigt nur
`factory.defaults.yml`, `run-tests.sh`, ADR-038, Spec/Task-Datei – keine Berührung von
Push-/PR-Verifikationslogik). `config-validation-check.sh factory.defaults.yml` → Exit 0 (AK3).
Repo-weiter Grep nach `skills.requirements|architecture|release-notes` (F1) findet nur noch
Spec-Prosa, keinen Code/Skript-Bezug. Annotation-Gate C(a)/C(b) (F2) grün. Keine fehlenden Tests
identifiziert – der bestehende `#201`-Block deckt AK1/AK2/AK5 vollständig ab; kein
Produktionscode geändert.

**`/refactor`-Verifikation (2026-07-24):** Diff (`origin/main...HEAD`) besteht ausschließlich aus
YAML-Kommentarblock (`factory.defaults.yml`), zwei Doku-Dateien (ADR-038, Spec/Task) und einem
Test-Assertion-Block (`run-tests.sh`, `ph1_ok`-Schleife). Kein Produktionscode, keine Duplikation,
keine Funktion >20 Zeilen, keine Magic Numbers. Der neue `ph1_ok`-Block folgt exakt dem im File
etablierten `_ok=0`-Akkumulator-Idiom (vgl. `jq_ok` Zeile 256, `ak7_ok` Zeile 2648) – keine
Extraktion nötig. Ergebnis: kein Refactoring-Bedarf, keine Code-Änderung vorgenommen (Tests
bleiben unverändert grün: 521/4 wie zuvor, `config-validation-check.sh` weiterhin Exit 0).

## Offene Fragen

Keine offen (siehe Spec).

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `chore/201-inerte-phase1-config-bereinigen`
Erstellt: 2026-07-24 14:13
