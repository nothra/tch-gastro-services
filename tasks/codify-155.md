## Codify-Report: Task 155

### Neue Regeln hinzugefügt

- **[docs/factory/PROJECT-CONTEXT.md – Ergänzung #120-Eintrag]** „Ist der Draft-PR schon
  offen, schließt *jede* Rename-Variante ihn." – wegen: Bei der Branch-Typ-Korrektur
  (feature→docs, #120-Regel) schloss die GitHub-Branch-Rename-API den offenen Draft-PR #156,
  statt ihn zu retargeten. Der bestehende #120-Eintrag empfahl `git push origin --delete <old>`,
  was denselben Effekt hat – der Eintrag war für den Open-PR-Fall unvollständig. Ergänzt um den
  5-Schritt-PR-Ersatz-Ablauf (statt Parallel-Eintrag: kanonische Quelle erweitert).

- **[docs/factory/PROJECT-CONTEXT.md – neuer Stolperstein]** „Branch-Protection required Checks:
  nur `pull_request`-getriggerte Jobs." – wegen: Beim Ruleset-Setup wäre es naheliegend gewesen,
  `gate`/`post-merge-verify` als required zu setzen; beide laufen aber nur auf `push`→`main` und
  hätten jeden PR-Merge dauerhaft blockiert (`skipped` bzw. gar kein Check-Run auf PRs). Regel +
  Verifikationsbefehl (`gh api …/check-runs`) festgehalten, kanonisch verweist auf ADR-029.

### Bestätigt (kein neuer Regelbedarf)

- **#117-Muster erneut aufgetreten und vom Review gefangen:** `/implement` lieferte in Runde 1
  einen Guard, der nur die Direktive (`ADR-029`-Token) prüfte, nicht die AC3-Rationale (Framing).
  Genau die codifizierte #117-Regel. Der Loop hat funktioniert (Review → Rework → APPROVED) –
  **keine** neue Regel, aber ein Signal: die #117-Regel wird beim Implementieren noch nicht
  proaktiv angewandt, sondern erst im Review eingelöst. Bewusst keine weitere Regel (würde die
  bestehende nur duplizieren); Awareness bleibt der Hebel.

### Keine Änderungen an CLAUDE.md / Guidelines

Die zwei Learnings sind operative GitHub-/Prozess-Gotchas → gehören in „Bekannte Stolpersteine"
(PROJECT-CONTEXT.md), konsistent mit den benachbarten Einträgen (#120/#145/#114). Keine
fundamentale Factory-Regel und kein universelles Prinzip berührt. Kein neuer `scripts/checks/`-
Check: beide Learnings sind nicht sinnvoll statisch automatisierbar (GitHub-API-Verhalten bzw.
Live-Check-Runs brauchen Netz).

### Kein Out-of-Scope-Issue

Kein Learning erfordert eigenständige Folge-Arbeit. Der Security-Hinweis (`/security-review` als
required Check statt Pipeline-Schritt) ist eine Design-Frage der Autonomie-Architektur (ADR-008/
ADR-019) und bewusst **nicht** als spekulatives Backlog-Issue angelegt.

### Empfehlung für nächste Features

- Bei jeder Branch-Typ-Korrektur nach `/architecture` zuerst prüfen, ob `start-work.sh` den
  Draft-PR schon angelegt hat – dann direkt den PR-Ersatz-Weg gehen (nicht rename-and-hope).
- Beim Anfassen von Branch-Protection/required Checks immer gegen echte PR-Check-Runs
  verifizieren, nie gegen die Job-Namen im Workflow-YAML.
