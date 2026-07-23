# Coverage / Test-Vollständigkeit: Task 197

## Coverage-Werkzeug

Die Änderung dieser Task ist ausschließlich **Shell + YAML + Doku** (keine TS/TSX-Produktion).
Das Projekt-Coverage-Gate (`pnpm test:coverage`, Vitest) misst `app/`/`lib/`-TypeScript – es
berührt den hier geänderten Code **nicht** und ist daher für diese Task nicht das relevante Maß
(kein neuer TS-Code → keine TS-Coverage-Lücke; `pnpm test` bleibt unverändert grün, siehe Pre-Push).

Die relevante „Coverage" ist das Bash-Test-Harness `scripts/checks/tests/run-tests.sh`: pro
Akzeptanzkriterium und Fehlerszenario mindestens ein dedizierter Test, plus reine Unit-Tests der
Kernfunktionen ohne `claude`-Lauf. Stand: **393 grün / 0 rot**.

## AK → Test-Nachweis

| AK/F | Test(s) in run-tests.sh |
|------|--------------------------|
| AK1 (review klein → light) | `select_tier 149/150 → light`; E2E kleiner Diff → review light |
| AK2 (review groß → heavy) | `select_tier 150|500/150 → heavy`; E2E großer Diff → review heavy |
| AK3 (Basis origin/main) | `measure_size diff` + Fremd-Commit-Setup (bleibt 3); Drei-Punkt-Merge-Base |
| AK4 (implement/bug-fix klein → light) | `select_tier 5/6 → light`; proxy-Zählung; E2E kleiner Proxy → implement light |
| AK5 (implement/bug-fix groß → heavy) | `select_tier 6/6 → heavy`; E2E großer Proxy → implement heavy |
| AK6 (security-review fix heavy) | E2E `/security-review` → opus; kein `tier_by_size` in defaults |
| AK7 (übrige Skills + default light) | yq-Iteration über 7 Skills + default (light, kein tier_by_size); E2E `/test` → light |
| AK8 (@reason/@tradeoff je Knopf) | bestehender Annotations-Test (#35, Inline- + Block-Style) bleibt grün |
| AK9 (Config-Gate grün) | Gate auf realen Defaults mit tier_by_size → exit 0; Override justiert threshold → exit 0 |
| AK10 (CLAUDE_MODEL sticht) | E2E `CLAUDE_MODEL=…` → Review nutzt Override-Modell |
| AK11 (SSOT-Konsistenz) | grep token-efficiency.md: verweist auf factory.defaults.yml, kein README-Tier-Tabellen-Verweis |
| AK12 (implement-Tier final) | yq: factory.config.yml hat kein `.skills.implement.tier` mehr |
| F1 (Diff unbestimmbar → heavy) | `measure_size diff` ohne origin → leer; `select_tier ''` → Fallback heavy |
| F2 (Proxy unbestimmbar → heavy) | `measure_size proxy` ohne Spec/Abschnitt → leer; Fail-Safe |
| F3 (ungültiger Schwellwert → fail-closed) | Gate 4c: signal bogus / threshold 0 / threshold nicht-integer → fail |
| F4 (yq/Config fehlt → Bestandsverhalten) | inhärent: `load_config` bricht ohne yq laut ab (unverändert); yq-abhängige Tests via HAS_YQ-Skip |

Zusätzlich abgesichert: Binärdatei-Ausschluss (O4), nicht-numerische Schwelle → Fail-Safe
(kein stilles Downgrade), Grenzwerte (Schwelle-1 / Schwelle) je Signal.

## Test-Qualität

- Verhalten statt Implementierung; Erwartungswerte sind Literale (keine tautologischen Asserts).
- Deterministisch: reine Funktionen + lokale git-Setups (bare origin, kein Netz), kein `sleep`.
- Unabhängig: jeder Fall in eigenem `mktemp`-Verzeichnis, danach `rm -rf`.
- Portabel (POSIX-awk/Regex), läuft yq-frei grün (yq-abhängige Fälle unter `HAS_YQ`-Skip).
