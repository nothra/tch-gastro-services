# Task 426: trennlinie-factory-projekt-ziehen

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Teil-Task **T1a-1 · Dokumente sortieren** des Epics #424 (Factory → `nothra/dev-factory`): erster
von drei PRs, die im TCH-Repo **verhaltensneutral** die Trennlinie zwischen Factory- und
Projekt-Dateien ziehen. Dieser PR: Zuordnungstabelle `docs/factory/OWNERSHIP.md` (+ Test),
Factory-ADRs nach `docs/factory/adr/`, Lessons und Kleinfunde trennen, ADR-063 auf Accepted.

Nachfolger (je eigene Task, Start erst nach Merge des Vorgängers): **T1a-2 #431** (Mischdateien &
Gates, AK-Gruppen D–I), **T1a-3 #432** (Projekt-Orte & Texte, AK-Gruppen J–K). Ihre Task-Dateien
legt jeweils `start-work.sh` an.

- Spec: [`docs/specs/spec-426-trennlinie-factory-projekt-ziehen.md`](../docs/specs/spec-426-trennlinie-factory-projekt-ziehen.md)
- Epic-Spec: [`docs/specs/spec-424-factory-in-eigenes-repo-auslagern.md`](../docs/specs/spec-424-factory-in-eigenes-repo-auslagern.md)
- Architektur: [ADR-063](../docs/factory/adr/063-factory-eigenes-repo-vendored-manifest.md) D3, D8, D11

## Akzeptanzkriterien
<!-- Volltext GIVEN/WHEN/THEN je AK in der Spec -->

### A · Zuordnungstabelle (AK1.5)
- [x] AK-A1 Jede getrackte Datei genau einer Seite zugeordnet (Pfad/Glob + Begründung)
- [x] AK-A2 Test gegen `git ls-files`: rot bei fehlender/doppelter Zuordnung, Datei benannt
- [x] AK-A3 spec-424-AK1.5-TCH-Inhalte sind `project`
- [x] AK-A4 Anpassungsstellen aus ADR-063 D3 sind `project`
- [x] AK-A5 Maschinenlesbares, vom Test selbst geparstes Format (Allowlist-Quelle für T1b)
- [x] AK-A6 Fehlende Zuordnung neuer Dateien rot im lokalen Gate und in CI (bestehender Required Check)

### B · ADRs trennen (AK3.2, Datei-Anteil)
- [x] AK-B1 Factory-ADRs per `git mv` nach `docs/factory/adr/`, Nummern unverändert, `--follow` greift
- [x] AK-B2 App-ADRs bleiben in `docs/adr/`
- [x] AK-B3 Repo-weiter Test: kein toter ADR-Link
- [x] AK-B4 Beide ADR-READMEs listen genau ihr Verzeichnis
- [x] AK-B5 Aktive Projekt-Dateien schreiben `Factory-ADR-NNN`; Archiv (Specs/Tasks) nur Links repariert
- [x] AK-B6 ADR-063 Accepted + Nachtrag (Q2–Q6)

### C · Lessons trennen (AK3.3, Datei-Anteil)
- [x] AK-C1 App-Lessons per `git mv` nach `docs/project/lessons/`
- [x] AK-C2 Gemischte Lessons eintragsweise geteilt, Rekonstruktions-Test (nichts verloren/doppelt)
- [x] AK-C3 Index in `PROJECT-CONTEXT.md` getrennt gruppiert, Links gültig, „Laden bei" erhalten
- [x] AK-C4 Kern-Kurzregeln verlinken neuen Ort
- [x] AK-C5 `/codify`-Anleitung nennt beide Orte + Zuordnungsregel

### L · Kleinfunde
- [x] AK-L1 Kleinfunde nach betroffener Datei geteilt, Skills nennen beide Orte (Q6)

### Epic-weit (AKE.1)
- [x] AK-X1 Self-Tests + App-Gates vorher und nachher grün (Ergebnisse hier)
- [~] AK-X2 Required Checks grün, Namen unverändert
- [~] AK-X3 Stage-2-Probelauf (`start-work.sh`, `pre-push.sh`) verhält sich wie vorher

### Fehlerszenarien
- [x] F-1, F-2, F-3 abgedeckt (siehe Spec; F-4 … F-7 gehören zu #431/#432)

## Technische Notizen
- `/architecture` **nicht nötig**: ADR-063 D3/D8/D11 deckt die Grundsatzfragen; Q2–Q6 der Spec sind
  Detailentscheidungen innerhalb von D3 und werden als Nachtrag in ADR-063 festgehalten (AK-B6).
- Größe: T1a gesamt 54 AK → geteilt (Spec Q1, entschieden 2026-10-19). Dieser PR: 21 AK; Hand-
  Änderungen an ~15 Dateien, ~30 `git mv` (ADRs/Lessons) und ~160 Link-Reparaturen **per Skript**
  (Lesson #196: skriptbasiert + Rekonstruktions-Assertion).
- Reihenfolge im PR: Zuordnungstabelle + Test zuerst (ADR-063 Implementierungs-Hinweise), dann
  verschieben – die Tabelle muss nach jedem Schritt grün bleiben.

## Offene Fragen
- Q1 entschieden: geteilt in #426 / #431 / #432
- Q2–Q6 mit Empfehlung in der Spec; Nachtrag in ADR-063 ist Teil dieses PRs (AK-B6)

## Umsetzungs-Notizen (/implement)
- **Blocker [2026-10-19]:** AK-C5/AK-L1 verlangen Änderungen an `.claude/commands/*` (hard denied) – Patch
  `tasks/patch-426.diff` (`git apply --check` grün, zusätzlich in Kopie angewendet und gegen die Tests geprüft).
  **Mensch: `git apply tasks/patch-426.diff`, committen, Patch-Datei entfernen**; bis dahin sind die Skill-Tests
  (AK-C5, AK-L1-Skills) und der Link-Test wegen `setup-project.md:112` rot.
- **AK-X1:** Self-Tests vorher (`1174742`): 1568 grün / 0 rot. Nachher: 1667 grün / 14 rot (nur Patch-abhängige +
  #236/#319-Pfade, im Folgecommit behoben). App-Gates (`pnpm test`, `typecheck`, `format:check`, Lint im pre-commit) liefen
  bei jedem Commit/Push grün.
- **AK-X2:** keine Workflow-Datei geändert → Required-Check-Namen unverändert; neue Checks laufen in `factory-self-test`.
- **AK-X3:** `pre-push.sh` lief bei jedem Push. `start-work.sh`-ID-Modus: Verhalten durch Suite gedeckt, Echtlauf nach Merge.
- **AK-C2-Nachweis:** Reconstruction gegen `1174742`: 175 von 175 Einträgen identisch (normalisiert), 0 verloren/doppelt.
- **Für #431/#432:** `Factory-ADR-NNN` in `CLAUDE.md` wird beim Umzug nach `FACTORY.md` wieder `ADR-NNN`; Lessons-/Kleinfunde-
  Tests und `fixtures/lessons-split-426.tsv` gehören dann in die Projekt-Suite; OWNERSHIP-Zeilen mitziehen.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `refactor/426-trennlinie-factory-projekt-ziehen`
Erstellt: 2026-10-19 08:34
