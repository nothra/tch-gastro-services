# Task 173: deploy-freeze-bei-rotem-gate

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Struktureller Schutz gegen falsch-grüne Deploy-Gates: Sobald ein Gate-Lauf über
verifikationsrelevante Schritte rot wird, wird ein **Freeze** gesetzt. Der Promote-Schritt
verweigert **fail-closed** jeden weiteren Promote (inkl. PRD-DB-Migration), solange der Freeze
steht. `main` läuft normal weiter – nur **deployt** wird nichts, bis ein Maintainer den Freeze
nach Fix + Verifikation aufhebt. Verhindert, dass ein einmal rotes Gate durch einen späteren,
evtl. flaky-grünen Lauf still überholt wird (Vorfall 19.07.2026: #134-rot → #167-flaky-grün →
fehlerhafter Code auf Produktion).

Spec: [`docs/specs/spec-173-deploy-freeze-bei-rotem-gate.md`](../docs/specs/spec-173-deploy-freeze-bei-rotem-gate.md)

**Requirements-Entscheidungen:** (1) Trigger eingegrenzt – nur E2E/Migrations-Fehler frieren,
nicht Infra-Flakes. (2) Freeze-Check **vor** der PRD-Migration (kein Prod-DB-Seiteneffekt).
(3) Aktive Benachrichtigung zusätzlich zum Log.

## Akzeptanzkriterien
- [ ] AC1 – Rotes Gate (E2E gegen INT / `db:migrate:int` / `db:migrate:prd`) setzt persistenten Freeze-Marker (Grund + blockierender SHA).
- [ ] AC2 – Reine Infra-/Vorbereitungsfehler (Secret-Check, Install, INT-Deploy-Timeout, Neon-Reset, Anonymisierung) setzen **keinen** Freeze.
- [ ] AC3 – Promote fail-closed: Marker gesetzt **oder** unlesbar → weder PRD-Migration+Seed noch Promote-Push.
- [ ] AC4 – Freeze-Check läuft **vor** der PRD-DB-Migration (kein Seiteneffekt auf die Prod-DB).
- [ ] AC5 – Wegen Freeze zurückgehaltener Promote endet **ohne Fehler** (nicht rot), mit klarer Meldung (SHA + Grund).
- [ ] AC6 – Automatisierter Test simuliert #134-rot → #167-grün und belegt: grüner Folgelauf promotet **nicht**.
- [ ] AC7 – Dokumentierter, manueller Freigabe-Weg (Maintainer); nach Freigabe promotet der nächste Lauf wieder.
- [ ] AC8 – Aktive Benachrichtigung bei Freeze-Setzen **und** bei blockiertem Promote (SHA + Grund).
- [ ] AC9 – ADR ergänzt (Marker-Variante, Trigger, Check-Position, Freigabe, Benachrichtigung, Zusammenspiel ADR-007/017/`concurrency`) + README/Runbook-Doku.

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
Architektur entschieden in [ADR-032](../docs/adr/032-deploy-freeze-bei-rotem-gate.md).

**Umsetzungs-Bausteine (TDD-Reihenfolge):**
1. **`scripts/deploy-freeze.sh`** (neu, testbar) – Subkommandos:
   - `set <sha> <grund>` → `git push origin <sha>:refs/factory/deploy-freeze` (fail-closed: Push-Fehler → non-zero).
   - `check` → Exit `0`=eingefroren, `10`=nicht eingefroren, sonst=unklar. Via `git ls-remote`.
   - `release` → `git push origin --delete refs/factory/deploy-freeze` (idempotent, „nicht vorhanden" = ok).
   - `status` → blockierenden SHA ausgeben.
   - Env-Overrides `FREEZE_REMOTE`, `FREEZE_REF` für Bare-Repo-Test.
2. **`scripts/checks/tests/run-tests.sh`** – Bare-Repo-Simulation (AC6): set→check(0)→check bleibt 0
   (grüner Folgelauf)→release→check(10); plus Nachweis, dass unlesbar (Exit≠10) fail-closed wirkt.
3. **`.github/workflows/deploy-gate.yml`**:
   - INT-Sammelstep splitten: `db:migrate:int` in eigenen Step `id: migrate_int` (Anonymize/Seed bleiben ohne Trigger).
   - `id: e2e` an „E2E gegen INT"; `id: migrate_prd` an „PRD-DB migrieren + Login seeden".
   - Neuer Step `id: check_freeze` **vor** der PRD-Migration → `frozen`-Output (fail-closed: unklar→true).
   - `if: steps.check_freeze.outputs.frozen != 'true'` an PRD-Migration+Seed, Promote-Push, Post-Deploy-Healthcheck.
   - Bei `frozen=true`: `::warning::` + Step-Summary (SHA+Grund) + Benachrichtigung, **kein** exit 1 (Lauf grün, AC5).
   - Neuer Step `set_freeze` mit `if: failure() && (e2e|migrate_int|migrate_prd outcome == 'failure')` → `set` + Benachrichtigung.
   - `permissions:` um `issues: write` erweitern.
4. **Benachrichtigung** (fail-open, `gh issue`): dediziertes „Deploy-Freeze"-Tracking-Issue kommentieren/öffnen
   beim Setzen+Blockieren, schließen bei Freigabe. Darf den fail-closed Marker nie blockieren.
5. **Freigabe-Job** `workflow_dispatch` (neuer/kleiner Workflow) → `deploy-freeze.sh release`.
6. **Doku:** Freigabe-Weg + Freeze-Konzept in README/Runbook.

**Live zu verifizieren (nicht annehmen):** `refs/factory/*`-Push mit `GITHUB_TOKEN` (`contents: write`).
Fällt das aus → Rückfall Option B (PAT + Repo-Variable), siehe ADR-032.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
Alle in ADR-032 entschieden: Marker = Git-Sentinel-Ref `refs/factory/deploy-freeze`;
Benachrichtigung = Tracking-Issue (fail-open); Freigabe = `workflow_dispatch`; Trigger = `e2e`/`migrate_int`/`migrate_prd`;
Testbarkeit via `scripts/deploy-freeze.sh` + Bare-Repo-Test. Keine offenen Fragen mehr.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/173-deploy-freeze-bei-rotem-gate`
Erstellt: 2026-07-19 17:51
