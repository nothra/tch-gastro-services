# Coverage / Test-Vollständigkeit – Task 212

## Einordnung: welches Coverage-Maß gilt hier?

Die Änderung ist **reines Bash-Factory-Tooling** (`scripts/**`, `docs/**`, `.claude/**`) mit
**0 TypeScript-Delta**. Das Projekt-Coverage-Gate `pnpm test:coverage` (Vitest) misst
`app/`/`lib/`-TypeScript (siehe `tasks/coverage-197.md`) und ist von dieser Task **unberührt** –
die App-Coverage bleibt exakt der `main`-Stand. Die verhaltensrelevante Abdeckung liegt in der
Shell-Test-Suite `scripts/checks/tests/run-tests.sh`.

## Abdeckung je Akzeptanzkriterium (run-tests.sh)

| AK/F | Ebene | Belegt durch |
|------|-------|--------------|
| AK1 ungepushte Commits | evaluate + I/O | Exit + Reason „Ungepushte Commits"; I/O mit echtem Commit |
| AK2 sauber+gepusht (false) | evaluate + I/O | Exit 0; I/O gegen echtes Temp-Repo mit push |
| AK3 Draft-PR | evaluate + I/O | Exit 1 + „PR noch Draft"; I/O via gh-Stub |
| AK4 weder gemergt noch Auto-Merge | evaluate + I/O + Edge | OPEN + CLOSED (geschlossen ≠ gemergt) |
| AK5 Auto-Merge scharf | evaluate + I/O | Exit 0 |
| AK6 MERGED | evaluate + I/O | Exit 0 |
| AK7 Stage-3-Eskalation | Endzustand | grep der committeten `pr-shepherd.md` (FACTORY_STAGE=3, kein `git rm --cached`, PUSH_GATE_BLOCKED) |
| AK8 Sentinel stoppt vor Banner | E2E-Verhalten | Mock-`claude` setzt Sentinel → exit≠0, kein Banner, Typ im Log |
| AK9 `.gitignore` generisch | echtes `git check-ignore` | `.coverage-tmp209/`, `.coverage-tmp999/` |
| AK10 kein getrackter Coverage-Pfad | check-ignore + Doku | `coverage/` ignoriert; Konvention in testing-standards.md |
| F1 gh/git nicht verwertbar | evaluate + I/O | leerer pr_state / gh-Stub exit 1 |
| F2 kein Upstream | evaluate + I/O | NO_UPSTREAM; Branch ohne origin-Tracking |
| F3 uncommittet | evaluate + I/O | dirty Working Tree |
| F4 --dry-run | E2E | DRY-RUN-Markierung, Lauf erreicht Erfolgs-Ausgabe |

**Zusätzlich E2E (Kern-Symptomatik #212):** unverifizierter Endzustand (ungepushter Commit) →
`INCOMPLETE_OUTCOME` im `interrupt-log.jsonl`, kein Erfolgs-Banner, exit≠0 – plus Positiv-Gegenprobe
(sauber+gepusht → Erfolg). Damit ist der neue Pipeline-Pfad **ausgeführt**, nicht nur grep-verifiziert.

**Edge-/Rework-Code:** detached HEAD (`branch='HEAD'`) und leerer Branch-Name → fail-closed
(dedizierte I/O-Tests); geschlossener PR (CLOSED) → blockiert.

## Bewusstes Coverage-Loch (dokumentiert, nicht behebbar im Harness)

Der gh-TSV-Filterausdruck `-q '[.isDraft,.state,(.autoMergeRequest!=null)]|@tsv'`
(`verify-final-state.sh`) wird mangels echtem `gh` im Test-Harness **nicht ausgeführt** – der
Stub bildet die TSV fest nach. Getestet ist das `IFS`-read-Mapping; die gh-Filter-Semantik
(Feldreihenfolge, `--json`-Feldnamen) ist durch Codelesen + Kommentar abgesichert. Kein stiller
Cap: an Lib-Zeile und Test-Stub benannt.

## Ergebnis

`bash scripts/checks/tests/run-tests.sh` → **454 grün, 0 rot**. `pnpm test:coverage` (App/TS)
unverändert über der 80 %-Schwelle (kein TS-Delta in dieser Task).
