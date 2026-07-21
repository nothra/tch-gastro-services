# Task 197: modell-tiers-gezielter-vergeben

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
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
- [ ] AK1 – review klein (< Schwelle) → light
- [ ] AK2 – review groß (>= Schwelle) → heavy
- [ ] AK3 – review-Basis = aktuelles origin/main (keine Fremd-PR-Aufblähung)
- [ ] AK4 – implement/bug-fix klein (Proxy < Schwelle) → light
- [ ] AK5 – implement/bug-fix groß (Proxy >= Schwelle) → heavy
- [ ] AK6 – security-review immer heavy + per @reason als bewusst dokumentiert
- [ ] AK7 – übrige Skills + default unverändert light
- [ ] AK8 – jede geänderte Knopf-Zeile trägt @reason/@tradeoff (ADR-011)
- [ ] AK9 – config-validation-check bleibt grün (dynamischer Tier-Fall)
- [ ] AK10 – globaler CLAUDE_MODEL-Override sticht weiterhin
- [ ] AK11 – kanonische Quelle konsistent; veralteten README-Tier-Tabellen-Verweis in token-efficiency.md §6 bereinigen
- [ ] AK12 – implement-Tier final (nicht mehr „testweise" in config.yml)

## Fehlerszenarien
- [ ] F1 – Diff nicht bestimmbar → fail-safe heavy
- [ ] F2 – Proxy nicht bestimmbar → fail-safe heavy
- [ ] F3 – ungültiger Schwellwert → fail-closed im Config-Gate
- [ ] F4 – yq/Config fehlt → unverändertes Bestandsverhalten

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

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `improvement/197-modell-tiers-gezielter-vergeben`
Erstellt: 2026-07-22 00:31
