# Spec: next auf ≥ 16.3.3 heben — kritische unauth. RCE (2 GHSAs) + Deps-Durchgang

## Kontext

Dependabot meldet zwei **kritische** Alerts auf `next` (aktuell `16.2.12`):

| GHSA | Severity | Vulnerable | Fix | Beschreibung |
|---|---|---|---|---|
| GHSA-2xp9-vwfh-vxw4 | critical | ≥16.0.0 <16.3.3 | 16.3.3 | Unauth. RCE in der Image Optimization API bei AVIF-Dateien |
| GHSA-p293-qw3h-jr36 | critical | ≥16.0.0 <16.3.3 | 16.3.3 | Unauth. RCE auf Windows-gehosteten Servern |

**Erreichbarkeit — korrigiert gegenüber der Issue-Formulierung:**
- **GHSA-2xp9 (Image-Optimization-RCE): erreichbar**, aber nicht aus dem im Issue genannten
  Grund. `next/image` wird im App-Code **nirgends** importiert und `next.config.ts` trägt keine
  `images`-Config — der Kommentar zum `sharp`-Override in `pnpm-workspace.yaml` (#291) ist
  insofern korrekt, dass die App die Komponente nie nutzt. Die Route `/_next/image` ist jedoch
  ein **Framework-Default** von Next.js und unabhängig von App-Code aktiv, solange
  `images.unoptimized` nicht gesetzt ist (ist es hier nicht) — sie bedient dann lokale Assets aus
  `public/`. Die Route ist damit unauthentifiziert von außen erreichbar; der Fix bleibt kritisch
  und geboten, unabhängig davon, ob `next/image` im Code verwendet wird.
- **GHSA-p293 (Windows-RCE): nicht erreichbar** — Hosting ist Vercel (fra1, Linux). Wird vom
  selben Bump mitgeschlossen.

**Scope-Entscheidung (mit Nutzer abgestimmt):** Dieser Task bündelt den next-Bump mit einem
kompletten Deps-Durchgang für alle aktuell offenen Dependabot-Alerts, die ein Lockfile-Refresh
mitzieht — bewusst als EIN Durchgang statt mehrerer Einzel-PRs, da next selbst mehrere
transitive Ranges (postcss, sharp) beeinflusst und ein gemeinsamer `pnpm install` weniger
Reibung erzeugt als sequenzielle Bumps.

## Scope

**Inbegriffen:**
- `next`: `16.2.12` → `≥ 16.3.3` (aktuellste 16.x-Patch-Version).
- `sharp` (runtime, optionale Dep für Image Optimization): Floor auf `0.35.4` — geschlossen über
  Lockfile-Refresh und/oder Anpassung des bestehenden `sharp@<0.35.0`-Overrides in
  `pnpm-workspace.yaml`, falls next 16.3 sharp nicht selbst hoch genug zieht.
- `browserslist` (bereits als #329 getrackt): Floor auf `≥ 4.28.7` — wird hier miterledigt, #329
  wird als Duplikat geschlossen (`Closes #329` zusätzlich im PR-Body).
- `js-yaml` (dev, ESLint-Kette): Floor auf `4.3.2` — bestehender Override
  `js-yaml@<4.3.1` in `pnpm-workspace.yaml` ggf. auf `^4.3.2` anheben, falls der Baum ihn nicht
  von selbst zieht.
- `baseline-browser-mapping` (runtime, transitiv über browserslist/caniuse): Floor auf `2.11.0`.
- `vitest` + `@vitest/mocker` (dev): Floor auf `4.1.11` (`^4.1.10` → `^4.1.11` in `package.json`).
- Neubewertung von #169: prüfen, ob next 16.3 seinen `postcss`-Pin auf `≥ 8.5.23` hebt (aktuell
  pinnt next `postcss` exakt auf `8.4.31`, siehe `pnpm-workspace.yaml`-Kommentar) — falls ja,
  entfällt der `postcss@<8.5.23`-Override; falls nein, bleibt er unverändert bestehen.
- Danach `pnpm audit` (bzw. Registry-Fallback bei Sandbox-Gzip-Bug, siehe
  `lessons/build-tooling.md`) gegen die Ziel-GHSAs gegenprüfen: keine offenen `next`-Alerts mehr.

**Nicht inbegriffen:**
- Kein genereller `pnpm audit`-Vollabgleich über alle Pakete hinaus — nur die im Issue genannten
  und die durch den next-Bump betroffenen transitiven Floors.
- Keine Aktualisierung des `esbuild`/`uuid`-Kleinfunds aus #169 (bleibt eigenes Ticket).
- Kein Update der stale-Reasoning im `sharp`-Kommentar in `pnpm-workspace.yaml` über die reine
  Versionsangabe hinaus — die Korrektur der Reachability-Aussage lebt in dieser Spec und im
  PR-Body, nicht als Doku-Rewrite des historischen #291-Kommentars (der bleibt als
  Entscheidungs-Historie stehen; nur die Versionszahl `<0.35.0` wird bei Bedarf angepasst).
