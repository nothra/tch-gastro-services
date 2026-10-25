# Security Review: Task 443

Gegenstand: Dependency-Bump `next`/`eslint-config-next` 16.3.8 → 16.4.3 (Lockfile-Refresh, `sharp` 0.35.4 → 0.35.5). Kein Anwendungscode geändert.

## Kritische Findings (Blocker)
- keine

## Wichtige Findings
- keine

## Hinweise
- [x] Dependencies: Ziel-Advisories GHSA-2464-fhr4-w9xw, GHSA-673q-mjm6-r5xr, GHSA-p3m5-59mp-jv5r – npm-Bulk-Advisory-API: `next@16.3.8` 3 Treffer (1 high, 2 critical), `next@16.4.3` keine.
- [x] Supply-Chain: Lockfile-Diff enthält keine neuen Pakete (nur Versionswechsel von next, eslint-config-next, next-auth-Peer-Snapshot, sharp und deren Plattform-Binaries `@next/swc-*`/`@img/sharp-*`), keine `git+`/`github:`/`http`-Resolutions. Integrity-Hashes von `next`, `eslint-config-next`, `sharp` sowie je ein Plattformpaket (`@next/swc-linux-x64-gnu`, `@img/sharp-darwin-arm64`) stimmen mit der npm-Registry überein; `next@16.4.3` hat kein install/postinstall-Skript.
- [x] Konfiguration: `pnpm-workspace.yaml` nur Kommentar-Änderungen (kein Override, kein `allowBuilds`-Eintrag geändert) – Floors für postcss/sharp/js-yaml bleiben über den von next selbst gezogenen Versionen.
- [x] Erreichbarkeit: Image-Optimization-RCE und Server-Actions-DoS sind für die App erreichbar (Framework-Default `/_next/image`, Server Actions); `use cache`-RCE nicht (nicht genutzt). Rauchtest bestätigt: SVG-Quellen werden mit 400 abgelehnt, Raster-Assets (`/favicon.ico`) liefern 200.
- [ ] Offen, nicht Teil dieses PR: `pnpm audit --prod` meldet weiterhin `source-map-js` <1.2.2 (GHSA-68fv-2mgg-jv7q, high → Issue #412) und `zod` <4.6.6 (GHSA-mrhx-c7xc-m3w5, high → Issue #446).
- [ ] Nach Merge am Default-Branch prüfen: Dependabot-Alerts #87–#89, #94–#96 geschlossen (vorher nicht prüfbar).
- Prüfkatalog Input/Auth/Krypto/Error-Handling: nicht betroffen (keine Code-Änderung).

## Ergebnis
PASSED
