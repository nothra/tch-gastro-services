# ADR 048: Amplifikations-Bremse für die öffentliche Theken-Leseroute (globaler Zähler im Proxy)

## Status
Accepted

## Date
2026-09-09

## Kontext

`app/theke/[token]/page.tsx` ist die öffentliche, login-freie Selbstbedienungs-Seite (F7, #54,
[ADR-034](034-selbstbedienung-token-zugang.md) D1). Jeder GET mit **beliebigem** Pfad-Segment löst
mindestens `getVeranstaltungByToken` aus, bei Treffer zusätzlich `listZeilen`, `listActiveCatalog`
und `listPositionen` – vier Neon-Reads. Der Token ist hier, anders als bei der Schreib-Action, ein
**frei wählbares URL-Segment**. Nach #182/[ADR-044](044-rate-limit-selbstbedienungs-action.md) ist
der Schreibpfad gedeckelt; dieser Lesepfad ist die verbleibende, billigste Amplifikationsfläche
(Verfügbarkeit/Kosten – **kein** Vertraulichkeitsrisiko, der 256-bit-Token bleibt unratbar).

Der Auftraggeber hat in `/requirements` gesetzt (siehe
[spec-297](../specs/spec-297-rate-limit-theke-leseroute.md)): eigene „Zu viele Anfragen"-Seite mit
Status 429 statt `notFound()`, **großzügiger Schwellwert + fail-open**, und als Schutzziel
**DB-Reads *und* Function-Invocations** – die Bremse sitzt damit **vor** der Route. Offen und
hierher delegiert sind die sechs Fragen OF-1 … OF-6 der Spec.

**Ein Faktum vorab, das OF-4 auflöst statt es abzuwägen:** Die Spec vermutete, `proxy.ts` laufe auf
der Edge-Runtime, deren zahlreiche kurzlebige Instanzen die aggregierte Deckelung verwässern würden.
Das ist in Next 16 nicht so. Die installierte `next@16.2.12` lehnt Route-Segment-Config im
Proxy-File mit der Begründung ab: *„Proxy always runs on Node.js runtime."*
(`node_modules/next/dist/build/analysis/get-page-static-info.js:587`). Die In-Memory-Begründung aus
ADR-020/ADR-044 überträgt sich also unverändert – es gibt keinen Runtime-Aufpreis für die
Proxy-Platzierung.

## Entscheidung

### D1 · Zähl-Dimension: **ein globaler Zähler für die Route** (OF-1)

Ein einziger Fixed-Window-Zähler für alle Anfragen auf `/theke/*`, analog zum Health-Endpunkt
(ADR-020), **nicht** ein Zähler je Token wie in ADR-044.

Ausschlaggebend ist, dass die Pro-Token-Dimension hier gegen **genau den Angriff aus dem Issue
wirkungslos** wäre: `curl /theke/<zufall>` in der Schleife erzeugt bei jedem Aufruf ein **neues**
Segment, also einen neuen Schlüssel und damit ein frisches Budget – gedrosselt würde nie. Zugleich
legte jeder dieser Schlüssel einen Map-Eintrag an (FS-5). Die Abwägung aus ADR-044 D2 kippt hier
also in die Gegenrichtung, und zwar aus genau dem Grund, den ADR-020 für die IP-Dimension nannte:
Ein angreiferkontrollierter Schlüsselraum lässt den Schutz leerlaufen. In ADR-044 war der Schlüssel
ein **serverseitig gebundenes** Closure-Argument und damit nicht frei wählbar – dieser Unterschied
trägt die abweichende Entscheidung.

Der globale Zähler ist zugleich die einzige Variante mit **konstantem** Zustand (FS-5 strukturell
erfüllt) und ohne Lookup vor der Entscheidung (AK-2/AK-3 strukturell erfüllt).

### D2 · Parameter: Fixed-Window 60 s, 240 Anfragen pro Fenster und Instanz (OF-2)

```ts
export const thekeReadRateLimiter = createRateLimiter({ limit: 240, windowMs: 60_000 });
```

Herleitung (AK-8 verlangt die Herleitung, nicht nur die Zahl): Die größte realistisch erwartbare
Theke ist eine Montagsrunde mit bis zu ~40 gleichzeitig anwesenden Teilnehmern. Pro Person und
Minute sind im Spitzenfall ~4 Lese-Anfragen plausibel (Erstaufruf, Reload, Zurück-Navigation,
RSC-Prefetch) → ~160/Fenster. Aufgerundet mit ~50 % Puffer: **240**. Das ist bewusst großzügig
(Auftraggeber-Vorgabe) und deckelt die Amplifikation trotzdem von *unbegrenzt* auf ≤ 240 Renders
bzw. ≤ ~960 Neon-Reads pro Minute und Instanz – gegenüber den Zehntausenden Anfragen pro Minute,
die eine ungebremste Schleife erreicht, eine Reduktion um Größenordnungen.

