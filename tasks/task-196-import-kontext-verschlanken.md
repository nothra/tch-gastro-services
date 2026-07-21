# Task 196: import-kontext-verschlanken

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Immer geladener `@import`-Kontext (2.068 Zeilen) verschlanken: Der Stolperstein-Volltext
(45 Einträge, ~978 Zeilen in `PROJECT-CONTEXT.md`) wandert in nicht-importierte, thematisch
getrennte Dateien unter `docs/factory/lessons/`. Im @import-Pfad bleiben nur ein schlanker
Index + ~3–5 taskübergreifende Kern-Kurzregeln. `/codify` wird angepasst, damit künftige
Learnings in `lessons/` + Index geschrieben werden (kein erneutes Zuwachsen).

Spec: `docs/specs/spec-196-import-kontext-verschlanken.md`

Entscheidungen (aus /requirements):
- Inline-Rest: Index **plus** kleine Kern-Kurzregeln (Lösungsidee #3).
- Index-Ort: in `PROJECT-CONTEXT.md` (bleibt @import).
- lessons/-Split-Granularität: wird in `/architecture` festgelegt.

## Akzeptanzkriterien
- [ ] AC1 – Stolperstein-Volltext nicht mehr im @import-Pfad, sondern in `docs/factory/lessons/`
- [ ] AC2 – @import-Reduktion messbar & im PR dokumentiert (vorher 2.068 Zeilen)
- [ ] AC3 – Alle 45 Learnings verlustfrei erhalten (Volltext in lessons/ + Index-Zeile), Count 45→45
- [ ] AC4 – ~3–5 Kern-Kurzregeln inline, je mit Verweis auf ihre Lesson-Datei
- [ ] AC5 – `/codify` schreibt künftig in lessons/ + Index (via `tasks/patch-196.diff`, Human-Apply)
- [ ] AC6 – Querverweise/kanonische Quellen konsistent, keine toten Verweise

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `improvement/196-import-kontext-verschlanken`
Erstellt: 2026-07-21 07:22
