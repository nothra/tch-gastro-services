# Security Review: Task 337

## Kontext
Reiner Dependency-Security-Bump: `next` 16.2.12 → 16.3.5 (schließt zwei kritische unauth.
RCE-GHSAs), gebündelt mit einem Deps-Durchgang (sharp, browserslist, js-yaml,
baseline-browser-mapping, vitest/@vitest-mocker) und Test-Guard-Erweiterung in
`scripts/checks/tests/run-tests.sh`. Kein neuer Anwendungscode (keine neuen Routen, keine
neue Business-Logik, kein neuer Input-Pfad). Diff-Umfang laut
`git diff origin/main...HEAD --stat`: `package.json`, `pnpm-lock.yaml`,
`pnpm-workspace.yaml`, `scripts/checks/tests/run-tests.sh`, Spec/Task/Review-Dateien.

## Prüfkatalog

### Input-Validierung & Injection
Nicht betroffen — kein neuer Anwendungscode, kein neuer User-Input-Pfad. Die geänderten
Bash-Guards in `run-tests.sh` lesen ausschließlich repo-interne Dateien (Lockfile,
`package.json`, `pnpm-workspace.yaml`), keine externe/user-kontrollierte Eingabe. Grep/awk/sed
bleiben POSIX-konform, `--`-Absicherung wo nötig (unverändert aus #291-Muster übernommen).

### Authentifizierung & Autorisierung
Nicht betroffen — kein Auth-Code geändert. Verifikation der Auth-E2E-Suite gegen next 16.3.5 +
next-auth v5-beta liegt bereits vor (Task-Datei: 3 passed/2 skipped/0 failed) und wurde nicht
neu gemessen (Vorgabe des Auftrags).

### Daten & Kryptographie
Nicht betroffen — keine Secrets/Keys im Diff, keine neue Krypto-Nutzung.

### Dependencies (Kern dieser Task)
- **Zielrisiko geschlossen:** `pnpm audit --json` wurde selbst erneut ausgeführt
  (`pnpm audit --json`, exit 1 wegen verbleibender High-Findings s.u.). Weder
  GHSA-2xp9-vwfh-vxw4 noch GHSA-p293-qw3h-jr36 sind in den `advisories` gelistet — beide
  next-RCE-GHSAs sind geschlossen. Deckt sich mit dem in der Task-Datei dokumentierten Ergebnis.
- **Begleit-Floors verifiziert:** Diff von `package.json`/`pnpm-workspace.yaml` zeigt die
  angehobenen bzw. entfernten Overrides (postcss, sharp, js-yaml als No-op entfernt, jeweils
  mit Messmethode dokumentiert — "Eintrag streichen, ohne Alt-Lockfile neu auflösen, Version
  prüfen", nicht vermutet). Der Floor-Guard in `run-tests.sh` deckt alle sechs Pakete aus dem
  Scope (sharp, js-yaml, browserslist, baseline-browser-mapping, vitest, @vitest/mocker) plus
  next selbst (AK1, Floor jetzt 16.3.3) mit Mutationsbelegen + Diskriminierungskontrollen ab —
  entspricht dem in `lessons/testing.md` geforderten Muster.
- **Reachability von GHSA-2xp9 (siehe unten, gesondert bewertet).**
- **Neuer Fund außerhalb des Scopes — `brace-expansion` (High, 2× CVE-2026-14257-Familie):**
  Selbst mit `pnpm audit --json` reproduziert:
  - GHSA-mh99-v99m-4gvg — "DoS via unbounded expansion length causing an out-of-memory
    process crash", `vulnerable_versions >=4.0.0 <5.0.8`
  - GHSA-rgw5-rvv9-x895 — "DoS via unbounded intermediate arrays, bypassing the
    CVE-2026-14257 mitigation", `vulnerable_versions >=4.0.0 <5.0.9`

  Per `pnpm why brace-expansion` verifiziert: im Lockfile liegt zusätzlich zu den bereits
  über Overrides gedeckelten 1.x/2.x-Linien jetzt eine **dritte, bislang ungedeckte
  Major-Linie** `brace-expansion@5.0.7` (dev-only, via `minimatch@10.2.5` →
  `@typescript-eslint/typescript-estree` → `@typescript-eslint/parser`/
  `eslint-config-next`). Die bestehenden Overrides (`brace-expansion@<1.1.18`,
  `brace-expansion@>=2.0.0 <2.1.4`, aus #291) greifen für diese Linie nicht — Muster aus
  `lessons/build-tooling.md` bestätigt sich erneut (mehrere parallel gepflegte Major-Linien,
  `pnpm audit` zeigt nur eine Range-Gruppe je Advisory-ID). Ist explizit **nicht** Teil des
  Task-337-Scopes (Spec-Abschnitt "Nicht inbegriffen": kein pnpm-audit-Vollabgleich) und wird
  nicht in diesem PR behoben.
  → **Issue #339 angelegt** (`enhancement` + `security`) über den zentralen Seam
  (`scripts/lib/create-issue.sh` → `create_issue_idempotent`), mit Fund, betroffener Version,
  Herkunftspfad und Fix-Vorschlag (dritter Override-Eintrag `brace-expansion@>=4.0.0 <5.0.9`).
- **Keine unnötigen neuen Dependencies:** Der Diff fügt keine neuen Pakete hinzu, nur
  Versionsanhebungen bereits vorhandener Pakete plus Entfernen von drei No-op-Overrides.

### Error Handling & Information Disclosure
Nicht betroffen — keine Error-Handling-Pfade geändert.

### Security Headers & Configuration
`next.config.ts` unverändert (kein `images.unoptimized`-Toggle, wie in der Spec bewusst als
"Nicht inbegriffen" ausgeschlossen — kein Scope-Verstoß).

## Reachability-Bewertung GHSA-2xp9 (Hinweis, kein Blocker)

Die Task-Datei dokumentiert unter "Reachability-Korrektur 2" einen Rauchtest-Befund: der
Auth-Proxy (`proxy.ts`, nicht Teil dieses Diffs) leitet den internen Self-Fetch, den die
Next.js-Bildoptimierung für lokale `public/`-Assets macht, für alle Pfade außerhalb einer
schmalen Ausnahmeliste (`icon(-dev|-int|-prd)?.svg` u. a.) auf `/login` um — die Optimierung
lokaler Assets scheitert dadurch praktisch mit `received null` statt ein Bild zu liefern, und
die einzigen matcher-ausgenommenen Pfade sind SVGs, die `next/image` ohnehin separat als
"nicht erlaubt" ablehnt.

**Sicherheitsbewertung:**
- Das reduziert die **praktische** Ausnutzbarkeit der AVIF-Decoder-RCE über den in der Spec
  angenommenen "lokales `public/`-Asset"-Vektor in dieser konkreten Deployment-Konfiguration —
  aber es ist **kein verlässlicher Schutzmechanismus gegen GHSA-2xp9**: `proxy.ts` ist
  Anwendungscode außerhalb dieses Diffs, kann sich jederzeit ändern (neue Ausnahme, Matcher-
  Refactoring), und die Route `/_next/image` bleibt als Framework-Default aktiv und
  grundsätzlich erreichbar. Ein Angreifer, der eine erreichbare AVIF-Verarbeitung über einen
  anderen Pfad findet (z. B. eine künftige, vom Matcher ausgenommene Route, oder ein remote
  `images.remotePatterns`-Ziel, falls das je konfiguriert wird), triggert dieselbe
  Schwachstelle ungeschützt.
- **Der next-Bump bleibt trotzdem zwingend geboten**, unabhängig von dieser
  Erreichbarkeits-Einschränkung: (a) Defense-in-depth — sich nicht auf einen Nebeneffekt einer
  Auth-Proxy-Konfiguration verlassen, die nicht für diesen Zweck entworfen wurde; (b) die
  zweite geschlossene GHSA (GHSA-p293-qw3h-jr36, Windows-RCE) ist von dieser Analyse komplett
  unabhängig — auch wenn sie auf Vercel/Linux aktuell nicht erreichbar ist, schließt der Bump
  sie defensiv mit; (c) die next-Versionsanhebung selbst trägt kein Risiko (Build + Auth-E2E
  grün verifiziert).
- Einstufung: **Hinweis**, kein Blocker — wie mit dem Nutzer bereits abgestimmt.

## Kritische Findings (Blocker)
Keine.

## Wichtige Findings
Keine (im Scope dieses PRs). Das `brace-expansion`-High-DoS-Risiko ist real und wichtig, liegt
aber außerhalb des Task-337-Scopes und wurde als eigenständiges Issue (#339) ausgelagert statt
hier als Blocker geführt — es betrifft keinen der beiden next-RCE-Fixes und ist ein
vorbestehender Zustand, den dieser PR nicht verschlechtert.

## Hinweise
- [Dependency-Reachability] `/_next/image`-Reachability von GHSA-2xp9 ist durch `proxy.ts`
  praktisch eingeschränkt, aber nicht als Sicherheitsgarantie zu werten — siehe Bewertung oben.
  Kein Code-Änderungsbedarf in diesem PR (out of scope, mit Nutzer abgestimmt).
- [Dependency-Security] Neue High-Advisories auf `brace-expansion@5.x` (dev-only, via
  TypeScript-ESLint-Toolchain) — ausgelagert nach Issue #339, referenziert Fix-Vorschlag.

## Ergebnis
PASSED
