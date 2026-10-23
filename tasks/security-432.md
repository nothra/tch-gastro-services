# Security Review: Task 432

Scope: `git diff origin/main...HEAD` (verhaltensneutrale Umlagerung: TCH-Skripte nach `scripts/project/`, Test-Split, Factory-Texte neutralisiert, TCH-Betriebsdoku nach `docs/project/betrieb.md`). Kein App-Code, keine neue Dependency (`package.json`/`pnpm-lock.yaml` unberührt).

## Kritische Findings (Blocker)
_Keine._

## Wichtige Findings
_Keine._

## Hinweise
- [x] Verlustfreiheit der sicherheitsrelevanten Skripte belegt: `neon-reset-int.sh`, `deploy-freeze.sh`, `deploy-freeze-notify.sh` sind gegenüber `origin/main` bis auf Pfadangaben in Kommentaren/Usage-Texten byte-identisch (per `diff` geprüft); Dateimodi (100755/100644) unverändert. Fail-closed-Logik (Freeze-Exit-Codes, Neon-Reset) unberührt.
- [x] Workflows (`deploy-gate.yml`, `deploy-freeze-release.yml`): nur Skriptpfade geändert; keine neuen Secrets, keine neue `${{ … }}`-Interpolation in `run:`-Blöcken (der bestehende `env:`-Weg für `inputs.grund`/`github.actor` bleibt).
- [x] `ci.yml` (Job `test`): zwei neue Steps. `permissions: contents: read` unverändert; `install-yq.sh` ist der etablierte Seam (gepinnte Version + SHA-256, Guardrail #258) und wird wie in `factory-ci.yml`/`factory-poll.yml` mit `sudo` aufgerufen – kein Inline-Download. Die Projekt-Suite läuft ohne Secrets; der Schritt hat weder `continue-on-error` noch `|| true` (per Test AK-J3 abgesichert).
- [x] Docs: `betrieb.md`, `OPERATING.md`, `PROJECT-CONTEXT.md` nennen Secret-**Namen**, keine Werte (Muster-Scan auf Connection-Strings/Tokens/Passwörter ohne echten Treffer).
- [ ] Nitpick, kein Sicherheitsrisiko, bewusst nicht ausgelagert: Die Test-Suiten räumen Wegwerf-Verzeichnisse mit `rm -rf "$TMP_…"` auf, wobei die Variablen vorher per `mktemp -d` belegt werden und im Skript nicht leer sein können. Ein `${VAR:?}`-Schutz würde bei Tippfehlern helfen, ist aber unter der Schwelle (ADR-043) und kein Defekt mit Auslöser.
- [x] Neue Fremd-Ausführung: keine. Der Hook-/Gate-Pfad bleibt: die Ownership-Prüfung (`ownership-check.sh`) deckt alle neuen Pfade ab (OWNERSHIP.md aktualisiert, 1254 Dateien grün).

## Ergebnis
PASSED
