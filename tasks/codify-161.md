## Codify-Report: Task 161

### Neue Regeln hinzugefügt

- **`docs/factory/PROJECT-CONTEXT.md` (Bekannte Stolpersteine): „Review-Diff-Scope: `git diff
  main...HEAD` zeigt Fremd-PRs, wenn lokales `main` hinter `origin/main` liegt (aus #161)"** –
  wegen des Fehler-Musters, das in **diesem Lauf zweimal auftrat** (in `/review` und
  `/security-review`): Der `main...HEAD`-Diff der Review-Skills nutzt die Merge-Basis; da
  `start-work.sh`-Worktrees auf `origin/main` basieren, das lokale `main` aber stehen bleibt,
  enthielt der Diff die bereits gemergten #170-Dateien als Fremd-Noise. Regel: Scope gegen
  `origin/main...HEAD` bestimmen; bei unerwarteten Dateien zuerst die Scope-Referenz prüfen.

### Autonome Folge-Issues (ADR-018)

- **#176** – „Review-/Security-/Refactor-Skills: Diff-Scope gegen origin/main statt main
  bestimmen" (`enhancement` + `tech-debt`). Die vier Skill-Dateien
  (`.claude/commands/{review,security-review,refactor,pr-shepherd}.md`) verdrahten `main...HEAD`
  fest. Fix ist ein Harness-Change unter `.claude/**` (agent-hard-denied → Patch-Workflow) und
  damit **außerhalb** des #161-Doku-Scopes. Die PROJECT-CONTEXT-Regel verweist auf #176.

### Keine weiteren Änderungen nötig

- **Review** (`tasks/review-161.md`): 0 kritische / 0 wichtige Findings, 1 optionaler, bewusst
  nicht behobener Nitpick (in §1.3 bereits reconciled) → keine Regel ableitbar.
- **Security** (`tasks/security-161.md`): PASSED, keine Findings → keine Regel.
- **Refactor**: eine Prosa-Duplikation entfernt – Einzelfall, kein wiederkehrendes Muster → keine
  Regel (das zugrundeliegende Prinzip „keine Duplikation" steht bereits in `clean-code.md`).
- **Kein Reflex-Check-Skript** für die Doku-AC ergänzt (Codify-Grundsatz OPERATING §5.1: nur bei
  verlässlich grep-barem **und** wiederkehrendem Fehler) – hier ein einmaliger Prosa-Reframe.

### Empfehlung für nächste Features

- Bei jedem Skill, der `git diff main...HEAD` als Kontext lädt, bis zur Umsetzung von **#176**
  bewusst `git fetch origin && git diff origin/main...HEAD` verwenden – besonders in
  Worktrees direkt nach `start-work.sh`.
- Für reine Doku-Tasks bleibt der Pfad tragfähig: `/test` = Regressions-Suite + Prettier +
  AC-Grep (kein neuer Test-Code), `/security-review` = Angriffsflächen-Check (n/a mangels Code).