Die Erfassungs-Re-Renders, die AK-8 nennt, fallen **nicht** unter dieses Budget – siehe D5.

### D3 · Platzierung: früher Zweig in `proxy()` **vor** `authMiddleware` (OF-3)

`proxy.ts` bekommt einen zweiten Matcher-Eintrag für `/theke/:path*` und im Rumpf einen Zweig, der
**vor** dem Aufruf der NextAuth-Middleware greift:

```ts
export default async function proxy(request: NextRequest, event: NextFetchEvent) {
  if (isThekePath(request)) {
    const isThrottled = READ_METHODS.has(request.method) && !thekeReadRateLimiter.tryAcquire();
    return isThrottled ? tooManyRequestsResponse() : NextResponse.next();
  }

  const response = await authMiddleware(request, event);
  if (response && shouldSuppressSessionRotation(request)) {
    stripSessionRotation(response);
  }
  return response;
}
```

**Der Zweig endet immer hier – für den gesamten Pfad, nicht nur für die gezählten Methoden.** Die
Bedingung trennt daher `isThekePath` (verlässt den Proxy) von der Zähl-Entscheidung (nur `GET`/
`HEAD`, D5). Ein früherer Entwurf ließ die nicht gezählten Methoden in `authMiddleware`
durchfallen; das wäre ein Fehler: Der neue Matcher-Eintrag holt `/theke/*` erst in den Proxy
hinein, und `authorized` in `auth.config.ts` gibt für **jeden** Pfad außer `/login` nur
`loggedIn` zurück. Ein durchfallender Server-Action-`POST` bekäme also einen 307 auf `/login`
und AK-7 wäre gebrochen – exakt die Fehlerklasse aus Lesson #63.

Der bestehende Negativ-Lookahead behält `theke/` unverändert – die Theke erreicht den
`authorized`-Callback also weiterhin **nie**, und der öffentliche Zugang bleibt öffentlich (AK-5).
Alles andere läuft unverändert durch das eng gefasste, fail-closed Auth-Gate (AK-6), und die
Session-Rotations-Unterdrückung bleibt an ihrem Platz (FS-6). Der `authorized`-Callback wird
**nicht** angefasst: Er kennt weiterhin nur „`/login` oder Session" und muss keine Liste
öffentlicher Pfade führen.

### D4 · Antwort: 429 mit eigenem HTML direkt aus dem Proxy (OF-5)

Die Hinweisseite wird als vollständiges, in sich geschlossenes HTML-Dokument aus einem eigenen
Modul geliefert (`lib/theke-throttle-response.ts`), mit `Status 429`, `Retry-After: 60` und
`Cache-Control: no-store` (kein CDN darf eine 429 für diese URL zwischenspeichern).

Ein `rewrite` auf eine eigene Next-Route wurde verworfen, weil es die Function-Invocation, die AK-3
gerade einsparen soll, wieder erzeugen würde – und weil `NextResponse.rewrite` den Status der
Zielroute liefert, nicht 429. Da die Antwort ohne App-Layout und ohne Assets auskommen muss (kein
`_next/`-Roundtrip im Drosselfall), trägt sie ihr bisschen CSS inline. Es entsteht **keine** neue
Route – `docs/routes.md` bleibt unverändert.

### D5 · Zähl-Umfang: nur GET und HEAD (OF-6)

Gezählt und gedrosselt werden ausschließlich `GET`- und `HEAD`-Anfragen (Dokument-Navigation und
RSC-Prefetch). Jede andere Methode auf `/theke/*` – insbesondere der Server-Action-`POST` – wird
**ungezählt an die Route durchgereicht** (`NextResponse.next()`, nicht ins Auth-Gate, siehe D3)
und unterliegt weiterhin **allein** der Grenze aus ADR-044 (AK-7). Eine HTML-429 als Antwort auf einen Server-Action-POST wäre für den Client ohnehin kein
verwertbarer `VerzehrActionState`.

