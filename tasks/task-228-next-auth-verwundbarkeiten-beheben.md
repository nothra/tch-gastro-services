# Task 228: next-auth-verwundbarkeiten-beheben

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
next-auth von `5.0.0-beta.31` auf `5.0.0-beta.32` anheben, um zwei kritische/hohe
Auth.js-Verwundbarkeiten zu beheben (GHSA-8fpg-xm3f-6cx3 Fail-open bei
Provider-Konfigurationsfehlern; Homoglyph-@-Bypass im E-Mail-Normalizer). Zieht
`@auth/core` transitiv auf `0.41.3` an. Reiner Patch-Bump innerhalb der bestehenden
v5-Beta-Linie (ADR-014) – keine Stable-Migration, keine Verhaltensänderung.
Details: [spec-228](../docs/specs/spec-228-next-auth-verwundbarkeiten-beheben.md).

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [x] GIVEN `package.json` mit `next-auth@5.0.0-beta.31` WHEN das Update durchgeführt wird
      THEN steht `next-auth@5.0.0-beta.32` in `package.json`.
- [x] GIVEN das aktualisierte `package.json` WHEN `pnpm install` läuft THEN weist
      `pnpm-lock.yaml` `@auth/core >=0.41.3` aus.
- [x] GIVEN die aktualisierten Pakete WHEN `pnpm test` läuft THEN bleiben alle Tests grün
      (insb. `auth.config.test.ts`, `lib/authz.test.ts`).
- [x] GIVEN die aktualisierten Pakete WHEN `pnpm typecheck` läuft THEN keine neuen Typfehler.
- [x] GIVEN die aktualisierten Pakete WHEN `pnpm test:e2e` läuft THEN bleibt
      `e2e/auth.spec.ts` grün.
- [x] GIVEN die aktualisierten Pakete WHEN `pnpm audit` erreichbar ist THEN keine
      next-auth/@auth/core-Findings mehr (Ersatzkriterium: Lockfile-Check, falls
      Audit-Endpoint nicht erreichbar).

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
- `@auth/core` ist nur transitiv über `next-auth` gepinnt – kein direkter
  `package.json`-Eintrag, kein Override in `pnpm-workspace.yaml` nötig.
- Architektur-Entscheidung (ADR-014, Auth.js v5) bleibt unverändert; ADR-Trigger für
  `/architecture` daher voraussichtlich nicht nötig – reiner Dependency-Bump.
- ADR-Trigger-Check (Schritt 0) durchgeführt: keine der vier Kategorien trifft zu
  (reiner Patch-Bump einer bestehenden Abhängigkeit).
- `pnpm install` ohne Peer-Dependency-Konflikt; Lockfile zeigt `next-auth@5.0.0-beta.32`
  und `@auth/core@0.41.3`.
- `pnpm test:e2e e2e/auth.spec.ts` schlug beim ersten Lauf mit `CredentialsSignin` fehl –
  Ursache war ein **fehlendes Seed-Konto** in der lokalen DB (Docker-Container ohne
  `pnpm db:seed`-Lauf für die kopierten `.env.local`-Zugangsdaten), keine Regression durch
  den Bump. Nach `pnpm db:seed` liefen alle 5 Tests grün.
- `pnpm audit` liefert in dieser Sandbox eine kaputte/nicht dekomprimierte Antwort vom
  Registry-Endpoint (wie in der Spec vorhergesehen) – Ersatzkriterium Lockfile-Check
  (`@auth/core@0.41.3`) gilt als Nachweis.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
- [ ] Backlog (kein aktiver Task): next-auth-v5-Stable-Release beobachten, sobald verfügbar
      eigenen Task für Breaking-Change-Review gegen `auth.config.ts`/`auth.ts` anlegen.

## Review-Findings
<!-- Wird durch /review befüllt -->
3-Personen-Review (Logik, Code-Qualität, Architektur) abgeschlossen: APPROVED, keine
kritischen/wichtigen Findings, ein Nitpick (Homoglyph-Normalisierung im Credentials-Pfad,
für dieses Projekt kaum relevant – kein Blocker). Details: [review-228](review-228.md).

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `fix/228-next-auth-verwundbarkeiten-beheben`
Erstellt: 2026-07-26 08:26
