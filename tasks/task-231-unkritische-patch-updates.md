# Task 231: unkritische-patch-updates

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Unkritische Patch-/Minor-Updates für acht Pakete (react, react-dom, prettier, tailwindcss,
@tailwindcss/postcss, tsx, @vitejs/plugin-react, @playwright/test). Details, Ist-Stand-Tabelle
und zwei Abweichungen vom Issue-Text (aktuellste statt Issue-Zielversion; eslint-config-next
aus dem Scope genommen) in [`docs/specs/spec-231-unkritische-patch-updates.md`](../docs/specs/spec-231-unkritische-patch-updates.md).

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [ ] AK-1 Alle acht Zielpakete auf ihrer jeweils aktuell neuesten Version, `pnpm-lock.yaml` bestätigt
- [ ] AK-2 `eslint-config-next`/`next` bleiben unverändert (16.2.12)
- [ ] AK-3 `pnpm install` ohne Peer-Dependency-Konflikte
- [ ] AK-4 `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm format:check`, `pnpm build` grün
- [ ] AK-5 `pnpm test:e2e` grün
- [ ] AK-6 Sonstige veraltete, nicht im Issue gelistete Pakete bleiben unangetastet

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
Kein ADR-Trigger erkennbar (reines Dependency-Update) – `/architecture` kann übersprungen
werden, sofern sich in `/implement` kein struktureller Umbau ergibt.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
Siehe Spec „Offene Fragen" – alle in dieser Phase entschieden.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `chore/231-unkritische-patch-updates`
Erstellt: 2026-08-16 10:33
