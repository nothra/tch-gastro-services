# Security Review: Task 48 (Login + RBAC)

> Unabhängiger Security-Pass (OWASP Top 10 + Basics) über `git diff main...HEAD`.
> Threat Surface: kleine, nicht-kommerzielle Vereins-PWA, Konten nur per Seed/Verwalter
> provisioniert (keine offene Registrierung), Vercel + Neon EU, Auth.js v5 Credentials + JWT.

## Kritische Findings (Blocker)

- _Keine._ Kein SQLi, keine hartkodierten Secrets, keine fehlende Auth, keine Self-Escalation.

## Wichtige Findings

- [ ] **[Auth / User-Enumeration] `auth.ts:28-30` — Timing-Seitenkanal.** Bei unbekannter
      E-Mail kehrt `authorize()` sofort zurück (`if (!user?.passwordHash) return null;`), bei
      existierender läuft der ~100 ms teure `bcrypt.compare`. Die Fehler*meldung* ist generisch
      (gut), aber die Antwort*zeit* verrät die Existenz. spec-48 fordert explizit „keine Preisgabe,
      ob der Benutzername existiert" → **Spec-AK teilweise nicht erfüllt.** Angriff: Response-Zeit
      über viele E-Mails messen, trennt registrierte Betreiber von Nicht-Registrierten.
      Praxisrelevanz gering (keine offene Registrierung, Betreiber sind bekannte Clubmitglieder).
      **Kein Merge-Blocker.** **Lösung:** bei fehlendem User `bcrypt.compare` gegen einen konstanten
      Dummy-Hash laufen lassen, um die Laufzeit anzugleichen (constant-time-Pfad). Vorbestehend aus #16.

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

> Keine blockierenden Findings. Innerhalb des #48-Scopes sind die Sicherheitsgrundlagen solide.
> Einziger echter Spec-Bezug: der Timing-Seitenkanal (`auth.ts:28-30`) — niedrige Praxisrelevanz
> für diese Threat Surface, empfohlen als kleiner Folge-Fix (konstanter Dummy-bcrypt-Vergleich),
> blockiert den Merge nicht.
