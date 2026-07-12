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

- [ ] `Secrets vorhanden?`: `run:`-Block enthält kein `${{ secrets.* }}` mehr, nur gequotete `$VAR`
- [ ] `INT-Refresh aktiv?`: `run:`-Block enthält kein `${{ secrets.* }}` mehr, nur gequotete `$VAR`
- [ ] Gesamtes `deploy-gate.yml`: keine `${{ secrets.* }}`-Referenz innerhalb eines `run:`-Ausdrucks
- [ ] Verhalten bei vollständigen Pflicht-Secrets unverändert (Prüfung grün)
- [ ] Fehlendes Pflicht-Secret → gleiche `::error::`-Meldung + `exit 1` (fail-closed)
- [ ] Fehlendes Neon-/INT-Secret → `enabled=false` + gleiche `::warning::`-Meldung

## Fehlerszenarien

- [ ] Secret mit `"`/Backtick/`$` wird literal getestet (kein Ausbruch aus dem Test-Ausdruck)
- [ ] Leeres/ungesetztes Secret → gleiche fail-closed-/Skip-Reaktion wie bisher

## Verifikation

- [ ] `deploy-gate.yml` bleibt valides YAML
- [ ] Grep-Nachweis: kein `${{ secrets.* }}` in einem `run:`-Step
- [ ] `actionlint`/YAML-Parse ohne neuen Fund

## Pipeline

- [x] `/requirements` – Spec erstellt
- [ ] `/architecture` – ADR nötig? (voraussichtlich **nein**: reine Härtung ohne Architekturentscheidung)
- [ ] `/implement` – TDD-Umsetzung
- [ ] `/review`
- [ ] `/security-review`
- [ ] `/codify`
- [ ] Fertig / PR erstellt
