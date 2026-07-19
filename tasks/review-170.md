# Review: Task 170

## Kritische Findings (müssen behoben werden)
- (keine)

## Wichtige Findings (sollten behoben werden)
- (keine)

## Nitpicks (optional)
- [ ] [lib/prefetch-session.test.ts:12+26] `should_returnTrue_when_getRequest` und
      `should_returnTrue_when_getWithoutAnySignals` sind seit dem Signatur-Wechsel
      **identisch** (beide: `shouldSuppressSessionRotation({ method: "GET" })` → `true`).
      Da das Prädikat nur noch `{ method }` akzeptiert, lassen sich „ohne Signale" gar keine
      Signale mehr weglassen – der zweite Test fügt keine Abdeckung hinzu (clean-code: keine
      Duplikation). AC5 („rein methodenbasiert") ist durch die **Signatur** selbst + den
      entfernten Header-Code belegt; ein separater Unit-Test dafür ist überflüssig. Vorschlag:
      den `getWithoutAnySignals`-Fall entfernen (AC5 bleibt über Signatur + Proxy-Test
      `should_stripSessionCookie_when_getRequest` mit leeren Headern abgedeckt) oder den
      Kommentar der AC5-Zuordnung an den einen GET-Test hängen.
- [ ] [lib/prefetch-session.ts:23-31] Die Methoden-Prüfung normalisiert die Schreibweise
      nicht (`MUTATION_METHODS.has(request.method)` gegen Uppercase-Literale). Das Spec-
      Fehlerszenario „Groß-/Kleinschreibung der Methode … dennoch bewusst prüfen" ist damit
      als Kommentar-Rationale (Z. 23-24: „Web-Request-API liefert sie uppercase") umgesetzt,
      aber **untestbar dokumentiert** – kein Test lockt die Annahme ein. Risiko ist niedrig
      und in **sichere Richtung**: käme eine Mutation als `"post"` (lowercase) an, würde ihr
      Set-Cookie gestrippt (Login/Logout bräche – aber Login ist per Design ein Uppercase-POST
      und würde eine lowercase-Methode ohnehin vor dem Session-Setzen mit 405 ablehnen; keine
      Resurrection-Richtung). Optional: einen dokumentierenden Test
      `should_returnFalse_when_uppercasePost`/bewusst gegen die Annahme, oder — falls
      Robustheit gewünscht — `request.method.toUpperCase()`. Nicht blockierend.

## Positives
- **Klasse statt Symptom:** Die method-weite Regel (alles außer POST/PUT/PATCH/DELETE)
  beendet das #164-Whack-a-Mole strukturell und entfernt die fragile
  `next-url`/`sec-fetch-dest`-Heuristik ersatzlos – GET/HEAD/OPTIONS und jede künftige
  nicht-mutierende Methode sind in einem Schritt erfasst.
- **Sichere Invariante, sauber begründet:** „Kein GET/HEAD/OPTIONS etabliert je legitim eine
  Session (Login = Credentials-POST; `api/auth` aus dem Matcher ausgenommen)" trägt die
  Sicherheit der Änderung – in ADR-032, Spec und Code-Kommentar konsistent belegt. `git grep`
  bestätigt: kein GET-Pfad außerhalb `api/auth` setzt Session-Cookies (Credentials-only Auth).
- **`stripSessionRotation` bewusst unangetastet** – verankerte Cookie-Regex, CSRF-/
  callback-url-Schutz und chunked-Cookie-Behandlung bleiben, Keep-**und** Strip-Tests grün
  (Selektivität nicht regrediert, #116).
- **Proxy-Kompositionstest** deckt AC1–AC4 auf der echten Verdrahtungs-Naht ab (realer Wrapper
  + reale Helfer, nur NextAuth gemockt); `should_passThrough_when_authReturnsNoResponse`
  sichert den `undefined`-Pfad; `beforeEach(vi.resetAllMocks())` gemäß #51-Regel.
- **Fail-closed erhalten:** kein try/catch im Wrapper – Exception propagiert (Spec-
  Fehlerszenario erfüllt).
- **Doku vollständig nachgezogen:** ADR-032 (mit Alternativen A/B/C), Spec, und die Korrektur
  des #164-Stolpersteins in `PROJECT-CONTEXT.md` (AC7). Kein stale `isRscRequest` mehr im Code
  (nur als Historie in Kommentaren/Spec).
- **Scope sauber:** keine Routen-/Matcher-Änderung → `docs/routes.md` korrekt nicht betroffen;
  Branch-Typ `bug` + `security` passt (Scope-Check #120 dokumentiert).

## Anmerkung zu AC6 (kein Finding, Prozess)
AC6 (`--repeat-each=24` gegen INT → 0 Fehler) ist als `[~]` mit Blocker dokumentiert: INT
trägt den Fix erst nach dem Merge, lokal nicht aussagekräftig. Das ist der eigentliche
Wirksamkeitsnachweis der Änderung – vor dem Abschluss über `/post-merge-verify` bzw. den
Nachtest nach dem INT-Deploy verifizieren. Ehrlich als offen markiert; kein Code-Defekt.

## Empfehlung
APPROVED
