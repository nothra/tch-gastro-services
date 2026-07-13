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

Zwei Deliverables (als echte Dateien auf dem Branch committet):
1. `.claude/launch.json` – Dev-Server-Config `dev` (`pnpm dev`, Port 3000), damit
   `preview_start`/Browser-Pane den Server per Name starten.
2. `.claude/commands/implement.md` – Schritt 4 um verpflichtende Oberflächentests bei
   UI-berührenden Tasks erweitert.

Weg dorthin: Der Agent kann `.claude/**` nicht per Edit/Write schreiben (#88-Grenze). Die
Änderungen wurden daher als programmatisch erzeugte Patches geliefert, vom Menschen mit
`git apply` im Worktree eingespielt und anschließend über `factory-commit.sh` committet
(git-Commit von `.claude/**` läuft über den ADR-019-Seam, nicht über das gesperrte Tool).

## Akzeptanzkriterien
- [x] GIVEN `.claude/launch.json` committet WHEN geparst THEN valides JSON mit
      `configurations[0].name == "dev"`, `runtimeExecutable == "pnpm"`,
      `runtimeArgs == ["dev"]`, `port == 3000`.
- [x] GIVEN `.claude/commands/implement.md` committet WHEN Schritt 4 gelesen wird
      THEN Abschnitt „Oberflächentests bei UI-berührenden Tasks" vorhanden, nennt `pnpm db:up`,
      `pnpm test:e2e` (Playwright, `e2e/*.spec.ts`) und interaktive Browser-Verifikation.
- [x] GIVEN die neue Regel WHEN Oberflächentests eingeordnet werden THEN dokumentiert als
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
Blocker [2026-07-13] (AUFGELÖST): `.claude/**` per #88-Grenze für den Agenten hard-denied.
Aufgelöst durch: Mensch hat die gelieferten Patches im Worktree mit `git apply` eingespielt;
die echten Dateien sind jetzt committet. Die Patch-Dateien wurden anschließend wieder entfernt.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `chore/98-oberflaechentests-lokaler-dev-server`
Erstellt: 2026-07-13 17:30
