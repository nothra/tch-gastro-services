# Task 98: oberflaechentests-lokaler-dev-server

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Oberflächentests werden fester Bestandteil der Implementierungsphase (`/implement`) –
ausgeführt gegen einen **lokal gestarteten Dev-Server** (`pnpm dev`, http://localhost:3000).
Grund: Unit-grün auf Vitest-Ebene ≠ UI-/Proxy-grün (vgl. #63, wo ein Handler-Direktaufruf
die `proxy.ts`-Ebene umging). Die Lücke wird schon in der Implementierungsphase geschlossen,
nicht erst in CI/post-merge.

Zwei Deliverables, beide als Patch (`.claude/**` ist per #88-Grenze hard-denied – Patch-Workflow):
1. `tasks/patch-launch-json.diff` – legt `.claude/launch.json` mit Dev-Server-Config `dev`
   (`pnpm dev`, Port 3000) an, damit `preview_start`/Browser-Pane den Server per Name starten.
2. `tasks/patch-implement-surface-tests.diff` – erweitert Schritt 4 in
   `.claude/commands/implement.md` um verpflichtende Oberflächentests bei UI-berührenden Tasks.

## Akzeptanzkriterien
- [ ] GIVEN die Patch-Dateien liegen im Branch WHEN `git apply --check tasks/patch-launch-json.diff`
      und `... patch-implement-surface-tests.diff` laufen THEN exit 0 (beide sauber anwendbar).
- [ ] GIVEN `patch-launch-json.diff` angewendet WHEN `.claude/launch.json` geparst wird
      THEN valides JSON mit `configurations[0].name == "dev"`, `runtimeExecutable == "pnpm"`,
      `runtimeArgs == ["dev"]`, `port == 3000`.
- [ ] GIVEN `patch-implement-surface-tests.diff` angewendet WHEN `implement.md` Schritt 4 gelesen wird
      THEN Abschnitt „Oberflächentests bei UI-berührenden Tasks" vorhanden, nennt `pnpm db:up`,
      `pnpm test:e2e` (Playwright, `e2e/*.spec.ts`) und interaktive Browser-Verifikation.
- [ ] GIVEN die neue Regel WHEN Oberflächentests eingeordnet werden THEN dokumentiert als
      *zusätzlich* zu den pre-push-Gates (Lint + `pnpm test`), nicht als deren Ersatz.

## Technische Notizen
- `playwright.config.ts` startet lokal den Dev-Server bereits selbst
  (`webServer: { command: "pnpm dev", reuseExistingServer: !CI }`), Voraussetzung ist die
  lokale DB (`pnpm db:up` + `.env.local`).
- Patches wurden programmatisch erzeugt (nicht von Hand, vgl. #94) und in einem Spiegel-Repo
  real angewendet + per Assertion geprüft (JSON valide/Port 3000; Skill-Abschnitt vorhanden).

## Offene Fragen
- Keine.

## Blocker
Blocker [2026-07-13]: `.claude/launch.json` und `.claude/commands/implement.md` sind per
#88-Grenze hard-denied – der Agent kann sie nicht direkt schreiben. Der Mensch wendet nach
dem Merge `git apply tasks/patch-launch-json.diff` und `git apply tasks/patch-implement-surface-tests.diff`
an (Reihenfolge egal, beide unabhängig).

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `chore/98-oberflaechentests-lokaler-dev-server`
Erstellt: 2026-07-13 17:30
