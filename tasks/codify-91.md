## Codify-Report: Task 91

### Neue Regeln hinzugefügt

- **`docs/factory/guidelines/bash-gotchas.md` – Gotcha #5: Shell-Test-Isolation: alle `source`-Abhängigkeiten mitkopieren**
  Wegen: Nach dem Patch liefen 3 Self-Tests rot, weil `run-pipeline.sh` neu
  `scripts/lib/report-verdict.sh` sourct und die Testaufbauten die Datei nicht mit in das Temp-Verzeichnis
  kopierten. Unter `set -euo pipefail` bricht der `source`-Aufruf sofort ab – noch vor dem eigentlich
  getesteten Code. Das Testergebnis war ein falsches Rot, das den echten Befund verdeckte. Fix: alle
  drei Testaufbauten um `cp scripts/lib/report-verdict.sh "$tmp/scripts/lib/"` ergänzt.

- **`docs/factory/PROJECT-CONTEXT.md` – Bekannter Stolperstein: Report-Guard Stale-Verdict (Issue #92)**
  Wegen: `run_skill()` liest die Report-Datei ohne Frischheitscheck. Bei Pipeline-Re-Läufen auf
  Branches mit bereits committeten Reports (APPROVED/PASSED) akzeptiert der Guard den alten Verdict
  als Erfolg – auch wenn in diesem Lauf kein Review stattfand. Fail-open statt fail-closed (gegen
  Spec/ADR-019 §4). Review-Finding (`run-pipeline.sh:239-246`). Fix geplant als Issue #92.

- **`docs/factory/PROJECT-CONTEXT.md` – Bekannter Stolperstein: `.claude/**`-Änderungen erfordern Patch-Workflow**
  Wegen: Änderungen an `.claude/settings.json` und Skill-Dateien (`implement`/`test`/`refactor`/
  `bug-fix.md`) sind für den Agenten hard denied (#88-Grenze). Auch `factory.defaults.yml` liegt
  außerhalb der Allow-Liste. Der Agent liefert diese Änderungen als Patch-Datei; der Mensch wendet
  ihn per `git apply` an. Das Muster war bekannt, aber nicht als Regel dokumentiert.

### GitHub-Issue angelegt

- **Issue #92:** „Preflight: Stale-Report löschen bevor run_skill() den Report-Guard prüft"
  (`enhancement` + `tech-debt`). Concretely: Report-Datei im Preflight löschen analog zu
  INTERRUPT-Sentinel-Cleanup.

### Keine Änderungen an CLAUDE.md oder universellen Guidelines nötig

Die Gotcha-Ergänzung (bash-gotchas.md) und die Stolpersteine (PROJECT-CONTEXT.md) sind der
richtige Scope – keine fundamentale Factory-Regel und kein neues universelles Prinzip.

### Positives aus dieser Task

- **TDD-first mit git-Stubs** hat sauber funktioniert: Wrapper + Guard als Shell-Logik, komplette
  Testabdeckung (Happy-Path via Bare-Remote, Fehlerszenarien, Permissions- und Skill-Doku-Konsistenz),
  254 grün / 0 rot.
- **Geteilter Verdict-Helper** (`scripts/lib/report-verdict.sh`, ADR-019 §4) verhindert Drift
  zwischen Guard und `pipeline_summary()` – eine kanonische Quelle, kein Copy-Paste.
- **Granulare Permissions** (kein pauschales `Bash(git *)` / `Bash(gh *)`) und korrekte
  deny-Liste (`.claude/**`, `.env*`) halten die Sicherheitsfläche minimal.
- **Patch-Workflow** für `.claude/**`-Änderungen funktionierte reibungslos als Fallback.

### Empfehlung für nächste Features

- Issue #92 (Preflight-Cleanup) vor dem nächsten Stage-3-Re-Lauf beheben – das ist der
  einzige verbleibende Fail-open-Pfad im Report-Guard.
- Bei künftigen Tasks, die Shell-Skripte durch neue `source`-Aufrufe erweitern: Testaufbauten
  sofort prüfen (Faustregel aus Gotcha #5).
