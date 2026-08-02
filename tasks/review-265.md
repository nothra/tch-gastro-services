# Review: Task 265

## Kritische Findings (müssen behoben werden)
_Keine._

## Wichtige Findings (sollten behoben werden)
- [ ] [scripts/checks/tests/run-tests.sh:3824-3828] Der Testfixture-Helper `hi_repo()` (AK4-Worktree-Test, #265) setzt vor `git commit` **keine** lokale Git-Identität (`user.email`/`user.name`), anders als jeder andere commit-erzeugende Fixture-Helper in dieser Datei – u. a. das direkte Schwestermuster `ih_repo()` (Zeile 3551-3560, #262-Abschnitt), das exakt denselben Worktree-Aufbau nutzt und dort explizit `git -C "$wt" config user.email t@t` / `user.name t` setzt. Ohne globale Git-Identität im Ausführungsstamm (z. B. Docker-/CI-Image ohne aufgelöste `/etc/passwd`-GECOS-Daten, oder ein anderes Test-Image gemäß der `#197`-Lesson "Neue gesourcte Lib … alle Temp-Repo-Scaffoldings mitkopieren") schlägt `git -C "$WT" commit -q -m "chore: init"` (Zeile 3872) mit "Please tell me who you are" fehl (stderr ist nach `/dev/null` umgeleitet, also still); der nachfolgende `git worktree add` (Zeile 3873) hätte dann keine gültige Basis, und Test AK4 würde aus dem falschen Grund rot bzw. nur zufällig grün laufen, weil die Umgebung eine implizite Fallback-Identität liefert. Verifiziert: lokal (macOS) fällt git auf `whoami@hostname` zurück und der Test läuft zufällig grün – das widerspricht aber `testing-standards.md` ("Flaky Tests: Zero Tolerance", keine Umgebungsabhängigkeit) und dem in dieser Datei durchgängig etablierten Muster (>15 Stellen setzen `-c user.email=…`/`config user.email …` explizit). **Fix:** `hi_repo()` um `git -C "$wt" config user.email t@t` und `git -C "$wt" config user.name t` ergänzen, analog `ih_repo()`.

## Nitpicks (optional)
- [ ] [scripts/checks/hooks-installed-check.sh:48,61] Die Hook-Liste `pre-commit pre-push commit-msg` ist als Literal an zwei Stellen (Schleife + Erfolgsmeldung) dupliziert; eine Array-Variable würde eine künftige vierte Hook-Ergänzung an einer Stelle halten. Bei 62 Zeilen Skriptgröße verschmerzbar.
- [ ] [scripts/checks/pre-push.sh:110-127] Der neue, günstige Dateisystem-Check steht hinter der potenziell langlaufenden Test-Suite/Typecheck (Check 1/2) – bei fehlenden Hooks liefe die komplette Suite unnötig durch, bevor der Fehler sichtbar wird. Folgt aber demselben Muster wie der bestehende Routen-Doku-Check (auch spät platziert) – konsistent, kein neues Problem dieser PR.

## Positives
- Alle sieben Akzeptanzkriterien der Spec sind durch je einen dedizierten, diskriminierenden Test abgedeckt (u. a. Test 5/AK5: der vorhandene `pre-push`-Hook wird explizit als NICHT in der Fehlermeldung genannt geprüft – keine bloße Anwesenheitsprüfung).
- ADR-042 exakt eingehalten: reine Präsenz-/Ausführbarkeits-Prüfung, kein Inhaltsvergleich gegen `install-hooks.sh` (Spec-Scope „Nicht inbegriffen" korrekt respektiert), kein automatisches Reparieren (nur Verweis auf `bash scripts/install-hooks.sh`).
- Konsistente Pattern-Übernahme von `routes-doc-check.sh`: eigenes isoliert testbares Skript, `FACTORY_DIR`-Override für Tests, `pre-push.sh`-Verdrahtung mit „Datei fehlt → Warnung, übersprungen"-Fallback.
- Korrekte relative→absolute Pfadauflösung von `git rev-parse --git-common-dir` (identisch zu `install-hooks.sh`), verifiziert inkl. Worktree-Fall und Pfaden mit Leerzeichen (dieses Repo selbst: `TCH Gastro Services.worktrees/…`).
- `set -e`-Falle in `pre-push.sh` korrekt vermieden: die Kommandosubstitution zur Ausgabe-Erfassung steht direkt in der `if`-Bedingung (`if HOOKS_INSTALLED_OUTPUT="$(...)"; then`), nicht als separate Zuweisung – sonst würde ein fehlschlagender Check das gesamte Gate-Skript unter `set -euo pipefail` sofort abbrechen.
- Keine Portabilitätsverstöße (kein `grep -E`/PCRE im neuen Skript, reine `[ -f ]`/`[ -x ]`-Tests).
- Out-of-Scope-Finding (core.hooksPath + veraltete Hook-Dateireste im Standardpfad → false-positive „installiert") als eigenes Issue [#268](https://github.com/nothra/tch-gastro-services/issues/268) angelegt, da explizit außerhalb des Spec-265-Scopes ("Nicht inbegriffen").

## Empfehlung
NEEDS_REWORK
