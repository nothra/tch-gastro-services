# Review: Task 228

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)

_Keine._

## Nitpicks (optional)
- [ ] [lib/credentials.ts / auth.ts:27] Der Credentials-Login vergleicht E-Mail-Adressen über
      eine direkte DB-Gleichheitsabfrage (`eq(users.email, email)`) ohne eigene
      NFKC-Normalisierung. Die mit `@auth/core@0.41.3` gefixte Normalisierung (GHSA-7rqj-j65f-68wh)
      greift nur im Email/Magic-Link-Provider, den dieses Projekt nicht einsetzt – für den
      tatsächlichen Login-Pfad (Credentials-Provider, geschlossene Registrierung laut ADR-016)
      ist die zweite Advisory damit praktisch nicht relevant. Kein Blocker: Spec-Scope ist bewusst
      auf Dependency-Ebene begrenzt; bei Bedarf eigener Hardening-Task, aber Risiko ist gering
      (keine offene Registrierung, kein Homoglyph-Kollisionsrisiko bei exakter DB-Gleichheit).

## Positives
- Diff exakt auf den in Spec/Task beschriebenen Scope begrenzt: `package.json`,
  `pnpm-lock.yaml`, zwei neue Doku-Dateien (Spec + Task). Keine Testdateien angefasst, keine
  Änderung an `auth.config.ts`/`auth.ts`/`lib/authz.ts`.
- Unabhängig verifiziert: `next-auth@5.0.0-beta.32` liefert bei nicht-OK-Session-Response `null`
  statt Error-Objekt → `!!auth?.user` (`auth.config.ts:12`) wertet jetzt korrekt fail-closed aus
  (GHSA-8fpg-xm3f-6cx3 behoben). `@auth/core@0.41.3` normalisiert E-Mails vor der Validierung via
  NFKC (GHSA-7rqj-j65f-68wh behoben) und bringt zusätzliche Härtungen (provider-gebundene
  OAuth-State/PKCE-Cookies, robusteres Bearer-Token-Decoding).
- Peer-Dependency-Erweiterung bei `nodemailer` (`^7.0.7` → `^7.0.7 || ^8.0.5`) unproblematisch,
  da nur die erlaubte Range erweitert wird und das Projekt keine direkte `nodemailer`-Abhängigkeit
  führt. Kein `--force`, kein Downgrade.
- Lockfile korrekt: `@auth/core@0.41.3` (erfüllt `>=0.41.3`), `next-auth@5.0.0-beta.32`.
- ADR-014 beschreibt nur die grundsätzliche Tech-Stack-Wahl (Auth.js v5) ohne Versionsnummer –
  der Patch-Bump löst korrekt keine ADR-Pflegepflicht aus; Spec dokumentiert den
  ADR-Trigger-Check explizit.
- Konsistent mit der etablierten Override-Konvention (ADR-010/#167/#189): `next-auth` ist eine
  direkte `package.json`-Dependency, kein tief-transitiver Fall – daher zu Recht kein
  `pnpm-workspace.yaml`-Override.
- Task- und Spec-Datei sind inhaltlich deckungsgleich (identische Akzeptanzkriterien/Scope);
  unterschiedliche Checkbox-Zustände (Spec `[ ]`, Task `[x]`) entsprechen der etablierten
  Konvention (Spec bleibt statisches Anforderungsdokument, Task wird während der Ausführung
  abgehakt).
- Die technische Notiz zum initialen `CredentialsSignin`-E2E-Fehlschlag ist klar dokumentiert
  (Ursache: fehlender `pnpm db:seed`-Lauf im Docker-Container, explizit als „keine Regression
  durch den Bump" gekennzeichnet) – kein Missverständnis für spätere Leser.
- Keine Routen betroffen (`app/**/page.tsx`, `app/api/**/route.ts`) – `docs/routes.md` zu Recht
  unangetastet.
- Commit-Message folgt dem Format `<typ>: <Beschreibung>` und benennt die behobenen Advisories
  explizit.
- Lokale Verifikation (Review-Runde): `pnpm typecheck` grün, `auth.config.test.ts` +
  `lib/authz.test.ts` grün (25/25 Tests).

## Empfehlung
APPROVED
