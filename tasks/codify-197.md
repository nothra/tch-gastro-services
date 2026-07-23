## Codify-Report: Task 197

Quelle: `tasks/review-197.md` (Runde 1 NEEDS_REWORK → Runde 2 APPROVED), `tasks/security-197.md`
(PASSED). Keine kritischen Findings; drei verallgemeinerbare Muster aus dem Rework + ein
Selbstfund beim Testen.

### Neue Regeln hinzugefügt
- `docs/factory/lessons/factory-workflow.md` (+ Index-Zeile, Trigger `/implement`,`/review` – bei
  ADR-Umsetzung) – **ADR-Status auf `Accepted` flippen, wenn der PR die ADR umsetzt.** Wegen:
  ADR-038 blieb trotz vollständiger Umsetzung auf `Proposed` (Review-Finding WICHTIG).
- `docs/factory/lessons/testing.md` (+ Index-Zeile, Trigger `/implement`,`/test`) – **Neue gesourcte
  Lib in `run-pipeline.sh` → in ALLE Temp-Repo-Scaffoldings in `run-tests.sh` mitkopieren.** Wegen:
  vergessene `tier-select.sh`-Kopie im `#101`-Test → 2 rote Tests in einem **fremden** Testblock
  (Selbstfund, Ursache erst auf den zweiten Blick sichtbar).
- `docs/factory/lessons/code-style.md` (+ Index-Zeile, Trigger `/refactor`,`/review` Clean-Code) –
  **Fail-Safe/Guard symmetrisch auf ALLE Inputs einer Vergleichsoperation.** Wegen: `select_tier`
  sicherte nur `size`, nicht `threshold` → nicht-numerischer threshold hätte still auf `light`
  gekippt (Review-Finding, hochgestuft, in Runde 2 behoben).

### Keine Änderungen nötig
- Kein neuer `scripts/checks/`-Gate: Alle drei Learnings sind Urteils-/Prozessregeln, nicht
  mechanisch fail-closed prüfbar (ein „ADR-Status ↔ Umsetzung"-Check bräuchte eine verlässliche
  ADR↔PR-Zuordnung; hoher Aufwand, geringe Trefferquote – YAGNI).
- Keine `CLAUDE.md`-/Guideline-Änderung: die Muster sind projekt-/harness-spezifisch, gehören in
  `lessons/` (ADR-037), nicht in die immer geladenen Kern-Prinzipien.
- Kein Out-of-Scope-Issue: keine Folge-Arbeit, die eigenen Aufwand braucht.

### Überraschend gut funktioniert
- Die Extraktion in eine reine, sourcebare Lib (`tier-select.sh`, Muster `report-verdict.sh`) machte
  die gesamte Größen→Tier-Logik ohne echten `claude`-Lauf testbar – dadurch belegen die Tests jedes
  AK/F direkt. Muster für künftige Pipeline-Logik.
- Der unabhängige Review (3 Personas) fand den asymmetrischen Fail-Safe – genau in der Invariante,
  die den Kern der Task ausmacht; beim Selbst-Review leicht zu übersehen.

### Empfehlung für nächste Features
- Die Proxy-Schwelle (6 AK) und der Diff-Schwellwert (~150) sind Richtwerte (ADR-038, `@tradeoff`).
  Nach einigen Läufen mit `/daily-metrics` gegenprüfen (Review-Iterationen/Kosten) und ggf. im
  Team-Override justieren – nicht in den Defaults.
