# Review: Task 160

Diff: `CONTRIBUTING.md` (Neufassung), `docs/specs/spec-160-*.md`, `tasks/task-160-*.md`.
Reine Doku-Änderung – kein Produktionscode, keine Routen (`app/**/page.tsx`,
`app/api/**/route.ts`) berührt → `docs/routes.md`-Pflege (#145) nicht einschlägig.

## Kritische Findings (müssen behoben werden)
- keine

## Wichtige Findings (sollten behoben werden)
- [ ] `CONTRIBUTING.md` (Abschnitt „Arbeitsweise", Punkt 5): **Typecheck** ist als „required
      Check" gelistet – das ist faktisch falsch. Die CI (`.github/workflows/factory-ci.yml`) hat
      Jobs `issue-sync`, `factory-self-test`, `lint`, `test`; **kein** Typecheck-Job. Typecheck
      läuft nur als **lokales pre-push-Gate** (`scripts/checks/pre-push.sh`, #137), nicht als
      required CI-Check (vgl. #155-Learning: required = lint, test, issue-sync, factory-self-test,
      pr-closes-issue). Da diese Task gerade Doku-Genauigkeit herstellt, korrigieren:
      „(Lint, Tests, Issue-Sync, Self-Test u. a.)" statt „(Lint, Tests, Typecheck, Issue-Sync u. a.)".

## Nitpicks (optional)
- keine

## Positives
- Alle 7 Akzeptanzkriterien der Spec erfüllt: Titel/Einleitung app-bezogen (AC1), Factory als
  Werkzeug klar (AC2, Blockquote + README-Verweis), Setup-/PR-Workflow konsistent zu README/
  CLAUDE.md/git-workflow.md (AC3), Beitragsarten app-bezogen + Template-Versionierung/„universal
  over specific" entfernt (AC4), verbindliche Konventionen verlinkt (AC5), Sweep sauber (AC6).
- Faktische Claims verifiziert: `.env.example` (tracked), `pnpm dev/db:up/db:migrate/db:seed`
  (package.json), Draft-PR + `Closes #<id>` (start-work.sh), Squash-Merge/PR-Pflicht/kein
  Force-Push (ADR-029). Referenzierte README-Abschnitte existieren wörtlich.
- AC7: 9/9 Links zeigen auf existierende Ziele; keine fragilen Section-Anker, keine externen
  URLs mehr (kein Bruchrisiko).
- Sweep-Nicht-Änderungen vorbildlich begründet (Own-Voice vs. Historie, #144): ADRs/CHANGELOG
  als Historie erhalten, „Template"-Homonyme (ADR-Boilerplate, Excel-/Preis-Template) korrekt
  ausgenommen, `.claude/**`/`docs/factory/**` bewusst außerhalb Scope.

## Empfehlung
NEEDS_REWORK
