# Task 231: unkritische-patch-updates

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
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
- [x] AK-1 Alle acht Zielpakete auf ihrer jeweils aktuell neuesten Version, `pnpm-lock.yaml` bestätigt
- [x] AK-2 `eslint-config-next`/`next` bleiben unverändert (16.2.12)
- [x] AK-3 `pnpm install` ohne Peer-Dependency-Konflikte
- [x] AK-4 `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm format:check`, `pnpm build` grün
- [x] AK-5 `pnpm test:e2e` grün
- [x] AK-6 Sonstige veraltete, nicht im Issue gelistete Pakete bleiben unangetastet

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
Kein ADR-Trigger erkennbar (reines Dependency-Update) – `/architecture` kann übersprungen
werden, sofern sich in `/implement` kein struktureller Umbau ergibt.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
Siehe Spec „Offene Fragen" – alle in dieser Phase entschieden.

## Review-Findings
<!-- Wird durch /review befüllt -->
Siehe [`tasks/review-231.md`](review-231.md) – drei Runden (Logik, Code-Qualität, Architektur),
keine kritischen/wichtigen Findings, zwei Nitpicks (nicht blockierend). Empfehlung: APPROVED.

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

## Implementierungs-Notizen

- Bump nur via `pnpm install` (react/react-dom, exakte Version in `package.json` manuell
  angehoben) bzw. `pnpm update <paket>` (die übrigen sechs, Caret-Range) – kein `--latest`,
  da alle Zielversionen bereits innerhalb der bestehenden Caret-Ranges liegen.
- `pnpm update` hat dabei die Caret-Ranges der sechs Pakete in `package.json` auf die neue
  Version nachgezogen (z. B. `^4` → `^4.3.3`), was `pnpm` automatisch tut, ohne dass dies extra
  angestoßen wurde – bleibt weiterhin eine reine Caret-Range, kein Scope-Verstoß.
- `pnpm exec playwright install chromium` war nötig, da der `@playwright/test`-Bump
  (1.61.1→1.62.1) eine neue Browser-Binary-Version voraussetzt (Cache-Pfad enthielt die alte
  Executable nicht mehr).
- Lokale DB (`tch-gastro-db`) war bereits als Container vorhanden, aber gestoppt – per
  `docker start tch-gastro-db` gestartet statt `pnpm db:up` (Konflikt: `docker compose up -d`
  versucht denselben Containernamen neu anzulegen, wenn er aus einem anderen Worktree/Projekt
  bereits existiert).
- Reines Dependency-Update ohne neues Verhalten – keine neuen Produkt-Tests nötig (siehe Spec
  „Nicht inbegriffen"); alle bestehenden Unit- und E2E-Tests bleiben unverändert grün.

## Test-Vollständigkeit (/test)

- `git diff origin/main...HEAD` bestätigt: kein Produktionscode geändert (nur `package.json`,
  `pnpm-lock.yaml`, Spec-/Task-/Review-Dateien) – keine neuen Codepfade, daher keine neuen Tests
  erforderlich.
- `pnpm test:coverage`: 687 Tests grün (59 skipped), Coverage 89,27 % Statements / 94,31 %
  Branches / 78,63 % Funktionen / 89,27 % Lines – über der projektweiten 80 %-Schwelle.
  Niedrig abgedeckte Dateien (`db/*.ts`) sind vorbestehend und von diesem Diff nicht berührt.
- Alle Akzeptanzkriterien (AK-1 bis AK-6) sind Versions-/Gate-Kriterien, keine
  Verhaltenskriterien – bereits in `/implement` per `pnpm outdated`, `pnpm install`,
  `pnpm test`, `pnpm build` und `pnpm test:e2e` verifiziert (siehe oben).

---
Branch: `chore/231-unkritische-patch-updates`
Erstellt: 2026-08-16 10:33
