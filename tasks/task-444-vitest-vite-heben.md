# Task 444: vitest-vite-heben

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
`vitest` und `@vitest/coverage-v8` auf >= 4.1.12 heben und das Lockfile neu auflösen, sodass
`@vitest/mocker` >= 4.1.12 und `vite` >= 8.1.6 aufgelöst werden. Das schließt 7 Dependabot-Alerts
(#84–#86, #90–#93) der Dev-/Test-Toolchain. Spec:
[`docs/specs/spec-444-vitest-vite-dev-toolchain-alerts.md`](../docs/specs/spec-444-vitest-vite-dev-toolchain-alerts.md)

## Akzeptanzkriterien
- [ ] AK1: `vitest` und `@vitest/coverage-v8` tragen in `package.json` einen Caret-Range in 4.x mit Untergrenze >= 4.1.12, im Gleichschritt; der geschriebene Specifier steht in der Task-Notiz
- [ ] AK2: `pnpm why` zeigt kein `@vitest/mocker` < 4.1.12 und kein `vite` < 8.1.6 (auch nicht transitiv)
- [ ] AK3: Ein `vite`-Override (falls gesetzt) ist durch eine Frisch-Auflösung ohne Lockfile, je mit und ohne Override, als nötig belegt; sonst entfällt das AK mit Vermerk
- [ ] AK4: `pnpm test`, `pnpm test:coverage` (>= 80 %), `pnpm lint`, Typecheck und `pnpm build` sind grün
- [ ] AK5: Die DB-Integrationstests (`pnpm dotenv -e .env.local -- vitest run`) sind grün
- [ ] AK6: Die npm-Bulk-Advisory-API über den Lockfile-Baum meldet für `@vitest/mocker` und `vite` keinen offenen Treffer (mit Gegenprobe gegen die Altversionen)
- [ ] Nach dem Merge: Die Dependabot-Alerts #84–#86 und #90–#93 sind geschlossen (Lesson #390)

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/444-vitest-vite-heben`
Erstellt: 2026-10-28 21:16
