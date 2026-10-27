# Task 447: undici-auf-7-30-1-heben

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Dependabot-Alert #100 (high, GHSA-xjj6-f33q-929c, DoS über `content-encoding`) schließen:
undici-Override auf `^7.30.1` heben, Floor-Guard für 6.x/7.x/8.x nachziehen (8.x neu, Kleinfund
mitgenommen). Spec: [`docs/specs/spec-447-undici-7-30-1-ghsa-xjj6.md`](../docs/specs/spec-447-undici-7-30-1-ghsa-xjj6.md)

## Akzeptanzkriterien
<!-- Wortlaut: siehe Spec -->
- [ ] AK1: Override `"undici@>=7.0.0 <7.30.1": "^7.30.1"` in `pnpm-workspace.yaml`
- [ ] AK2: YAML-Kommentar nennt GHSA-xjj6-f33q-929c + Fixes 6.29.1 / 8.12.2
- [ ] AK3: Lockfile ohne undici < 7.30.1 (7.x), keine 6.x/8.x unter Floor
- [ ] AK4: Frisch-Auflösung ohne Alt-Lockfile ≥ 7.30.1, mit/ohne Override in Task-Notiz
- [ ] AK5: Floor-Guard prüft undici 6.29.1 / 7.30.1 / 8.12.2, grün
- [ ] AK6: Mutationsbeleg Major 7 (Fixture 7.30.0 wird gemeldet)
- [ ] AK7: Mutationsbeleg Major 8 (8.12.1 gemeldet, 7.x-Nachbar nicht; Gegenprobe)
- [ ] AK8: Major-6-Mutationsbeleg bleibt unter neuem Floor 6.29.1 gültig
- [ ] AK9: Kleinfund „undici-8.x-Linie" entfernt
- [ ] AK10: test, lint, Typecheck, build, run-tests.sh grün
- [ ] AK11: Bulk-Advisory-API ohne undici-Treffer (Gegenprobe 7.30.0)
- [ ] AK12 (Nach-Merge): Dependabot-Alert #100 geschlossen

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
Kein ADR-Trigger (gleiche Mechanik wie #291/#390/#412) → /architecture entfällt.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
- [x] Kleinfund undici-8.x mitnehmen → ja (Entwickler, /requirements)
- [ ] Aspekt-Label `factory-pipeline` (berührt `scripts/`) gemäß git-workflow.md prüfen

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `chore/447-undici-auf-7-30-1-heben`
Erstellt: 2026-10-27 17:57
