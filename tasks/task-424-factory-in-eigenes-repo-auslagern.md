# Task 424: factory-in-eigenes-repo-auslagern

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
**Epic.** Die dm Development Factory wird aus dem TCH-Repo in ein eigenes privates GitHub-Repo unter
`nothra` ausgelagert und als wiederverwendbares, versioniertes Werkzeug betrieben. TCH wird ihr
erster Konsument. Spec: [`docs/specs/spec-424-factory-in-eigenes-repo-auslagern.md`](../docs/specs/spec-424-factory-in-eigenes-repo-auslagern.md).

Umsetzung in drei Teil-Tasks, nacheinander, je eigenes Issue/Spec/PR (Issues werden nach
`/architecture` angelegt, damit der Schnitt die ADR berücksichtigt):
- **T1 · Werkzeugkasten packen:** Factory-Repo mit Historie, generischer Inhalt, Versionen, eigene Pipeline
- **T2 · Werkzeug abholen:** versionierte Einbindung, automatischer Update-PR, Änderungs-Gate, Neuprojekt-Nachweis
- **T3 · Umziehen:** Factory-Issues, -ADRs, -Lessons ins Factory-Repo; TCH-Doku verweist dorthin

Dieser Epic-PR liefert **nur** Spec + ADR (Phase 1); die Umsetzung läuft in den Teil-Tasks.

## Akzeptanzkriterien
<!-- Epic-Ebene; Detail-AK in der Spec (AK1.x–AK3.x, AKE.x, F1–F7) -->
- [ ] Spec mit Akzeptanzkriterien für T1–T3 liegt vor und ist mit dem Entwickler abgestimmt
- [ ] ADR zu Verteilungsmechanik, Historienübertrag, Versionsschema und Dateitrennung (Spec Q1–Q5) liegt vor
- [ ] Teil-Issues T1–T3 sind angelegt und in der Spec verlinkt
- [ ] T1 gemergt (AK1.1–AK1.8)
- [ ] T2 gemergt (AK2.1–AK2.8)
- [ ] T3 gemergt (AK3.1–AK3.5)
- [ ] Epic-weite AK erfüllt (AKE.1, AKE.2)

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

## Offene Fragen
Siehe Spec, Abschnitt „Offene Fragen" (Q1–Q6 für `/architecture` bzw. Detail-Specs).

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/424-factory-in-eigenes-repo-auslagern`
Erstellt: 2026-10-19 04:50
