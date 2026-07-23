# Coverage: Task 207

## Scope & Werkzeug

Der geänderte Code ist **reines Bash** (`scripts/lib/create-issue.sh`,
`scripts/checks/tests/run-tests.sh`). Die projektweite Coverage-Schwelle (80 %, `pnpm test:coverage`
via Vitest) misst **TypeScript** – für diese Task **nicht anwendbar**, da kein TS-Code geändert
wurde (Diff `origin/main...HEAD` enthält nur `.sh`/`.md`). Die relevante Abdeckung ist die
**Branch-Coverage der neuen Bash-Funktionen** durch die Bash-Suite (`run-tests.sh`), manuell
verifiziert (kein bash-Coverage-Tool im Stack).

Vitest-Suite bleibt unberührt grün (640 passed / 59 skipped), da keine TS-Datei betroffen ist.

## Akzeptanzkriterien → Test-Abdeckung (Sektion „Idempotenter Issue-Seam (#207, ADR-040)")

| AC / F | Verhalten | Test(s) |
|--------|-----------|---------|
| AC1 | Offener Titel-Treffer → bestehende Nummer, keine Anlage | „AC1: …" (3 Assertions) |
| AC2 | Kein Treffer → reguläre Anlage inkl. Labels | „AC2: …" (4 Assertions) |
| AC3 | Geschlossenes Issue blockiert nicht (`--state open`) | „AC3: …" (3 Assertions) |
| AC4 | Retry-Idempotenz: zwei Läufe → genau eine Anlage | „AC4: …" (2 Assertions) |
| AC5 | Exakter Titelvergleich (Teilstring beidseitig), Tiebreak niedrigste Nummer | „AC5: Teilstring / Umkehr-Teilstring / mehrere Treffer / umgekehrte Reihenfolge" |
| AC6 | Geltungsbereich: Bestands-Aufrufer unverändert | „AC6: start-work.sh / sync-issues.sh nutzt Wrapper NICHT" |
| F1 | Lookup nicht durchführbar → fail-open + stderr-Warnung | „F1: …" (4 Assertions) + „F1/FS1: kein gh …" |
| F2 | Anlage bleibt fail-closed + Label-Degradation hinter dem Wrapper | „W4: …" (4 Assertions) |
| F3 | stdout-Hygiene: nur Nummer, Diagnostik auf stderr | „F3: …" (2 Assertions) |

## Branch-Abdeckung der neuen Funktionen

**`_cri_find_open_issue_by_title`:**
- kein `gh` → `return 2` — „F1/FS1: kein gh …"
- `gh`-Fehler (`|| return 2`) — „F1: Lookup-Fehler …"
- repo gesetzt (`--repo`) — alle `idem`-Tests (FACTORY_REPO=test/repo)
- repo leer (no-repo-Zweig, gh-Auto) — „Lookup: ohne FACTORY_REPO/REPO …"
- Match, numerische Nummer, erster Treffer (`-z "$best"`) — AC1, AC5c
- Match, `-lt` true (niedrigere ersetzt) — AC5c (308→204)
- Match, `-lt` false (höhere ersetzt NICHT) — „AC5: umgekehrte Reihenfolge (204 vor 308)"
- Match, nicht-numerische Nummer (`''|*[!0-9]*)`) — „Guard: nicht-numerische Nummer-Zeile …"
- kein Match (`|| continue`) → `return 1` — AC2, AC5 (Teilstring)

**`create_issue_idempotent`:**
- rc=0 (Treffer) → Nummer + stderr-Hinweis — AC1, F3
- rc=2 (fail-open) → Warnung + Delegation — F1
- rc=1 (kein Treffer) → Delegation ohne Warnung — AC2
- Delegation erhält Label-Degradation/fail-closed — W4

**errexit-Robustheit** (`set -euo pipefail`, Seam wird so gesourct): Treffer-, No-Match- und
Fail-open-Pfad je ein eigener strict-mode-Durchlauf — „W3: … (rc=0)".

## Ergebnis

Bash-Suite: **439 grün / 0 rot**. Alle ACs und alle Zweige der neuen Funktionen abgedeckt;
verhaltensbasiert (nicht implementierungsgebunden), deterministisch (gh-Stub, kein Netz/Zeit),
isoliert (`mktemp -d`/`rm -rf`).
