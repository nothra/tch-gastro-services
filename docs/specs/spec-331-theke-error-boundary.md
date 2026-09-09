# Spec: Theken-Erfassung übersteht eine Proxy-Antwort außerhalb des Action-Protokolls

> Herkunft: [#331](https://github.com/nothra/tch-gastro-services/issues/331), gefunden im
> `/security-review` zu #297. Kein Merge-Blocker für #297 – die Drossel selbst arbeitet korrekt.

## Kontext

Seit #297 / [ADR-048](../adr/048-rate-limit-theke-leseroute.md) hat der Schreibpfad der
öffentlichen Theke ein eigenes Proxy-Budget (`thekeActionRateLimiter`, 240/60 s). Ist es
erschöpft, beantwortet `proxy.ts` auch einen echten Server-Action-`POST` mit der HTML-429 aus
`lib/theke-throttle-response.ts`. Diese Antwort liegt **außerhalb** des Server-Action-Protokolls.

Verifizierte Kette (an den installierten Versionen `next@16.2.12` / `react-dom@19.2.8`
nachgelesen, nicht aus dem Gedächtnis):

1. `next/dist/client/components/router-reducer/reducers/server-action-reducer.js` – eine
   Action-Antwort ohne `text/x-component` und ohne `x-action-redirect` führt zu `throw`
   (Zeile 113). Der Body wird nur bei **exakt** `content-type: text/plain` als Meldung
   übernommen (Zeile 117: `contentType === 'text/plain'`, strikter Vergleich – ein
   `; charset=utf-8` fällt heraus); bei `text/html` bleibt es bei „An unexpected response was
   received from the server."
2. `react-dom-client` `updateActionStateImpl` – `useThenable` auf dem rejected Thenable wirft
   während des Renderns weiter.
3. Im gesamten `app/`-Baum existiert **weder** `error.tsx` **noch** `global-error.tsx`
   (per `find` geprüft, Ergebnis leer) – die Exception läuft bis in Next' Default-`GlobalError`.

Folge: Statt der roten Inline-Meldung neben dem +/− Button (so zugesichert im Modul-Kommentar von
`app/_verzehr/MengeControl.tsx`, „FS3") verschwindet die komplette Theken-Ansicht hinter
„Application error: a client-side exception has occurred". Erholung nur per Reload.

Die ADR-044-Drossel verhält sich korrekt anders: sie gibt `{ error: TOO_MANY_REQUESTS }`
**innerhalb** des Action-Protokolls zurück (`app/veranstaltung/actions.ts`).

**Warum das Verfügbarkeits-Relevanz hat:** Das Schreib-Budget lässt sich **ohne gültiges Token**
erschöpfen – `proxy.ts` zählt, bevor irgendetwas aufgelöst wird. Rund 4 Requests/s auf
`/theke/<beliebiges Segment>` mit gesetztem `Next-Action`-Header genügen, um die Erfassung aller
Veranstaltungen auf der Instanz für das Fenster zu blockieren – und die App dabei bei jedem Klick
sichtbar abstürzen zu lassen statt „gerade zu viel los" zu melden. Die Fehlerklasse ist nicht neu
(ein Netz-/Offline-Fehler während einer Server Action erzeugt heute schon denselben Screen);
#297 macht sie nur billig auslösbar.

## Scope

**Inbegriffen** (drei Bausteine, alle drei vom Auftraggeber in `/requirements` gesetzt):

1. **`app/theke/[token]/error.tsx`** – Error-Boundary für die Theken-Route: fester, freundlicher
   Text und ein „Erneut versuchen"-Knopf auf `reset()`. Deckt zugleich den Offline-Fall ab.
2. **Klartext-Antwort im Server-Action-Zweig** – `proxy.ts` liefert einer gedrosselten Anfrage
   **mit** Action-Ausweis eine 429 mit exakt `content-type: text/plain` und kurzem Body statt der
   HTML-Seite. Der Absturz ist damit nicht nur gefangen, sondern auch diagnostizierbar. Der
   Lesepfad bleibt unverändert bei HTML.
3. **Modul-Kommentar in `app/_verzehr/MengeControl.tsx`** – die Zusicherung „Fehler wird sichtbar"
   auf ihren tatsächlichen Geltungsbereich präzisieren (Action-Fehlerzustände), plus Verweis auf
   die Boundary für Antworten außerhalb des Protokolls.
4. **ADR-048 D4 nachziehen** – D4 begründet das HTML mit dem menschlichen Browser-Aufruf; für den
   fetch-basierten Action-Pfad trägt diese Begründung nicht. Die neue Asymmetrie gehört in dieselbe
   ADR (Lesson #211: der PR ändert die von einer ADR namentlich beschriebene Mechanik).

**Nicht inbegriffen** (bewusst, Scope-Disziplin):

- **Keine app-weite Boundary** (`app/error.tsx` / `global-error.tsx`). Auftraggeber-Entscheidung:
  nur der im Issue belegte Pfad. Die geschützten Routen sind nicht öffentlich flutbar und damit
  nicht dieselbe Fehlerklasse. Es wird auch **kein** Folge-Issue dafür angelegt.
- **Keine Beobachtbarkeit des Drosselns** (kein Log, kein Zähler) – separat als Kleinfund vermerkt.
- **Keine Änderung an Budgets, Fensterlänge oder Zähl-Dimension** aus ADR-048 D1/D2/D5.
- **Kein `not-found.tsx`** – der Miss-Pfad (`notFound()` bei unbekanntem Token) ist unverändert
  korrekt und läuft nicht über die Error-Boundary.
- **Keine Anzeige von `error.message` oder `error.digest`** in der UI (Auftraggeber-Entscheidung).

## Akzeptanzkriterien

- [ ] **AK-1 (Boundary fängt den Absturz):** GIVEN die Theken-Ansicht ist geladen und das
      Schreib-Budget des Proxys ist im laufenden Fenster erschöpft WHEN ein Teilnehmer +/− drückt
      THEN erscheint innerhalb der Theken-Route eine eigene Fehlerfläche mit verständlichem Text –
      **nicht** „Application error: a client-side exception has occurred".

- [ ] **AK-2 (Erholung ohne Reload):** GIVEN die Fehlerfläche ist sichtbar WHEN der Nutzer den
      „Erneut versuchen"-Knopf drückt THEN ruft die Boundary das von Next übergebene `reset()`
      auf; ein manueller Seiten-Reload ist nicht nötig.

- [ ] **AK-3 (Kein fremdbestimmter Text in der UI):** GIVEN ein beliebiger Fehler löst die
      Boundary aus THEN zeigt sie ausschließlich eigenen, festen Text – weder `error.message`
      noch `error.digest` erscheinen in der Ausgabe.

- [ ] **AK-4 (Action-POST bekommt Klartext):** GIVEN das Schreib-Budget ist erschöpft WHEN eine
      Anfrage auf `/theke/*` mit gesetztem `Next-Action`-Header gedrosselt wird THEN antwortet der
      Proxy mit Status 429 und `content-type` **exakt** `text/plain` – ohne Parameter, also
      insbesondere **kein** `; charset=utf-8` – und einem kurzen Hinweistext als Body.
      *Begründung des „exakt":* `server-action-reducer.js:117` vergleicht strikt
      (`contentType === 'text/plain'`); mit Parameter fällt der Body wieder heraus und die
      Meldung wäre erneut die generische.

- [ ] **AK-5 (Lesepfad bleibt HTML):** GIVEN das Lese-Budget ist erschöpft WHEN eine Anfrage
      **ohne** Action-Ausweis gedrosselt wird THEN bleibt es bei der HTML-Hinweisseite aus
      ADR-048 D4 (Status 429, `content-type: text/html; charset=utf-8`).
      *Die Asymmetrie ist in beide Richtungen zu prüfen* (Lesson #211: Spiegel-Kriterien beide
      Richtungen explizit assertieren) – ein Wiring-Guard auf nur einen Zweig genügt nicht.

- [ ] **AK-6 (Header beider Varianten):** GIVEN eine gedrosselte Antwort – Lese- **oder**
      Schreibpfad THEN trägt sie `retry-after` mit der Fensterlänge in Sekunden und
      `cache-control: no-store`.

- [ ] **AK-7 (Eine Quelle für die Fensterlänge):** GIVEN die Klartext-Antwort nennt eine Wartezeit
      THEN leitet sie sie aus `THEKE_RATE_LIMIT_WINDOW_MS` ab – kein zweites `60`-Literal
      (ADR-048 D2, #142 projektweite Magic-Number-Konsistenz).

- [ ] **AK-8 (Kommentar-Zusicherung präzisiert):** GIVEN der Modul-Kommentar von
      `app/_verzehr/MengeControl.tsx` THEN sagt er, dass „der Fehler wird sichtbar" für
      Action-**Fehlerzustände** gilt, und benennt die Proxy-Antwort außerhalb des Protokolls als
      den Fall, den die Boundary der Theken-Route abdeckt.

- [ ] **AK-9 (ADR-048 D4 nachgezogen):** GIVEN der Action-Zweig liefert nun Klartext THEN
      beschreibt ADR-048 D4 diese Asymmetrie samt Begründung (HTML für den menschlichen
      Browser-Aufruf, Klartext für den fetch-basierten Action-Pfad) – die ADR behauptet nicht
      länger HTML für beide Zweige.

- [ ] **AK-10 (Kein Routen-Doku-Drift):** GIVEN `error.tsx` wird hinzugefügt THEN bleibt
      `docs/routes.md` unverändert und `scripts/checks/routes-doc-check.sh` grün – die Datei
      erzeugt keine eigene URL, und der Check scannt ausschließlich `page.tsx`/`route.ts`
      (an `routes-doc-check.sh:42` nachgelesen). Der Punkt steht als AK, weil Lesson #145 die
      Gegenrichtung kennt: der App Router erzeugt Routen aus mehr als diesen zwei Dateinamen.

## Fehlerszenarien

- [ ] **FS-1 (Offline-Fall mit abgedeckt):** GIVEN keine Netzverbindung WHEN eine Erfassungs-Action
      abgeschickt wird THEN erscheint dieselbe Fehlerfläche statt des Absturz-Screens. Dieser Fall
      existierte schon vor #297 und ist der zweite Grund für die Boundary.

- [ ] **FS-2 (Kein Enumerations-Leak durch den Klartext):** GIVEN zwei gedrosselte
      Action-Anfragen – eine auf ein gültiges, eine auf ein erfundenes Token-Segment THEN sind die
      Antworten ununterscheidbar; der Body nennt weder Token noch Veranstaltung (Fortführung von
      #297 FS-4).

- [ ] **FS-3 (Kein Endlos-Absturz bei anhaltender Drossel):** GIVEN das Budget ist nach dem
      `reset()` noch erschöpft WHEN der Nutzer erneut drückt THEN erscheint wieder die
      Fehlerfläche – kein Absturz-Screen, keine Endlosschleife.

- [ ] **FS-4 (`notFound()` läuft nicht über die Boundary):** GIVEN ein unbekanntes Token WHEN die
      Seite aufgerufen wird THEN bleibt es bei der neutralen Not-Found-Antwort; die Fehlerfläche
      erscheint nicht (kein Leak-Wechsel gegenüber ADR-034/#297 FS-4).

- [ ] **FS-5 (Boundary ist selbst nicht die neue Fehlerquelle):** GIVEN `error.tsx` THEN ist es
      eine Client Component (`"use client"`) ohne Server-only-Import, ohne DB-Zugriff und ohne
      Abhängigkeit von den Props der Theken-Seite – sie muss auch dann rendern, wenn genau das
      Laden dieser Daten gescheitert ist.

## Offene Fragen

Kein ADR-Trigger: die Entscheidungen sind gesetzt (Auftraggeber + ADR-048-Nachzug). Offen bleiben
zwei Umsetzungsfragen, die `/implement` nach `clean-code.md` entscheidet:

- [ ] **OF-1 · Ort der Klartext-Antwort:** zweiter Export in `lib/theke-throttle-response.ts`
      (dann Modul-Kommentar dort mitpflegen – der Header behauptet heute „Antwort für gedrosselte
      **Lese**-Anfragen" und nennt „die Funktion nimmt kein Argument"; Lesson: Zähl-/Umfang-
      nennenden Modul-Header beim Hinzufügen einer Einheit mitziehen) **oder** eigenes Modul.
      Bindende Bedingung in beiden Fällen: `RETRY_AFTER_SECONDS` bleibt **eine** Quelle (AK-7).
- [ ] **OF-2 · Wortlaut** der Fehlerfläche und des Klartext-Bodys – deutsch, freundlich,
      ohne technische Details; die Fehlerfläche nennt keine 429-Spezifika, weil sie auch den
      Offline-Fall trägt (FS-1).
