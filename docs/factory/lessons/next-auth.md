# Lessons: Next.js, Auth & Routen

> Ausgelagerte `/codify`-Learnings (Volltext) zu **Next.js-Framework, `proxy.ts`, NextAuth/Session, öffentliche Routen**. **Nicht** `@import`-
> geladen (ADR-037) – bei Bedarf gezielt lesen. Kanonische Quelle je Regel ist der
> jeweilige Eintrag hier; im @import-Pfad (`PROJECT-CONTEXT.md`) steht nur eine Index-Zeile.
> Neue Learnings kommen hierher (nicht in den @import-Pfad) – siehe `/codify` + ADR-037.

### Next.js 16: Middleware heißt `proxy.ts` (aus #48)

Next 16 hat die Middleware-Konvention von `middleware.ts` auf **`proxy.ts`** umbenannt. Sind
**beide** Dateien vorhanden, bricht `next build` hart ab. NextAuth-v5-Doku und ältere ADRs nennen
noch `middleware.ts` – der Route-Schutz war hier in Wahrheit längst über `proxy.ts` verdrahtet.

**Regel:** Edge-Routen-Schutz in **`proxy.ts`** (Root) verdrahten, **keine** `middleware.ts`
anlegen. Muster: `const { auth } = NextAuth(authConfig); export default auth;` mit einer
`authConfig` **ohne** `db`/`bcrypt` (edge-sicher). Negativ-Lookahead-Matcher eng fassen
(nur konkrete statische Assets ausnehmen, nicht pauschal `.*\.svg$`) – fail-closed.

### NextAuth v5: Custom-Session-/JWT-Claims typisieren (aus #48)

`declare module "next-auth/jwt"` **greift nicht** – `next-auth/jwt` re-exportiert nur (`export *`);
die Augmentierung muss auf **`@auth/core/jwt`** zielen. Zusätzlich typisiert der `session()`-Callback
in der v5-Beta den Custom-Claim nicht sauber (`token.x` landet als `{}`).

**Regel:** In `types/next-auth.d.ts` `User`/`Session` über `next-auth` **und** `JWT` über
`@auth/core/jwt` augmentieren; im `session()`-Callback den JWT-Claim explizit casten
(`token.x as T`). Typen aus dem Data-Layer nur als `import type` (bleibt edge-sicher).

