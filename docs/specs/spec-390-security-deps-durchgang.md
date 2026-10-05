# Spec: Security-Deps-Durchgang (next 16.3.6 + weitere Dependabot-Alerts)

## Kontext
Dependabot meldet 14 offene Alerts (Stand 2026-10-05), darunter eine **kritische** RCE in
`next/og` `ImageResponse` (GHSA-vcvr-r3jv-pc5j, `next` ≥ 16.2.0 < 16.3.6; App läuft auf 16.3.5).
In der App ist `next/og` nicht erreichbar (kein `ImageResponse`, keine `opengraph-image`/`icon.tsx`),
der Bump ist trotzdem fällig. Die übrigen Alerts betreffen transitive Pakete (`brace-expansion`,
`undici`) und werden im selben Durchgang abgeräumt.

| Paket | Alerts | Max. Severity | Fix-Version | Scope |
|---|---|---|---|---|
| `next` | #65 (`package.json`), #80 (Lockfile) | critical | 16.3.6 | runtime |
| `brace-expansion` | #74–#79 | high | ≥ 1.1.21 (1.x) bzw. ≥ 2.1.7 (2.x) | runtime (transitiv) |
| `undici` | #64, #67–#69, #72, #73 | high | 7.29.1 | development (transitiv) |

## Scope
**Inbegriffen:**
- `next` auf ≥ 16.3.6 (Minor/Patch innerhalb 16.x).
- Auflösung von `brace-expansion` und `undici` auf die gepatchten Versionen (Overrides in
  `pnpm-workspace.yaml` und/oder Lockfile-Refresh).
- Neubewertung #169 (postcss-Override, wartete auf next).
- Verifikation des Framework-Bumps (Build, Auth-E2E, `next/image`, PWA).

**Nicht inbegriffen:**
- Major-Upgrades (Next 17, Tailwind etc.) und Funktionsänderungen.
- Aufnahme von `next/og`/`ImageResponse` oder anderen neuen Features.
- Neue, erst nach dem Start auftauchende Alerts (eigenes Issue).

## Akzeptanzkriterien
- [x] GIVEN `next` 16.3.5 WHEN der Bump erfolgt ist THEN löst `pnpm-lock.yaml` `next` ≥ 16.3.6 auf und `package.json` pinnt eine Version ≥ 16.3.6.
- [x] GIVEN das Lockfile WHEN `brace-expansion` aufgelöst wird THEN liegt jede aufgelöste 1.x-Version ≥ 1.1.21 und jede 2.x-Version ≥ 2.1.7.
- [x] GIVEN das Lockfile WHEN `undici` aufgelöst wird THEN liegt jede aufgelöste 7.x-Version ≥ 7.29.1.
- [ ] GIVEN der Branch ist gepusht WHEN Dependabot neu scannt THEN sind die Alerts #64–#69, #72–#80 geschlossen (oder jeder Restalert ist in der Task-Datei begründet dokumentiert). _(Präzisiert in /implement: Dependabot wertet nur den Default-Branch aus – prüfbar erst nach dem Merge.)_
- [x] GIVEN der Bump WHEN `pnpm build` läuft THEN endet er erfolgreich, inkl. PWA-Manifest (`/manifest.webmanifest` wird erzeugt). _(Angepasst in /implement, Q3: `@serwist/next` ist nicht installiert, es gibt keinen Service Worker – die PWA besteht heute aus dem Manifest.)_
- [x] GIVEN der Bump WHEN die Auth-E2E laufen THEN sind Login, Rollen-Gate und Logout grün.
- [x] GIVEN der Bump WHEN eine Seite mit `next/image` bzw. `/_next/image` geladen wird THEN wird das Bild weiterhin optimiert ausgeliefert (Rauchtest gegen einen matcher-ausgenommenen Pfad, vgl. Lesson #337).
- [x] GIVEN die Overrides in `pnpm-workspace.yaml` WHEN der Durchgang abgeschlossen ist THEN ist für #169 (postcss) entschieden: Override entfällt oder bleibt mit Begründung; veraltete/No-op-Overrides sind entfernt oder begründet.
- [x] GIVEN der Durchgang WHEN `pnpm lint`, Typecheck und `pnpm test` laufen THEN sind alle grün (keine Regression).

## Fehlerszenarien
- [x] Ein Alert hat keinen gepatchten Stand in der benötigten Major-Linie → nicht stillschweigend übergehen; Begründung + Folge-Issue in der Task-Datei. _(Nicht eingetreten: alle 14 Alerts haben einen Fix in ihrer Linie.)_
- [x] Override-Ziel zieht in eine falsche Major-Linie (offenes `>=` statt Caret) → Caret innerhalb derselben Major-Linie, bei mehreren Linien disjunkte Selektoren (Lesson `build-tooling.md`, #291/#339).
- [x] `pnpm audit` scheitert in der Sandbox (Gzip-Bug) → Prüfung per `curl`-Workaround bzw. Lockfile-Versionsabgleich (Lesson #228). _(Advisory-Daten direkt per `gh api` aus Dependabot + `advisories/<ghsa>` gelesen.)_
- [x] `next dev` schreibt Agent-Regel-Block in `CLAUDE.md` → vor Commit zurücksetzen (Lesson #337). _(Nicht eingetreten: verifiziert gegen `next start`, kein `next dev`.)_

## Offene Fragen
- [x] Bestehender Override `brace-expansion@>=4.0.0 <5.0.9` (5.x-Zweig, vgl. #339): bleibt unverändert, solange kein Alert die 5.x-Linie trifft – im Durchgang prüfen.
  **Antwort (/implement):** Die neuen Advisories treffen die 4.x/5.x-Linie doch (Floor 5.0.12, GHSA-q2hr-2g5m-vwhr), nur nicht als eigener Dependabot-Alert, weil der Baum bereits 5.0.12 auflöst. Selektor auf `>=4.0.0 <5.0.12` → `^5.0.12` angehoben (durable Zusicherung, minimatch@10 deklariert nur ^5.0.5).
- [x] Wird `next` weiterhin exakt gepinnt (aktuell `"16.3.5"`) – Annahme: ja, exakter Pin 16.3.6 (oder neuestes 16.3.x).
  **Antwort (/implement):** Exakter Pin auf **16.3.8** (neuester 16.3.x-Patch, veröffentlicht 2026-09-30), `eslint-config-next` im Lockstep.
- [x] Q3 (/implement): `@serwist/next` steht im Tech-Stack (ADR-014), ist aber nicht installiert – kein Service Worker. AK „PWA-Build“ deshalb auf das Manifest angepasst.
