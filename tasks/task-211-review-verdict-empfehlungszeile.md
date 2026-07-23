# Task 211: review-verdict-empfehlungszeile

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [x] Codify ausgeführt
- [x] Fertig / PR erstellt

## Beschreibung

Die Verdict-Erkennung der Pipeline liest den Review-/Security-Verdict per Volltext-Grep und
matcht dadurch auch Fließtext-Erwähnungen von `APPROVED`/`NEEDS_REWORK` (bzw. `PASSED`/
`NEEDS_FIXES`) statt der strukturierten Anker-Zeile. Bei #206 wurde so ein `NEEDS_REWORK`-Review
fälschlich als bestanden gewertet. Der Verdict soll **ausschließlich** aus der Zeile unter der
Anker-Überschrift (`## Empfehlung` bzw. `## Ergebnis`) gelesen werden – an **einem** Ort
(`report_verdict`), den beide `run-pipeline.sh`-Stellen nutzen (ADR-019 §4).

Volle Spezifikation: [`docs/specs/spec-211-review-verdict-empfehlungszeile.md`](../docs/specs/spec-211-review-verdict-empfehlungszeile.md)

## Akzeptanzkriterien

- [x] AK1 – Verdict wird aus der ersten nicht-leeren Zeile unter `## Empfehlung` gelesen (`report_verdict review`)
- [x] AK2 – Fließtext-Erwähnung an anderer Stelle wird ignoriert (Reihenfolge im Dokument irrelevant)
- [x] AK3 – Leerzeilen zwischen Überschrift und Verdict werden übersprungen
- [x] AK4 – Security-Review-Anker `## Ergebnis` → `PASSED | NEEDS_FIXES` analog
- [x] AK5 – Phase-2-Review-Loop nutzt die Anker-Logik (kein Volltext-`grep -q "APPROVED"`)
- [x] AK6 – Security-Gate nutzt die Anker-Logik (kein Volltext-`grep -q "NEEDS_FIXES"`)
- [x] AK7 – Verdict-Logik nur an einem Ort (`report_verdict`), beide run-pipeline-Stellen rufen sie auf
- [x] AK8 – Shell-Test-Suite grün; Mock-Fixtures tragen den Anker; „letztes Vorkommen"-Test durch Anker-Test ersetzt
- [x] F1 – Fehlender Anker → leeres Verdict (fail-closed, kein Volltext-Fallback)
- [x] F2 – Anker-Zeile ohne gültiges Token → leeres Verdict
- [x] F3 – Fehlende Report-Datei → leerer stdout, Exit 0
- [x] F4 – Anker-Zeile mit beiden Tokens (z. B. Template kopiert) → leeres Verdict (fail-closed)

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

### Umsetzung (/implement, 2026-07-23)

- `report_verdict()` liest nun anker-basiert per `awk`: erste nicht-leere Zeile nach der
  verbindlichen Überschrift; genau **ein** gültiges Token → Verdict, sonst leer (fail-closed).
  Ersetzt den alten `grep -oE … | tail -1` („letztes Vorkommen gewinnt"). `index()` +
  `[[:space:]]` sind BSD/GNU-awk-portabel.
- `run-pipeline.sh`: Phase-2-Review-Loop (vormals `grep -q "APPROVED"`) und Security-Gate
  (vormals `grep -q "NEEDS_FIXES"`) rufen jetzt `report_verdict review|security-review` auf.
  Die nur noch dort genutzten Hilfsvariablen `REVIEW_FILE`/`SECURITY_FILE` sind entfallen.
- Tests (`run-tests.sh`): #91-Verdict-Block auf den Anker-Contract migriert (AK1–AK4, F1–F4),
  „letztes Vorkommen"-Test durch F2/F4-Fail-closed-Tests ersetzt; falsche Review-Fixtures
  (`## Ergebnis` statt `## Empfehlung`, anker-lose Mocks) korrigiert; zwei `--dry-run`-Mocks
  (`VERDICT: APPROVED` → `## Empfehlung\nAPPROVED`) angepasst; AK5/AK6-Wiring-Guards ergänzt
  (Volltext-Greps sind aus `run-pipeline.sh` verschwunden). Suite: 399 grün, 0 rot.
- ADR-Trigger-Check: keine der vier Kategorien greift (Bugfix in bestehender ADR-019-§4-Absicht)
  → kein `/architecture`.

### Review (/review, 2026-07-23)

APPROVED nach einer Rework-Runde. Zwei WICHTIG-Findings in-scope behoben: ADR-019-§4-Drift
(Mechanik-Beschreibung auf Anker-Logik aktualisiert) und Testlücke AK6 (Spiegel-Assertion
`security-14` ergänzt). Out-of-Scope-Fund (Contract-Drift-Guard) autonom als Issue **#214**
angelegt. Details: [`review-211.md`](review-211.md).

### Refactoring (/refactor, 2026-07-23)

Kein neues Verhalten. Einzige Änderung: `token_a`/`token_b` → `pass_token`/`fail_token`
(awk `a`/`b`/`hasA`/`hasB` → `pass`/`fail`/`hasPass`/`hasFail`) – benennt die reale
Pass/Fail-Semantik der zwei Verdict-Tokens (Review-Nitpick). Generalisierung auf eine
Token-Liste bewusst verworfen (Spec schließt neue Tokens aus → YAGNI). Suite: 402 grün.

## Offene Fragen

_Keine – fehlender Anker = fail-closed; erste nicht-leere Zeile nach der Überschrift zählt
(mit Entwickler geklärt, 2026-07-23)._

PR-Shepherd 2026-07-23: Merge freigegeben – alle Gates grün (CI: lint/test/analyze/CodeQL/
factory-self-test/issue-sync/pr-closes-issue pass), Branch level mit main (kein Rebase nötig),
keine offenen Review-Kommentare, Ruleset verlangt 0 Approvals (ADR-029). PR #213.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `fix/211-review-verdict-empfehlungszeile`
Erstellt: 2026-07-23 20:10
