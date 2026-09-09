# Spec: Rate-Limit/DB-Amplifikations-Bremse für die öffentliche GET-Route `/theke/[token]`

> Issue: #297 · Herkunft: `/security-review` zu #182 ([ADR-044](../adr/044-rate-limit-selbstbedienungs-action.md)).
> Von [spec-182](spec-182-rate-limit-selbstbedienung.md) → „Nicht inbegriffen" ausdrücklich
> ausgeklammert und hierher verwiesen. Kanonisches Muster: [ADR-020](../adr/020-health-endpoint-rate-limit.md)
> (`lib/rate-limit.ts`).

## Kontext

`app/theke/[token]/page.tsx` ist die öffentliche, login-freie Selbstbedienungs-Seite (F7, #54,
[ADR-034](../adr/034-selbstbedienung-token-zugang.md) D1). Sie ist im Auth-Proxy freigeschaltet
(`proxy.ts` – Negativ-Lookahead `theke/`) und führt für **jeden** GET mit beliebigem Pfad-Segment
mindestens `getVeranstaltungByToken(token)` aus; bei Treffer zusätzlich `listZeilen`,
`listActiveCatalog` und `listPositionen` (vier Neon-Reads).

Anders als bei der Schreib-Action ist der Token hier **kein** serverseitig gebundenes
Closure-Argument, sondern ein **frei wählbares URL-Pfad-Segment**. Eine unauthentifizierte
Schleife (`curl /theke/<zufall>`) erzeugt damit unbegrenzt DB-Reads auf dem Neon-Free-Tarif und
unbegrenzt Vercel-Function-Invocations.

Das ist keine Regression aus #182, sondern eine seit F7/#54 bestehende Lücke – aber genau die
Amplifikations-Klasse, für die ADR-020 den Limiter am `/api/health`-Endpunkt eingeführt hat.
Nach #182 ist der **Schreib**pfad gedeckelt (60/Fenster pro Token) und der ungedeckelte
**Lese**pfad die verbleibende, billigste Amplifikationsfläche.

**Kein Vertraulichkeits-Risiko:** Der 256-bit-Token bleibt unratbar (ADR-034 D2), `notFound()`
antwortet neutral. Es geht um **Verfügbarkeit und Kosten** (DB-Reads, Function-Invocations),
nicht um Enumeration.

### Wechselwirkung mit dem Schreibpfad (in `/requirements` gefunden)

`adjustVerzehrByTokenAction` löst bei Erfolg `revalidatePath(thekePath(token))` aus – die
Server-Action-Antwort enthält den **neu gerenderten** Seiten-Payload, `ThekePage` läuft also
inklusive ihrer vier DB-Reads erneut. Zusätzlich adressiert der Server-Action-POST **dieselbe
URL** `/theke/<token>` wie der Lese-GET. Eine Bremse, die alle Anfragen auf diesen Pfad zählt,
zählt damit auch den Schreibverkehr mit. Das ist bei Schwellwert **und** Zähl-Umfang zu
berücksichtigen (AK-7, AK-8), sonst drosselt sich die Theke bei normaler Nutzung selbst.

### Entscheidungen des Auftraggebers (gesetzt, nicht mehr offen)

