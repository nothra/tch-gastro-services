# Test-Coverage: Task 48

## Coverage (vitest `pnpm test:coverage`, Schwelle 80 %)

| Metrik      | Wert    | Schwelle | Status |
|-------------|---------|----------|--------|
| Statements  | 96.29 % | 80 %     | ✅ |
| Branches    | 84.21 % | 80 %     | ✅ |
| Functions   | 100 %   | 80 %     | ✅ |
| Lines       | 100 %   | 80 %     | ✅ |

18 Tests in 5 Dateien grün.

**Verbleibende ungedeckte Branches (unkritisch, kein AC):**
- `app/components/AppHeader.tsx:10` — `email ?? "Angemeldet"`-Fallback (reine Anzeige,
  tritt nur bei Konto ohne E-Mail auf; kein AC).
- `app/components/StageBanner.tsx:6`, `lib/stage.ts:7` — **vorbestehend, nicht Teil von #48.**

## Akzeptanzkriterium → Test-Nachweis

| AC (spec-48) | Nachweis |
|---|---|
| AC1 unangemeldet → Redirect `/login` | `proxy.ts` (`authorized`) · e2e `auth.spec.ts` „unangemeldet → Redirect" |
| AC2 gültige Zugangsdaten → angemeldet, Rollen wirken | Flow `authorize→jwt→session` · e2e „Login mit Admin" |
| AC3 Abrechner (ohne Verwalter) → serverseitig abgelehnt | `lib/authz.test.ts` `should_throwForbidden_when_userLacksRole` (Mechanismus; Katalog-/Stammdaten-Actions = F2/F3) |
| AC4 Verwalter → lesen+schreiben | `lib/authz.test.ts` `should_returnSession_when_userHasRole` |
| AC5 Abmelden → Sitzung beendet, Seiten gesperrt | `app/actions/session.test.ts` (Action) · `AppHeader.test.tsx` (Button-Render) · **neu** e2e `auth.spec.ts` „Abmelden … sperrt geschützte Seiten" |
| AC6 manipulierte/abgelaufene Session → abgelehnt | `lib/authz.test.ts` `should_throwForbidden_when_noSession` |
| Fehler: falsche Zugangsdaten → generische Meldung, keine Preisgabe | `auth.ts`/`lib/credentials.ts` (identisch `null`; `bcrypt.compare` läuft immer → kein Timing-Leak) · `lib/credentials.test.ts` · e2e „falsche Zugangsdaten" |
| Fehler: fremde Rolle → 403-artig, protokolliert | `lib/authz.test.ts` `should_logRejection_when_accessDenied` (+ `ForbiddenError`-Test) |

## Neu ergänzte Tests in diesem Schritt

- `app/actions/session.test.ts` — `signOutAction` delegiert an `signOut({ redirectTo: "/login" })`.
- `lib/authz.test.ts` — `should_logRejection_when_accessDenied` (AC „protokolliert"),
  `hasAnyRole`-leeres-`required` (fail-closed), `ForbiddenError`-Default-Message/Name.
- `e2e/auth.spec.ts` — Abmelde-Fluss end-to-end (Login → Abmelden → `/login` → geschützte Seite gesperrt).

## Hinweis zur e2e-Ausführung

Der neue e2e-Test wurde **nicht** lokal ausgeführt (erfordert Migration + Seed der lokalen
`tch_dev`-DB und einen laufenden Dev-Server). Er folgt exakt dem Muster der bestehenden
e2e-Tests (Skip ohne `SEED_ADMIN_*`) und wird durch den Deploy-Gate-e2e-Lauf (INT) abgedeckt.
tsc + ESLint über die Datei sind grün.
