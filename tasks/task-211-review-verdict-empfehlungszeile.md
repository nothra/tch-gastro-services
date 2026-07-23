# Task 211: review-verdict-empfehlungszeile

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung

Die Verdict-Erkennung der Pipeline liest den Review-/Security-Verdict per Volltext-Grep und
matcht dadurch auch Fließtext-Erwähnungen von `APPROVED`/`NEEDS_REWORK` (bzw. `PASSED`/
`NEEDS_FIXES`) statt der strukturierten Anker-Zeile. Bei #206 wurde so ein `NEEDS_REWORK`-Review
fälschlich als bestanden gewertet. Der Verdict soll **ausschließlich** aus der Zeile unter der
Anker-Überschrift (`## Empfehlung` bzw. `## Ergebnis`) gelesen werden – an **einem** Ort
(`report_verdict`), den beide `run-pipeline.sh`-Stellen nutzen (ADR-019 §4).

Volle Spezifikation: [`docs/specs/spec-211-review-verdict-empfehlungszeile.md`](../docs/specs/spec-211-review-verdict-empfehlungszeile.md)

## Akzeptanzkriterien

- [ ] AK1 – Verdict wird aus der ersten nicht-leeren Zeile unter `## Empfehlung` gelesen (`report_verdict review`)
- [ ] AK2 – Fließtext-Erwähnung an anderer Stelle wird ignoriert (Reihenfolge im Dokument irrelevant)
- [ ] AK3 – Leerzeilen zwischen Überschrift und Verdict werden übersprungen
- [ ] AK4 – Security-Review-Anker `## Ergebnis` → `PASSED | NEEDS_FIXES` analog
- [ ] AK5 – Phase-2-Review-Loop nutzt die Anker-Logik (kein Volltext-`grep -q "APPROVED"`)
- [ ] AK6 – Security-Gate nutzt die Anker-Logik (kein Volltext-`grep -q "NEEDS_FIXES"`)
- [ ] AK7 – Verdict-Logik nur an einem Ort (`report_verdict`), beide run-pipeline-Stellen rufen sie auf
- [ ] AK8 – Shell-Test-Suite grün; Mock-Fixtures tragen den Anker; „letztes Vorkommen"-Test durch Anker-Test ersetzt
- [ ] F1 – Fehlender Anker → leeres Verdict (fail-closed, kein Volltext-Fallback)
- [ ] F2 – Anker-Zeile ohne gültiges Token → leeres Verdict
- [ ] F3 – Fehlende Report-Datei → leerer stdout, Exit 0
- [ ] F4 – Anker-Zeile mit beiden Tokens (z. B. Template kopiert) → leeres Verdict (fail-closed)

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

Betroffene Stellen:
- `scripts/lib/report-verdict.sh::report_verdict()` – anker-basiert statt Volltext-`grep … | tail -1`
- `scripts/run-pipeline.sh:428` (Review-Loop) und `:460` (Security-Gate) → `report_verdict` nutzen
- `scripts/checks/tests/run-tests.sh` – Tests + Report-Mock-Fixtures (Anker ergänzen)

Skill-spezifische Anker: review → `## Empfehlung` (`APPROVED|NEEDS_REWORK`),
security-review → `## Ergebnis` (`PASSED|NEEDS_FIXES`). Nur POSIX-Regex / portables `awk`
(clean-code.md „Portabilität in Gate-Skripten"). Kein ADR-Trigger erkennbar (Bugfix innerhalb
der bestehenden ADR-019-§4-Absicht) → `/architecture` voraussichtlich nicht nötig.

## Offene Fragen

_Keine – fehlender Anker = fail-closed; erste nicht-leere Zeile nach der Überschrift zählt
(mit Entwickler geklärt, 2026-07-23)._

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `fix/211-review-verdict-empfehlungszeile`
Erstellt: 2026-07-23 20:10
