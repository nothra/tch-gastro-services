# Security Review: Task 164

Auth-Edge-Middleware-Fix (`proxy.ts` wrappt NextAuth; entfernt auf RSC-/Prefetch-GETs das
rotierende `…authjs.session-token`-Set-Cookie). Geprüft: `proxy.ts`, `lib/prefetch-session.ts`,
`auth.config.ts`, `auth.ts`, `app/actions/session.ts`, Tests, `AppNav.tsx`, `app/page.tsx`, Matcher.
Verifiziert per Diff vs. `main`, Leak-Grep, Testlauf.

## Kritische Findings (Blocker)
- keine.

## Wichtige Findings
- keine.

## Hinweise
- [ ] **[Auth/Fail-safe]** `lib/prefetch-session.ts:26-31`: Bei einem GET **ohne** `next-url` und
      **ohne** `sec-fetch-dest` (sehr alter Client) gibt `isRscRequest` bewusst `false` → das Cookie
      rotiert normal (theoretisch resurrectbar). Korrekte paranoide Wahl für einen Cookie-strippenden
      Guard (nie echtes Auth brechen); moderne Browser senden immer `sec-fetch-dest`, Next-Prefetch
      immer `next-url`. Kein Handlungsbedarf.
- [ ] **[Session/UX]** Client-seitige RSC-Navigation (nicht nur Prefetch) rotiert die Rolling-Session
      nicht mehr – designbedingt (in der Task-Datei als bewusste Entscheidung dokumentiert). Verkürzt
      **keine** bestehende Session (Cookie bleibt bis zum eigenen Ablauf gültig), eher konservativer.
      Kein Security-Belang.

## Ergebnis
PASSED

---

## Begründung (warum die Angriffsflächen geschlossen sind)
1. **Kein legitim setzendes Cookie wird unterdrückt.** Session-Etablierung nur über Credentials-
   Provider = **POST** (`auth.ts`); `isRscRequest` gated hart auf `method === "GET"`. Kein OAuth-/
   Magic-Link-GET-Callback vorhanden; `api/auth` ist zudem aus dem Matcher ausgenommen (Proxy läuft
   dort nicht). Logout (`app/actions/session.ts`) ist POST → nicht betroffen.
2. **Zugriffsschutz unverändert.** `auth.config.ts`/`auth.ts`/`app/actions/session.ts` sind
   **byte-identisch zu `main`**. Der `authorized`-Callback (fail-closed Redirect) läuft unverändert
   **innerhalb** `authMiddleware(...)`; gestrippt wird erst danach und nur der Set-Cookie-Header –
   Status/Redirect bleiben. Ein Deny wird nie zu einem Allow.
3. **Kein Spoofing-Hebel.** `next-url`/`sec-fetch-dest` kann ein Angreifer nur an den **eigenen**
   Requests setzen → Effekt maximal: eigene Session-Rotation entfällt (Set-Cookie ist requester-
   gebunden). Kein Cross-User-Effekt, keine Session-Fixation, kein fremdes Logout verhinderbar.
4. **Regex trifft nur das Session-Token.** `^(?:__Secure-)?authjs\.session-token(?:\.\d+)?=`
   verankert, verlangt `=` direkt danach → `csrf-token`/`callback-url`/`_vercel_jwt` matchen nicht
   (Keep-Test belegt). Kein ReDoS (lineare Struktur). CSRF-Schutz intakt.
5. **Fail-closed bei Exceptions.** Kein try/catch im Wrapper → eine Exception in `authMiddleware`
   propagiert; Next behandelt die Middleware fail-closed (kein Auth-Bypass). Matcher unverändert.
6. **Keine Secrets/Leaks** (kein `console`, keine Debug-Header, keine Token-Werte). Keine neuen
   Dependencies, keine Injection-/XSS-Fläche (reine Header-Manipulation).
