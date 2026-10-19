# Task 424: factory-in-eigenes-repo-auslagern

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
**Epic.** Die dm Development Factory wird aus dem TCH-Repo in das eigene öffentliche GitHub-Repo
`nothra/dev-factory` ausgelagert und als wiederverwendbares, versioniertes Werkzeug betrieben. TCH wird ihr
erster Konsument. Spec: [`docs/specs/spec-424-factory-in-eigenes-repo-auslagern.md`](../docs/specs/spec-424-factory-in-eigenes-repo-auslagern.md).

Umsetzung in vier Teil-Tasks, nacheinander, je eigenes Issue/Spec/PR (Schnitt laut ADR-063 D11):
- **T1a · Trennlinie ziehen (TCH)** – #426: Besitz je Datei klären, Erweiterungspunkte, TCH-Spezifika an projekteigene Orte – verhaltensneutral
- **T1b · Herauslösen** – #427: `nothra/dev-factory` mit Historie, Scan, Ruleset, CI, `v0.6.0`
- **T2 · Werkzeug abholen** – #428: versionierte Einbindung, automatischer Update-PR, Änderungs-Gate, Neuprojekt-Nachweis,
  Factory-Funde aus Projekt-Arbeit landen direkt im Factory-Repo
- **T3 · Umziehen** – #429: Factory-Issues, -ADRs, -Lessons ins Factory-Repo; TCH-Doku verweist dorthin

Dieser Epic-PR liefert **nur** Spec + ADR (Phase 1); die Umsetzung läuft in den Teil-Tasks.

> **Merge-Notiz (2026-10-19, Entscheidung des Entwicklers):** PR #425 wird nach Phase 1 gemergt.
> Sein `Closes #424` schließt das Epic dabei automatisch; #424 wird direkt danach **wieder geöffnet**
> und erst mit dem Merge von T3 (#429) geschlossen. Die übrigen offenen Checkboxen (Status-Schritte
> ab „Review bestanden", T1a–T3, AKE) sind bewusst offen – sie werden in den Teil-Tasks erledigt,
> diese Datei bleibt auf `main` als Epic-Übersicht stehen.

## Akzeptanzkriterien
<!-- Epic-Ebene; Detail-AK in der Spec (AK1.x–AK3.x, AKE.x, F1–F7) -->
- [x] Spec mit Akzeptanzkriterien für T1–T3 liegt vor und ist mit dem Entwickler abgestimmt
- [x] ADR zu Verteilungsmechanik, Historienübertrag, Versionsschema und Dateitrennung (Spec Q1–Q5, Q8) liegt vor → ADR-063
- [x] Teil-Issues T1a, T1b, T2, T3 sind angelegt und in der Spec verlinkt (#426, #427, #428, #429)
- [ ] T1a (#426) gemergt (AK1.5, Datei-Anteile AK3.2/3.3)
- [ ] T1b (#427) gemergt (AK1.1–AK1.4, AK1.6–AK1.8)
- [ ] T2 (#428) gemergt (AK2.1–AK2.13)
- [ ] T3 (#429) gemergt (AK3.1–AK3.10)
- [ ] Epic-weite AK erfüllt (AKE.1, AKE.2)

## Technische Notizen
Architektur: [ADR-063](../docs/adr/063-factory-eigenes-repo-vendored-manifest.md) (Status Proposed, flippt mit T1a auf Accepted).
- Verteilung: committete Kopie an heutigen Pfaden + Manifest `factory.lock`; `scripts/factory-sync.sh` atomar (D1)
- Update: Pull-Workflow `factory-update.yml`, ein fester Branch/PR, PAT `FACTORY_SYNC_TOKEN` (D2)
- Keine Mischdateien: `CLAUDE.md` → Import von `docs/factory/FACTORY.md`; `settings.json`/`.gitignore` zusammengesetzt aus Fragmenten; Projekt-Checks in `scripts/project/checks/*.d/`; Gate-Kommandos + Labels in `factory.config.yml` (D3)
- Integritäts-Gate lokal (Hash) + CI `factory-integrity` gegen Release-Manifest, required (D4)
- Historie per `git filter-repo`-Allowlist aus `docs/factory/OWNERSHIP.md`, gitleaks vor erstem Push (D5)
- SemVer ab `v0.6.0`, Release mit Notes + Manifest-Asset (D6)
- `create_factory_issue` im Seam, Fallback in Task-Datei (D7)
- Factory-ADRs nach `docs/factory/adr/`, Nummern bleiben, ortsabhängige Auflösung (D8)

## Offene Fragen
Q1–Q8 entschieden (Q1–Q5, Q8 in ADR-063; Q6/Q7 in der Spec). Offen: keine auf Epic-Ebene; Detailfragen klären die Teil-Specs.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/424-factory-in-eigenes-repo-auslagern`
Erstellt: 2026-10-19 04:50
