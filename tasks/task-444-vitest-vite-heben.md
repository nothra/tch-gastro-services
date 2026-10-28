# Task 444: vitest-vite-heben

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
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
- [x] AK1: `vitest` und `@vitest/coverage-v8` tragen in `package.json` einen Caret-Range in 4.x mit Untergrenze >= 4.1.12, im Gleichschritt; der geschriebene Specifier steht in der Task-Notiz
- [x] AK2: `pnpm why` zeigt kein `@vitest/mocker` < 4.1.12 und kein `vite` < 8.1.6 (auch nicht transitiv)
- [x] AK3: Ein `vite`-Override (falls gesetzt) ist durch eine Frisch-Auflösung ohne Lockfile, je mit und ohne Override, als nötig belegt; sonst entfällt das AK mit Vermerk – **entfällt**, kein Override gesetzt (siehe Notiz)
- [x] AK4: `pnpm test`, `pnpm test:coverage` (>= 80 %), `pnpm lint`, Typecheck und `pnpm build` sind grün
- [x] AK5: Die DB-Integrationstests (`pnpm dotenv -e .env.local -- vitest run`) sind grün
- [x] AK6: Die npm-Bulk-Advisory-API über den Lockfile-Baum meldet für `@vitest/mocker` und `vite` keinen offenen Treffer (mit Gegenprobe gegen die Altversionen)
- [ ] Nach dem Merge: Die Dependabot-Alerts #84–#86 und #90–#93 sind geschlossen (Lesson #390)

## Technische Notizen
Nicht-ADR-würdig: Patch-Bump einer Dev-Toolchain innerhalb der Major-Linie, keine der vier Trigger-Kategorien.

**AK1 – geschriebener Specifier (Lesson #448):** `pnpm update vitest@^4.1.12 @vitest/coverage-v8@^4.1.12`
schrieb `"vitest": "^4.1.12"` und `"@vitest/coverage-v8": "^4.1.12"` (aufgelöst je 4.1.12).

**vite hängt nur als Peer im Baum.** `vitest` und `@vitejs/plugin-react` deklarieren `vite`
ausschließlich als `peerDependencies` (`^6 || ^7 || ^8` bzw. `^8.0.0`); pnpm installiert den Peer
automatisch. Auf diese Kopie wirken weder `pnpm update vite` noch ein `overrides`-Eintrag – beides
gemessen, das Lockfile blieb jeweils auf `vite@8.1.3`. Eine komplette Neuauflösung ohne Lockfile
hätte zwar `vite@8.3.5` geliefert, aber ~100 weitere Pakete mitgehoben, darunter Runtime-Deps
(`pg`, `pdfmake`, `drizzle-orm`, `@neondatabase/serverless`) – außerhalb des Scopes. Gewählter Weg:
`pnpm add -D vite@^8.1.6` (der Root-Eintrag erfüllt den Peer, Lockfile löst `vite@8.3.5` auf),
direkt danach `pnpm remove vite` – das Lockfile behält 8.3.5, `package.json` trägt am Ende nur die
zwei Specifier-Änderungen. Streuung gegenüber `main`: nur der vitest/vite-Teilbaum (u. a.
`rolldown` 1.1.4 → 1.2.15, neu `lightningcss@1.33.0`, zusätzliche Kopien `postcss@8.5.32` /
`nanoid@3.3.20` unter vite – beide über ihren Floors).

**AK2:** `pnpm why @vitest/mocker` → genau eine Version 4.1.12; `pnpm why vite` → genau eine
Version 8.3.5 (via `@vitejs/plugin-react@6.0.5`, `@vitest/mocker`, `vitest`). Durable Zusicherung:
Floor-Guard in `scripts/checks/tests/run-tests.sh` mit angehobenen Fällen `vitest`/`@vitest/mocker`
(4.1.12), neuen Fällen `@vitest/coverage-v8` (4.1.12) und `vite` (8.1.6), plus Mutationsbeleg
(Altversionen 4.1.11 / 8.1.3 zwischen altem und neuem Floor) und AK1-Check auf Caret + Gleichschritt.
RED vor dem Bump: 5 rot (genau diese Fälle), GREEN danach: 1854 grün, 0 rot.

**AK3 entfällt:** kein `vite`-Override gesetzt. Frisch-Auflösung ohne Lockfile (Wegwerf-Kopie von
`package.json` + `pnpm-workspace.yaml`, `pnpm install --lockfile-only`) ohne Override → `vite@8.3.5`,
also über dem Floor. Ein Override wäre zudem wirkungslos (Peer, s. o.). `@vitejs/plugin-react`
musste nicht mitgehoben werden (Peer `vite: ^8.0.0` erlaubt 8.3.5).

**AK4:** `pnpm lint` 0, `pnpm typecheck` 0, `pnpm test:coverage` grün (Statements 93,4 %,
Branches 98,17 %, Lines 93,16 %), `pnpm build` 0.

**AK5:** `pnpm dotenv -e .env.local -- vitest run` → 127 Dateien, 1881 Tests grün, keine Skips.
Keine Testanpassung nötig – `vi.mock` verhält sich unter `@vitest/mocker@4.1.12` unverändert.

**AK6:** `pnpm audit` nicht genutzt (Lesson #228); npm-Bulk-Advisory-API
(`/-/npm/v1/security/advisories/bulk`) über alle `packages:`-Einträge des Lockfiles (706 Pakete,
789 Versionen) → **kein einziger Treffer**. Gegenprobe mit `vite@8.1.3`, `@vitest/mocker@4.1.11`,
`vitest@4.1.11` → genau die sieben Advisories der Alerts: GHSA-qxg6-89mg-rqv8, GHSA-xp26-3454-mjgp
(mocker, `<4.1.12`) sowie GHSA-9jrq-w75r-8gcw, GHSA-rq7h-c2jc-7f22, GHSA-698v-4r3x-3vcv,
GHSA-r825-w8mm-5pxw, GHSA-587h-7wmj-h5pm (vite, `>=8.0.0 <=8.1.5`).

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

## Review-Findings
<!-- Wird durch /review befüllt -->
Iteration 1: **APPROVED** – 0 kritisch, 0 wichtig, 3 Nitpicks (Details in
[`review-444.md`](review-444.md)).

## Test-Notizen (/test)
Keine neuen Tests nötig: Die Änderung ist ein Dependency-Bump; jedes AK ist durch den Floor-Guard
in `run-tests.sh` (Floors, Mutationsbeleg + Diskriminierungs-Kontrolle, AK1-Specifier-Check) oder
einen Gate-Lauf belegt. Lauf: `run-tests.sh` 1854 grün / 0 rot; `pnpm test:coverage` Statements
93,4 %, Branches 98,17 %, Lines 93,16 % (≥ 80 %). Der DB-Integrationslauf (`dotenv -e .env.local`)
wurde in diesem Schritt nicht wiederholt (Secret-Datei-Guardrail); Beleg aus `/implement`: AK5,
1881 Tests grün, und kein Code/Test seitdem geändert. Das gitignorierte Wegwerf-Skript
`scripts/bump444.tmp.sh` konnte hier nicht gelöscht werden (`rm` nicht freigegeben) – bitte von Hand
entfernen.

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/444-vitest-vite-heben`
Erstellt: 2026-10-28 21:16
