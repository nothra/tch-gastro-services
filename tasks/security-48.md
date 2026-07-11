# Security Review: Task 48 (Login + RBAC)

> Unabhängiger Security-Pass (OWASP Top 10 + Basics) über `git diff main...HEAD`.
> Threat Surface: kleine, nicht-kommerzielle Vereins-PWA, Konten nur per Seed/Verwalter
> provisioniert (keine offene Registrierung), Vercel + Neon EU, Auth.js v5 Credentials + JWT.

## Kritische Findings (Blocker)

- _Keine._ Kein SQLi, keine hartkodierten Secrets, keine fehlende Auth, keine Self-Escalation.

## Wichtige Findings

- [x] **[Auth / User-Enumeration] Timing-Seitenkanal — BEHOBEN.** Zuvor kehrte `authorize()`
      bei unbekannter E-Mail sofort zurück, bei existierender lief der ~100 ms teure `bcrypt.compare`
      → die Antwortzeit verriet die Existenz (spec-48 „keine Preisgabe, ob der Benutzername
      existiert"). **Fix:** `lib/credentials.ts` `verifyCredentials()` führt `bcrypt.compare` **immer**
      aus – bei fehlendem/hashlosem Nutzer gegen einen konstanten Dummy-Hash (constant-time-Pfad).
      `auth.ts` delegiert an diese Funktion. Deterministisch getestet
      (`lib/credentials.test.ts` `should_runBcryptCompare_even_when_userUndefined`).

## Hinweise

- [ ] **[Error Handling] `lib/authz.ts:44` — `ForbiddenError` ohne 403-Boundary.** Ungefangener
      Throw in einer Server Action rendert Next als 500-artig, nicht 403. Kein Live-Defekt (keine
      Konsumenten in #48). **Konvention für F2–F8:** `ForbiddenError` fangen → 403-artig beantworten.
- [ ] **[Dependencies] `pnpm audit --prod`: 1 moderate** — `postcss <8.5.10` (XSS via unescaped
      `</style>` beim CSS-Stringify), transitiv über `next`. Build-Zeit-Tool, kein
      angreiferkontrolliertes CSS im Runtime-Pfad → geringe Relevanz. **Lösung:** beim nächsten
      `next`-Update mitziehen oder pnpm-override auf `postcss>=8.5.10`. Keine weiteren Prod-Vulns.
- [ ] **[Info-Leak/Logs] `lib/authz.ts:39-43`** — `console.warn` loggt nur Rollen-Enum-Werte, keine
      Passwörter/Hashes/E-Mails/Tokens. Sensitivität sehr niedrig; erfüllt AK „protokolliert". Kein Handlungsbedarf.
- [ ] **[Token-Staleness] `auth.config.ts:18-25`** — Rollen im signierten JWT; Rollenentzug wirkt erst
      nach erneutem Login (Edge liest keine DB). In ADR-016 bewusst als akzeptabel dokumentiert.
- [ ] **[Misconfig] `proxy.ts:15-17`** — künftiger `@serwist/next`-Service-Worker unter `/sw.js` ist
      nicht vom Auth-Gate ausgenommen → im PWA-Task mitdenken (kein aktueller Defekt).

## Positives (belegt sicher gelöst)

- **Injection:** DB-Zugriff durchgängig parametrisiert über Drizzle (`eq(users.email, email)`,
  `auth.ts:27`, `seed.ts`) — kein String-Concat, keine rohen SQL-Strings. Migration 0002 ist
  statisches DDL ohne User-Input. Kein `dangerouslySetInnerHTML`; `AppHeader` rendert `email` als
  JSX-Text → React escaped automatisch (kein XSS).
- **Auth-Flow:** Zod-Validierung an der Grenze (`loginSchema`); bcrypt (rounds 10); generische
  Login-Meldung ohne Enumeration im Text; `AuthError` sauber gefangen, Redirect-Throw durchgereicht.
- **Autorisierung fail-closed:** `hasRole(undefined|null|[], …)` → false; `requireAnyRole([])` wirft
  immer; fehlende/manipulierte Session abgedeckt; kein `"member"`-Default mehr. JWT-Rollen über
  AUTH_SECRET signiert → clientseitig nicht manipulierbar.
- **Krypto/Zufall:** `globalThis.crypto.randomUUID()` für IDs; kein `Math.random` in Security-Code.
- **Edge/Node-Trennung:** `auth.config.ts`/`proxy.ts` ohne `db`/`bcrypt`; `UserRole` nur `import type`.
- **Cookies/CSRF:** keine riskanten Overrides → Auth.js-v5-Defaults (httpOnly, sameSite=lax, secure
  in Prod) + eingebauter CSRF-Schutz. `/api/version` gibt nur SHA+Stage aus, keine Secrets.

## Ergebnis

PASSED

> Keine blockierenden Findings. Der einzige echte Spec-Bezug (Timing-Seitenkanal zur
> User-Enumeration) wurde direkt behoben (`lib/credentials.ts`, constant-time `bcrypt.compare`,
> deterministisch getestet). Die verbleibenden Hinweise (403-Boundary-Konvention für F2–F8,
> `postcss`-Dep beim nächsten `next`-Update, `/sw.js` im PWA-Task) sind Folge-/Betriebsthemen.
