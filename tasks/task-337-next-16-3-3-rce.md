# Task 337: next-16-3-3-rce

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [ ] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
`next` auf ≥ 16.3.3 heben — schließt zwei kritische unauth. RCE-GHSAs
(GHSA-2xp9-vwfh-vxw4, GHSA-p293-qw3h-jr36). Gebündelt mit einem Deps-Durchgang
für weitere offene Dependabot-Alerts, die das Lockfile-Refresh mitzieht
(sharp, browserslist/#329, js-yaml, baseline-browser-mapping, vitest).
Spec: `docs/specs/spec-337-next-16-3-3-rce.md`.

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [x] `next` ≥ 16.3.3 aufgelöst (ist: 16.3.5); beide GHSAs (GHSA-2xp9, GHSA-p293) geschlossen
      — verifiziert per `pnpm audit --json`: keine der beiden GHSA-IDs mehr gelistet
- [x] `sharp`, `browserslist`, `js-yaml`, `baseline-browser-mapping`, `vitest`/`@vitest/mocker`
      auf/über dem Floor aus der Spec aufgelöst — Guard in `run-tests.sh` (#291/#337) grün
- [ ] #329 (browserslist) via `Closes #329` im PR-Body mitgeschlossen — **noch offen**, PR-Body
      #338 enthält aktuell nur `Closes #337`; wird vor Merge nachgezogen (Review-Runde-1-Finding)
- [x] `pnpm build` grün (inkl. `@serwist/next`-PWA-Build) — verifiziert, next 16.3.5 (Turbopack)
- [x] Auth-E2E (Login, Rollen-Gate, Logout) grün gegen next 16.3 + next-auth v5-beta —
      `pnpm exec playwright test e2e/auth.spec.ts`: 3 passed, 2 skipped, 0 failed
- [ ] `/_next/image`-Rauchtest gegen lokales `public/`-Asset liefert weiterhin ein optimiertes
      Bild — **mit Einschränkung erfüllt, siehe Technische Notizen** (Reachability-Korrektur 2)
- [x] #169 neu bewertet: postcss-Pin von next 16.3 geprüft, Override entfernt (next 16.3.5 pinnt
      postcss jetzt selbst exakt auf 8.5.23 = Floor; No-op gemessen, nicht vermutet)
- [x] Security-Overrides (`sharp`, `js-yaml`) auf No-op geprüft und entfernt (next 16.3.5
      deklariert sharp selbst ^0.35.4, eslint zieht js-yaml auf 4.3.2 — beide No-op gemessen)

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
Kein ADR-Trigger — reiner Dependency-Bump ohne Architekturentscheidung. `/architecture`
wird für diese Task übersprungen.

**Reachability-Korrektur (wichtig für Verifikation):** `next/image` wird im App-Code
nirgends importiert, `next.config.ts` hat keine `images`-Config. `/_next/image` ist
trotzdem als Next.js-Framework-Default aktiv (kein `images.unoptimized`) und bedient
lokale `public/`-Assets unauthentifiziert — GHSA-2xp9 ist darüber erreichbar, nicht weil
die App die `next/image`-Komponente nutzt. Der `sharp`-Kommentar in `pnpm-workspace.yaml`
(#291) bleibt in seiner engeren Aussage korrekt (Komponente ungenutzt), ist aber für die
Routen-Erreichbarkeit nicht die vollständige Geschichte.

**Reachability-Korrektur 2 (Rauchtest-Befund, aus dieser Task):** Der `/_next/image`-Rauchtest
gegen ein neu angelegtes, testweises `public/`-Asset scheitert mit
`⨯ The requested resource isn't a valid image … received null`. Ursache: `proxy.ts` schützt per
Matcher ALLES außer einer expliziten Ausnahmeliste (`api/auth`, `api/version`, `api/health`,
`theke/`, `_next/static`, `_next/image`, `favicon.ico`, `manifest.webmanifest`,
`icon(-dev|-int|-prd)?.svg`). `/_next/image` selbst ist zwar ausgenommen, der interne
Self-Fetch, den die Bildoptimierung für LOKALE Assets macht, läuft aber durch denselben
Origin und damit erneut durch den Proxy — für jeden `public/`-Pfad außerhalb der Ausnahmeliste
wird dieser interne Fetch auf `/login` umgeleitet (HTML statt Bilddaten). Gegenprobe gegen
einen ausgenommenen Pfad (`icon-dev.svg`) bestätigt das: dort kommt der interne Fetch durch,
scheitert aber (erwartungsgemäß) an "SVG nicht erlaubt" statt an "received null".
Konsequenz: Die Spec-Annahme "bedient lokale `public/`-Assets unauthentifiziert" gilt nicht
pauschal für beliebige Assets, sondern nur für die matcher-ausgenommenen Pfade — die aber
SVG sind und deshalb ohnehin separat blockiert werden. Dieses Verhalten ist vermutlich
vorbestehend (`proxy.ts` ist nicht Teil dieses Diffs) und keine 16.3.5-Regression. Nutzer-
Entscheidung: als dokumentierten Befund aufnehmen, kein Merge-Blocker für den Security-Bump
selbst — eine tiefere Analyse, ob dies GHSA-2xp9 in dieser App praktisch entschärft, ist
nicht Teil dieser Task.

**pnpm audit (Registry, kein Gzip-Bug diesmal):** Nach dem Bump listet `pnpm audit --json`
weder GHSA-2xp9-vwfh-vxw4 noch GHSA-p293-qw3h-jr36 — beide geschlossen. Zwei neue, aus dem
Scope dieser Task fallende `brace-expansion`-High-Advisories (CVE-2026-14257) sind aufgetaucht;
das ist gemäß Spec-Abschnitt "Nicht inbegriffen" (kein pnpm-audit-Vollabgleich) nicht Teil
dieser Task — Weitergabe an `/security-review` bzw. Kleinfund/Issue dort.

**`/refactor`-Phase:** Wichtiges Review-Runde-1-Finding behoben – `ovr_count_337` hatte keinen
eigenen Mutationsbeleg (nur eine Diskriminierungskontrolle über den real vorhandenen
undici-Override). Ergänzt: synthetische Fixture mit zurückgekehrtem postcss-Override belegt,
dass derselbe Zähl-Ausdruck ihn findet (`run-tests.sh`). Kein neues Verhalten, nur Test-Härtung
– Suite davor 1550 grün/1 rot, danach 1551 grün/1 rot (derselbe unabhängige #334-Fund). Übrige
Nitpicks aus dem Review (Kommentar-Länge, Label-Kosmetik) bewusst nicht angefasst – keine
Verhaltens-/Korrektheitsrelevanz, unverhältnismäßig für einen reinen Security-Bump.

**`/test`-Phase:** `pnpm test:coverage` grün — 803 passed, 59 skipped, 0 failed, Gesamt-Coverage
90,14 % Statements / 94,68 % Branches (über der 80 %-Schwelle), keine Regression durch
next 16.3.5 / vitest 4.1.11. Kein neuer Anwendungscode in dieser Task (reiner Dependency-Bump)
— zusätzliche Unit-Tests nicht nötig; die Test-Abdeckung der AKs liegt in den bereits
reviewten Bash-Guard-Assertions (`run-tests.sh`, Mutationsbelege + Diskriminierungskontrollen)
plus Build/Auth-E2E/Audit-Verifikation oben.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
Keine — Scope (voller Deps-Durchgang statt Einzel-PR) und Reachability-Einschätzung
sind mit dem Nutzer abgestimmt (siehe Spec).

## Review-Findings
<!-- Wird durch /review befüllt -->
Siehe `tasks/review-337.md`. Runde 1 (Backend/Logik): NEEDS_REWORK — kritische Findings:
fehlendes `Closes #329` im PR-Body (behoben), unbelegte Auth-E2E/`/_next/image`-ACs (nachgeholt,
siehe oben), offene Task-Checkboxen (behoben), Scope-fremder `next dev`-Agent-Rules-Block in
CLAUDE.md (aus dem Commit entfernt). Runde 2 (Code-Qualität) und Runde 3 (Architektur): beide
APPROVED, nur Nitpicks.

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `chore/337-next-16-3-3-rce`
Erstellt: 2026-09-15 21:40
