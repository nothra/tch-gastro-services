# Task 112: ci-gate-pr-body-braucht-closes-keyword

## Status
- [x] In Bearbeitung
- [x] Review bestanden — Selbst-Review: fail-closed, POSIX-ERE portabel, Here-String statt Pipe (kein SIGPIPE-Falschrot), Positiv-/Negativ-Tests decken das Muster in beide Richtungen ab
- [x] Tests vollständig — 16 neue Fälle in run-tests.sh (Suite 281 grün); Gate gegen echten PR-#113-Body verifiziert
- [x] Security-Review bestanden — n/a: liest nur den PR-Body (nicht-privilegiert), keine Ausführung von Fremdinhalt, kein Secret-Zugriff
- [x] Refactoring abgeschlossen — n/a (neues, kleines Gate; keine Duplikation)
- [x] Codify ausgeführt — Regel bestand bereits in git-workflow.md; dieses Gate erzwingt sie jetzt technisch (kein neuer Stolperstein)
- [x] Fertig / PR erstellt

## Beschreibung
CI-Gate, das fail-closed fehlschlägt, wenn ein PR-Body kein GitHub-Closing-Keyword
(`Closes`/`Fixes`/`Resolves`, auch `-s`/`-d`/`-ed`) mit `#<issue-nr>`-Referenz enthält.
Hintergrund: PR #79 schloss Issue #78 nicht, weil der Body es nur erwähnte (`(#78)`) statt
`Closes #78` – dasselbe Muster bei #71/#74/#76. Die Regel steht bereits in `git-workflow.md`,
wurde aber nirgends erzwungen. Das Gate macht die Konvention technisch verbindlich.

Umfang:
- `scripts/checks/pr-closes-keyword-check.sh` – liest `$PR_BODY`, prüft per POSIX-ERE.
- Neuer Job `pr-closes-issue` in `.github/workflows/factory-ci.yml` (nur bei `pull_request`).
- Tabellen-getriebene Tests (Positiv + Negativ) in `scripts/checks/tests/run-tests.sh`.

## Akzeptanzkriterien
- [x] GIVEN ein PR-Body mit `Closes #<nr>` (bzw. Fixes/Resolves, case-insensitiv) WHEN das Gate läuft THEN exit 0.
- [x] GIVEN ein PR-Body ohne Closing-Keyword (nur `(#78)`, `Behebt #78` oder leer) WHEN das Gate läuft THEN exit 1 mit Hinweis, wie es zu beheben ist.
- [x] GIVEN das Gate ist verdrahtet WHEN eine `pull_request`-CI läuft THEN wird `github.event.pull_request.body` an das Skript übergeben; bei `push` läuft der Job nicht.

## Technische Notizen
- Reines PR-Level-Gate: lokal (pre-commit/pre-push) gibt es keinen PR-Body → bewusst nur CI, kein Hook.
- POSIX-ERE ohne PCRE (clean-code.md), damit lokal (macOS/BSD) und in CI (GNU) identisch.
- Here-String (`<<<`) statt `printf | grep -q`, um den SIGPIPE-Falschrot unter `set -o pipefail` zu vermeiden (bash-gotchas.md).
- Referenzform bewusst auf `#<nr>` beschränkt (start-work.sh-Konvention); URL-/`owner/repo#`-Form nicht abgedeckt, um die Konvention einheitlich zu halten.

## Offene Fragen
Keine.

## Review-Findings
Selbst-Review, keine Findings.

## Codify-Notizen
Kein neuer Stolperstein – das Gate operationalisiert eine bereits dokumentierte Regel.

---
Branch: `chore/112-ci-gate-pr-body-braucht-closes-keyword`
Erstellt: 2026-07-15 15:43
