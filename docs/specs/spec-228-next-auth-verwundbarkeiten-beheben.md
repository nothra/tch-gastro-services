# Spec: next-auth/@auth/core-Verwundbarkeiten beheben

## Kontext

`pnpm audit` meldet 20 Findings (3 kritisch, 10 high, 7 moderate) in `next-auth`/`@auth/core`,
aus dem Security-Review von Task #189 als eigener Task ausgelagert (dort nur uuid/exceljs
behandelt). Betroffen:

- **GHSA-8fpg-xm3f-6cx3** (next-auth): Provider-Konfigurationsfehler können dazu führen, dass
  `auth`/Session-Objekte mit einem Error befüllt statt `null` zurückgegeben werden – ein
  existence-basierter Check wie `!!auth?.user` (genau das Pattern in `auth.config.ts`) würde in
  diesem Fall fail-open statt fail-closed auswerten.
- **GHSA-7rqj-j65f-68wh** (next-auth) / zugehöriges `@auth/core`-Finding: Der Standard-E-Mail-
  Normalizer validiert vor Unicode-Normalisierung – ein Homoglyph-`@`-Zeichen kann die
  E-Mail-Validierung umgehen.

**Rechercheergebnis (löst die im Issue offene Frage auf):** Ein Wechsel auf eine *stabile*
next-auth-v5-Major-Version ist nicht möglich – laut npm-Dist-Tags existiert weiterhin keine
`5.0.0`-Stable-Version (`beta` zeigt aktuell auf `5.0.0-beta.32`, `latest` noch auf die
v4-Linie). Beide Advisories sind bereits in der Beta-Linie gepatcht:
`next-auth@5.0.0-beta.32` (Release-Notes) behebt den Fail-open-Fall explizit ("a non-OK session
response now yields no session instead of an error object, so checks like `!!auth` fail
closed") und zieht `@auth/core@0.41.3` (Release-Notes: NFKC-Normalisierung vor der
E-Mail-Validierung, schließt den Homoglyph-Bypass). Der Fix ist damit ein reiner
**Patch-Bump innerhalb der bestehenden Beta-Linie** (ADR-014: Auth.js/NextAuth v5 ist die
getroffene Tech-Stack-Entscheidung), keine Migration.

`@auth/core` ist nur transitiv über `next-auth` gepinnt (`pnpm-lock.yaml`, aktuell `0.41.2`) –
kein direkter `package.json`-Eintrag, kein Override in `pnpm-workspace.yaml` nötig (anders als
bei den tief-transitiven Fällen `uuid`/`postcss`/`esbuild` aus #189/ADR-010): Der direkte
Versions-Bump von `next-auth` hebt `@auth/core` automatisch mit an.

## Scope

**Inbegriffen:**
- `next-auth` in `package.json` von `5.0.0-beta.31` auf `5.0.0-beta.32` anheben.
- `pnpm-lock.yaml` entsprechend aktualisieren (`@auth/core` landet dabei bei `>=0.41.3`).
- Verifikation: bestehende Auth-/RBAC-/Proxy-Tests (`auth.config.test.ts`, `lib/authz.test.ts`,
  `e2e/auth.spec.ts`) bleiben grün, `pnpm typecheck` bleibt grün (Breaking-Change-Check gegen
  `auth.config.ts`/`auth.ts`/`types/next-auth.d.ts`).

**Nicht inbegriffen:**
- Migration auf next-auth v5 stable (existiert noch nicht) oder Downgrade auf v4 (eigene
  Architektur-Entscheidung, eigener Task/ADR bei Bedarf).
- Änderungen an Provider-Konfiguration, Callback-Logik oder RBAC-Verhalten – der Fix behebt die
  Verwundbarkeit auf Dependency-Ebene, nicht durch Anpassung von `auth.config.ts`.
- Ein `pnpm-workspace.yaml`-Override für `@auth/core` (nicht nötig, siehe Kontext).

## Akzeptanzkriterien

- [ ] GIVEN `package.json` mit `"next-auth": "5.0.0-beta.31"` WHEN das Dependency-Update
      durchgeführt wird THEN steht in `package.json` `"next-auth": "5.0.0-beta.32"`.
- [ ] GIVEN das aktualisierte `package.json` WHEN `pnpm install` läuft THEN weist
      `pnpm-lock.yaml` `@auth/core` in Version `>=0.41.3` aus (Lockfile-Check als
      Ersatzkriterium für `pnpm audit`, siehe unten).
- [ ] GIVEN die aktualisierten Pakete WHEN die volle Test-Suite läuft (`pnpm test`) THEN sind
      alle bestehenden Tests weiterhin grün, insbesondere `auth.config.test.ts`,
      `lib/authz.test.ts`.
- [ ] GIVEN die aktualisierten Pakete WHEN `pnpm typecheck` läuft THEN treten keine neuen
      Typfehler auf (insb. `types/next-auth.d.ts`, `auth.config.ts`, `auth.ts`).
- [ ] GIVEN die aktualisierten Pakete WHEN die E2E-Suite läuft (`pnpm test:e2e`,
      `e2e/auth.spec.ts`) THEN bleibt der Login-/RBAC-Flow unverändert funktionsfähig.
- [ ] GIVEN die aktualisierten Pakete WHEN `pnpm audit` ausgeführt wird (falls der
      Audit-Endpoint in der jeweiligen Umgebung erreichbar ist) THEN werden keine
      next-auth/@auth/core-Findings mehr gemeldet. Ist der Endpoint nicht erreichbar
      (beobachtet in dieser Sandbox: kaputte/nicht dekomprimierte Antwort), gilt stattdessen
      der Lockfile-Check oben als Nachweis.

## Fehlerszenarien

- [ ] Falls `pnpm install` mit `next-auth@5.0.0-beta.32` einen Peer-Dependency-Konflikt meldet:
      Konflikt analysieren, bevor der Bump committet wird (kein `--force`/`--no-strict-peer-dependencies`
      ohne Prüfung der Ursache).
- [ ] Falls Tests oder Typecheck nach dem Bump fehlschlagen: Ursache in
      `auth.config.ts`/`auth.ts`/`types/next-auth.d.ts` lokalisieren (Signatur-/Typänderung in
      `@auth/core`), nicht pauschal Tests anpassen, um sie grün zu bekommen.

## Offene Fragen

- [ ] **Backlog-Hinweis (kein aktiver Task):** next-auth-v5-Stable-Release beobachten. Sobald
      ein stabiles `5.0.0` erscheint, sollte ein eigener Task den Wechsel von der Beta- auf die
      Stable-Linie prüfen (Breaking-Change-Review gegen `auth.config.ts`/`auth.ts`).
