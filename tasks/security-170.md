# Security Review: Task 170

Scope: `git diff main...HEAD` – method-basierte Unterdrückung der Auth.js-Session-Rotation
(`lib/prefetch-session.ts`, `proxy.ts` + Tests, ADR-032/Spec/Doku). Reine
Session-Management-Änderung; keine DB-, Netz- oder Rendering-Grenze berührt.

## Kritische Findings (Blocker)
- (keine)

## Wichtige Findings
- (keine)

## Hinweise
- [ ] [Session Management] `shouldSuppressSessionRotation` (`lib/prefetch-session.ts:29`)
      normalisiert die Schreibweise der HTTP-Methode nicht (`MUTATION_METHODS.has(request.method)`
      gegen Uppercase-Literale). **Kein Sicherheitsrisiko in die kritische Richtung:** Um das
      Strippen zu *umgehen* (= Resurrection zuzulassen), müsste `request.method` exakt
      `POST/PUT/PATCH/DELETE` sein – jede Mixed-/Lowercase-Variante liefert weiterhin `true`
      (strippt). Eine als `"post"` eintreffende Mutation würde ihr Set-Cookie verlieren (Login/
      Logout bräche), aber die Web-Request-/Edge-Runtime liefert Standardmethoden uppercase, und
      Login lehnt eine unerwartete Methode ohnehin vor dem Session-Setzen ab. Bereits als
      Kommentar-Rationale dokumentiert (`lib/prefetch-session.ts:23-24`) und im Review als
      nicht-blockierender Nitpick geführt. Optional (Robustheit, keine Sicherheit):
      `request.method.toUpperCase()` – bewusst als Verhaltensänderung im /refactor abgelehnt.

- [ ] [Session Handling / Info] Bewusster Trade-off (ADR-032): Die Rolling-Session erneuert
      sich nur noch bei mutierenden Requests, nicht mehr bei jeder Navigation. Wirkt in die
      **sichere** Richtung (kürzere effektive Session-Erneuerung, feste `maxAge`). Kein Finding,
      hier nur zur Vollständigkeit dokumentiert.

## Prüfkatalog-Ergebnis (Kurz)
- **Injection/Input-Validierung:** Kein User-Input erreicht einen Sink. Der Cookie-Regex
  wirkt ausschließlich auf server-eigene `Set-Cookie`-Header, nicht auf Request-Daten;
  verankert (`^`) und mit escaptem Literal-Punkt. Kein SQL/Command/XSS. ✓
- **AuthN/AuthZ & Session:** `stripSessionRotation` *entfernt* nur ein server-gesetztes
  rotierendes Cookie – setzt/fälscht nie eines; kann eine Session nie verlängern oder
  wiederbeleben. Invariante „kein GET/HEAD/OPTIONS etabliert je eine Session" trägt
  (Credentials-POST; `api/auth` aus dem Matcher ausgenommen, `proxy.ts:42`). Kein IDOR/BOLA. ✓
- **Cookie-Selektivität (CSRF):** Regex trifft nur `authjs.session-token`
  (inkl. chunked `.0/.1`); `__Host-authjs.csrf-token`, callback-url und `_vercel_jwt`
  bleiben erhalten (Keep-Test grün). Keine CSRF-Schwächung. ✓
- **Sensitive Data:** Keine Secrets im Code, keine Token in Logs. ✓
- **Dependencies:** Keine neuen Abhängigkeiten. ✓
- **Error Handling:** Kein try/catch im Wrapper → fail-closed, keine Stacktraces nach außen. ✓

## Ergebnis
PASSED
