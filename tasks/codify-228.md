## Codify-Report: Task 228

### Neue Regeln hinzugefügt
- [`docs/factory/lessons/factory-workflow.md`](../docs/factory/lessons/factory-workflow.md)
  „Neuer Worktree hat kein `.env.local`" – wegen: `pnpm test:e2e` schlug beim ersten Lauf im
  frisch angelegten Worktree mit `CredentialsSignin` fehl, weil `.env.local` (gitignored) nicht
  automatisch in neue Worktrees kopiert wird und die geteilte lokale DB kein passendes
  Seed-Konto hatte. Sah zunächst wie eine Regression durch den next-auth-Bump aus, war aber ein
  reines Umgebungs-Setup-Problem (`/implement`-Selbstfund). Root-Cause-Fix (Automatisierung in
  `start-work.sh`) als eigenes Issue ausgelagert:
  [#236](https://github.com/nothra/tch-gastro-services/issues/236).
- [`docs/factory/lessons/build-tooling.md`](../docs/factory/lessons/build-tooling.md)
  „`pnpm audit` scheitert an Gzip-Decoding-Bug" – wegen: `pnpm audit` bricht in dieser Sandbox
  reproduzierbar mit `ERR_PNPM_AUDIT_BAD_RESPONSE` ab (Registry liefert Gzip-Body ohne
  `Content-Encoding`-Header). Der manuelle `curl` + `gunzip`-Workaround gegen den
  npm-Advisory-Bulk-Endpoint liefert echte 0/N-Advisory-Daten und ist ein stärkerer Nachweis als
  das bisherige Lockfile-Ersatzkriterium – nützlich für jeden künftigen `/security-review` mit
  Dependency-Verifikation.
- Beide Lessons mit Index-Zeile + „Laden bei"-Trigger in
  [`docs/factory/PROJECT-CONTEXT.md`](../docs/factory/PROJECT-CONTEXT.md) verankert (ADR-037).

### Keine Änderungen nötig
Review-, Test- und Refactor-Phase lieferten keine strukturellen Findings, die eine neue Regel
rechtfertigen (reiner Dependency-Bump, kein Produktionscode geändert). Der einzige
Review-Nitpick (Homoglyph-Normalisierung im Credentials-Pfad) ist projektspezifisch niedrig-
risikorelevant (keine offene Registrierung, ADR-016) und kein wiederkehrendes Muster – kein
eigenes Issue, nur im Review-Report vermerkt.

### Empfehlung für nächste Features
- Vor dem ersten `pnpm test:e2e` in einem neuen Worktree routinemäßig `.env.local` kopieren +
  `pnpm db:seed` laufen lassen, bis Issue #236 die Automatisierung liefert.
- Bei next-auth/`@auth/core`-Advisories künftig direkt den in `build-tooling.md` dokumentierten
  `curl`+`gunzip`-Workaround nutzen statt nur auf das Lockfile-Ersatzkriterium zu vertrauen.
