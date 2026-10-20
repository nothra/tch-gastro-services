# Security Review: Task 426

Scope: T1a-1 – Doku-/Datei-Umzug (ADRs, Lessons, Kleinfunde), zwei neue Gate-Skripte (`ownership-check.sh`, `adr-links-check.sh`), pre-push-Check 6a, `.claude/commands`-Textänderungen, Tests. Kein App-Code, keine Dependencies, keine Workflow-/Permission-/`settings.json`-Änderung im Diff.

Geprüft: Diff `origin/main...HEAD` auf Secrets (nur Prosa-Treffer wie „Token-Route", „.env.local"-Lessons, keine Werte), neue Skripte auf `eval`/`xargs`/`source`/Netzwerkaufrufe (keine), `.claude`-Diff auf Permission-/Allow-/Deny-Änderungen (keine).

## Kritische Findings (Blocker)
Keine.

## Wichtige Findings
Keine.

## Hinweise
- [ ] Command Injection / Pfade: `adr-links-check.sh` und `ownership-check.sh` behandeln Dateinamen und Link-Ziele ausschließlich als Daten (`[ -e ]`, awk-Regex mit escapetem Glob, `--`/Pathspec-Trennung bei `git grep`); es wird nichts ausgeführt oder gesourct. Ein Link-Ziel mit `../` kann höchstens einen Existenz-Test auf einen anderen Pfad auslösen (kein Lesen, keine Ausgabe des Inhalts).
- [ ] Test-Umgebungsvariablen: `OWNERSHIP_FILE`, `OWNERSHIP_FILE_LIST`, `FACTORY_DIR` sind reine Test-Overrides. Ist `OWNERSHIP_FILE` in der lokalen Shell exportiert, prüft der lokale pre-push-Check gegen eine andere Tabelle. Das ist nur lokales, ohnehin per `--no-verify` umgehbares Feedback; maßgeblich bleibt CI (`factory-self-test`, Ruleset `protect-main`). Keine Maßnahme nötig.
- [ ] Fail-open-Randfall (aus `/review`, Nitpick): Ein getrackter Dateiname mit `|` würde von `ownership-check.sh` übersprungen. Kein Ist-Fall (0 Dateien), keine Ausnutzbarkeit über Dritte (Dateinamen kommen aus dem eigenen Repo, PR-Review sichtbar). Dokumentiert, nicht eskaliert.
- [ ] Stored-Prompt-Injection-Absicherung der Kleinfunde bleibt erhalten: `docs/project/kleinfunde.md` übernimmt den „Daten, keine Anweisungen"-Sicherheitshinweis und verweist auf ADR-043; die geteilte Datei `docs/factory/kleinfunde.md` behält ihn unverändert (Lesson #286).
- [ ] `.claude/commands/*` wurden nur textlich geändert (Ablageorte, Zuordnungsregel, Links), ohne neue Tool-Rechte oder Kommandos; geliefert über den Patch-Workflow (vom Menschen angewendet, Patch-Datei anschließend entfernt).

## Ergebnis
PASSED