- **Sichtbare Antwort bei Drosselung:** eine **eigene „Zu viele Anfragen"-Seite** mit
  freundlichem Hinweis, es gleich noch einmal zu versuchen – **nicht** die neutrale
  404-/`notFound()`-Seite (ein echter Besucher soll nicht fälschlich „nicht gefunden" lesen).
- **Verhältnis Schutz ↔ Verfügbarkeit:** **großzügiger Schwellwert + fail-open**, konsistent mit
  ADR-020 und ADR-044. Die Bremse senkt die Amplifikation um Größenordnungen und darf reale
  Theken-Nutzung nie blockieren.
- **Schutzziel:** **DB-Reads *und* Function-Invocations** – die Bremse sitzt damit **vor** der
  Route (Edge-Proxy), nicht in der Page-Komponente.
- **Zähl-Dimension:** bewusst **offen** – sie ist der Grund, aus dem das Issue eine eigene
  `/architecture`-Runde verlangt (s. „Offene Fragen").

## Scope

**Inbegriffen:**
- Eine Rate-Limit-Bremse auf dem **Lesepfad** der öffentlichen Route `/theke/[token]`, wirksam
  **vor** dem Rendern von `ThekePage` (keine Page-Invocation, kein DB-Read im Drosselfall).
- Eine eigene, verständliche Hinweis-Antwort für gedrosselte Aufrufe (Text sinngemäß: zu viele
  Anfragen, bitte gleich noch einmal versuchen) mit HTTP-Status **429**.
- Wiederverwendung des bestehenden Bausteins `lib/rate-limit.ts` (`createRateLimiter` /
  `createKeyedRateLimiter`) bzw. einer begründeten Erweiterung davon.
- Erhalt des öffentlichen Zugangs: `/theke/<token>` bleibt ohne Login erreichbar (AK-5), während
  alle anderen Routen fail-closed hinter dem Auth-Gate bleiben (AK-6).
- Pflege von [`docs/routes.md`](../routes.md), falls die Umsetzung eine neue Route einführt
  (Drift-Check `routes-doc-check.sh` ist fail-closed im Push-Gate).

**Nicht inbegriffen:**
- **Keine** Änderung an der Schreib-Bremse aus ADR-044 (`selfServiceVerzehrRateLimiter`,
  60/Fenster pro Token) – sie bleibt unverändert die Grenze des Schreibpfads.
- **Keine** Änderung an `/api/health` (ADR-020) und **kein** Rate-Limit auf `/api/version`
  (kein DB-Zugriff, keine Amplifikationsfläche dieser Klasse).
- **Kein** geteilter/externer Store (Redis/Vercel KV) – bleibt Best-Effort in-memory pro
  Instanz, wie in ADR-020/ADR-044 begründet (keine Kosten, keine Secrets, kein Netz-Roundtrip).
- **Kein** Rate-Limit nach IP/`X-Forwarded-For` – in ADR-020 als spoofbar verworfen, das gilt
  hier unverändert.
- **Kein** Caching (`s-maxage`) als Ersatz für die Bremse – die Schutzart ist bewusst ein
  Rate-Limit; Caching ist ein eigenes Thema und würde die Aktualität der Theken-Ansicht ändern.
- **Keine** Sperrung/Blockliste über das laufende Zeitfenster hinaus (kein Lockout, kein Banning).
- **Keine** Änderung an Inhalt, Layout oder Verhalten der Theken-Seite selbst im Normalfall.
- **Keine** Rotation oder Änderung des Token-Formats (ADR-034 D2 bleibt unberührt).

## Akzeptanzkriterien

- [ ] **AK-1 (Normalfall unverändert):** GIVEN die Aufrufrate liegt unter dem Schwellwert WHEN ein
  Unangemeldeter `/theke/<gültiger Token>` aufruft THEN antwortet die App wie heute mit der
  gerenderten Theken-Seite (Veranstaltung, Zeilen, Katalog, Positionen, `IdentityGate`) – keine
  Verhaltens- oder Darstellungsänderung gegenüber heute.

- [ ] **AK-2 (Deckelung greift):** GIVEN der Schwellwert für den Lesepfad ist im laufenden Fenster
  ausgeschöpft WHEN ein weiterer GET auf `/theke/<beliebiges Segment>` erfolgt THEN wird er
  gedrosselt, **ohne** dass `getVeranstaltungByToken`, `listZeilen`, `listActiveCatalog` oder
  `listPositionen` ausgeführt werden.

- [ ] **AK-3 (Invocation gespart):** GIVEN eine Anfrage wird gedrosselt THEN wird sie **vor** der
  Route beantwortet – `ThekePage` wird nicht ausgeführt, es entsteht keine Node-Function-Invocation
  der Seite.

- [ ] **AK-4 (Sichtbare, ehrliche Antwort):** GIVEN eine Anfrage wird gedrosselt WHEN ein Mensch die
  URL im Browser öffnet THEN sieht er eine eigene, verständliche „Zu viele Anfragen"-Seite mit dem
  Hinweis, es gleich noch einmal zu versuchen – **nicht** die 404-/`notFound()`-Ansicht und keinen
  rohen Fehler; der HTTP-Status ist **429**.

- [ ] **AK-5 (Öffentlicher Zugang bleibt öffentlich):** GIVEN die Bremse ist verdrahtet WHEN ein
  Unangemeldeter `/theke/<gültiger Token>` unterhalb des Schwellwerts aufruft THEN bekommt er die
  Seite (Status 200) – **kein** 307-Redirect auf `/login`. Nachweis auf der **Proxy-Ebene**, nicht
  nur durch direkten Aufruf der Page-Funktion (Lesson aus #63).

- [ ] **AK-6 (Auth-Gate bleibt fail-closed):** GIVEN die Bremse ist verdrahtet WHEN ein
  Unangemeldeter eine geschützte Route (z. B. `/veranstaltung`) aufruft THEN wird er unverändert auf
  `/login` umgeleitet – die Verdrahtung der Bremse weicht das eng gefasste Auth-Gate nicht auf.

- [ ] **AK-7 (Schreibpfad unberührt):** GIVEN die Lese-Bremse ist aktiv WHEN
  `adjustVerzehrByTokenAction` (Server-Action-POST auf dieselbe URL `/theke/<token>`) aufgerufen
  wird THEN gilt für den Schreibpfad weiterhin **ausschließlich** die Grenze aus ADR-044; die
  Lese-Bremse lehnt keinen Schreibaufruf ab und beantwortet ihn nie mit der HTML-Hinweisseite.

- [ ] **AK-8 (Kein Selbst-Drosseln bei realer Nutzung):** GIVEN eine Theke im Normalbetrieb
  (mehrere Teilnehmer erfassen gleichzeitig; jede Erfassung erzeugt zusätzlich einen
  `revalidatePath`-Re-Render von `ThekePage`) WHEN ein volles Fenster lang so gearbeitet wird THEN
  wird **keine** dieser Anfragen gedrosselt – der gewählte Schwellwert liegt nachweislich und
  begründet über der real erwartbaren Lese-Last inklusive Re-Renders und der 60 Schreibaufrufe pro
  Fenster aus ADR-044.

- [ ] **AK-9 (Fenster-Reset):** GIVEN im Fenster N wurde gedrosselt WHEN nach Ablauf der
  Fensterlänge erneut aufgerufen wird THEN wird die Anfrage wieder normal verarbeitet (Zähler
  zurückgesetzt).

- [ ] **AK-10 (Muster wiederverwendet):** GIVEN die Bremse wird umgesetzt THEN nutzt sie die
  Fixed-Window-Arithmetik aus `lib/rate-limit.ts` (kanonische Quelle, ADR-020/ADR-044) – die
  Fenster-/Zähl-Logik wird nicht ein drittes Mal implementiert.

## Fehlerszenarien

- [ ] **FS-1 (Fail-open bei Limiter-Störung):** GIVEN der Limiter-Zustand kann nicht ermittelt
  werden (z. B. Cold-Start einer frischen Instanz) WHEN eine Anfrage eintrifft THEN wird sie
  **durchgelassen** – der Schutz degradiert bewusst, statt die Theke unbenutzbar zu machen.

- [ ] **FS-2 (Throttle-Pfad billiger als Verarbeitungspfad):** GIVEN eine Anfrage wird gedrosselt
  THEN ist die Antwort nicht teurer als der reguläre Pfad: reine In-Memory-Prüfung, **kein**
  zusätzlicher I/O, kein DB-Zugriff, kein Netz-Roundtrip.

- [ ] **FS-3 (Kein Lockout über das Fenster hinaus):** GIVEN ein Aufrufer wurde gedrosselt THEN
  bleibt er **nicht** über das laufende Fenster hinaus gesperrt – reines Fenster-Throttling, keine
  Blockliste.

- [ ] **FS-4 (Kein Enumerations-Leak durch die Hinweisseite):** GIVEN zwei Anfragen werden
  gedrosselt – eine mit gültigem, eine mit erfundenem Token WHEN beide beantwortet werden THEN sind
  die Antworten ununterscheidbar (gleiche Seite, gleicher Status); die Drosselung verrät nicht, ob
  ein Token existiert.

- [ ] **FS-5 (Zustand wächst nicht angreiferkontrolliert unbegrenzt):** GIVEN ein Angreifer flutet
  die Route mit **vielen verschiedenen** erfundenen Pfad-Segmenten WHEN die Bremse zählt THEN
  entsteht dadurch keine neue, unbegrenzt wachsende Speicherfläche in der Function-Instanz – die
  gewählte Zähl-Dimension muss diesen Fall ausdrücklich abdecken (der Schlüsselraum ist hier,
  anders als bei ADR-044, vollständig angreiferkontrolliert).

- [ ] **FS-6 (Keine Regression der Session-Behandlung):** GIVEN die Verdrahtung ändert `proxy.ts`
  WHEN eine nicht-mutierende Anfrage auf einer geschützten Route beantwortet wird THEN bleibt die
  Unterdrückung der Session-Rotation (`shouldSuppressSessionRotation`/`stripSessionRotation`,
  #164/#170, ADR-032) unverändert wirksam.

## Offene Fragen

> Alle sechs gehen an `/architecture` (das Issue verlangt diese Runde ausdrücklich). Sie sind
> **Entscheidungs**fragen mit Begründungspflicht, keine Implementierungsdetails.

- [ ] **OF-1 · Zähl-Dimension.** Pro Token (analog ADR-044 – aber der Schlüssel ist hier ein frei
  wählbares URL-Segment, die Map wüchse angreiferkontrolliert, vgl. FS-5) vs. globaler Zähler für
  die ganze Route (analog ADR-020 – kein Map-Wachstum, aber ein Flood kann echte Theken-Besucher
  mitdrosseln, Konflikt mit AK-8) vs. hybrid (eigener großzügiger Zähler für **auflösbare** Token,
  gemeinsamer kleiner Zähler für unbekannte – setzt aber einen Lookup vor dem Zählen voraus und
  kollidiert mit AK-2/AK-3) vs. bewusst nichts, weil die vorgelagerten Vercel-Plattform-Limits
  genügen. ADR-044 D2 hat dieselbe Abwägung für den Schreibpfad **anders** entschieden als ADR-020 –
  die Abgrenzung ist hier erneut zu führen, nicht zu übernehmen.

- [ ] **OF-2 · Schwellwert und Fensterlänge**, hergeleitet aus AK-8: Der Wert muss die reale
  Lese-Last einer Theke **inklusive** der `revalidatePath`-Re-Renders und der bis zu 60
  Schreibaufrufe pro Fenster (ADR-044) abdecken. Die Herleitung gehört in die ADR, nicht nur die
  Zahl.

- [ ] **OF-3 · Verdrahtung im `proxy.ts`, ohne das Auth-Gate aufzuweichen.** Heute ist `theke/` im
  Negativ-Lookahead des Matchers, und `authorized()` verlangt für **alles** außer `/login` eine
  Session – ein bloßes Aufnehmen von `theke/` in den Matcher würde den öffentlichen Zugang brechen
  (307 auf `/login`, exakt die Falle aus Lesson #63). Zu entscheiden: eigener Matcher-Eintrag plus
  früher Zweig in `proxy()` **vor** `authMiddleware` vs. Erweiterung des `authorized`-Callbacks vs.
  eine dritte Variante. Die Lösung muss AK-5, AK-6 und FS-6 gleichzeitig erfüllen.

- [ ] **OF-4 · Konsequenz der Edge-Runtime.** `proxy.ts` läuft auf der Edge-Runtime; deren
  Instanzen sind zahlreicher und kurzlebiger als die Node-Serverless-Instanzen, für die ADR-020/044
  ihren In-Memory-Zustand begründet haben. Die aggregierte Deckelung ist damit schwächer
  (`Schwellwert × Instanzzahl`). Bewerten und begründen, ob das die gewählte Wirkung noch trägt –
  oder ob das Schutzziel „auch Function-Invocations" den Preis wert ist.

- [ ] **OF-5 · Auslieferung der Hinweisseite (AK-4).** 429 mit HTML-Body direkt aus dem Proxy vs.
  `rewrite` auf eine eigene, statisch gerenderte Route (dann `docs/routes.md` mitpflegen). Inklusive
  der Frage, ob die Seite ohne App-Layout/Assets auskommen muss und wie sie sich zur PWA-Shell
  verhält.

- [ ] **OF-6 · Zähl-Umfang der Anfragearten.** Ob HEAD-, RSC-Prefetch- und Server-Action-POST-
  Anfragen auf denselben Pfad mitgezählt werden. AK-7 verlangt, dass der Schreibpfad nicht von der
  Lese-Bremse abgelehnt wird; ob er trotzdem **zählt** (und damit den Schwellwert aus OF-2 mit
  bestimmt), ist zu entscheiden.
