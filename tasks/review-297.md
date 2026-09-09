# Review: Task 297

> Diff-Scope: `git diff origin/main...HEAD` (4 Commits, 9 Dateien).
> Gates zum Review-Zeitpunkt grün: `pnpm test` (785 passed / 59 skipped), `pnpm lint`,
> `scripts/checks/routes-doc-check.sh`.

## Kritische Findings (müssen behoben werden)

- [ ] **`proxy.ts:26,49-52` (+ `docs/adr/048-rate-limit-theke-leseroute.md:115-121` D5) – Die
  Bremse ist mit einem Zeichen umgehbar: `curl -X POST /theke/<zufall>` rendert `ThekePage`
  weiterhin ungedeckelt.** `READ_METHODS` zählt nur `GET`/`HEAD`; jede andere Methode wird per
  `NextResponse.next()` ungezählt an die Route durchgereicht. Next.js rendert Seiten des App
  Routers aber **auch** für `POST`/`PUT`/`PATCH`/`DELETE`, wenn kein Server-Action-Request
  vorliegt – `ThekePage` läuft dann samt `getVeranstaltungByToken` (und bei Treffer den drei
  Folge-Reads). Damit bleibt genau die Amplifikationsfläche offen, für die das Issue aufgemacht
  wurde (spec-297 „Kontext": *„Eine unauthentifizierte Schleife (`curl /theke/<zufall>`) erzeugt
  unbegrenzt DB-Reads"*); AK-2 ist nur für `GET` erfüllt, nicht für das Schutzziel.

  Die tragende Prämisse von ADR-048 D5 – *„Jede andere Methode … unterliegt weiterhin allein der
  Grenze aus ADR-044"* – ist für diese Anfragen **falsch**: ohne Server-Action-Marker wird
  `adjustVerzehrByTokenAction` nie aufgerufen, also läuft auch `selfServiceVerzehrRateLimiter`
  nie. Der Pfad unterliegt **keiner** Grenze.

  **Empirisch belegt** (lokaler `pnpm dev`, nicht nur Codelesen – Lesson #314):

  | Probe | Ergebnis |
  |---|---|
  | `POST /login` | **200**, 17 806 B, gerenderte Login-Seite → App Router rendert Seiten bei POST |
  | `POST /theke/erfundenes-segment` | **404**, 18 426 B, Server-Log: `application-code: 30ms` → Page lief, DB-Read erfolgte |
  | `PUT` / `PATCH` / `DELETE` auf denselben Pfad | je **404** mit `application-code: 242ms / 31ms / 30ms` → ebenfalls Page-Invocation + DB-Read |
  | `OPTIONS` | 400 von Next, ohne `application-code` → als einzige Methode unkritisch |
  | 300 × `POST /theke/rand-<i>`, danach `GET /theke/erfundenes-segment` | GET liefert weiterhin **404**, nicht 429 → das Lese-Budget wurde von 300 Page-Renders **nicht** belastet |

  **Kein Widerspruch zu AK-7:** AK-7 schützt den *Schreibaufruf* (Server-Action-POST) davor, mit
  der HTML-429 abgewiesen zu werden. Ein POST **ohne** Action-Marker ist kein Schreibaufruf,
  sondern ein getarnter Seiten-Read. Die Unterscheidung gehört in den Zweig, statt sie an der
  HTTP-Methode festzumachen. Denkbare Richtungen (Auswahl liegt bei `/implement`):
  (a) alles zählen, was **kein** Server-Action-Request ist; (b) Nicht-Lese-Methoden ohne
  Action-Marker mit 405 abweisen, statt sie durchzureichen.
  **Achtung beim Discriminator:** der `Next-Action`-Header trägt nur der JS-Pfad; die
  progressive-enhancement-Variante (`<form action={formAction}>` in `app/_verzehr/MengeControl.tsx:35`)
  kodiert die Action-ID im Multipart-Body (`$ACTION_ID_…`). Ein reiner Header-Check würde diesen
  Fall mitdrosseln – im hiesigen Aufbau vermutlich unerreichbar (das Formular liegt hinter dem
  client-seitigen `IdentityGate`), aber der Test dazu gehört mitgeschrieben statt angenommen.

  Sobald der Zweig mehr als GET/HEAD zählt, brauchen AK-2/AK-7 zusätzliche Fälle in
  `proxy.test.ts` (gezählter Nicht-Action-POST ↔ ungezählter Action-POST) und die ADR-Aussage in
  D5 muss im selben PR nachgezogen werden (Lesson #211/#55 – sie ist bereits einmal für D3/D5
  nachgezogen worden, dieselbe Stelle ist erneut betroffen).

## Wichtige Findings (sollten behoben werden)

- [ ] **`docs/routes.md:27` – „proxy-exempt" stimmt nach diesem PR nicht mehr.** Die Zeile
  beschreibt `/theke/[token]` als `öffentlich (proxy-exempt, Token)`. Mit dem zweiten
  Matcher-Eintrag `"/theke/:path*"` (`proxy.ts:75`) läuft die Route jetzt **durch** den Proxy –
  ausgenommen ist sie nur noch vom **Auth-Gate** (Negativ-Lookahead in `matcher[0]`). Die
  Bedeutung von „proxy-exempt" ist in derselben Datei durch die Zeilen 41–43 (`/api/auth`,
  `/api/health`, `/api/version`) belegt: dort heißt es „vom Proxy-Matcher ausgenommen", und das
  gilt für die Theke nicht mehr. Der Drift-Check greift hier nicht (er vergleicht Pfade, nicht die
  Zugriffs-Prosa) – lokal grün geprüft. Genau die Lesson-Klasse #211/#176: Doku, die die geänderte
  Mechanik namentlich beschreibt, im selben PR nachziehen. Die Task-Notiz „`docs/routes.md`
  bewusst unverändert" ist für die *Routen-Tabelle als solche* richtig, deckt aber diese
  Formulierung nicht ab. Vorschlag: `öffentlich (kein Auth-Gate, Token; Lese-Bremse im Proxy,
  ADR-048)`.

- [ ] **`lib/theke-throttle-response.ts:14` ↔ `lib/rate-limit.ts:58` – gekoppelte Konstante ohne
  Guard.** `RETRY_AFTER_SECONDS = 60` und `windowMs: 60_000` sind zwei unabhängige Literale in
  zwei Modulen. Beide Kommentare behaupten die Kopplung ausdrücklich („Deckt sich mit der
  Fensterlänge des Limiters (ADR-048 D2)" bzw. „Retry-After deckt sich mit der Fensterlänge" in
  `lib/theke-throttle-response.test.ts:20`), aber nichts erzwingt sie: Wird das Fenster auf
  `120_000` gestellt, bleibt der Header still bei 60 und **alle drei** Kommentare werden zur
  Falschaussage. Entweder den Wert aus einer gemeinsamen Quelle ableiten (Fensterlänge als
  exportierte Konstante, aus der beide Stellen lesen) oder einen Test, der beide Literale
  gegeneinander pinnt. Lesson-Klasse #142 (Magic-Number-Konsistenz projektweit statt datei-lokal).

## Nitpicks (optional)

- [ ] **`lib/rate-limit.test.ts:136-146` – der Cold-Start-Test ist nahezu tautologisch.** Ein per
  `vi.resetModules()` frisch importiertes Modul hat `count = 0`; `tryAcquire()` kann dort nur
  `false` liefern, wenn `limit <= 0` wäre. Der Test unterscheidet also nicht zwischen „fail-open
  funktioniert" und „ein frischer Zähler ist frisch"; die aussagekräftige Zusicherung (Limit 240)
  liefert bereits der Test darunter. Wenn er bleibt, sollte der Kommentar ehrlich sagen, was er
  pinnt (`limit > 0` am produktiven Singleton), statt FS-1 zu behaupten.

- [ ] **`lib/theke-throttle-response.test.ts:9` – `async` ohne `await`.** Der erste Test ist als
  `async` deklariert, prüft aber nur synchrone Header/Status. Die beiden folgenden Tests brauchen
  `async` zu Recht.

- [ ] **`proxy.ts:28-30` – `isThekePath(request: NextRequest)` nutzt nur `nextUrl.pathname`.** Ein
  Parameter `pathname: string` wäre der engere Vertrag (und die `request()`-Fixture in
  `proxy.test.ts` müsste die `NextRequest`-Form nicht mehr für diesen Zweck nachbauen).

- [ ] **`proxy.test.ts:196-204` – asymmetrische Matcher-Prüfung.** `matcher[0]` wird als echter
  Regex gegen zwei Pfade verhaltensgeprüft, `matcher[1]` nur per
  `toContain("/theke/:path*")` – eine reine Präsenz-Assertion auf ein Literal. Ein Vertippen wie
  `"/theke:path*"` fiele auf, ein semantischer Fehler (`"/theke/:path"` ohne `*`, also nur eine
  Segment-Tiefe) nicht. Da `path-to-regexp` nicht direkt verfügbar ist, ist das vertretbar – aber
  die Asymmetrie gehört mindestens als Kommentar dokumentiert.

## Positives

- **Der Kern der Verdrahtung ist richtig und gut begründet.** Der frühe Zweig steht vor
  `await authMiddleware(...)`, der Negativ-Lookahead bleibt unangetastet, der `authorized`-Callback
  führt weiterhin keine Liste öffentlicher Pfade. AK-5/AK-6/FS-6 sind an der Naht getestet – nicht
  per Direktaufruf der Page (Lesson #63 sauber angewandt).
- **Die im `/implement` gefundene Abweichung vom ADR-Entwurf ist erkannt, korrigiert, am
  laufenden Server per Mutation belegt (307 ↔ 404) und in ADR-048 D3/D5 im selben PR nachgezogen**
  – genau das von Lesson #211/#55/#286/#314 geforderte Vorgehen.
- **Kein dritter Zähl-Code (AK-10):** `createRateLimiter` wird wiederverwendet, der Modul-Header in
  `lib/rate-limit.ts:1-8` zählt seinen zweiten Konsumenten korrekt mit auf (Lesson #207).
- **Der Singleton-Test pinnt beide produktiven Parameter (240/60 s) am echten Objekt** und
  begründet in einem Kommentar, warum die Fake-Uhr über die Import-Zeit hinausgestellt wird – der
  Fallstrick „globaler Zähler startet sein Fenster beim Import" ist verstanden, nicht umgangen.
- **`lib/theke-throttle-response.ts` ist domänenspezifisch benannt** (Lesson #105), enthält kein
  externes Asset und kein Skript, und die Antwort ist token-unabhängig konstruiert – FS-4 ist
  strukturell erfüllt und zusätzlich per Byte-Vergleich zweier Segmente getestet.
- **`docs/routes.md` wurde bewusst nicht „vorsichtshalber" um eine Route ergänzt** und der
  fail-closed Drift-Check bleibt grün (verifiziert).
- **Kein toter `try/catch`-Zweig um `tryAcquire`**, mit Verweis auf `clean-code.md` begründet.

## Empfehlung

NEEDS_REWORK
