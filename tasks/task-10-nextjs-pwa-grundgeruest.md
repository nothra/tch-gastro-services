# Task 10: nextjs-pwa-grundgeruest

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [x] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [x] Fertig / PR erstellt

## Beschreibung
Lauffähiges Next.js-Grundgerüst (App Router, TypeScript, pnpm) im Repo-Root neben der
Factory: Tailwind v4, ESLint + Prettier, Vitest + Smoke-Test, Web-App-Manifest (PWA,
installierbar), minimale TCH-Startseite. Next 16.2 / React 19.

## Akzeptanzkriterien
- [x] GIVEN frisches Gerüst WHEN `pnpm install/lint/test/build` am Repo-Root THEN alle grün (Test 1/1, Build inkl. Route `/manifest.webmanifest`)
- [x] GIVEN Prettier WHEN `pnpm format:check` THEN grün (auf App-Code beschränkt; Factory-Dateien via .prettierignore ausgenommen)
- [x] GIVEN Manifest WHEN gebaut THEN `/manifest.webmanifest` + `/icon.svg` vorhanden → installierbar (Homescreen)
- [x] GIVEN Repo WHEN committed THEN node_modules/.next/next-env.d.ts ignoriert; pnpm-lock.yaml committet

## Technische Notizen
- pnpm 11 blockiert Post-install-Builds → `allowBuilds: {sharp, unrs-resolver}` in `pnpm-workspace.yaml`.
- Prettier auf App-Code eingegrenzt; docs/tasks/scripts/.github/.claude bleiben hand-gepflegt.
- **Bewusst DEFERRED** (Folge-Tasks): Service Worker via @serwist (nur Manifest jetzt),
  shadcn/ui, Playwright/E2E, Drizzle+Neon-Schema, Auth.js-Verdrahtung (brauchen Env/Neon).
- CI-Gates (`FACTORY_LINT/TEST_COMMAND` + Node/pnpm-Setup im Workflow) sind eigener Folge-Task.

## Offene Fragen
- Keine (Gerüst lokal verifiziert).

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/10-nextjs-pwa-grundgeruest`
Erstellt: 2026-07-08 21:27