Daraus folgt die saubere Auflösung von AK-8: Der `revalidatePath`-Re-Render läuft **innerhalb**
desselben POST, erscheint am Proxy also nie als eigener GET und belastet das Lese-Budget nicht.
Das Selbst-Drossel-Risiko, das die Spec für eine Bremse *in* der Page beschreibt, existiert bei
dieser Platzierung strukturell nicht – ein zweiter, unabhängiger Grund für D3.

### D6 · Fail-open bleibt strukturell (FS-1)

Wie in ADR-020/044 ist `tryAcquire()` reine synchrone Zähler-Arithmetik ohne I/O. Ein Cold-Start
liefert einen frischen Zähler und lässt durch; es gibt keinen realistischen Fehlerpfad, den ein
`try/catch` behandeln könnte. Ein künstlicher Fallback wäre ein toter Zweig und damit ein Verstoß
gegen `clean-code.md` („Keine Fallbacks für vom Typsystem bereits ausgeschlossene Fälle").

## Alternativen

### D1 – Zähl-Dimension

**Option A (gewählt): globaler Route-Zähler.**
Pro: Wirkt gegen den tatsächlichen Angriff (zufällige Segmente); konstanter Zustand (FS-5); keine
Auflösung des Tokens vor der Entscheidung nötig (AK-2/AK-3); identisch zum bereits erprobten
ADR-020-Muster.
Con: Ein Flood belegt das gemeinsame Budget und drosselt im selben Fenster auch echte Besucher.
Das ist derselbe Trade-off, den ADR-020 für den Gate-Healthcheck bewusst akzeptiert hat, und er
wird durch den großzügigen Schwellwert entschärft.

**Option B: pro Token, analog ADR-044.**
Pro: Isolation zwischen Veranstaltungen; echte Besucher sind vom Flood auf fremde Segmente nicht
betroffen.
Con: **Wirkungslos gegen den Angriff aus dem Issue** – jedes neue Zufallssegment ist ein neuer
Schlüssel mit frischem Budget. Zusätzlich wächst die Map angreiferkontrolliert (FS-5). Der Schutz
liefe genau so leer wie die in ADR-020 verworfene IP-Dimension.

**Option C: hybrid – großzügiges Budget je auflösbarem Token, kleines gemeinsames Budget für
unbekannte.**
Pro: Träfe Angreifer und verschonte echte Besucher.
Con: „Auflösbar" ist nur mit einem DB-Lookup **vor** der Zähl-Entscheidung feststellbar – genau der
Read, den AK-2/AK-3 im Drosselfall verbieten. Eine Näherung über ein signiertes Cookie („dieser
Client hat die Seite schon einmal erfolgreich geladen") wäre möglich, bringt aber Signatur,
Cookie-Lebenszyklus und einen zweiten Zählpfad mit – deutlich mehr Mechanik, als die Vereins-Skala
trägt (YAGNI). Bleibt hinter der unveränderten Schnittstelle nachrüstbar.

**Option D: bewusst nichts, auf Vercel-Plattform-Limits vertrauen.**
Pro: Kein Code.
Con: Konfigurierbares Rate-Limiting (Vercel Firewall) ist kein Bestandteil des hier genutzten
Tarifs; der Basis-DDoS-Schutz greift erst weit oberhalb der Last, die Neon-Free schmerzt. Das Issue
ist genau deshalb aufgemacht worden.

### D3 – Verdrahtung

**Option A (gewählt): zweiter Matcher-Eintrag + früher Zweig vor `authMiddleware`.**
Pro: Der Negativ-Lookahead bleibt unangetastet, der `authorized`-Callback bleibt „`/login` oder
Session"; kein neuer Weg, auf dem eine geschützte Route versehentlich öffentlich wird. Der Zweig
ist an derselben Naht testbar wie der bestehende Session-Guard (`proxy.test.ts`).
Con: Der Proxy läuft künftig auch für Theken-Anfragen – im Normalfall ein zusätzlicher, sehr
billiger Schritt vor der Seite.

**Option B: `theke/` aus dem Lookahead nehmen und den `authorized`-Callback um eine
Public-Path-Ausnahme erweitern.**
Pro: Nur ein Matcher-Eintrag.
Con: Verteilt das Wissen „welcher Pfad ist öffentlich" auf zwei Stellen und macht aus dem
fail-closed Callback eine Ausnahmen-Liste – genau die Klasse Fehler, die Lesson #63 beschreibt
(öffentliche Route landet im Auth-Gate → 307 auf `/login`). Höheres Risiko ohne Gegenwert.

**Option C: Guard in `ThekePage` selbst.**
Pro: Kleinster Eingriff, kein Proxy-Umbau.
Con: Verfehlt das gesetzte Schutzziel (die Function-Invocation ist dann bereits bezahlt) und zählt
die `revalidatePath`-Re-Renders mit – die Theke drosselte sich bei intensiver Nutzung selbst.

### D4 – Auslieferung der Hinweisseite

**Option A (gewählt): 429 mit inline-HTML aus dem Proxy.**
Pro: Kein Render, kein Asset-Roundtrip, korrekter Status, keine neue Route (und damit kein
`docs/routes.md`-Drift).
Con: Ein kleines HTML-Literal im Code – gekapselt in einem eigenen, benannten Modul und damit
isoliert testbar.

**Option B: `rewrite` auf eine eigene Route `/theke/zu-viele-anfragen`.**
Pro: Die Seite wäre eine normale React-Komponente im App-Layout.
Con: Erzeugt genau die Invocation, die AK-3 einsparen soll, und liefert nicht den Status 429.

## Begründung

Die Entscheidungen folgen dem Muster von ADR-020 und ADR-044 – **Wiederverwendung** (die
Fixed-Window-Arithmetik bleibt in `lib/rate-limit.ts`, es entsteht kein dritter Zähl-Code),
**YAGNI** (kein geteilter Store, keine Eviction, keine Cookie-Heuristik) und **Verfügbarkeit vor
Schutz im Zweifel** (großzügiger Schwellwert, strukturelles fail-open).

Der eine bewusste Bruch mit ADR-044 ist die Zähl-Dimension, und er ist kein Übersehen, sondern
folgt aus einem harten Unterschied: Dort war der Schlüssel serverseitig gebunden, hier ist er frei
wählbar. Unter dieser Bedingung ist „pro Schlüssel" kein Schutz, sondern nur zusätzlicher Zustand –
dieselbe Einsicht, mit der ADR-020 die IP-Dimension verworfen hat.

Die Entscheidung ist vollständig reversibel: Schwellwert und Fenster sind eine Konstante; hinter
der unveränderten `RateLimiter`-Schnittstelle ließen sich später ein geteilter Store, eine
Hybrid-Dimension oder eine Plattform-Firewall nachrüsten, ohne die Aufrufstelle im Proxy zu ändern.

## Konsequenzen

**Positiv:**
- Der beschriebene Angriff (Schleife auf zufällige Segmente) wird tatsächlich gedeckelt – anders
  als bei einer Pro-Token-Dimension.
- Gedrosselte Anfragen kosten weder DB-Read noch Seiten-Invocation noch Asset-Roundtrip.
- Der Zustand ist konstant (ein Zähler, ein Fenster-Start) und wächst nicht mit Angreifer-Input.
- Das Auth-Gate bleibt unverändert eng und fail-closed; der `authorized`-Callback führt keine
  Liste öffentlicher Pfade.
- Die Erfassungs-Re-Renders sind vom Lese-Budget strukturell ausgenommen – kein Selbst-Drosseln.
- Keine neue Route, kein `docs/routes.md`-Drift, keine neue Abhängigkeit, keine Secrets.

**Negativ / Trade-offs:**
- **Ein gemeinsames Budget.** Ein gezielter Flood belegt es und beantwortet im selben Fenster auch
  echte Theken-Besucher mit 429. Die Bremse schützt **Kosten**, nicht die Verfügbarkeit unter einem
  bewussten Angriff – dafür bräuchte es eine Plattform-Firewall (nicht im Tarif, außerhalb dieses
  Tasks). Bewusst akzeptiert, wie in ADR-020.
- **Keine instanzübergreifende Garantie.** Wie in ADR-020/044 ist die Deckelung best-effort pro
  Instanz; wie viele Proxy-Instanzen Vercel warm hält, ist nicht kontrollierbar. Bei M Instanzen
  gilt die Grenze M-fach.
- Der Proxy läuft künftig auch für Theken-Anfragen – ein zusätzlicher, billiger Schritt im
  Normalfall.
- Der Schwellwert 240 ist eine begründete Schätzung, keine Messung. Er ist eine Konstante und
  jederzeit anpassbar, falls die Praxis etwas anderes zeigt.

## Implementierungs-Hinweise

Siehe Technische Notizen in
[`tasks/task-297-rate-limit-theke-leseroute.md`](../../tasks/task-297-rate-limit-theke-leseroute.md):
betroffene Dateien, TDD-Reihenfolge, Testfälle je AK/FS.
