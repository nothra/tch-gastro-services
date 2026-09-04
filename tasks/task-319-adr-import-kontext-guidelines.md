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
@import-Umgang mit den 5 Guidelines-Dateien in `CLAUDE.md` entscheiden **und umsetzen**
(offener Posten aus ADR-037, herausgelöst aus dem Nachtrag zu #314). Auftraggeber-Entscheidung:
abweichend von der Issue-Abgrenzung ("Umsetzung ist ein Folge-Task") liefert dieser Task ADR
**plus** vollzogene Umstellung – die Trennung hat den Punkt bei ADR-037 zwei Runden liegen lassen.
Spec: [`docs/specs/spec-319-adr-import-kontext-guidelines.md`](../docs/specs/spec-319-adr-import-kontext-guidelines.md).

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
Entscheidung:
- [ ] AC1 – @import-Umgang (Mechanismus und/oder Umfang) für alle 5 Guidelines entschieden (einer der 4 Issue-Kandidaten oder begründete Kombination)
- [ ] AC2 – Begründung ohne Kosten-Messwerte prüfbar, je Kandidat mit dessen eigener Argumentationsart; keine Option vorab ausgeschlossen
- [ ] AC3 – Risiko "Gate-Regel wird durch Nicht-Laden still verletzt" explizit adressiert
- [ ] AC4 – Zusatzbefund "Lessons-Index wächst zurück" (PROJECT-CONTEXT.md) in derselben ADR mitentschieden
- [ ] AC5 – Normativer Gehalt bleibt gültig; Prosa-/Narrativ-Kürzung (Kandidat 3) ausdrücklich erlaubt, Regelverlust nicht

Umsetzung (in diesem Task):
- [ ] AC6 – Gewählter Mechanismus im Repo tatsächlich angewandt, nicht nur beschrieben
- [ ] AC7 – Neuer @import-Zeilen-/Wortstand gegen Ausgangswert (1.376 / 9.812) im PR dokumentiert
- [ ] AC8 – Verweise konsistent, kanonische Quelle je Regel eindeutig, keine toten Links
- [ ] AC9 – `.claude/**`-Anteil (falls nötig) als `tasks/patch-319.diff`, `git apply --check` grün

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
