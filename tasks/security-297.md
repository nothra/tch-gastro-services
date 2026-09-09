# Security Review: Task 297

> `/security-review`, 2026-09-09 · Branch `feature/297-rate-limit-theke-leseroute`
> Diff-Scope: `git diff origin/main...HEAD` (11 Dateien, Lesson #161 – gegen `origin/main`,
> nicht gegen lokales `main`).
> Persona: `docs/factory/agents/security-agent.md`. Kein Produktionscode geändert.

## Kritische Findings (Blocker)

_Keine._ Keine ausnutzbare Schwachstelle in Vertraulichkeit oder Integrität, kein Auth-Bypass,
keine neue Abhängigkeit, kein Secret-/Logging-Leak. Der Merge ist aus Security-Sicht nicht
blockiert.

## Wichtige Findings

- [x] **W1 · [Verfügbarkeit/Robustheit] Eine HTML-429 auf einen echten Erfassungs-POST reißt die
  ganze Theken-Seite in Next' globalen Error-Screen** – nicht nur die Mengen-Steuerung.
  Anker: `proxy.ts:68-71` → `lib/theke-throttle-response.ts:49-57` →
  `app/_verzehr/MengeControl.tsx:25` (`useActionState`).

  Belegte Kette (an den **installierten** Versionen `next@16.2.12` / `react-dom@19.2.8`
  nachgelesen und vom Orchestrator eigenständig nachvollzogen, Lesson #314):
  1. Die Drossel-Antwort trägt `content-type: text/html; charset=utf-8`
     (`lib/theke-throttle-response.ts:53`).
  2. `next/dist/client/components/router-reducer/reducers/server-action-reducer.js` – eine
     Action-Antwort ohne `text/x-component` und ohne `x-action-redirect` führt zu `throw`. Der
     Body wird **nur** bei exakt `contentType === 'text/plain'` als Meldung übernommen (strikter
     Vergleich – ein `; charset=utf-8` fällt bereits heraus); bei `text/html` bleibt es bei der
     generischen Meldung *„An unexpected response was received from the server."*
  3. `react-dom-client` `updateActionStateImpl` – `useThenable(...)` auf dem rejected Thenable
     wirft **während des Renderns** weiter (`catch (x) { … throw x; }`).
  4. Im gesamten `app/`-Baum existiert weder `error.tsx` noch `global-error.tsx` (per `find`
     geprüft, leeres Ergebnis) → die Exception läuft bis in Next' Default-`GlobalError`.

  Ergebnis: Statt der roten Inline-Meldung neben dem ±-Button verschwindet die komplette
  Theken-Ansicht hinter „Application error: a client-side exception has occurred"; Erholung nur
  per Reload. Die ADR-044-Drossel verhält sich korrekt anders – sie antwortet **innerhalb** des
  Action-Protokolls mit `{ error: TOO_MANY_REQUESTS }` (`app/veranstaltung/actions.ts:315`), und
  genau darauf beruft sich der Modul-Kommentar `app/_verzehr/MengeControl.tsx:6-11` („Schlägt die
  Action fehl, bleibt die alte Menge stehen und der Fehler wird sichtbar").

  Angriffsseite: Das Schreib-Budget ist **ohne gültiges Token** erschöpfbar – `proxy.ts:68-70`
  zählt, bevor irgendetwas aufgelöst wird. ~4 Anfragen/s auf `/theke/<beliebig>` mit irgendeinem
  `Next-Action`-Header legen die Erfassung **aller** Veranstaltungen auf der Instanz für das
  Fenster lahm, und die Theke sieht dabei nicht „gerade zu viel los", sondern eine abgestürzte
  App. Die Fehlerklasse ist nicht neu (ein Offline-/Netzfehler während einer Server Action führt
  heute schon dorthin) – #297 macht sie billig auslösbar.

  **Kein Blocker:** keine Vertraulichkeits-/Integritätswirkung, kein Datenverlust (der Verzehr ist
  server-autoritativ, ADR-025 D4), selbstheilend nach dem Fenster. Aber oberhalb der
  Kleinfunde-Schwelle (reproduzierbarer Auslöser + Verfügbarkeitsrisiko).
  → **Ausgelagert als Issue [#331](https://github.com/nothra/tch-gastro-services/issues/331)**
  (`bug` + `security`), angelegt über den Seam `create_issue_idempotent` (ADR-018).
  Empfohlener kleinster wirksamer Schritt dort: `app/theke/[token]/error.tsx` mit `reset()`.

- [x] **W2 · [Doku-Vollständigkeit] Die neue Verfügbarkeits-Angriffsfläche auf dem Schreibpfad war
  in ADR-048 qualitativ genannt, aber nicht beziffert.** Anker:
  `docs/adr/048-rate-limit-theke-leseroute.md` → Konsequenzen, Bullet „Der Schreibpfad hat jetzt
  eine Obergrenze".

  Der Satz („deckelt im Extremfall auch echte Erfassung") war nicht falsch, ließ aber die für die
  Abwägung entscheidende Größe weg: dass es **kein gültiges Token** braucht und dass fremde
  Veranstaltungen mitbetroffen sind – vor ADR-048 unmöglich, weil ADR-044 auf einen serverseitig
  gebundenen Schlüssel zählt. Die Entscheidung selbst wird **nicht** relitigiert (der ungezählte
  Marker-Zweig wäre ein Header-Schalter zum Abstellen der Bremse); beanstandet war allein die
  Vollständigkeit der dokumentierten Konsequenz.

  **In diesem PR behoben** (Lesson #211/#176 – Doku, die dieser PR selbst verfasst hat, wird im
  selben PR nachgezogen): Der Bullet nennt jetzt Größenordnung, die fehlende Token-Bindung, den
  Vergleich zu ADR-044 und verweist für die UI-Wirkung auf #331. Kein Produktionscode berührt.

## Hinweise

- [x] **H1 · [Logging/Monitoring, OWASP A09] Drosseln hinterlässt keine Spur.** `proxy.ts:70`
  lehnt still ab – kein Log, kein Zähler. Ob die Bremse je gegriffen hat (Missbrauch oder zu eng
  bemessener Schwellwert), ist nachträglich nicht feststellbar. Konsistent mit ADR-020
  (`app/api/health/route.ts` loggt ebenfalls nicht), dort trifft eine Drossel aber nur den
  Deploy-Healthcheck, hier echte Besucher. Vorschlag: `console.warn` auf der **Flanke** (erste
  Ablehnung je Fenster), nicht pro Anfrage – sonst wird der Flood-Fall zur Log-Amplifikation.
  → Kleinfund, unterhalb der Schwelle (ADR-043): Eintrag in `docs/factory/kleinfunde.md`.

- [x] **H2 · [Security-Header] 429 ohne `X-Content-Type-Options: nosniff`.**
  `lib/theke-throttle-response.ts:52-56`. Kein aktueller Vektor – das Dokument ist statisch, die
  einzige Interpolation ist eine aus einer Konstante berechnete Zahl. Kein Regress: `next.config.ts`
  setzt projektweit **keine** `headers()`-Policy, die 429 ist also nicht schlechter gestellt als
  der Rest der App. Eine projektweite Header-Baseline wäre ein eigener Task, kein Thema dieses PRs
  (geprüft: dafür existiert heute kein Issue). → Kleinfund, Eintrag in
  `docs/factory/kleinfunde.md`.

- [ ] **H3 · [kein Security-Thema] `Retry-After`-Ganzzahligkeit** (`lib/theke-throttle-response.ts:20`)
  ist bereits als Review-Nitpick erfasst und von `/refactor` bewusst abgelehnt (`clean-code.md` –
  Fallback für einen vom Typ/der Konstante ausgeschlossenen Fall). Aus Security-Sicht irrelevant:
  kein Leak, kein Parsing-Risiko. Keine Aktion.

## Antwort auf Nitpick 5 aus Review-Runde 3

> *Frage des Reports: Was passiert in der UI, wenn ein echter Erfassungs-POST auf ein erschöpftes
> Schreib-Budget läuft?*

Next erkennt die HTML-429 als ungültige Server-Action-Antwort und wirft
`Error("An unexpected response was received from the server.")`; `useActionState` re-throwt die
Rejection während des Renderns; mangels `error.tsx` fängt erst Next' Default-`GlobalError`. Der
Nutzer sieht **weder** die freundliche 429-Seite **noch** die rote Inline-Meldung, sondern den
generischen Client-Error-Screen (Kette + Fundstellen siehe W1).

**Sicherheitsrelevanz:** rein Verfügbarkeit. Keine Vertraulichkeits-/Integritätswirkung (die 429
enthält keine Daten, der Absturz ist clientseitig, kein Zustand geht verloren). Relevant ist, dass
ein Angreifer ohne Token und mit ~4 req/s die Erfassung nicht nur blockiert, sondern die App bei
jedem Klick sichtbar abstürzen lässt. Daraus W1 (→ #331) und W2 (ADR-Bezifferung, in diesem PR
behoben).

## Geprüft und für sauber befunden

- **Injection/XSS** (`lib/theke-throttle-response.ts:22-57`): vollständig statisches
  Template-Literal; einzige Interpolation ist `RETRY_AFTER_SECONDS` = `60_000 / 1000` aus
  `lib/rate-limit.ts:56`. Keine Reflexion von Pfad, Token, Query oder Headern. `String(...)` als
  Header-Wert schließt Header-Injection aus. Keine externen Assets, kein Skript.
- **AuthN/AuthZ – Kernfrage: kein neuer Bypass.** Die Menge der Anfragen, die jetzt vor
  `authMiddleware` zurückkehren, ist `pathname.startsWith("/theke/")` (`proxy.ts:27-29`) – **exakt**
  die Menge, die der Negativ-Lookahead in `matcher[0]` (`proxy.ts:93`, Token `theke/` unverändert)
  schon vor diesem PR aus dem Proxy ausschloss. Es kann keine Anfrage geben, die vorher gegated war
  und jetzt nicht mehr. Unabhängig gegengeprüft: Unter `app/theke/` existiert ausschließlich
  `[token]/page.tsx` – keine geschützte Nachbarroute, die der Präfix mitnimmt.
  - *Groß-/Kleinschreibung:* zur Laufzeit case-**sensitiv** (`middleware-route-matcher.js` baut
    `new RegExp(matcher.regexp)` ohne Flags). `/Theke/x` bleibt damit im Auth-Gate – die Divergenz
    zeigt in die **fail-closed**-Richtung.
  - *`..`-Segmente / Encoding / Trailing Slash:* echte Dot-Segmente normalisiert der URL-Parser vor
    `nextUrl.pathname`; `%2e%2e` bleibt ein literales Segment unter `/theke/` und kann mangels
    `rewrites`, `basePath` und `i18n` (`next.config.ts`) auf keine geschützte Route auflösen.
    `/theke` ohne Slash fällt weiterhin ins Auth-Gate – wie vor dem PR.
  - *Gegenrichtung (Bremse umgehbar):* die Matcher-Kompilierung hängt den Transport-Suffix an,
    RSC-/Transport-Formen der Route sind mit erfasst; der POST-ohne-Marker-Bypass aus
    Review-Runde 1 ist geschlossen (`proxy.test.ts:171-200`). Der `Next-Action`-Header verschiebt
    eine Anfrage nur zwischen zwei gleich großen Budgets – er schaltet nichts ab.
- **Enumerations-Leak / Timing (FS-4):** Die Drossel-Antwort nimmt kein Argument und entsteht vor
  jeder Token-Auflösung – gültiges und erfundenes Segment sind byte- und headergleich
  (`proxy.test.ts:297-308`). Kein Timing-Orakel: beide Zweige sind dieselbe O(1)-Arithmetik ohne I/O.
- **Unbegrenzt wachsender Zustand (FS-5):** zwei Singletons mit je `count`/`windowStart`
  (`lib/rate-limit.ts:63-77`), keine angreiferkontrollierte Map – anders als
  `createKeyedRateLimiter`. Strukturell erfüllt. (Der bereits bestehende, angreiferkontrollierte
  Schlüsselraum von `selfServiceVerzehrRateLimiter` ist eine bewusste Altentscheidung aus
  ADR-044 D2 und von diesem PR unberührt.)
- **Session-Handling (FS-6):** `/theke/*` erreichte `authMiddleware` auch vorher nie, es geht keine
  Rotations-Unterdrückung verloren; der Pfad für geschützte Routen ist unverändert
  (`proxy.ts:73-77`).
- **Fail-open (ADR-048 D6):** strukturell korrekt, kein toter `try/catch`. Ein Importfehler des
  Limiter-Moduls ließe die Middleware insgesamt fehlschlagen (fail-closed) statt still
  durchzuwinken.
- **Dependencies:** keine neuen – `package.json`, `pnpm-lock.yaml` und `pnpm-workspace.yaml` sind
  im Diff nicht enthalten (eigenständig per `git diff origin/main...HEAD -- …` verifiziert, leere
  Ausgabe). Die neuen Imports in `proxy.ts:2-6` sind projekteigene Module bzw. `next/server`.
- **Secrets / sensible Daten:** nichts geloggt, kein Token in Antwort, Body oder Header, keine
  Stack Traces oder internen Fehlerdetails nach außen. Keine Zufallszahlen im Diff.
- **Error Handling:** die 429 ist die einzige neue Fehlerantwort; ihr Inhalt ist konstant und
  gibt keine internen Informationen preis (außer der Fensterlänge über `Retry-After` – gewollt).

## Ergebnis

**PASSED**

Kein Blocker. W2 ist in diesem PR behoben (ADR-Doku), W1 ist als Issue #331 ausgelagert, H1/H2
stehen in `docs/factory/kleinfunde.md`. Nächster Pipeline-Schritt: `/codify`.

### Geänderte Dateien in diesem Schritt

- `tasks/security-297.md` (dieser Report, neu)
- `docs/adr/048-rate-limit-theke-leseroute.md` (W2 – Konsequenzen-Bullet beziffert)
- `docs/factory/kleinfunde.md` (H1, H2)
- **kein Produktionscode**
