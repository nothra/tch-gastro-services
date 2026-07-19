# Review: Task 164

**Runde 2** (nach Rework zum zentralen `proxy.ts`-Guard). Runde 1 (NEEDS_REWORK, per-Link
unvollständig) ist adressiert: der Schutz liegt jetzt zentral und deckt ALLE geschützten Links ab.
Diff ggü. Basis `216e8cc`: `proxy.ts`, `lib/prefetch-session.ts(+test)`, `app/components/AppNav.tsx`,
`app/page.tsx`, `app/nav-prefetch.test.tsx`. Keine Routen-Änderung → `docs/routes.md` unangetastet.

Der Fix wurde mechanisch gegen die NextAuth-Quelle verifiziert (`node_modules/next-auth/lib/index.js:166`
baut `finalResponse` via `new Response(body, response)` → Header mutable, `stripSessionRotation` kann
nicht am Immutable-Guard werfen; Direktaufruf `auth(request, event)` trifft dieselbe `instanceof Request`-
Branch wie `export default auth`). Laufzeit-A/B am lokalen Prod-Server bestätigt: RSC-GET strippt Session-
Cookie, Dokument-GET rotiert weiter, abgemeldet → 307 `/login`.

## Kritische Findings (müssen behoben werden)
- keine.

## Wichtige Findings (sollten behoben werden)
- [ ] **[proxy.ts:24-30] Kompositions-Naht nicht automatisiert getestet.** `isRscRequest`/
      `stripSessionRotation` sind gut getestet, aber die Verknüpfung (RSC-GET → gestrippt /
      Dokument-GET → rotiert / POST → nie) ist nur empirisch belegt (`proxy.test.ts` fehlt).
      Kollidiert mit „neuer Code: 100 % Coverage" + #114/#117 (jede separierbare Verhaltensregel
      eine Assertion). **Für `/test`:** Verknüpfung in eine testbare `applyPrefetchGuard(request,
      response)` in `lib/prefetch-session.ts` ziehen (bleibt edge-safe) und mit Fake-Response
      (Session-Set-Cookie) testen: RSC-GET entfernt / Dokument-GET erhält / POST erhält.
- [ ] **[Task-Doku] Rolling-Session-Verhaltensänderung explizit festhalten.** Der Guard strippt auf
      ALLEN RSC-GETs (auch echten Soft-Navigationen, nicht nur Prefetch) → das JWT-Fenster erneuert
      sich nur noch bei Dokumentaufrufen/Login. Risiko praktisch vernachlässigbar (maxAge-Default
      30 Tage, `auth.ts:19` setzt keins; wöchentliche PWA), aber bewusste projektweite Entscheidung
      → in der Task-Datei/ADR-Verweis dokumentieren („Entscheidungen dokumentieren").

## Nitpicks (optional)
- [ ] **[lib/prefetch-session.test.ts:49]** Kommentar behauptet „csrf bleibt unangetastet", getestet
      wird nur `callback-url`. Einen `__Host-authjs.csrf-token=…`-Keep-Fall ergänzen (#116: Strip-Test
      ≠ Keep-Test). Für `/test`.
- [ ] **[proxy.ts:18]** `auth as unknown as EdgeMiddleware` ist ein vollständiger Typ-Bypass (gut
      kommentiert, per Quelle korrekt) – fängt eine NextAuth-Signaturänderung beim Upgrade nicht.
      Akzeptabel.
- [ ] **[app/nav-prefetch.test.tsx]** Prüft jetzt nur noch die Perf-/Defense-in-depth-Eigenschaft
      (prefetch={false}-Prop), nicht mehr den Sicherheitsfix. Nicht tautologisch, Kommentar rahmt es
      ehrlich. Beibehalten ok.

## Positives
- Root Cause empirisch getract (Set-Cookie-Reihenfolge) und Fix gegen die NextAuth-Quelle verifiziert –
  nicht geraten.
- Konsequent fail-safe: fehlende Signale → nicht strippen; POST nie strippen; Session-Establishment läuft
  nur über den im Matcher ausgenommenen `api/auth`-POST → der Guard sieht nie ein etablierendes Cookie.
- Angreifer-Vektor harmlos (`next-url` auf GET betrifft nur die eigene Session-Rotation).
- Regex präzise verankert (`^(?:__Secure-)?authjs\.session-token(?:\.\d+)?=`): trifft HTTP-/Secure-/
  gechunkte Varianten, nicht csrf-/callback-url.
- `lib/prefetch-session.ts` edge-safe (nur Web-`Headers`/`Response`/RegExp) und domänenspezifisch benannt.
- Sehr gute WHY-Kommentare (Root Cause, Erkennung via next-url/sec-fetch-dest, Fail-safe).

## Empfehlung
APPROVED
