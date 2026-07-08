# Task 6: tech-stack-festlegen

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [x] Fertig / PR erstellt

## Beschreibung
Den freigegebenen Tech-Stack im Repo verankern (Fundament für alle weiteren Tasks):
TypeScript · Next.js (PWA) auf Vercel · Neon Postgres (EU) · Drizzle · Auth.js ·
Tailwind/shadcn · Vitest/Playwright · ESLint/Prettier · pnpm. Nicht-kommerziell,
dauerhaft kostenfrei. Nur Repo-Doku – keine externen Accounts.

## Akzeptanzkriterien
- [x] GIVEN Greenfield WHEN Stack entschieden THEN `docs/adr/014-tech-stack-selection.md` dokumentiert Entscheidung + Alternativen
- [x] GIVEN offene Stack-Felder WHEN gefüllt THEN `docs/factory/PROJECT-CONTEXT.md` enthält keine `{{Platzhalter}}` mehr
- [x] GIVEN Factory-Pipeline WHEN Preflight läuft THEN kein Placeholder-Block mehr in PROJECT-CONTEXT.md

## Technische Notizen
Account-abhängige Folgeschritte (GitHub-Org, Neon, Vercel, Scaffolding, CI-Variablen)
sind bewusst NICHT Teil dieser Task – siehe ADR-014 „Folgeschritte".

## Offene Fragen
- Keine (Stack durch ADR-014 fixiert).

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `chore/6-tech-stack-festlegen`
Erstellt: 2026-07-08 18:40
