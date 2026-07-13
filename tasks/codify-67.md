## Codify-Report: Task 67

### Neue Regeln hinzugefügt

**`docs/factory/PROJECT-CONTEXT.md` – Bekannte Stolpersteine:**

- **Debug-Artefakte nicht durch .gitignore gedeckt** (`*.tmp.txt`, `*debug.tmp.sh`):
  Im Lint-Debugging entstanden zwei temporäre Dateien (`lint-out.tmp.txt`,
  `scripts/lint-debug.tmp.sh`), die der Review als zu entfernendes „Wichtiges Finding"
  markierte. `*.log` und `*-debug.log*` sind in `.gitignore` bereits abgedeckt, aber
  `.tmp`-Muster nicht. Änderung: `.gitignore` um `*.tmp.txt` und `*.tmp.sh` erweitert
  (damit `git add .` solche Dateien nicht aufnimmt) und Regeln in Stolpersteine aufgenommen.

**`.gitignore` – ergänzt:**
- `*.tmp.txt` und `*.tmp.sh` hinzugefügt, sodass Debugging-Artefakte dieses Musters
  automatisch ignoriert werden.

### Kein zusätzliches Backlog-Issue erstellt

- **FS-2 (Gate-Retry):** Der Review empfahl ein separates Follow-up für einen
  Gate-seitigen Retry-Mechanismus (globaler Zähler könnte unter aktivem Flood den
  einzelnen Deploy-Gate-`curl` mit `429` treffen). ADR-020 dokumentiert dies als
  bewusst akzeptierten Trade-off. Der Effekt ist bereits abgefedert (fail-open bei
  Cold-Start, strukturell weit unter dem Schwellwert, `429 ≠ 503`). Als Backlog-Kandidat
  für einen geteilten Store (Upstash/Vercel KV) notiert – kein Issue angelegt, da der
  Review ihn explizit als „nicht in diesem PR erzwingen" eingestuft hat und kein
  eigenständiger Aufwand ohne konkreten Neon-Free-Kostendruck gerechtfertigt ist.

- **Stage-Env-Branch-Coverage:** `process.env.NEXT_PUBLIC_STAGE ?? "dev"` mit gesetztem
  Env ist untested (Nitpick aus dem Review). Vorbestehende Zeile, marginale Branch-Coverage-
  Lücke. Kein Issue, da es sich um eine kosmetische Coverage-Lücke in einer reinen
  Umgebungsvariablen-Fallback-Zeile handelt.

### WHAT-Kommentar am Modul-Level (Refactoring-Finding)

Der Kommentar `Die Route importiert nur diese Instanz und bleibt dünn.` beschrieb aus
Konsumenten-Perspektive, wie der Singleton genutzt wird – nicht warum er existiert.
Das ist ein WHAT-Kommentar in einer Modul-Definition, der bei gut benamsten Code nichts
zur Verständlichkeit beiträgt. Er wurde im Refactoring-Pass entfernt. Kein neuer Eintrag
in den Guidelines nötig; `clean-code.md` deckt das Prinzip bereits ab. In `PROJECT-CONTEXT.md`
als konkretes Muster (Modul-Level ≠ Call-Site) dokumentiert.

### Positives aus dieser Task

- **Factory/DI-Muster** für den Rate-Limiter funktioniert hervorragend: injizierbare Uhr
  ermöglicht vollständig deterministisch testbaren Code ohne echten Timer oder DB.
- **AK-4-Nachweis via `selectSpy`** (Spy, der beweist, dass der DB-Read im Throttle-Pfad
  nicht aufgerufen wird) ist ein robustes Testmuster für „Guard verhindert teure Operation".
- Die `proxy.ts`-Regel aus #63 wurde korrekt angewendet (`api/health` im Negativ-Lookahead).
  Kein Regression-Incident.
- **ADR-020** mit vier explizit entschiedenen offenen Fragen ist ein gutes Template:
  Frage → Entscheidung → Alternativen → Begründung.

### Empfehlung für nächste Features

- **`.tmp`-Muster in .gitignore prüfen** bevor ein Feature Debugging-Skripting nutzt –
  jetzt erledigt, sollte nicht erneut auftreten.
- Bei Rate-Limiting in anderen Kontexten: das `createRateLimiter`-Factory-Muster aus
  `lib/rate-limit.ts` ist wiederverwendbar und bereits gut getestet.
