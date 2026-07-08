# Work Tracking

Dieses Verzeichnis enthält eine Markdown-Datei pro Feature/Task.

## Warum Markdown-Dateien in Git?

- **Observability:** Fortschritt ist jederzeit über Git/GitLab sichtbar
- **Persistenz:** Kontext bleibt über Claude-Sessions hinweg erhalten
- **Kleine Batches:** Fokussierte Tasks statt eines riesigen "Baue das Auth-System"
- **Crash Recovery:** Nächste Session setzt dort fort, wo die letzte aufgehört hat

## Task anlegen

```bash
bash scripts/start-work.sh <id> <kurzbeschreibung>
```

Beispiel:
```bash
bash scripts/start-work.sh 42 user-login-implementieren
```

Erstellt:
- Branch: `feature/42-user-login-implementieren`
- Task-Datei: `tasks/task-42-user-login-implementieren.md`

## Dateinamen-Konvention

```
task-<id>-<kurzbeschreibung>.md     # Haupt-Task
review-<id>.md                      # Review-Findings (durch /review erstellt)
security-<id>.md                    # Security-Report (durch /security-review erstellt)
coverage-<id>.md                    # Coverage-Report (optional)
pipeline-stuck-<id>.md              # Circuit-Breaker-Report
```

## Task-Lebenszyklus

```
Erstellt (start-work.sh)
    → /requirements  (Akzeptanzkriterien befüllen)
    → /architecture  (Technische Entscheidungen)
    → /implement     (TDD-Implementierung)
    → /review        (Code-Review, creates review-<id>.md)
    → /test          (Test-Vervollständigung)
    → /security-review (creates security-<id>.md)
    → /refactor      (Clean-Code-Pass)
    → /codify        (Learnings extrahieren)
    → PR erstellen   (alle Checkboxen abgehakt)
```

## Hinweis

Task-Dateien werden committed – sie sind Teil der Factory-Dokumentation.
`review-*.md` und `security-*.md` können optional nach PR-Merge archiviert werden.
