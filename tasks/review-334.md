# Review: Task 334

> Runde 3 (2026-09-12), nach der Rework-Runde auf den Runde-2-Fund (Git-Identität in
> `telemetry_persist()`s Commit). Unabhängig neu geprüft, nicht nur „laut Commit-Message
> übernommen": Bash-Suite frisch laufen lassen (1530/1530 grün), Diff Zeile für Zeile gegen
> `origin/main...HEAD` gelesen, und der reale CI-Status des PR abgerufen –
> `factory-self-test` ist jetzt **grün in GitHub Actions selbst**
> (`https://github.com/nothra/tch-gastro-services/actions/runs/34672136333/job/103495359924`,
> ebenso `lint`, `test`, `config-validation`, `pr-closes-issue`, `issue-sync`, CodeQL/Analyze,
> Vercel-Deploy). Das ist die stärkste verfügbare Bestätigung für den Runde-2-Fix: nicht nur
> die lokale/Docker-Simulation, sondern der tatsächlich gatende Check selbst.

## Kritische Findings (müssen behoben werden)

*(keine)*

## Wichtige Findings (sollten behoben werden)

*(keine)*

## Nitpicks (optional)

*(keine neuen – die beiden Runde-1-Nitpicks/Wichtig-Findings und der Runde-2-Fund sind
behoben, siehe Kopfnotiz und Historie unten)*

## Positives

- **Alle drei bisherigen Kritisch-Funde sind nicht nur behauptet, sondern empirisch
  verifiziert behoben:**
  - Runde 1 (CSV-Leck in zwei Fail-Open-Zweigen, Kosten-Unterzählung bei Retry) – per
    Mutationstest bestätigt (Fix zurückgenommen → genau der erwartete Test kippt).
  - Runde 2 (Git-Identität) – RED→GREEN in einem frischen `ubuntu:24.04`-Container gegen
    die reale Commit-Zeile gezeigt, **und** jetzt zusätzlich durch den echten grünen
    GitHub-Actions-Lauf bestätigt. Drei unabhängige Nachweis-Ebenen für denselben Fix.
- Die Testsuite ist um sinnvolle, kausal geprüfte Guards gewachsen (Index-nicht-leer-Zweig,
  Commit-schlägt-fehl-Zweig via deterministischem `pre-commit`-Hook, Retry-Summe,
  explizite Identität am Commit) – kein reiner Wiring-Grep, sondern Verhalten gegen den
  echten Orchestrator.
- Namenskonsistenz (`telemetry_persist`) und ADR-049-Drift (veralteter Funktionsname)
  vollständig durchgezogen, keine Reste mehr im Repo (`grep -rn 'persist_telemetry\b'`
  liefert nichts außer der historischen Finding-Beschreibung in diesem Report).
- Alle 8 Akzeptanzkriterien der Task-Datei sind abgehakt und decken sich mit dem, was die
  Tests tatsächlich prüfen (nicht nur behauptet – jedes AK hat einen benannten Test-Anker).
- ADR-049 steht auf `Accepted`, keine offene Drift zwischen ADR-Text und gebautem Verhalten.
- Whitelist-Projektion, Format-Drift-Guard und Fail-open-Verhalten bleiben über alle drei
  Runden hinweg unverändert korrekt – die Rework-Runden haben ausschließlich die neu
  gefundenen Lücken adressiert, ohne die bereits verifizierten Garantien zu beschädigen.

## Empfehlung

APPROVED
