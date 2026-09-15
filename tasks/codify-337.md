## Codify-Report: Task 337

### Neue Regeln hinzugefügt

- [`docs/factory/lessons/build-tooling.md`] `next dev` (≥16.3) schreibt automatisch einen
  `<!-- BEGIN:nextjs-agent-rules -->`-Block ans Ende von `CLAUDE.md`/`AGENTS.md`. Der Block ist
  ein echtes, harmloses Framework-Feature, aber Scope-fremder Inhalt für einen fachlichen
  Task-Commit — wegen: Review-Runde 1 fand ihn im Diff eines reinen Dependency-Bumps, obwohl er
  nichts mit dem Task zu tun hat; der Blocktext selbst instruiert Agenten sogar, ihn
  mitzucommitten. Index-Zeile in `PROJECT-CONTEXT.md` ergänzt.
- [`docs/factory/lessons/build-tooling.md`] `brace-expansion`-Muster (#231) als Rezidiv
  bestätigt: ein Paket mit mehreren parallel gepflegten Major-Linien kann bei jedem erneuten
  `pnpm audit`-Check eine **neue, echte** ungedeckte Linie zeigen, nicht nur ein einmaliges
  Anzeige-Artefakt — wegen: `/security-review` fand hier eine dritte, bisher ungedeckte
  `brace-expansion@5.x`-Linie (Issue #339 angelegt).
- [`docs/factory/lessons/next-auth.md`] Ein `/_next/image`-Rauchtest gegen ein beliebiges
  `public/`-Asset kann am eigenen Auth-Proxy-Matcher scheitern (interner Self-Fetch der
  Bildoptimierung läuft durch denselben Proxy und wird für nicht ausgenommene Pfade auf
  `/login` umgeleitet), nicht an der Optimierung selbst — wegen: eigener Rauchtest während der
  Implementierung scheiterte mit "received null" gegen ein valides Testasset; Gegenprobe gegen
  einen matcher-ausgenommenen Pfad bestätigte die Ursache. Index-Zeile in
  `PROJECT-CONTEXT.md` ergänzt.

### Keine Änderungen nötig

- **Turn-Limit-Exhaustion bei `/implement`** (3 gescheiterte Versuche, dann Pipeline-Abbruch):
  bereits durch die bestehende, orchestrator-weite Lesson in `lessons/factory-workflow.md`
  abgedeckt (aus #185/#264/#324) — kein neuer Eintrag nötig, dieser Lauf bestätigt nur, dass das
  Muster weiterhin auftritt (hier: gebündelter Multi-Paket-Bump + Lockfile-Refresh + neue
  Guard-Tests in einem Durchlauf ist ein Task-Zuschnitt, der die 50-Turn-Grenze reißen kann).
- **postcss/sharp/js-yaml-No-op-Messmethode:** wurde exakt nach der bestehenden #291-Lesson
  durchgeführt (Eintrag entfernen, neu auflösen, Version prüfen) — keine neue Regel, die
  bestehende hat funktioniert.
- **Review-Zyklus (NEEDS_REWORK → Fixes → APPROVED):** ein einziger Rework-Durchlauf, kein
  Circuit-Breaker-Fall (Limit: 3 Iterationen).

### Empfehlung für nächste Features

- Bei einem gebündelten Dependency-Security-Bump mit mehreren betroffenen Paketen und
  Lockfile-Refresh: `/implement` in kleineren Schritten committen lassen (z. B. nach dem
  next-Bump selbst, dann nach jedem No-op-Override-Entfernen), damit ein Turn-Limit-Abbruch
  nicht den gesamten Fortschritt uncommitted zurücklässt.
- Nach jedem `pnpm audit`-Vollständigkeits-Check bei einem Paket mit bekannten Multi-Major-
  Linien-Advisories (`brace-expansion` u. Ä.) explizit auf **neue** Linien prüfen, nicht nur die
  bereits bekannten Ranges bestätigen — das Muster ist jetzt dreimal aufgetreten.
