# Test-Coverage: Task 155

Docs-only-Task – **kein TypeScript-Produktionscode**. Die Vitest-Coverage-Schwelle (80 %)
ist hier nicht anwendbar (kein neuer TS-Code, nichts zu instrumentieren). Die relevanten
„Tests" sind die Shell-Doc-Guards in `scripts/checks/tests/run-tests.sh` (CI-Job
`factory-self-test`). Ergebnis: **300 grün, 0 rot**.

## AC → Absicherung

| AC | Kriterium | Absicherung | Status |
|----|-----------|-------------|--------|
| AC1 | ADR-029 liegt vor (Datei existiert) | Guard `#155: ADR-029-Datei vorhanden` (Existenz, verhindert dangling reference) | ✅ automatisiert |
| AC1 | ADR-029 hat die geforderten Abschnitte/JSON | in `/review` inhaltlich geprüft; ADR-Struktur wird projektweit nicht per Guard erzwungen (kein Gold-Plating) | ✅ Review |
| AC2 | Verify-Befehl passt zum Live-Ruleset | **statisch nicht guardbar** (Self-Test hat kein Netz); in `/review` live gegen `gh api …/rulesets/19162920` verifiziert | ✅ Review (live) |
| AC3 | git-workflow.md verweist auf ADR-029 (Direktive) | Guard `#155: … verweist auf ADR-029` (`grep -q 'ADR-029'`) | ✅ automatisiert |
| AC3 | Framing: Hook = lokal/umgehbar vs. Ruleset = server-seitig (Rationale) | Guard `#155: … umgehbares lokales Feedback` (`grep -q 'umgehbar'`), Unabhängigkeit per Negativ-Nachweis belegt (#117) | ✅ automatisiert |
| AC4 | Branch `docs/`, Label `documentation` | Prozess-Schritt (GitHub-State), nicht Repo-testbar; in Task-Datei dokumentiert | ✅ erledigt |

## Warum keine weiteren Guards

- **ADR-Inhaltsstruktur / Verify-Befehl-Wortlaut** wird bewusst *nicht* geguardet: die Factory
  erzwingt ADR-Abschnitte nirgends per Test; ein Wortlaut-Grep wäre brüchig und ohne echten
  Schutzwert (der einzig sicherheitsrelevante Abgleich – JSON vs. Live-Ruleset – braucht Netz
  und gehört in `/review` bzw. `/post-merge-verify`, nicht in den statischen Self-Test).
- **Test-Qualität:** die drei `#155`-Guards sind unabhängig, deterministisch (reine
  Datei-/Grep-Prüfungen, kein Netz/Zeit/Zufall), und die Namen beschreiben das geprüfte
  Verhalten. Distinktive Tokens (`umgehbar`, `ADR-029`) je 1× in der Datei (kein Fehl-Match,
  #114-Lehre).
