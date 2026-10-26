# Spec: zod auf >= 4.6.6 heben (GHSA-mrhx-c7xc-m3w5)

## Kontext
Dependabot-Alert **#97** (high): `zod` `< 4.6.6` kann bei der Validierung übergroßer, eingeschränkter
Collections den Speicher erschöpfen (GHSA-mrhx-c7xc-m3w5). `zod` ist Laufzeit-Abhängigkeit und
validiert Eingaben an den Server-Grenzen (Server Actions, Route Handlers). Aktuell aufgelöst:
`zod@4.4.3` (`package.json`: `^4.4.3`). Einordnung: vor #444 (vitest/vite, Dev-Toolchain).

## Scope
**Inbegriffen:** `zod` auf eine gefixte Version (>= 4.6.6, Caret innerhalb 4.x) heben; Lockfile neu
auflösen; Gates und Build grün; Verhalten der bestehenden Validierungen unverändert.
**Nicht inbegriffen:** Neue Validierungslogik oder Größenlimits; andere Dependabot-Alerts (u. a. #444);
Änderungen an Schemas, sofern der Bump sie nicht erzwingt.

## Akzeptanzkriterien
- [ ] AK1: GIVEN `package.json` WHEN `zod` geprüft wird THEN steht dort ein Caret-Range in 4.x mit Untergrenze >= 4.6.6.
- [ ] AK2: GIVEN `pnpm-lock.yaml` WHEN alle aufgelösten `zod`-Versionen gelistet werden (`pnpm why zod`) THEN ist keine Version < 4.6.6 enthalten (auch nicht transitiv).
- [ ] AK3: GIVEN der Bump WHEN `pnpm test`, `pnpm lint`, Typecheck und `pnpm build` laufen THEN sind alle grün.
- [ ] AK4: GIVEN die DB-Integrationstests WHEN sie mit `pnpm dotenv -e .env.local -- vitest run` laufen THEN sind sie grün (Zod-Meldungs-/Obergrenzen-Tests unverändert).
- [ ] AK5: GIVEN die Advisory-Prüfung (npm-Bulk-Advisory-API über den Lockfile-Baum, Lesson #390) WHEN sie nach dem Bump läuft THEN meldet sie für `zod` keinen offenen Treffer.

## Fehlerszenarien
- [ ] Der Bump bricht Typen oder Fehlermeldungstexte bestehender Schemas → Anpassung auf das Minimum beschränken, Abweichung in der Task-Datei dokumentieren.
- [ ] Eine transitive Abhängigkeit hält `zod` < 4.6.6 → Override als Caret in derselben Major-Linie (Lesson #291/#339).

## Offene Fragen
- [ ] Dependabot-Alert #97 lässt sich vor dem Merge nicht als geschlossen prüfen (nur Default-Branch) – Nach-Merge-Prüfung (Lesson #390).
