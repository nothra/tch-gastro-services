# Task 428: factory-split-t2-factory-lock-einbinden (T2a-4 · Erst-Einbindung)

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Teil-Task T2 des Epics #424: TCH bindet die Factory als versionierte Kopie aus `nothra/dev-factory`
(v0.6.0) per `factory.lock` ein. **Geteilt am 2026-10-24 (zweimal):** diese Task ist **T2a-4 (Erst-Einbindung in TCH)**; T2a-1…3 laufen als Tasks in `nothra/dev-factory` ([#22](https://github.com/nothra/dev-factory/issues/22), [#23](https://github.com/nothra/dev-factory/issues/23), [#24](https://github.com/nothra/dev-factory/issues/24)) und gehen voran; **/implement erst nach dem Release der letzten.** Fund-Ablage + Neuprojekt (AK2.7, AK2.9–AK2.13, F8) sind T2b = #441.
Detail-Spec: [spec-428](../docs/specs/spec-428-factory-versioniert-per-factory-lock-einbinden.md);
Technik: [ADR-063](../docs/factory/adr/063-factory-eigenes-repo-vendored-manifest.md) D1, D2, D4, D7, D10.

## Akzeptanzkriterien
> Volltext in spec-428 (eine Quelle). **Nur T2a-4**; die übrigen Kriterien gehören den Factory-Tasks.
- [ ] AK2.14a `factory.lock` existiert, `main` besteht alle Gates inkl. `factory-integrity`, jede Datei der Seite `factory` ist durch das Lock gedeckt
- [ ] AK2.14b jede Abweichung TCH ↔ eingebundene Version ist Teil der Version oder ins Factory-Repo gegeben; Dateiliste Vorher/Nachher + `git log`-Beleg im PR
- [ ] AK2.14c `protect-main` führt `factory-integrity` als Required Check (nach dem Merge, menschlich); ADR-029-Nachtrag
- [ ] AK2.15d TCHs `OWNERSHIP.md` entfernt, kein Text verweist mehr darauf als Quelle der Zuordnung
- [ ] AKE.1 Pipeline unverändert, Self-Tests und App-Gates grün, Required-Check-Namen bis auf `factory-integrity` unverändert
- [ ] AKE.2 eigener PR/Issue, beide Repos grün; Reihenfolge Factory-Releases → TCH-PR

## Technische Notizen
Entscheidungen: [ADR-063 Nachtrag 2026-10-24 + „Zweiter Schnitt von T2a“](../docs/factory/adr/063-factory-eigenes-repo-vendored-manifest.md) (Q1–Q9).
- **Reihenfolge:** (1) Factory-Tasks in `nothra/dev-factory`, je ein Release: T2a-1 Konsumenten-Vertrag (Ownership-Modus Q7, Suite-Schnitt Q8; `OWNERSHIP.md` dort projekteigen), T2a-2 `factory-sync.sh` Sync-Modus (atomar, Temp-Dir, Bash 3.2, `shasum -a 256`) + `factory-integrity-check.sh` + CI-Job, T2a-3 `factory-update.yml`. (2) TCH-PR #428 bindet die letzte Version ein: Bootstrap per Tag-Tarball + `FACTORY_DIR` (Q9), `factory.lock`, `OWNERSHIP.md` löschen, Verweise umstellen, Log-Beleg (AK2.14b). (3) Nach Merge: Ruleset-Eintrag (Q4, menschlich), ADR-029-Nachtrag.
- **Messung (2026-10-24):** v0.6.0 hatte 113 Dateien, TCH 111; 37 identisch, 50 nur durch `#nr`-Qualifizierung verschieden, 24 mit Textänderung (Wiederholung gegen v0.6.1: 34 / 47 / 30) (groß: `run-tests.sh` ~1000 Zeilen, `OWNERSHIP.md`, ADR-063, `OPERATING.md`); zusätzlich in v0.6.0: `factory-release-check.sh`, `factory-release-manifest.sh`.
- **Änderungsstopp:** Seite-`factory`-Dateien in TCH nicht mehr ändern; Ausnahme dieser ADR-Nachtrag (wandert mit v0.7.0 ins Factory-Repo).
- **Tests (TDD):** Sync-Abbruch per Stub im `PATH` (Messung brechen, Lesson #319); je Gate-Stufe Mutationsbeleg; Fixture-Release offline.

## Offene Fragen
- [x] Q1 Reihenfolge: Factory-PR → v0.7.0 → TCH-PR (ADR-063 Nachtrag Q1)
- [x] Q2 Erst-Einbindung = Wechsel auf v0.7.0, Änderungsstopp, Log-Beleg (Nachtrag Q2/Q9)
- [ ] Q3 `FACTORY_SYNC_TOKEN` (PAT) anlegen – menschlicher Schritt vor erstem Workflow-Lauf (nach T2a-4)
- [x] Q4 Ruleset `factory-integrity` erst nach dem Merge (Nachtrag Q4)
- [x] Q6 T2 geteilt: T2a #428 / T2b #441
- [x] Q7 Skill-Texte (AK2.12) → T2b

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/428-factory-split-t2-factory-lock-einbinden`
Erstellt: 2026-10-24 14:30
