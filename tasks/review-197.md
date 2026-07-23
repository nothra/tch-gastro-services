# Review: Task 197

Diff-Scope: `git diff origin/main...HEAD` (origin/main frisch gefetcht; 0 Fremd-Commits,
reine Task-Änderung). Drei Personas: Logik/Korrektheit, Code-Qualität, Architektur.

## Kritische Findings (müssen behoben werden)
- [ ] _Keine._

## Wichtige Findings (sollten behoben werden)
- [x] `docs/adr/038-groessenabhaengige-modell-tier-wahl.md:4` – ADR-Status war `Proposed`.
      **BEHOBEN (Runde 2):** auf `Accepted (2026-07-22)` gesetzt.
- [x] `scripts/lib/tier-select.sh:55` – Binärdatei-Zweig war ungetestet.
      **BEHOBEN (Runde 2):** neuer Test „#197 O4: Binärdatei wird bei der Diff-Größe übersprungen"
      speist `measure_size diff` mit einer eingecheckten Binärdatei und belegt die Ausschluss-Zeile.

## Nitpicks (optional)
- [x] `scripts/lib/tier-select.sh:35` – `select_tier` sicherte nur `size`, nicht `threshold` ab
      (nicht-numerischer threshold → stilles Downgrade auf light). **BEHOBEN (Runde 2):** symmetrische
      Guard-Klausel für `threshold` ergänzt + Unittest „nicht-numerische Schwelle → Fail-Safe".
- [x] `scripts/checks/tests/run-tests.sh` (#197 E2E) – `diff`-Signal hatte nur den light-Fall E2E.
      **BEHOBEN (Runde 2):** E2E „#197 AK2: großer Diff (>= 150) → /review auf heavy" ergänzt.
- [ ] `scripts/lib/tier-select.sh:65` – `find … | head -1` wählt bei mehreren Spec-Treffern einen
      beliebigen. Konvention: genau eine Spec je ID → praktisch irrelevant. **Belassen (bewusst).**
- [ ] `scripts/checks/tests/run-tests.sh` (#197 E2E) – E2E kopiert nur `factory.defaults.yml`
      (light = `claude-sonnet-4-6`), nicht den Team-Override (`claude-sonnet-5`); reales effektives
      light-Modell wird nicht E2E abgedeckt (von AK nicht gefordert; separat via yq-Merge verifiziert).
      **Belassen (bewusst, konsistent mit bestehenden Phase-1b-Tests).**

## Positives
- Reine, ohne `claude`-Lauf testbare Funktionen (`select_tier`/`measure_size`) exakt im Muster von
  `scripts/lib/report-verdict.sh`; Fail-Safe-Design konsequent (unbestimmbar → statisches `tier`).
- Saubere Unterscheidung „unbestimmbar (leer → heavy)" vs. „bestimmbar 0 (→ light)": `diff` via
  `printf '0'`, `proxy` via `found`-Flag im awk – beide getestet.
- AK3 (Drei-Punkt-Merge-Base gegen `origin/main`) mit echtem Fremd-Commit-Setup verifiziert.
- ADR-038/009/011 exakt eingehalten: additives `tier_by_size`, `tier ∈ model_tiers` unangetastet
  (Regel 4a unverändert grün), Knöpfe nur in Defaults, `@reason`/`@tradeoff` je Knopf, provisorischer
  implement-Override sauber aufgelöst (AK12), keine widersprüchlichen Kommentare mehr.
- Keine tautologischen Asserts (Erwartungswerte sind Literale); Grenzwerte je Signal getestet;
  Portabilität durchgängig POSIX (kein `\s\d\w`, kein PCRE). Regression = null (Skills ohne
  `tier_by_size` laufen byte-genau den Alt-Pfad).

## Empfehlung
Runde 1: NEEDS_REWORK (2 WICHTIG + 2 hochgestufte/ergänzende Nitpicks).
Runde 2 (nach Rework): **APPROVED** – alle WICHTIG-Findings und die beiden actionable Nitpicks
behoben, Suite 389 grün / 0 rot, Gates grün. Verbleibende 2 Nitpicks bewusst belassen.

APPROVED
