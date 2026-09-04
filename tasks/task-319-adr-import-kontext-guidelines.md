# Task 319: adr-import-kontext-guidelines

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
ADR entscheiden: Lademechanismus der 5 Guidelines-Dateien im `@import`-Pfad von `CLAUDE.md`
(offener Posten aus ADR-037, herausgelöst aus dem Nachtrag zu #314). Reine
Entscheidungs-/Doku-Task – keine Umsetzung, keine inhaltliche Änderung an den Guidelines selbst.
Spec: [`docs/specs/spec-319-adr-import-kontext-guidelines.md`](../docs/specs/spec-319-adr-import-kontext-guidelines.md).

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [ ] AC1 – @import-Umgang (Mechanismus und/oder Umfang) für alle 5 Guidelines entschieden (einer der 4 Issue-Kandidaten oder begründete Kombination)
- [ ] AC2 – Begründung ohne Kosten-Messwerte prüfbar, je Kandidat mit dessen eigener Argumentationsart; keine Option vorab ausgeschlossen
- [ ] AC3 – Risiko "Gate-Regel wird durch Nicht-Laden still verletzt" explizit adressiert
- [ ] AC4 – Zusatzbefund "Lessons-Index wächst zurück" (PROJECT-CONTEXT.md) in derselben ADR mitentschieden
- [ ] AC5 – Normativer Gehalt bleibt gültig; Prosa-/Narrativ-Kürzung (Kandidat 3) ausdrücklich erlaubt, Regelverlust nicht
- [ ] AC6 – Umsetzung explizit als Folge-Task (neues Issue) benannt, nicht hier umgesetzt

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
- Granularität rollen-spezifischer Zuschnitte, falls Kandidat 2 gewählt wird → /architecture
- Grenze "geltende Regel" vs. "Vorfall-Narrativ", falls Kandidat 3 gewählt wird (Narrative sind teils die Regel-Begründung) → /architecture
- Governance-Mechanismus gegen erneutes Zurückwachsen → /architecture

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/319-adr-import-kontext-guidelines`
Erstellt: 2026-09-04 19:35