**Ergänzung – Coverage-Lücke bei `auth.config.ts` (aus #55, `/test`-Fund):** `authorized`/`jwt`/
`session` sind reine Funktionen ohne next-auth-Laufzeit-Abhängigkeit (direkt aufrufbar, kein Mock
nötig) – trotzdem blieb `auth.config.ts` seit der Einführung in #48 über mehrere Folge-Tasks hinweg
bei 0 % Coverage, weil ein Config-/Callback-Modul nicht wie „normale" Business-Logic aussieht und
deshalb beim Implementieren übersprungen wird. Erst die Coverage-Analyse in `/test` bei #55 deckte
es auf. **Regel:** Beim Einführen oder Ändern eines next-auth-Callbacks sofort einen Test daneben
schreiben, der die Funktion **direkt** aufruft (kein next-auth-Bootstrap nötig) – nicht auf eine
spätere `/test`-Coverage-Analyse verlassen.

### Öffentliche API-Routen aus dem Auth-Proxy ausnehmen (aus #63)

Eine neue Route unter `app/api/*` ist per Default vom `proxy.ts`-Matcher **erfasst** → der
`authorized`-Callback leitet Unangemeldete auf `/login` um (307). Ein öffentlicher Endpunkt
(Healthcheck, Webhook, Versions-Info) bekommt so **nie 200**, sondern einen Redirect. Besonders
tückisch: Ein Unit-Test, der den Route-Handler (`GET()`) **direkt** aufruft, umgeht den Proxy und
ist grün – der Bug zeigt sich erst live/e2e (in #63 im Deploy-Gate-Healthcheck erst nach dem Promote).

**Regel:** Jede unauthentifiziert erreichbare Route **explizit** in den Negativ-Lookahead des
`proxy.ts`-Matchers aufnehmen (Muster: `api/auth|api/version|api/health`). Den Matcher weiterhin
eng fassen (kein pauschales `api`), damit geschützte Routen fail-closed bleiben. Für solche Routen
einen Nachweis haben, der die **Proxy-Ebene** einbezieht (Gate-Healthcheck/e2e), nicht nur den Handler.

### Auto-Prefetch geschützter Routen belebt die Session nach dem Abmelden wieder (aus #164)

Next.js prefetcht `<Link>`s zu geschützten Routen automatisch (Viewport). Auth.js (JWT-Strategie)
erneuert das Session-Cookie bei **jedem** authentifizierten Request (Rolling Session) → jede
authentifizierte Prefetch-Antwort trägt ein frisches `…authjs.session-token`-`Set-Cookie`. Klickt
der Nutzer „Abmelden", während eine solche Prefetch-Antwort noch unterwegs ist, landet sie **nach**
dem signOut-Clear und **setzt das Cookie neu** → die Session wird wiederbelebt, das Logout „hält
nicht". Reines Timing ⇒ **flaky** (nur unter Latenz sichtbar, z. B. INT-Deploy-Gate; ~1/6).

**Korrektur (aus #170 / ADR-032): nicht-mutierende Methoden statt GET-only.** Der #164-Fix
unterdrückte die Rotation **nur bei `GET`** und erkannte den Request über die Next-16-internen
Header `next-url`/`sec-fetch-dest`. Das war Whack-a-Mole: Auch **`OPTIONS`- und `HEAD`-Requests**
durchlaufen den Proxy, rotieren das Cookie und können den signOut-Clear überholen (Playwright
feuert solche Preflight-/Probe-Requests rund um `page.goto`) → Logout blieb auf INT flaky
(`--repeat-each=24` → 1 Fehler). #170 ersetzt die Erkennung durch ein **rein methodenbasiertes**
Kriterium und die fragile Header-Heuristik entfällt ersatzlos. (Die ursprüngliche Prefetch-GET-
Analyse bleibt als Historie gültig; nur die Erkennungs-Aussage ist überholt.)

**Regel:**
- **Zentral in `proxy.ts` fixen, nicht per-Link.** Die NextAuth-Middleware wrappen und auf
  **allen nicht-mutierenden Methoden** das rotierende Session-`Set-Cookie` aus der Antwort
  entfernen (`lib/prefetch-session.ts`: `shouldSuppressSessionRotation` + `stripSessionRotation`).
  Deckt **alle** geschützten Routen und Methoden ab; per-Link `prefetch={false}` (Review-Runde 1)
  war unvollständig. `prefetch={false}` auf prominenten Nav-Links bleibt nur als
  Defense-in-depth/Perf.
- **Nur bei Mutationen NICHT strippen** – `POST`/`PUT`/`PATCH`/`DELETE` (Login/Logout/Server-Actions)
  dürfen das Session-Cookie setzen/löschen und bleiben unangetastet; `api/auth` ist ohnehin aus dem
  Matcher ausgenommen. Sicher per Konstruktion: **kein GET/HEAD/OPTIONS etabliert je legitim eine
  Session** (Login = Credentials-POST). Kein try/catch im Wrapper → Exception propagiert fail-closed.
- **Cookie-Regex verankern** (`^(?:__Secure-)?authjs\.session-token(?:\.\d+)?=`), damit CSRF-/
  callback-url-/`_vercel_jwt`-Cookies **nicht** getroffen werden; chunked `…session-token.0/.1`
  einschließen. Keep-Test (CSRF bleibt) **und** Strip-Test schreiben (#116).
- **Bewusster Trade-off:** Die Rolling-Session erneuert sich danach nur noch bei mutierenden
  Requests (faktisch beim Login-POST), nicht mehr bei jeder Navigation. Vernachlässigbar
  (maxAge-Default 30 Tage), eher sicherer. In der Task-Datei festhalten.

**Debugging-Lehre (allgemein):** Server-seitige Korrektheit schließt einen **Client-Race** nicht aus.
Die Issue-Vermutung `export const dynamic = "force-dynamic"` war hier ein **No-op** – die Route war
bereits `ƒ Dynamic` und sendete `no-store`. Nicht der gemeldeten Ursache glauben, sondern **empirisch**
verifizieren: Build-Routen-Tabelle (`○`/`ƒ`), echte Response-Header, und für flaky Races die
Playwright-Trace mit `--repeat-each` (die **Reihenfolge** der `Set-Cookie`-Header – `[SESSION-CLEARED]`
vor racenden `[SESSION-SET]`-Prefetch-Antworten – war der entscheidende Beweis).

