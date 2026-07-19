# Test-/Coverage-Analyse: Task 160

## Ergebnis: Keine neuen Tests erforderlich (reine Doku-Änderung)

Der Diff (`git diff --name-only main...HEAD`) berührt ausschließlich `.md`-Dateien:
`CONTRIBUTING.md` (Neufassung), `docs/specs/spec-160-*.md`, `tasks/task-160-*.md`,
`tasks/review-160.md`. **Kein Produktionscode** (`.ts/.tsx/.js/.sh`) geändert →
kein neuer ausführbarer Pfad, der Unit-/Integrationstests bräuchte.

## AC-Abdeckung (verifiziert, nicht per Laufzeit-Test)

Die Akzeptanzkriterien aus `spec-160` beschreiben Doku-Eigenschaften; sie wurden im
`/implement` und `/review` **statisch** belegt (das ist der passende Nachweis, kein
Vitest/Playwright-Fall):

- **AC1/AC2/AC4** (Ausrichtung app-bezogen, Factory als Werkzeug, Template-Passagen entfernt):
  Framing-Grep auf `CONTRIBUTING.md` ohne Treffer (`Factory Template`, `living document`,
  `all projects that use it`, `universal over specific`, `New skills`, `guideline extension`).
- **AC3** (Konsistenz mit README/CLAUDE.md/git-workflow.md): faktische Claims gegen die
  kanonischen Quellen geprüft (`.env.example`, pnpm-Scripts, Draft-PR + `Closes #<id>` in
  `start-work.sh`, Squash/PR-Pflicht/kein Force-Push aus ADR-029, required Checks aus
  `factory-ci.yml`).
- **AC6** (Sweep): `git grep -i template`/`weiterentwicklung` über `*.md` (ohne `docs/factory/**`,
  `tasks/**`) – verbleibende Treffer als Historie/Homonym begründet (Own-Voice vs. Historie, #144).
- **AC7** (Links): alle 10 Link-Ziele in `CONTRIBUTING.md` als existierend geprüft
  (`git ls-files`/Dateisystem), keine externen URLs, keine fragilen Section-Anker.

## Bestehende Suite

Zuletzt grün beim Commit `d256a8f` (Pre-Push-Gate): **376 passed | 52 skipped**. Seither
kein Code-Change → keine Regression, keine Coverage-Verschiebung. Coverage-Schwelle (80 %)
betrifft neuen Produktionscode – hier gibt es keinen.

## Bewusst KEIN Doc-Guard-Test hinzugefügt

Ein CI-Guard „`CONTRIBUTING.md` darf `Factory Template` nicht enthalten" wäre denkbar, aber:
- **Out of Scope:** Issue #160 fordert die Ausrichtung des Dokuments, keinen Regressions-Guard.
- **Fragil/geringer Nutzen:** Ein einmaliger Terminologie-Sweep rechtfertigt kein dauerhaftes
  Grep-Gate; es würde bei legitimer künftiger Erwähnung (z. B. Verweis auf die Factory-Herkunft)
  falsch-positiv blocken. Kein Gold-Plating (YAGNI, `clean-code.md`).

→ Kein neuer Test-Code committet; diese Notiz dokumentiert die Analyse.
