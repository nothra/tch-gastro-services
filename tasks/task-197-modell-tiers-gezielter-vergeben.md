# Task 197: modell-tiers-gezielter-vergeben

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [x] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Modell-Tiers der Pipeline gezielter vergeben, statt pauschal pro Skill. `review`,
`implement` und `bug-fix` werden **größenabhängig** getiert (kleiner Lauf → `light`,
großer → `heavy`); `security-review` bleibt bewusst fix `heavy`. Es bleibt bei zwei
Tiers (heavy=Opus 4.8 / light=Sonnet 5).

- **review:** Signal = Code-Diff gegen aktuelles `origin/main`, Schwelle ~150 Zeilen.
- **implement/bug-fix:** Signal = Proxy aus Spec/Task/ADR (Diff existiert bei Auswahl
  noch nicht), z. B. Anzahl Akzeptanzkriterien.
- Fail-safe: bei unbestimmbarem Signal immer `heavy` (kein stilles Downgrade).

Volle Spezifikation: `docs/specs/spec-197-modell-tiers-gezielter-vergeben.md`.

## Akzeptanzkriterien
- [x] AK1 – review klein (< Schwelle) → light
- [x] AK2 – review groß (>= Schwelle) → heavy
- [x] AK3 – review-Basis = aktuelles origin/main (keine Fremd-PR-Aufblähung)
- [x] AK4 – implement/bug-fix klein (Proxy < Schwelle) → light
- [x] AK5 – implement/bug-fix groß (Proxy >= Schwelle) → heavy
- [x] AK6 – security-review immer heavy + per @reason als bewusst dokumentiert
- [x] AK7 – übrige Skills + default unverändert light
- [x] AK8 – jede geänderte Knopf-Zeile trägt @reason/@tradeoff (ADR-011)
- [x] AK9 – config-validation-check bleibt grün (dynamischer Tier-Fall)
- [x] AK10 – globaler CLAUDE_MODEL-Override sticht weiterhin
- [x] AK11 – kanonische Quelle konsistent; veralteten README-Tier-Tabellen-Verweis in token-efficiency.md §6 bereinigen
- [x] AK12 – implement-Tier final (nicht mehr „testweise" in config.yml)

## Fehlerszenarien
- [x] F1 – Diff nicht bestimmbar → fail-safe heavy
- [x] F2 – Proxy nicht bestimmbar → fail-safe heavy
- [x] F3 – ungültiger Schwellwert → fail-closed im Config-Gate
- [x] F4 – yq/Config fehlt → unverändertes Bestandsverhalten

## Technische Notizen
Architektur entschieden in **ADR-038** (`docs/adr/038-groessenabhaengige-modell-tier-wahl.md`).

Kern: additives, optionales Feld `tier_by_size` je Skill; das statische `tier` bleibt als
**Fail-Safe-Fallback** (= `heavy`). Kein Sentinel → `config-validation` Regel 4a (`tier ∈
model_tiers`) bleibt unverändert grün.

Implementierungsschritte (TDD, je Schritt Test zuerst):
1. **Lib `scripts/lib/tier-select.sh` (neu):** reine Funktionen
   - `select_tier(size, threshold, fallback_tier)` → `heavy`/`light` (leer size → fallback)
   - `measure_size(signal, ...)`:
     - `diff`: `git fetch -q origin main` (best effort) → Summe added+deleted aus
       `git diff --numstat origin/main...HEAD`; Binär (`-`) überspringen; git-Fehler → leer.
     - `proxy`: AK-Checkbox-Zahl im `## Akzeptanzkriterien`-Block der Spec `docs/specs/spec-<id>-*.md`
       (awk zwischen Überschrift und nächster `## `); keine Spec/Abschnitt → leer.
2. **`run-pipeline.sh` `get_model`:** Lib sourcen; Reihenfolge CLAUDE_MODEL → tier_by_size →
   statisches tier → tier→Modell-Map. `cfg_skill_field` für `tier_by_size.signal`/`.threshold`
   (Rückgabe "null"/"" wenn nicht gesetzt → behandeln).
3. **`factory.defaults.yml`:** `tier_by_size` an `review`(diff,150) / `implement`(proxy,6) /
   `bug-fix`(proxy,6); `security-review` bleibt fix heavy + expliziter `@reason` „kein
   tier_by_size"; `@reason`/`@tradeoff` an jedem geänderten Knopf (ADR-011).
4. **`factory.config.yml`:** provisorischen `implement`-Test-Override auflösen (AK12); nur noch
   bewusste Overrides behalten.
5. **`config-validation-check.sh` Regel 4c:** wo `tier_by_size` existiert → `signal ∈
   {diff,proxy}` + `threshold` positiver Integer (fail-closed, F3). Additiv zu 4a.
6. **`token-efficiency.md` §6:** Verweis „README.md (Tier-Tabelle)" auf reale SSOT
   `factory.defaults.yml` korrigieren (AK11 – die Tabelle existiert in README.md nicht).
7. **Tests `scripts/checks/tests/run-tests.sh`:** je Signal Positiv-/Negativ-Fall (klein→light,
   groß→heavy, unbestimmbar→heavy), security-review immer heavy, CLAUDE_MODEL sticht,
   Regel-4c-Ablehnung. yq-abhängige Fälle unter dem bestehenden `HAS_YQ`-Skip.

Nicht anfassen: `model_tiers`-IDs; Tiers der übrigen Skills; kein dritter Tier.

## Offene Fragen (geklärt in ADR-038)
- [x] O1 – additives `tier_by_size` + `tier` als Fail-Safe (Gate bleibt grün)
- [x] O2 – Proxy = AK-Zahl der Spec, Default-Schwelle 6 (kalibrierbar)
- [x] O3 – Schwellwerte pro Skill in factory.defaults.yml, override-fähig
- [x] O4 – numstat added+deleted, Binär übersprungen, keine Ausschlüsse in v1 (Über-Zählen → heavy)

## Umsetzungsnotizen (/implement)
- **Neue Lib `scripts/lib/tier-select.sh`** (Muster: `report-verdict.sh`): reine, im
  Test-Harness ohne claude-Lauf prüfbare Funktionen `select_tier` (Größe+Schwelle→Tier,
  Fail-Safe auf Fallback-Tier) und `measure_size` (Signal `diff`/`proxy`).
  - `diff`: `git fetch -q origin main` (best effort) → `git diff --numstat origin/main...HEAD`
    (Drei-Punkt/Merge-Base misst nur Branch-eigene Änderungen → AK3); Binär (`-`) übersprungen;
    git-Fehler → leer → Fail-Safe.
  - `proxy`: AK-Checkboxen im `## Akzeptanzkriterien`-Block der Spec (awk, `found`-Flag
    unterscheidet „Abschnitt fehlt" → leer/Fail-Safe von „Abschnitt da, 0 Boxen" → 0).
- **`run-pipeline.sh`:** Lib gesourct; `get_model <skill> [task_id]` neu geordnet
  (CLAUDE_MODEL → `tier_by_size` → statisches `tier` → tier→Modell); Call-Site übergibt `task_id`
  (nur `proxy` braucht sie).
- **`factory.defaults.yml`:** `tier_by_size` an `review`(diff/150)/`implement`(proxy/6)/
  `bug-fix`(proxy/6); `security-review` bewusst fix heavy ohne `tier_by_size` (@reason); statisches
  `tier: heavy` bleibt an den dynamischen Skills als Fail-Safe. `@reason`/`@tradeoff` je Knopf.
- **`factory.config.yml`:** provisorischen `implement: { tier: heavy }`-Test-Override aufgelöst
  (AK12) – nur der bewusste `max_turns: 50`-Deckel bleibt; Kommentar auf ADR-038 aktualisiert.
- **`config-validation-check.sh` Regel 4c:** wo `tier_by_size` in der effektiven Config existiert →
  `signal ∈ {diff,proxy}` + `threshold` positiver Integer, fail-closed (F3). Additiv zu 4a; `tier`
  bleibt gültiger `model_tiers`-Schlüssel → 4a unverändert grün (AK9).
- **`token-efficiency.md` §6:** Verweis auf nicht existierende „README.md (Tier-Tabelle)" durch die
  reale SSOT `factory.defaults.yml` (`model_tiers` + `skills.*.tier`/`tier_by_size`) ersetzt (AK11).
- **Tests** (`scripts/checks/tests/run-tests.sh`): 30 neue Assertions – reine Lib-Tests (yq-frei:
  select_tier-Grenzen, proxy/diff inkl. AK3-Fremd-Commit, F1/F2) + End-to-End via
  `run-pipeline --dry-run` (AK1/AK4/AK5/AK6/AK7/AK10) + Gate-Regel-4c (AK9/F3). Bestehende
  run-pipeline-Temp-Repos kopieren die neue Lib mit (sonst bräche das Sourcen).
- **Verifikation:** `run-tests.sh` 386 grün / 0 rot; `config-validation-check.sh` grün auf realer
  Config; live gegen dieses Repo: `proxy(197)=12`, `diff=401` → beide ≥ Schwelle → heavy (korrekt
  für diesen großen Lauf). F4 (yq fehlt) ist unverändertes Bestandsverhalten von `load_config`.

## Review-Findings
Multi-Persona-Review (Logik / Code-Qualität / Architektur), Details in `tasks/review-197.md`.
Keine kritischen Findings. Runde 1: NEEDS_REWORK → Runde 2 nach Rework: **APPROVED**.
Behoben in Runde 2:
- ADR-038-Status `Proposed` → `Accepted (2026-07-22)` (WICHTIG).
- Binärdatei-Ausschluss in `measure_size diff` durch Test belegt (WICHTIG, O4).
- `select_tier`: symmetrische Guard-Klausel für `threshold` (kein stilles Downgrade) + Test.
- E2E-Symmetrie: „großer Diff → review heavy" (AK2) ergänzt.
Bewusst belassen: `find|head -1` (eine Spec je ID); E2E kopiert nur Defaults (reales light-Modell
separat via yq-Merge verifiziert). Danach 389 grün / 0 rot.

## Refactoring-Notizen (/refactor)
Kein Struktur-Refactoring nötig – Review (Runde 2) bestätigte Naming, Funktionsgröße,
Magic-Number-Vermeidung und Duplikationsfreiheit als sauber. Einzige Änderung: Header-Docstring
von `select_tier` an die im Rework ergänzte symmetrische `threshold`-Guard angepasst (reine
Doku-Korrektur, kein Verhalten). Suite vor/nach identisch 393 grün.

## Codify-Notizen
Details in `tasks/codify-197.md`. 3 neue Lessons (ADR-037):
- factory-workflow: ADR-Status beim Umsetzen auf `Accepted` flippen (#197 Review-Finding).
- testing: neue gesourcte Lib in run-pipeline.sh → alle Temp-Repo-Scaffoldings in run-tests.sh
  mitkopieren (#197 Selbstfund, 2 rote Fremd-Tests).
- code-style: Fail-Safe/Guard symmetrisch auf alle Vergleichs-Inputs (#197 Review-Finding).
Je Lesson eine Index-Zeile mit „Laden bei"-Trigger in PROJECT-CONTEXT.md. Kein neuer Check
(Urteilsregeln, nicht mechanisch prüfbar), keine CLAUDE.md-/Guideline-Änderung, kein Folge-Issue.

---
Branch: `improvement/197-modell-tiers-gezielter-vergeben`
Erstellt: 2026-07-22 00:31
