# Review: Task 265

## Kritische Findings (müssen behoben werden)
_Keine._

## Wichtige Findings (sollten behoben werden)
- [x] [scripts/checks/tests/run-tests.sh:3824-3828] Der Testfixture-Helper `hi_repo()` (AK4-Worktree-Test, #265) setzte vor `git commit` **keine** lokale Git-Identität (`user.email`/`user.name`), anders als jeder andere commit-erzeugende Fixture-Helper in dieser Datei – u. a. das direkte Schwestermuster `ih_repo()` (Zeile 3551-3560, #262-Abschnitt), das exakt denselben Worktree-Aufbau nutzt und dort explizit `git -C "$wt" config user.email t@t` / `user.name t` setzt. Ohne globale Git-Identität im Ausführungsstamm schlägt `git -C "$WT" commit -q -m "chore: init"` mit "empty ident name"/"Please tell me who you are" fehl (stderr nach `/dev/null`, also still); der nachfolgende `git worktree add` hätte dann keine gültige Basis, und Test AK4 würde aus dem falschen Grund rot laufen.
  **Behoben:** `hi_repo()` setzt jetzt lokal `git config user.email t@t` / `user.name t` (analog `ih_repo()`). Verifiziert per RED→GREEN: in einer künstlich identitätslosen Umgebung (`env -i HOME=<leer> GIT_CONFIG_NOSYSTEM=1 GIT_AUTHOR_*= GIT_COMMITTER_*=`) schlug `git commit` vor dem Fix mit `fatal: empty ident name (for <>) not allowed` (exit 128) fehl; nach dem Fix läuft der komplette `#265`-Abschnitt (20/20 Assertions inkl. AK4) in derselben Umgebung grün. Reguläre Suite weiterhin 772/772 grün.

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
APPROVED (nach Rework: Wichtig-Finding behoben, siehe oben)
