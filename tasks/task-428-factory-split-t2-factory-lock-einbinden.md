# Task 428: factory-split-t2-factory-lock-einbinden (T2a)

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
(v0.6.0) per `factory.lock` ein. **Geteilt am 2026-10-24:** diese Task ist T2a; Fund-Ablage + Neuprojekt (AK2.7, AK2.9–AK2.13, F8) sind T2b = #441.
Detail-Spec: [spec-428](../docs/specs/spec-428-factory-versioniert-per-factory-lock-einbinden.md);
Technik: [ADR-063](../docs/factory/adr/063-factory-eigenes-repo-vendored-manifest.md) D1, D2, D4, D7, D10.

## Akzeptanzkriterien
> AK-Volltext steht in der Spec (eine Quelle, kein Drift). Hier nur die Kennungen zum Abhaken.
- [ ] AK2.1a–c Manifest `factory.lock`, Hashes stimmen, Besitz eindeutig
- [ ] AK2.2a–d, AK2.4b Abholen atomar; Update-PR (täglich/manuell), kein PR ohne neuere Version
- [ ] AK2.3, AK2.3b Anpassungsstellen unberührt; zusammengesetzte Dateien neu zusammengesetzt
- [ ] AK2.4, F3 Update-PR löst Gates aus, nie Auto-Merge, höchstens ein offener PR
- [ ] AK2.5a–d, AK2.6, F2, F7 Änderungs-Gate lokal + CI (`factory-integrity`), Update besteht es
- [ ] AK2.8, F1, F4 Offline-Betrieb; nichts halb aktualisiert
- [ ] AK2.14a–c Erst-Einbindung TCH, Abweichungs-Dokumentation, Ruleset-Nachtrag
- [ ] AK2.15a–d Besitz im Konsumenten aus `factory.lock`, `OWNERSHIP.md` entfällt (ADR-063 Q7)
- [ ] AK2.16a–b ausgelieferte Self-Test-Suite konsumenten-neutral, Factory-Tests getrennt (Q8)
- [ ] AKE.1, AKE.2 Pipeline unverändert, beide Repos grün
- [ ] FS-T2.1–FS-T2.4 Manifest ungültig, Hash-Abweichung, Token fehlt, Tag ohne Release

## Technische Notizen
Entscheidungen: [ADR-063 Nachtrag 2026-10-24](../docs/factory/adr/063-factory-eigenes-repo-vendored-manifest.md) (Q1–Q9).
- **Reihenfolge:** (1) Issue/PR in `nothra/dev-factory`: `factory-sync.sh`-Sync-Modus (atomar, Temp-Dir, Bash 3.2, `shasum -a 256`), `factory-integrity-check.sh` + CI-Job, `factory-update.yml`, Ownership-Modus (Q7), Suite-Schnitt (Q8); `OWNERSHIP.md` wird dort projekteigen → Release **v0.7.0**. (2) TCH-PR #428: Bootstrap per Tag-Tarball + `FACTORY_DIR` (Q9), `factory.lock`, `OWNERSHIP.md` löschen, Verweise umstellen, Log-Beleg (AK2.14b). (3) Nach Merge: Ruleset-Eintrag (Q4, menschlich), ADR-029-Nachtrag.
- **Messung (2026-10-24):** v0.6.0 hat 113 Dateien, TCH 111 Factory-Dateien; 37 identisch, 50 nur durch `#nr`-Qualifizierung verschieden, 24 mit Textänderung (groß: `run-tests.sh` ~1000 Zeilen, `OWNERSHIP.md`, ADR-063, `OPERATING.md`); zusätzlich in v0.6.0: `factory-release-check.sh`, `factory-release-manifest.sh`.
- **Änderungsstopp:** Seite-`factory`-Dateien in TCH nicht mehr ändern; Ausnahme dieser ADR-Nachtrag (wandert mit v0.7.0 ins Factory-Repo).
- **Tests (TDD):** Sync-Abbruch per Stub im `PATH` (Messung brechen, Lesson #319); je Gate-Stufe Mutationsbeleg; Fixture-Release offline.

## Offene Fragen
- [x] Q1 Reihenfolge: Factory-PR → v0.7.0 → TCH-PR (ADR-063 Nachtrag Q1)
- [x] Q2 Erst-Einbindung = Wechsel auf v0.7.0, Änderungsstopp, Log-Beleg (Nachtrag Q2/Q9)
- [ ] Q3 `FACTORY_SYNC_TOKEN` (PAT) anlegen – menschlicher Schritt vor erstem Workflow-Lauf
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
