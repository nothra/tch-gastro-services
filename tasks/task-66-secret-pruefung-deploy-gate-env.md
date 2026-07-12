# Task 66: Härtung – Secret-Prüfung im Deploy-Gate über `env:` statt inline `${{ secrets.* }}`

- **Issue:** #66
- **Art:** enhancement · **Aspekte:** security, tech-debt
- **Spec:** [spec-66-secret-pruefung-deploy-gate-env.md](../docs/specs/spec-66-secret-pruefung-deploy-gate-env.md)
- **Herkunft:** Backlog-Hinweis #2 aus `tasks/security-63.md`

## Ziel

Alle innerhalb von `run:`-Shell-Ausdrücken referenzierten Secrets im Deploy-Gate
(`.github/workflows/deploy-gate.yml`) über den `env:`-Block des Steps als Shell-Variablen
lesen und nur noch gequotete Variablen testen. **Kein neues Verhalten** – reine Härtung
(schließt das Actions-Script-Injection-Muster, folgt dem bestehenden `$BYPASS`-Vorbild).

## Requirements (abgeschlossen)

- [x] Spec erstellt: `docs/specs/spec-66-secret-pruefung-deploy-gate-env.md`
- [x] Akzeptanzkriterien definiert
- [x] Betroffene Steps identifiziert: `Secrets vorhanden?` **und** `INT-Refresh aktiv?`

## Akzeptanzkriterien (aus Spec)

- [x] `Secrets vorhanden?`: `run:`-Block enthält kein `${{ secrets.* }}` mehr, nur gequotete `$VAR`
- [x] `INT-Refresh aktiv?`: `run:`-Block enthält kein `${{ secrets.* }}` mehr, nur gequotete `$VAR`
- [x] Gesamtes `deploy-gate.yml`: keine `${{ secrets.* }}`-Referenz innerhalb eines `run:`-Ausdrucks
- [x] Verhalten bei vollständigen Pflicht-Secrets unverändert (Prüfung grün)
- [x] Fehlendes Pflicht-Secret → gleiche `::error::`-Meldung + `exit 1` (fail-closed)
- [x] Fehlendes Neon-/INT-Secret → `enabled=false` + gleiche `::warning::`-Meldung

## Fehlerszenarien

- [x] Secret mit `"`/Backtick/`$` wird literal getestet (kein Ausbruch aus dem Test-Ausdruck)
- [x] Leeres/ungesetztes Secret → gleiche fail-closed-/Skip-Reaktion wie bisher

## Verifikation

- [x] `deploy-gate.yml` bleibt valides YAML
- [x] Grep-Nachweis: kein `${{ secrets.* }}` in einem `run:`-Step
- [x] `actionlint`/YAML-Parse ohne neuen Fund

## Pipeline

- [x] `/requirements` – Spec erstellt
- [x] `/architecture` – ADR nötig? Nein – reine Härtung ohne Architekturentscheidung (Schritt-0-Check: kein Trigger)
- [x] `/implement` – TDD-Umsetzung
- [x] `/review` – APPROVED (`tasks/review-66.md`); 2 Prozess-Findings vor PR: committen + rebasen
- [x] `/refactor` – 219 grün / 0 rot; einzige Änderung: `FIX_BAD`/`FIX_OK` → `TMP_YAML_INLINE`/`TMP_YAML_ENV` (Namens-Konsistenz mit `TMP_*`-Konvention der Datei)
- [x] `/security-review` – PASSED (`tasks/security-66.md`); keine Blocker, keine Out-of-Scope-Issues
- [ ] `/codify` – nicht automatisiert gelaufen (Stage-3-Turn-Budget des Skills zu knapp,
      3 Versuche erschöpft); als Follow-up vorgemerkt, kein Blocker für diesen PR
- [x] Fertig / PR erstellt – [PR #90](https://github.com/nothra/tch-gastro-services/pull/90)
