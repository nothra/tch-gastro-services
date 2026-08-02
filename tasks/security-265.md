# Security Review: Task 265

## Kontext

Diff `origin/main...HEAD` umfasst ausschließlich lokale Dev-/CI-Tooling-Skripte (Bash) und
CI-Workflow-Konfiguration, keine Anwendungslogik:
- `scripts/checks/hooks-installed-check.sh` (neu)
- `scripts/checks/pre-push.sh` (Verdrahtung)
- `scripts/checks/tests/run-tests.sh` (Tests)
- `.github/workflows/factory-ci.yml` (CI-Job-Fix)
- Doku/Task-/Review-Dateien

Threat Surface: lokaler Entwickler-Workflow + GitHub-Actions-CI dieses Repos. Kein
User-Input aus dem Web, keine DB, keine Auth-/Session-Logik, keine neuen Dependencies.

## Kritische Findings (Blocker)
_Keine._

## Wichtige Findings
_Keine im Scope dieses PR._

## Hinweise
- [Security-relevante Ausprägung eines bereits gemeldeten Out-of-Scope-Findings] Das im
  `/review`-Schritt gemeldete Verhalten von `hooks-installed-check.sh` bei gesetztem
  `core.hooksPath` (Issue [#268](https://github.com/nothra/tch-gastro-services/issues/268))
  hat neben der funktionalen auch eine Security-Seite: `pre-commit.sh` scannt auf
  hardkodierte Credentials, `pre-push.sh` blockiert Direkt-Pushes auf `main`/`master`.
  Meldet der neue Check fälschlich „installiert", obwohl `core.hooksPath` diese Dateien nie
  ausführt (verifiziert in der vorherigen Review-Runde), entsteht ein falsches
  Sicherheitsgefühl beim Entwickler – das lokale Schutznetz (Secret-Scan, Push-Schutz) ist
  inaktiv, ohne dass irgendein Signal darauf hinweist. Da dies explizit außerhalb des
  Spec-265-Scopes liegt ("Nicht inbegriffen": keine `core.hooksPath`-Sonderbehandlung),
  wurde Issue #268 nachträglich mit dem `security`-Aspekt-Label versehen (statt eines
  neuen Issues) und per Kommentar um diese Einordnung ergänzt. Kein Blocker für diesen PR,
  da nur die lokale Push-Vorstufe betroffen ist – der server-seitige Schutz
  (GitHub-Ruleset `protect-main`, ADR-029) bleibt unabhängig davon fail-closed wirksam.

## Detailprüfung (Prüfkatalog)

- **Input-Validierung & Injection:** Kein User-Input aus externen Quellen. Alle
  Shell-Variablen (`ROOT`, `GIT_COMMON_DIR`, `HOOKS_DIR`, `FACTORY_HOOKS`, Hook-Namen) sind
  programmintern erzeugt bzw. aus `git rev-parse` (vertrauenswürdig) abgeleitet, korrekt
  gequotet (`"$ROOT"`, `"$hook_file"`). Kein `eval` auf variablem Inhalt, kein `grep`/`sed`
  mit variablem Suchmuster (die einzige `sed`-Nutzung in `pre-push.sh` verwendet `$OUTPUT`
  nur als Pipe-**Daten**, das `s/^/     /`-Muster selbst ist ein festes Literal – kein
  Injection-Vektor). Keine SQL-/Command-/XSS-relevante Oberfläche vorhanden.
- **Authentifizierung & Autorisierung:** Nicht betroffen (kein Auth-Code geändert).
- **Daten & Kryptographie:** Keine Secrets/Keys im Diff. Der neue Check liest nur
  Dateisystem-Metadaten (Existenz/Ausführbar-Bit), **führt die Hook-Dateien selbst nie
  aus** (kein `source`/`exec` auf ihren Inhalt) – dadurch kein Risiko, potenziell
  manipulierten Hook-Inhalt beim bloßen Prüfen zu triggern.
- **Dependencies:** Keine neuen Dependencies, kein `package.json`-Diff.
- **Error Handling:** Fehlermeldungen nennen nur lokale Pfade/Hook-Namen (keine sensiblen
  Daten, kein Stack Trace). Fail-closed durchgängig: kein Git-Repo, fehlendes
  `.git/hooks`, nicht erreichbare Projektwurzel → jeweils Exit ≠ 0 statt stillem Erfolg.
- **CI-Workflow-Änderung (`factory-ci.yml`):** Der neue Schritt `bash
  scripts/install-hooks.sh` führt ausschließlich bereits im Repo vorhandenen, vertrauens-
  würdigen Code aus (kein zusätzliches Secret, keine neue `permissions`-Eskalation – der
  Job bleibt bei `contents: read, issues: read`). Trigger ist der reguläre `pull_request`-
  Event (nicht `pull_request_target`), also keine neue Angriffsfläche für Fork-PRs
  gegenüber dem bereits bestehenden `test`/`lint`-Job-Verhalten (die führen ohnehin schon
  Repo-Code wie `pnpm test`/`pnpm lint` aus).

## Ergebnis
PASSED
