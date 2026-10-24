# Task 428: factory-split-t2-factory-lock-einbinden

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
(v0.6.0) per `factory.lock` ein. Detail-Spec: [spec-428](../docs/specs/spec-428-factory-versioniert-per-factory-lock-einbinden.md);
Technik: [ADR-063](../docs/factory/adr/063-factory-eigenes-repo-vendored-manifest.md) D1, D2, D4, D7, D10.

## Akzeptanzkriterien
> AK-Volltext steht in der Spec (eine Quelle, kein Drift). Hier nur die Kennungen zum Abhaken.
- [ ] AK2.1a–c Manifest `factory.lock`, Hashes stimmen, Besitz eindeutig
- [ ] AK2.2a–d, AK2.4b Abholen atomar; Update-PR (täglich/manuell), kein PR ohne neuere Version
- [ ] AK2.3, AK2.3b Anpassungsstellen unberührt; zusammengesetzte Dateien neu zusammengesetzt
- [ ] AK2.4, F3 Update-PR löst Gates aus, nie Auto-Merge, höchstens ein offener PR
- [ ] AK2.5a–d, AK2.6, F2, F7 Änderungs-Gate lokal + CI (`factory-integrity`), Update besteht es
- [ ] AK2.8, F1, F4 Offline-Betrieb; nichts halb aktualisiert
- [ ] AK2.9–AK2.13b, F8 Fund-Ablage ins Factory-Repo, Credential-/PII-Sperre, Fallback in Task-Datei
- [ ] AK2.7a–d Neuprojekt via `--init` (Self-Test offline + einmal echt)
- [ ] AK2.14a–c Erst-Einbindung TCH, Abweichungs-Dokumentation, Ruleset-Nachtrag
- [ ] AKE.1, AKE.2 Pipeline unverändert, beide Repos grün
- [ ] FS-T2.1–FS-T2.4 Manifest ungültig, Hash-Abweichung, Token fehlt, Tag ohne Release

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

## Offene Fragen
- [ ] Q1 Wo entstehen die neuen Dateien (Factory-Repo + v0.7.0 vor dem TCH-PR)? – Zuschnitt
- [ ] Q2 Erst-Einbindung: TCH-Fassung auf bereinigte v0.6.0 setzen oder Delta zuerst zurückgeben?
- [ ] Q3 `FACTORY_SYNC_TOKEN` (PAT) anlegen – menschlicher Schritt
- [ ] Q4 `factory-integrity` im Ruleset – Zeitpunkt relativ zum Merge
- [ ] Q5 Echter Neuprojekt-Nachweis: Wegwerf-Repo, Freigabe nötig
- [ ] Q6 35 AK > Turn-Limit-Schwelle: T2 in T2a/T2b teilen?
- [ ] Q7 Skill-Text-Änderungen (AK2.12) sind Factory-PR (folgt aus Q1)

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/428-factory-split-t2-factory-lock-einbinden`
Erstellt: 2026-10-24 14:30
