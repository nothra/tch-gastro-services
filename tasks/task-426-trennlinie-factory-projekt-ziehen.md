# Task 426: trennlinie-factory-projekt-ziehen

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Teil-Task **T1a** des Epics #424 (Factory → `nothra/dev-factory`): Im TCH-Repo die Trennlinie
zwischen Factory- und Projekt-Dateien ziehen, **verhaltensneutral** – Zuordnungstabelle
`docs/factory/OWNERSHIP.md`, keine Mischdateien mehr, TCH-Spezifika an projekteigene Orte,
Factory-ADRs nach `docs/factory/adr/`.

- Spec: [`docs/specs/spec-426-trennlinie-factory-projekt-ziehen.md`](../docs/specs/spec-426-trennlinie-factory-projekt-ziehen.md)
- Epic-Spec: [`docs/specs/spec-424-factory-in-eigenes-repo-auslagern.md`](../docs/specs/spec-424-factory-in-eigenes-repo-auslagern.md)
- Architektur: [ADR-063](../docs/adr/063-factory-eigenes-repo-vendored-manifest.md) D3, D8, D11

## Akzeptanzkriterien
<!-- Volltext GIVEN/WHEN/THEN je AK in der Spec -->

### A · Zuordnungstabelle (AK1.5)
- [ ] AK-A1 Jede getrackte Datei genau einer Seite zugeordnet (Pfad/Glob + Begründung)
- [ ] AK-A2 Test gegen `git ls-files`: rot bei fehlender/doppelter Zuordnung, Datei benannt
- [ ] AK-A3 spec-424-AK1.5-TCH-Inhalte sind `project`
- [ ] AK-A4 Anpassungsstellen aus ADR-063 D3 sind `project`
- [ ] AK-A5 Maschinenlesbares, vom Test selbst geparstes Format (Allowlist-Quelle für T1b)
- [ ] AK-A6 Fehlende Zuordnung neuer Dateien rot im lokalen Gate und in CI (bestehender Required Check)

### B · ADRs trennen (AK3.2, Datei-Anteil)
- [ ] AK-B1 Factory-ADRs per `git mv` nach `docs/factory/adr/`, Nummern unverändert, `--follow` greift
- [ ] AK-B2 App-ADRs bleiben in `docs/adr/`
- [ ] AK-B3 Repo-weiter Test: kein toter ADR-Link
- [ ] AK-B4 Beide ADR-READMEs listen genau ihr Verzeichnis
- [ ] AK-B5 Aktive Projekt-Dateien schreiben `Factory-ADR-NNN`; Archiv (Specs/Tasks) nur Links repariert
- [ ] AK-B6 ADR-063 Accepted + Nachtrag (Q2–Q6)

### C · Lessons trennen (AK3.3, Datei-Anteil)
- [ ] AK-C1 App-Lessons per `git mv` nach `docs/project/lessons/`
- [ ] AK-C2 Gemischte Lessons eintragsweise geteilt, Rekonstruktions-Test (nichts verloren/doppelt)
- [ ] AK-C3 Index in `PROJECT-CONTEXT.md` getrennt gruppiert, Links gültig, „Laden bei" erhalten
- [ ] AK-C4 Kern-Kurzregeln verlinken neuen Ort
- [ ] AK-C5 `/codify`-Anleitung nennt beide Orte + Zuordnungsregel

### D · `CLAUDE.md` / `FACTORY.md`
- [ ] AK-D1 Generischer Teil in `docs/factory/FACTORY.md`
- [ ] AK-D2 `CLAUDE.md` nur Imports + TCH-Regeln
- [ ] AK-D3 Jede alte Inhaltszeile in genau einer der beiden Dateien (belegt)
- [ ] AK-D4 `import-context-limit-check.sh` zählt verschachtelte Imports, Negativtest
- [ ] AK-D5 Gleicher Dauerkontext wie vorher (Liste vorher/nachher hier dokumentiert)

### E · Zusammengesetzte Dateien
- [ ] AK-E1 `settings.factory.json` + `settings.project.json`, `settings.json` inhaltsgleich zu vorher
- [ ] AK-E2 `gitignore.factory` + `.gitignore.project`, ignorierte Pfade unverändert (Probenliste)
- [ ] AK-E3 Zusammensetzen deterministisch, Test rot bei Abweichung
- [ ] AK-E4 Doku: Projekt-Fragment ändern → zusammensetzen → beide committen

