# Spec: next auf ≥ 16.4.1 heben — 2 kritische RCEs + DoS (3 GHSAs)

## Kontext

Dependabot meldet offene Alerts auf `next` (installiert `16.3.8`, `package.json` + `pnpm-lock.yaml`),
alle gefixt in **16.4.1**; betroffener Bereich `>= 16.0.0, <= 16.4.0`:

| Alert | Severity | GHSA | Beschreibung |
|---|---|---|---|
| #88/#95 | critical | GHSA-2464-fhr4-w9xw | Unauth. RCE in der Image Optimization API bei SVG-Dateien |
| #89/#96 | critical | GHSA-673q-mjm6-r5xr | Unauth. RCE in `use cache`-Funktionen, die Typed Arrays zurückgeben |
| #87/#94 | high | GHSA-p3m5-59mp-jv5r | DoS im App Router über Server Actions |

**Erreichbarkeit (gegen den Code geprüft):**
- **GHSA-2464 (Image-Optimization-RCE): erreichbar.** `/_next/image` ist ein Framework-Default und
  unabhängig davon aktiv, ob `next/image` im App-Code genutzt wird (`next.config.ts` setzt keine
  `images`-Config; gleiche Lage wie #337). Unauthentifiziert von außen erreichbar.
- **GHSA-673q (`use cache`-RCE): nicht erreichbar.** Weder `use cache` noch `cacheComponents` kommen
  in `app/`, `lib/`, `db/` oder `next.config.ts` vor. Wird vom selben Bump mitgeschlossen.
- **GHSA-p3m5 (Server-Actions-DoS): erreichbar.** Die App nutzt Server Actions
  (`"use server"` in 7 Dateien unter `app/`/`lib/`).

Auf npm ist `16.4.1` verfügbar; die aktuellste Version der 16.x-Linie ist `16.4.3`
(`dependencies.postcss` von 16.4.1: `8.5.23`).

## Scope

**Inbegriffen:**
- `next`: `16.3.8` → neueste 16.4.x-Patch-Version `≥ 16.4.1` (Stand heute `16.4.3`). `package.json`
  pinnt `next` exakt (kein Caret) – diese Konvention bleibt; der Issue-Wortlaut „Caret innerhalb
  16.x" meint nur: nicht über die Major-Grenze.
- `pnpm-lock.yaml` neu auflösen.
- Neubewertung der Overrides in `pnpm-workspace.yaml` (#169, `postcss`/`sharp`/`js-yaml`-Kommentare):
  Pin von `next` auf `postcss` messen; Override nur ändern, wenn die Messung es verlangt.
- Verifikation, dass kein offener `next`-Alert (Alerts #87–#89, #94–#96) mehr gegen die
  aufgelöste Version greift (Registry-Fallback bei defektem `pnpm audit`).

**Nicht inbegriffen:**
- Kein genereller Deps-Durchgang über weitere Pakete (das war #337/#390); andere offene Alerts
  bekommen eigene Issues.
- Keine Härtung von `next.config.ts` (z. B. `images.unoptimized`) – Verhaltensänderung über den
  Security-Patch hinaus.
- Kein Wechsel auf Next 17 / über die Major-Grenze.

## Akzeptanzkriterien

- [ ] GIVEN `package.json` mit `next: 16.3.8` WHEN der Bump durchgeführt wird THEN steht dort
      eine exakte Version `≥ 16.4.1` und `pnpm-lock.yaml` löst `next` auf genau diese auf.
- [ ] GIVEN das neue Lockfile WHEN der Advisory-Abgleich (`pnpm audit` bzw. Registry-Fallback)
      für `next` läuft THEN sind GHSA-2464-fhr4-w9xw, GHSA-673q-mjm6-r5xr und
      GHSA-p3m5-59mp-jv5r für die aufgelöste Version nicht mehr einschlägig.
- [ ] GIVEN der Bump WHEN `pnpm build` läuft THEN ist der Build grün (inkl. `@serwist/next`-PWA).
- [ ] GIVEN der Bump WHEN Lint, Typecheck und Unit-/Integrationstests (Gates) laufen THEN sind
      sie grün.
- [ ] GIVEN Auth via next-auth v5 (beta) WHEN die Auth-E2E-Suite (Login, Rollen-Gate, Logout)
      gegen die neue next-Version läuft THEN sind alle Auth-E2E-Tests grün.
- [ ] GIVEN die App liefert Assets aus `public/` WHEN ein Rauchtest gegen `/_next/image` mit einem
      matcher-ausgenommenen lokalen Pfad läuft (siehe Lesson #337) THEN antwortet die Route mit
      Status 200 und Bild-Content-Type.
- [ ] GIVEN eine Server Action (z. B. Login oder Erfassen) WHEN sie im Dev-/E2E-Lauf aufgerufen
      wird THEN funktioniert sie unverändert (Regressionsschutz für den Server-Actions-Fix).
- [ ] GIVEN die Overrides/Kommentare in `pnpm-workspace.yaml` WHEN `next` den `postcss`-Pin neu
      setzt THEN dokumentiert der PR das Messergebnis (Pin ≥ 8.5.23 ja/nein) und passt Kommentar
      bzw. Override an; ein als No-op vermuteter Override wird real gemessen (entfernen,
      ohne Alt-Lockfile neu auflösen), nicht angenommen.
- [ ] GIVEN Issue #443 WHEN der PR gemergt wird THEN steht `Closes #443` im PR-Body; das Schließen
      der Dependabot-Alerts #87–#89/#94–#96 wird nach dem Merge am Default-Branch geprüft (vor dem
      Merge nicht prüfbar).

## Fehlerszenarien

- [ ] GIVEN next 16.4 bricht mit next-auth v5-beta oder `@serwist/next` WHEN Build bzw.
      Auth-E2E rot werden THEN wird das als Blocker in der Task-Datei dokumentiert statt
      mit rotem Test zu mergen.
- [ ] GIVEN `pnpm audit` scheitert am bekannten Gzip-Decoding-Bug WHEN die Alert-Freiheit
      verifiziert wird THEN wird der Registry-Endpoint-Fallback (`lessons/build-tooling.md`)
      genutzt statt die Verifikation auszulassen.
- [ ] GIVEN `next dev` hängt automatisch einen `nextjs-agent-rules`-Block an `CLAUDE.md` WHEN
      committet wird THEN wird der Block vorher aus dem Diff entfernt (`git checkout -- CLAUDE.md`).

## Offene Fragen

- [ ] Keine – Zielversion (neueste 16.4.x statt exakt 16.4.1) ist im Scope festgelegt; abweichende
      Wahl bitte vor `/implement` melden.
