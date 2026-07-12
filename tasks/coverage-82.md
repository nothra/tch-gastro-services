# Test-Vollständigkeit: Task 82

## Warum keine Vitest-Coverage-Zahl

Der Diff dieser Task berührt **ausschließlich Shell-Tooling** (`scripts/lib/create-issue.sh`,
`scripts/start-work.sh`, `scripts/sync-issues.sh`) und Doku – **kein** TypeScript/JS-Produktcode
(`git diff main...HEAD`: 4× `.sh`, 8× `.md`, 0× `.ts/.tsx/.js`). `pnpm test:coverage`
(Vitest/Istanbul) misst den Next.js-App-Code und wäre für diese Änderung ohne Aussage.

Die zutreffende Test-Suite ist der Bash-Self-Test `scripts/checks/tests/run-tests.sh` (im CI-Gate
verankert). Vollständigkeit wird daher **kriterien-basiert** nachgewiesen (jedes Akzeptanzkriterium
und Fehlerszenario aus `docs/specs/spec-82-issue-seam.md` → Test), nicht über eine Zeilen-%-Zahl –
im Sinne von `testing-standards.md` („Coverage ist ein Hinweis, kein Qualitätsbeweis").

## Abdeckungs-Mapping (spec-82)

| Akzeptanzkriterium | Test in run-tests.sh |
|---|---|
| AC1 Art-Label → Nummer auf stdout, Exit 0 | Seam-Test 1 |
| AC2 Aspekt-CSV → Art + beide Aspekt-Labels | Seam-Test 2 |
| AC3 Label fehlt → trotzdem angelegt, Warnung auf stderr | Seam-Tests 3, 4, 9 |
| AC4 keine Nummer → fail-closed (Exit ≠ 0, kein stdout) | Seam-Test 5 |
| AC5 start-work Art-Label aus Branch-Typ + `FACTORY_ISSUE_LABEL` | Issue-Anlage-Tests |
| AC6 start-work `--labels` / `FACTORY_ASPECT_LABELS` durchgereicht | start-work #82-Tests |
| AC7 sync-issues `--create` mind. `enhancement`, kein eigenes `gh issue create` | sync #82-Tests |
| AC8 Skills rufen `create_issue` autonom (Doku) | Skill-Doku-greps |
| AC9 Self-Test deckt den Seam ab | diese Suite |
| AC10 ADR dokumentiert | Doku-Kriterium (kein Laufzeitverhalten) |

| Fehlerszenario | Test |
|---|---|
| `gh` nicht installiert → Seam fail-closed, klare stderr | Seam-Test 11 |
| `gh` fehlt (Aufrufer) → sync-issues Exit 2 | sync FS1-Test |
| leeres Art-Label → fail-open, Warnung, Issue ohne Label | Seam-Test 10 |
| ungültiges/abgelehntes Art-Label → fail-open | Seam-Test 4 |
| Titel leer → Aufrufer-Fallback (Titel aus H1/Dateiname) | sync-Titel-Test |
| stdout-Hygiene bei Degradation (nur Nummer) | Seam-Test 3 |
| Sonderzeichen in Titel/Body → genau ein `--title`/`--body`-Arg | Seam-Test 12 |
| Portabilität macOS/BSD (bash 3.2) | ganze Suite läuft auf `env bash` = 3.2.57 |

## Aus dem Review nachgezogene Regressionstests
- F1 (Kritisch): no-repo unter `set -euo pipefail` (nounset) → kein „unbound variable".
- `set -e`-Härtung: bloßer `create_issue`-Aufruf unter `set -euo pipefail` → Degradation läuft durch.
- Leerfeld-CSV (`"a,,b"`) → genau Art + 2 Aspekt-Labels.
- Mehr-Aspekt-Degradation (eines von zwei fehlt) → Fallback auf nur Art-Label.
- `FACTORY_ISSUE_LABEL`-Override in sync-issues.
- `--labels` ohne Wert → `usage()` + Exit 1 (kein wortloser `set -e`-Abbruch).

## Ergebnis
`bash scripts/checks/tests/run-tests.sh` → **208 grün, 0 rot**, deterministisch (mehrfach verifiziert).
Kein Produktionscode im /test-Schritt geändert.
