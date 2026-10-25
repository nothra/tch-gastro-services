# Review: Task 443

## Kritische Findings (müssen behoben werden)
- keine

## Wichtige Findings (sollten behoben werden)
- keine

## Nitpicks (optional)
- [ ] pnpm-workspace.yaml:54 und :58 – die #443-Nachträge hängen an bestehenden Kommentarzeilen und überschreiten die sonst eingehaltene Umbruchbreite (Zeile 54 ~120 Zeichen); eigener Zeilenumbruch wäre lesbarer. Rein kosmetisch.

## Positives
- Scope exakt eingehalten: nur `next` + versionsgleiches `eslint-config-next`; Lockfile-Diff enthält neben next/next-auth/eslint-config-next-Snapshots nur `sharp` 0.35.4 → 0.35.5 (von next deklarierte Range, kein Override nötig).
- Jedes AK der Spec ist belegt (Task-Datei: Build, Lint, tsc, 1881 Vitest inkl. DB, E2E, `/_next/image`-Rauchtest, Server-Action-Spec, Registry-Advisory-Abgleich mit Gegenprobe gegen 16.3.8).
- postcss-Messung (Pin 8.5.23, aufgelöst 8.5.23/8.5.26) im Review per `pnpm why` nachvollzogen; Overrides korrekt unverändert.
- Erreichbarkeits-Analyse in der Spec gegen den Code geprüft (kein `use cache`); Lessons (Proxy-Self-Fetch, localhost, eigener Dev-Server, `AGENTS.md`-Block) beachtet; keine Wegwerf-Artefakte im Diff.
- Keine Routen-Änderung → `docs/routes.md` nicht betroffen; keine ADR-Trigger.

## Out-of-Scope-Funde (nicht in diesem PR)
- `zod` <4.6.6 (GHSA-mrhx-c7xc-m3w5, high, direkte Dependency) → Issue #446 angelegt.
- `source-map-js` <1.2.2 (GHSA-68fv-2mgg-jv7q, high) → bereits als Issue #412 getrackt.

## Empfehlung
APPROVED