### F · CI-Workflows
- [ ] AK-F1 `factory-ci.yml` nur Factory-Jobs, kein pnpm
- [ ] AK-F2 Projekteigenes `ci.yml` mit `lint`/`test`, Namen/Trigger/Inhalt unverändert
- [ ] AK-F3 Required-Check-Namen in `protect-main` vorher = nachher, alle gemeldet
- [ ] AK-F4 Deploy-/Poll-Workflows zugeordnet, rufen neue Pfade

### G · Erweiterungspunkte Git-Gates
- [ ] AK-G1 `pre-commit.d`/`pre-push.d` lexikalisch, fail-closed mit Skriptnamen
- [ ] AK-G2 Fehlendes/leeres Verzeichnis → kein Fehler
- [ ] AK-G3 Nicht ausführbare Datei → Gate rot mit Hinweis
- [ ] AK-G4 `routes-doc-check.sh` in `pre-push.d`, Drift blockiert weiter (Verhaltenstest)

### H · Gate-Kommandos aus Konfiguration
- [ ] AK-H1 `commands.*` in `factory.config.yml` mit heutigen TCH-Werten
- [ ] AK-H2 Kein pnpm-Default in `factory.defaults.yml`
- [ ] AK-H3 Gates lesen Config; Env-Override hat Vorrang; leerer Format-Wert = übersprungen
- [ ] AK-H4 Fehlendes Pflicht-Kommando → Abbruch mit Schlüsselname
- [ ] AK-H5 `config-validation-check.sh` validiert `commands.*` (Positiv/Negativ)
- [ ] AK-H6 `start-work.sh`: Install + Seed-Hinweis aus Config (Q4)

### I · Labels aus Konfiguration
- [ ] AK-I1 `labels.kinds`/`labels.aspects` in Defaults, `labels.aspects_extra` (inkl. `factory-pipeline`) in Config
- [ ] AK-I2 `git-workflow.md` beschreibt Schema, Drift-Guard prüft neue Quelle
- [ ] AK-I3 `start-work.sh --labels`/Seam verhalten sich wie vorher (Q5)

### J · TCH-Skripte und Tests
- [ ] AK-J1 `neon-reset-int.sh`, `deploy-freeze*.sh` per `git mv` nach `scripts/project/`, Aufrufer angepasst
- [ ] AK-J2 Deren Self-Tests in `scripts/project/tests/`, `run-tests.sh` ohne Verweis
- [ ] AK-J3 Projekt-Suite läuft in CI in bestehendem Required Check
- [ ] AK-J4 Testfall-Zählung vorher = Factory nachher + Projekt nachher (+ neue separat)

### K · Factory-Texte generisch
- [ ] AK-K1 Genannte Skill-/Agent-/Guideline-Texte + `OPERATING.md` ohne pnpm/Neon/Vercel/db:seed/Drizzle
- [ ] AK-K2 TCH-Abschnitte aus `OPERATING.md` in `docs/project/`
- [ ] AK-K3 Restliste der AK1.3-Begriffe auf der Factory-Seite hier dokumentiert (Eingabe für T1b)

### L · Kleinfunde
- [ ] AK-L1 Kleinfunde nach betroffener Datei geteilt, Skills nennen beide Orte (Q6)

### Epic-weit (AKE.1)
- [ ] AK-X1 Self-Tests + App-Gates vorher und nachher grün (Ergebnisse hier)
- [ ] AK-X2 Required Checks grün, Namen unverändert
- [ ] AK-X3 Stage-2-Probelauf (`start-work.sh`, `pre-push.sh`) verhält sich wie vorher

### Fehlerszenarien
- [ ] F-1 … F-7 abgedeckt (siehe Spec)

## Technische Notizen
- `/architecture` **nicht nötig**: ADR-063 D3/D8/D11 deckt die Grundsatzfragen; Q2–Q6 der Spec sind
  Detailentscheidungen innerhalb von D3 und werden als Nachtrag in ADR-063 festgehalten (AK-B6).
- Größe: 54 AK, ~60–80 Dateien von Hand + ~160 Link-Reparaturen per Skript → über der
  Turn-Limit-Schwelle (Lesson #369). Teilungsvorschlag T1a-1/-2/-3 in Spec Q1 – Entscheidung offen.

## Offene Fragen
- Q1 Weiter teilen? (Spec Q1) – **mit Ralf zu klären vor `/implement`**
- Q2–Q6 mit Empfehlung in der Spec

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `refactor/426-trennlinie-factory-projekt-ziehen`
Erstellt: 2026-10-19 08:34
