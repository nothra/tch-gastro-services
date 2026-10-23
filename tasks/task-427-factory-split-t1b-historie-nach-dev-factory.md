# Task 427: factory-split-t1b-historie-nach-dev-factory

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Teil-Task T1b des Epics #424: die Factory-Dateien mit Historie in das öffentliche Repo
`nothra/dev-factory` herauslösen, vor dem ersten Push scannen, das Repo arbeitsfähig machen
(Ruleset, CI, eigene Config) und `v0.6.0` veröffentlichen. TCH bleibt unverändert.

Spec: [`docs/specs/spec-427-factory-nach-dev-factory-herausloesen.md`](../docs/specs/spec-427-factory-nach-dev-factory-herausloesen.md)
· Architektur: ADR-063 D5, D6, D9. **Manuell in Stage 2** – der Bootstrap-Push ist nicht
rückholbar und braucht die Freigabe des Entwicklers im Chat (B4).

## Akzeptanzkriterien
<!-- Volltext in der Spec -->
- [ ] A1 Pfadliste = `ownership-check.sh --list factory` + Altpfade, erzeugt, reproduzierbar
- [ ] A2 Kein Pfad außerhalb der Liste in der gesamten Historie (kein App-Code, keine Tasks/Specs/Projekt-Doku)
- [ ] A3 `git log --follow` zeigt Commits vor der Umbenennung (31 Dateien mit Altpfad)
- [ ] A4 `#<nr>` in Commit-Messages zu `nothra/tch-gastro-services#<nr>` ausgeschrieben
- [ ] A5 Autor/Datum der Commits unverändert
- [ ] B1 `gitleaks` über alle Commits ohne Fund (oder belegte Falsch-Positive)
- [ ] B2 E-Mail-Muster in Blob-Inhalten nur aus Erlaubt-Liste
- [ ] B3 Scan-Bericht in Task-Datei und PR-Body #435
- [ ] B4 Bootstrap-Push erst nach Freigabe im Chat
- [ ] C1 Keine TCH-Begriffe auf `main` außer dokumentierten erlaubten Stellen
- [ ] C2 Bereinigung ändert nur Wortlaut, keine Regel/Entscheidung/Prüflogik
- [ ] C3 TCH-Issue-Verweise im Inhalt qualifiziert
- [ ] D1 Öffentliches Repo `nothra/dev-factory` mit Factory-Inhalt + README
- [ ] D2 Eigene `factory.config.yml` (lint = `bash -n`), `CLAUDE.md`, `PROJECT-CONTEXT.md`, `OWNERSHIP.md`
- [ ] D3 CI im Factory-Repo grün (Self-Tests angepasst, nicht übersprungen)
- [ ] D4 Ruleset `protect-main` direkt nach dem Bootstrap-Push
- [ ] D5 Lokale Gates im frischen Klon grün ohne pnpm/Node/DB
- [ ] E1 Art- und Aspekt-Labels im Factory-Repo angelegt
- [ ] E2 Wegwerf-Probe `start-work.sh` → Issue/Branch/Worktree/Task/Draft-PR, danach aufgeräumt
- [ ] F1 Tag + Release `v0.6.0` mit Release Notes inkl. „Breaking"
- [ ] F2 Release-Manifest (Pfad + SHA-256) als Asset, stimmt mit Tag überein
- [ ] F3 `CHANGELOG.md` mit `v0.6.0`; Version in `FACTORY.md` = Tag
- [ ] X1 TCH-PR ändert keine Factory-Datei; Gates vor/nach grün
- [ ] X2 Herauslösen nur auf frischem Klon

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
Q1–Q6 in der Spec, für `/architecture`: Release-Manifest-Format, Ort des Werkzeugs,
ADR-063-Nachtrag, Besitz im Factory-Repo, Reihenfolge der Bereinigung, ggf. Teilung (24 AK).

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/427-factory-split-t1b-historie-nach-dev-factory`
Erstellt: 2026-10-23 17:01