- Kein `next.config.ts`-Härten der Image-Optimization-Route (z. B. `images.unoptimized: true`)
  — das wäre eine Verhaltensänderung über den Security-Patch hinaus (Gold-Plating) und keine
  Voraussetzung, um die GHSAs zu schließen.

## Akzeptanzkriterien

- [ ] GIVEN `package.json` mit `next: 16.2.12` WHEN der Bump durchgeführt wird THEN löst
      `pnpm-lock.yaml` `next` auf eine Version `≥ 16.3.3` auf.
- [ ] GIVEN der next-Bump ist gemerged WHEN Dependabot/`pnpm audit` erneut prüft THEN sind
      GHSA-2xp9-vwfh-vxw4 und GHSA-p293-qw3h-jr36 nicht mehr als offen gelistet.
- [ ] GIVEN das aktualisierte Lockfile WHEN `sharp`, `browserslist`, `js-yaml`,
      `baseline-browser-mapping`, `vitest`, `@vitest/mocker` aufgelöst werden THEN liegen sie
      jeweils auf/über dem in „Scope" genannten Floor.
- [ ] GIVEN Issue #329 (browserslist) WHEN dieser PR mergt THEN ist #329 durch `Closes #329` im
      PR-Body mitgeschlossen (kein separater PR nötig).
- [ ] GIVEN der next-Bump WHEN `pnpm build` läuft THEN ist der Build grün (Next.js 16.3
      kompiliert ohne Fehler, inkl. `@serwist/next`-PWA-Build).
- [ ] GIVEN Auth via next-auth v5 (beta) WHEN die Auth-E2E-Suite (Login, Rollen-Gate, Logout)
      gegen next 16.3 läuft THEN sind alle Auth-E2E-Tests grün.
- [ ] GIVEN die App liefert statische Assets aus `public/` WHEN ein Rauchtest gegen
      `/_next/image?url=<lokaler-public-pfad>&w=<breite>&q=<qualität>` läuft THEN antwortet die
      Route weiterhin mit einem optimierten Bild (Status 200, Bild-Content-Type) — belegt, dass
      die Framework-Default-Route nach dem Bump funktionsfähig bleibt, unabhängig davon, dass
      `next/image` im App-Code nicht verwendet wird.
- [ ] GIVEN #169 (postcss-Override-Aufräumen) WHEN next 16.3 seinen postcss-Pin geprüft wird
      THEN dokumentiert der PR das Messergebnis (Pin angehoben ja/nein) und passt
      `pnpm-workspace.yaml` entsprechend an (Override entfernen ODER unverändert lassen +
      Kommentar-Begründung aktualisieren).
- [ ] GIVEN `pnpm-workspace.yaml`-Overrides für `sharp`/`js-yaml` WHEN der Baum sie nach dem
      Bump bereits von selbst auf/über dem Floor auflöst THEN werden die betroffenen
      Override-Zeilen entfernt (No-op-Kriterium, analog #291); WHEN nicht THEN bleiben/werden sie
      auf den neuen Floor angehoben.

## Fehlerszenarien

- [ ] GIVEN next 16.3 bricht mit next-auth v5-beta (Kompatibilitäts-Regression) WHEN die
      Auth-E2E-Suite rot wird THEN wird das als Blocker dokumentiert (Task-Datei, Offene Fragen)
      statt der Bump stillschweigend mit rotem Auth-Test gemerged.
- [ ] GIVEN ein Security-Override in `pnpm-workspace.yaml` wird durch den Bump zum No-op (Ziel
      bereits über dem Floor ohne Override) WHEN das geprüft wird THEN wird das Entfern-Kriterium
      real gemessen (Override probeweise entfernen, `pnpm install`, Version prüfen), nicht
      angenommen (`lessons/build-tooling.md` — Override-No-op-Verdacht ist zu messen).
- [ ] GIVEN `pnpm audit` scheitert in der Sandbox am bekannten Gzip-Decoding-Bug WHEN die
      Alert-Freiheit verifiziert wird THEN wird der Registry-Endpoint-Fallback
      (`lessons/build-tooling.md`, #228) genutzt statt die Verifikation auszulassen.

## Offene Fragen

- [ ] Keine offenen Fragen — Scope und Reachability-Korrektur sind mit dem Nutzer abgestimmt.
