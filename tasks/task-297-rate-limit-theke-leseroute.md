# Task 297: rate-limit-theke-leseroute

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung

Rate-Limit-/Amplifikations-Bremse für die öffentliche, login-freie GET-Route `/theke/[token]`.
Die Route führt heute für **jeden** Aufruf mit beliebigem Pfad-Segment mindestens
`getVeranstaltungByToken` aus (bei Treffer vier Neon-Reads) – der Token ist hier ein frei
wählbares URL-Segment, kein serverseitig gebundenes Argument. Nach #182/ADR-044 ist der
Schreibpfad gedeckelt und dieser Lesepfad die verbleibende, billigste Amplifikationsfläche
(Verfügbarkeit/Kosten, **kein** Vertraulichkeitsrisiko – der 256-bit-Token bleibt unratbar).

Spec: [`docs/specs/spec-297-rate-limit-theke-leseroute.md`](../docs/specs/spec-297-rate-limit-theke-leseroute.md)

**Vom Auftraggeber gesetzt (keine offenen Fragen mehr):** eigene „Zu viele Anfragen"-Seite (429)
statt `notFound()`; großzügiger Schwellwert + fail-open (konsistent ADR-020/044); Schutzziel sind
DB-Reads **und** Function-Invocations → die Bremse sitzt **vor** der Route (Edge-Proxy), nicht in
der Page. Die **Zähl-Dimension** bleibt bewusst offen und geht an `/architecture`.

**Nächster Pipeline-Schritt: `/architecture 297`** – erst danach `/implement`.

## Akzeptanzkriterien
- [x] AK-1 Normalfall unverändert: gültiger Token unter Schwellwert → Seite rendert wie heute
- [x] AK-2 Deckelung greift: ausgeschöpftes Fenster → kein `getVeranstaltungByToken`/`listZeilen`/`listActiveCatalog`/`listPositionen`
- [x] AK-3 Invocation gespart: gedrosselte Anfrage wird vor der Route beantwortet, `ThekePage` läuft nicht
- [x] AK-4 Sichtbare, ehrliche Antwort: eigene „Zu viele Anfragen"-Seite mit Retry-Hinweis, Status 429, nicht 404
- [x] AK-5 Öffentlicher Zugang bleibt öffentlich: `/theke/<token>` ohne Login → 200, kein 307 auf `/login` (Nachweis auf Proxy-Ebene, Lesson #63)
- [x] AK-6 Auth-Gate bleibt fail-closed: geschützte Route ohne Session → weiterhin Redirect auf `/login`
- [x] AK-7 Schreibpfad vom Lese-Flood entkoppelt: Server-Action-POST zählt auf ein eigenes Budget – ein ausgeschöpftes Lese-Fenster lehnt keinen Schreibaufruf ab (reale Erfassung bleibt praktisch bei ADR-044; das Proxy-Budget ist reiner Missbrauchs-Deckel, kein Freibrief)
- [x] AK-8 Kein Selbst-Drosseln: Schwellwert deckt reale Theken-Last inkl. `revalidatePath`-Re-Renders und 60 Schreibaufrufen/Fenster
- [x] AK-9 Fenster-Reset: nach Fensterablauf wieder normale Verarbeitung
- [x] AK-10 Muster wiederverwendet: Fixed-Window-Arithmetik aus `lib/rate-limit.ts`, keine dritte Implementierung

## Fehlerszenarien
- [x] FS-1 Fail-open bei Limiter-Störung/Cold-Start
- [x] FS-2 Throttle-Pfad billiger als Verarbeitungspfad (kein I/O)
- [x] FS-3 Kein Lockout über das Fenster hinaus
- [x] FS-4 Kein Enumerations-Leak: Drossel-Antwort für gültiges und erfundenes Token ununterscheidbar
- [x] FS-5 Kein angreiferkontrolliert unbegrenzt wachsender Zustand (Schlüsselraum ist hier frei wählbar)
- [x] FS-6 Keine Regression der Session-Rotations-Unterdrückung (#164/#170, ADR-032)

## Technische Notizen

> Aus `/architecture` (2026-09-09): **[ADR-048](../docs/adr/048-rate-limit-theke-leseroute.md)** –
> globaler Zähler im Proxy. Alle sechs offenen Fragen der Spec sind dort entschieden.

**Kurzfassung der Entscheidung:** ein **globaler** Fixed-Window-Zähler (240 / 60 s) für
`/theke/*`, ausgewertet in `proxy.ts` **vor** `authMiddleware`, gezählt werden nur **GET/HEAD**;
Drossel-Antwort ist eine 429 mit eigenem HTML direkt aus dem Proxy. Pro Token zu zählen wäre gegen
den Angriff aus dem Issue wirkungslos (jedes Zufallssegment = neuer Schlüssel = frisches Budget).

### Betroffene Dateien

1. **`lib/rate-limit.ts`** – neue Singletons `thekeReadRateLimiter` und (seit Review-Runde 2)
   `thekeActionRateLimiter`, beide `{ limit: 240, windowMs: THEKE_RATE_LIMIT_WINDOW_MS }`, plus die
   exportierte Fensterlänge `THEKE_RATE_LIMIT_WINDOW_MS = 60_000`, aus der die Drossel-Antwort ihren
   `Retry-After` ableitet. Keine neue Arithmetik (AK-10). **Der Modul-Header zählt seine Konsumenten
   auf** („`createRateLimiter` – ein globaler Zähler, für den /api/health-Endpunkt") – beim
   Hinzufügen weiterer Konsumenten mitpflegen (Lesson aus #207).
2. **`lib/rate-limit.test.ts`** – je ein `describe`-Block pro neuem Singleton, der **beide**
   produktiven Parameter pinnt (Muster: bestehender Block `selfServiceVerzehrRateLimiter`), plus ein
   Test, der die Trennung der Budgets belegt.
3. **`lib/theke-throttle-response.ts`** (+ `.test.ts`) – baut die Drossel-Antwort: Status **429**,
   `content-type: text/html; charset=utf-8`, `Retry-After: 60`, `Cache-Control: no-store`,
   vollständiges `lang="de"`-Dokument mit Inline-CSS, **ohne** externe Assets und **ohne** JS
   (im Drosselfall darf kein `_next/`-Roundtrip entstehen). Domänenspezifischer Modulname statt
   `utils` (Lesson aus #105).
4. **`proxy.ts`** – zweiter Matcher-Eintrag `"/theke/:path*"`; der bestehende Negativ-Lookahead
   bleibt **unverändert** (inkl. `theke/`), damit die Theke den `authorized`-Callback weiterhin nie
   erreicht. Im Rumpf ein früher Zweig **vor** `authMiddleware`.
5. **`proxy.test.ts`** – neue Fälle (unten). Die vorhandene `request()`-Fixture liefert nur
   `method` + `headers`; sie braucht `nextUrl.pathname` und alle bestehenden Aufrufe müssen
   mitgezogen werden.
6. **`docs/routes.md`** – **unverändert**: es entsteht keine neue Route (ADR-048 D4). Nicht
   „vorsichtshalber" ergänzen, der Drift-Check ist fail-closed in beide Richtungen.

### Zielbild `proxy.ts`

```ts
export default async function proxy(request: NextRequest, event: NextFetchEvent) {
  if (isThekePath(request.nextUrl.pathname)) {
    const limiter = isServerActionRequest(request) ? thekeActionRateLimiter : thekeReadRateLimiter;
    return limiter.tryAcquire() ? NextResponse.next() : tooManyRequestsResponse();
  }

  const response = await authMiddleware(request, event);
  if (response && shouldSuppressSessionRotation(request)) {
    stripSessionRotation(response);
  }
  return response;
}
```

> **Zweimal korrigiert gegenüber dem ADR-Entwurf (Notizen unten):** In `/implement` wurde „verlässt
> den Proxy" (`isThekePath`) von „wird gezählt" getrennt – der Entwurf ließ nicht gezählte Methoden
> in `authMiddleware` durchfallen und brach damit AK-7. In **Review-Runde 2** entfiel die
> Methoden-Bedingung ganz: Sie ließ `POST`/`PUT`/`PATCH`/`DELETE` ungezählt durch, obwohl der App
> Router die Seite auch dafür rendert. ADR-048 D3/D5 sind beide Male im selben PR nachgezogen.

`isThekePath` = Pfad beginnt mit `/theke/`. **Jede** Anfrage auf diesem Pfad zählt; der
Discriminator ist nicht die Methode, sondern der Server-Action-Marker (`Next-Action`-Header): Er
wählt zwischen Schreib- und Lese-Budget, damit ein Lese-Flood die Erfassung nicht abwürgt (AK-7).
Ungezählt durchgereicht wird nichts – **nicht** ins Auth-Gate. Kein `try/catch` um `tryAcquire` –
reine synchrone Arithmetik, ein Fallback wäre ein toter Zweig (`clean-code.md`, ADR-048 D6).

### TDD-Reihenfolge

1. **`lib/rate-limit.test.ts`** RED → Singleton anlegen: erlaubt 240 im Fenster, drosselt den 241.,
   lässt nach 60 s wieder zu.
2. **`lib/theke-throttle-response.test.ts`** RED → Modul: Status, die drei Header, sichtbarer
   Hinweistext, keine externe Referenz im Markup.
3. **`proxy.test.ts`** RED → Zweig in `proxy.ts` verdrahten (Limiter-Modul mocken, Muster aus
   `app/api/health/route.test.ts`).
4. **Matcher-Guard** RED → zweiten Matcher-Eintrag ergänzen.
5. `/test` ergänzt fehlende Zweige, `/refactor` räumt auf.

### Testfälle je Akzeptanzkriterium

| AK/FS | Testfall | Ort |
|---|---|---|
| AK-1, AK-5 | GET `/theke/<token>` unter Limit → `authMiddleware` **nicht** aufgerufen, Anfrage läuft durch (kein Redirect auf `/login`) | `proxy.test.ts` |
| AK-2, AK-3, AK-4 | GET über Limit → Status 429, Hinweis-HTML, `authMiddleware` **nicht** aufgerufen | `proxy.test.ts` |
| AK-6, FS-6 | GET `/veranstaltung` → Zweig greift nicht, `authMiddleware` läuft, Session-Strip weiterhin aktiv | `proxy.test.ts` |
| AK-7, D5 | POST `/theke/<token>` **mit** `Next-Action`-Header → zählt aufs Schreib-Budget, Lese-Budget unberührt; läuft auch bei erschöpftem Lese-Budget durch | `proxy.test.ts` |
| AK-2, D5 | POST/DELETE `/theke/<token>` **ohne** Marker → zählt aufs Lese-Budget, über Limit 429 (Review-Runde 2, kritisch) | `proxy.test.ts` |
| AK-8 | HEAD wird gezählt, der Server-Action-POST nicht – zusammen mit AK-7 der Nachweis, dass Erfassung das Lesebudget nicht belastet | `proxy.test.ts` |
| AK-9, AK-10, OF-2 | 240 erlaubt, 241. gedrosselt, Reset nach exakt 60 000 ms am echten Singleton | `lib/rate-limit.test.ts` |
| AK-4 | Status/Header/Markup der Drossel-Antwort | `lib/theke-throttle-response.test.ts` |
| FS-4 | zwei gedrosselte GETs auf **unterschiedliche** Segmente → ununterscheidbare Antwort (Status, Header, Body) | `proxy.test.ts` |
| FS-1 | erster Aufruf nach Cold-Start wird durchgelassen (frischer Zähler) | `lib/rate-limit.test.ts` |
| FS-5 | strukturell: ein Zähler, keine Map – kein eigener Test nötig, in der ADR begründet | – |
| Matcher | `config.matcher` erfasst `/theke/…` **und** der bestehende Eintrag schließt `theke/` weiterhin aus | `proxy.test.ts` |

### Fallstricke

- **Der globale Limiter startet sein Fenster beim Modul-Import**, nicht lazy beim ersten Aufruf wie
  die keyed-Variante – der Singleton-Test muss das berücksichtigen (Fake-Uhr einfrieren, dann
  zählen). Und er hat **keinen Schlüssel zur Isolation**: der Test, der die 240 ausschöpft,
  verbraucht das Budget für die restliche Datei. Alle Konsumenten-Tests mocken das Limiter-Modul
  statt das echte Singleton zu benutzen.
- **AK-5 braucht den Nachweis auf Proxy-Ebene** (Lesson aus #63): ein Test, der nur `ThekePage`
  direkt aufruft, umgeht die Naht und wäre grün, während der öffentliche Zugang live kaputt ist.
- `NextResponse` kommt aus `next/server`; der Zweig muss vor dem `await authMiddleware(...)` stehen,
  sonst ist die Invocation-Ersparnis (AK-3) dahin.
- Beim Erweitern der `request()`-Fixture in `proxy.test.ts`: die bestehenden Fälle laufen alle über
  Methoden wie GET/HEAD – ohne gesetzten Pfad würden sie sonst je nach Implementierung in den neuen
  Zweig fallen und die Session-Guard-Tests still entwerten.

## Offene Fragen

- [x] OF-1 Zähl-Dimension → ADR-048 D1: globaler Zähler (pro Token wäre gegen Zufallssegmente wirkungslos)
- [x] OF-2 Schwellwert + Fenster → ADR-048 D2: 240 / 60 s, hergeleitet aus ~40 Teilnehmern × ~4 Aufrufen/min + 50 % Puffer
- [x] OF-3 Verdrahtung → ADR-048 D3: zweiter Matcher-Eintrag + früher Zweig vor `authMiddleware`
- [x] OF-4 Edge-Runtime → **hinfällig**: `proxy.ts` läuft in Next 16 immer auf Node.js (belegt in `next@16.2.12`)
- [x] OF-5 Hinweisseite → ADR-048 D4: 429 mit Inline-HTML aus dem Proxy, keine neue Route
- [x] OF-6 Zähl-Umfang → ADR-048 D5: nur GET/HEAD; POST bleibt allein bei ADR-044

## Implementierungs-Notizen (`/implement`, 2026-09-09)

**Abweichung vom ADR-Entwurf – der Theken-Zweig kehrt für den ganzen Pfad früh zurück, nicht nur
für GET/HEAD.** ADR-048 D3/D5 skizzierten `if (isThekeRead(request))`, ließen also POST & Co. in
`authMiddleware` durchfallen. Das bricht AK-7: Der neue Matcher-Eintrag holt `/theke/*` überhaupt
erst in den Proxy, und `authorized` in `auth.config.ts` verlangt für **jeden** Pfad außer `/login`
eine Session. Implementiert ist deshalb `isThekePath` (verlässt den Proxy) getrennt von
`isServerActionRequest` (wählt das Budget; in Runde 2 an die Stelle von `READ_METHODS` getreten).
**ADR-048 D3/D5 sind im selben PR nachgezogen** (Lesson #211/#55).

Beleg per Mutation am laufenden Dev-Server (nicht nur Codelesen, Lesson #286/#314):

| Variante | `POST /theke/<token>` | `GET /theke/<token>` |
|---|---|---|
| verworfener Entwurf (Durchfallen) | **307** → `/login` | 404 |
| implementiert (früher Return) | **404** | 404 |

**Oberflächen-/Live-Verifikation** gegen `pnpm dev` + lokale DB (Skill-Schritt 4), alle Nachweise
auf echter Proxy-Ebene statt per Direktaufruf der Page (Lesson #63):

- AK-5: `GET /theke/<token>` ohne Login → 404 (`notFound` der Route), **kein** 307 auf `/login`
- AK-6: `GET /veranstaltung` ohne Login → 307 auf `/login` (Auth-Gate unverändert fail-closed)
- AK-2/AK-4: nach 240 Lese-Anfragen → **429**, `content-type: text/html; charset=utf-8`,
  `retry-after: 60`, `cache-control: no-store`, `<h1>Zu viele Anfragen</h1>`
- FS-4: zweites, frei erfundenes Segment im selben Fenster → ebenfalls 429, ununterscheidbar
- AK-7: `POST` im **ausgeschöpften** Fenster weiterhin 404, nie 429 → ungezählt
- AK-6 im ausgeschöpften Fenster: `/veranstaltung` unverändert 307 → kein Übergriff der Bremse

Verifikations-Skripte liegen als `scripts/verify-297*.tmp.sh` (von `.gitignore` Zeile 19 gedeckt,
geprüft – nicht Teil des Commits).

**Kein neuer ADR-Trigger** (Skill-Schritt 0): Die Entscheidung ist mit ADR-048 bereits getroffen;
die Korrektur oben präzisiert die dort beschriebene Mechanik, wechselt aber weder Technologie noch
Muster noch Schnittstellen-Vertrag.

**`docs/routes.md` bewusst unverändert** – es entsteht keine neue Route (ADR-048 D4); der
Drift-Check ist in beide Richtungen fail-closed.

## Review-Findings

> Runde 1 (`/review`, 2026-09-09): **NEEDS_REWORK** – Report:
> [`tasks/review-297.md`](review-297.md). 1 kritisch, 2 wichtig, 4 Nitpicks.

**Kritisch:** Die Bremse zählt nur `GET`/`HEAD`. Next.js rendert App-Router-Seiten aber auch für
`POST`/`PUT`/`PATCH`/`DELETE` ohne Server-Action-Marker – `ThekePage` läuft dann samt
`getVeranstaltungByToken`, ungezählt und ungedeckelt. Am laufenden Dev-Server belegt: 300 ×
`POST /theke/rand-<i>` → je Page-Invocation mit `application-code ≈ 30 ms`, das Lese-Budget bleibt
unberührt (`GET` danach weiterhin 404 statt 429). ADR-048 D5 („unterliegt weiterhin allein der
Grenze aus ADR-044") trifft auf diese Anfragen nicht zu: ohne Action-Marker läuft
`adjustVerzehrByTokenAction` – und damit `selfServiceVerzehrRateLimiter` – nie.

### Rework Runde 2 (`/implement`, 2026-09-09) – alle 7 Findings behoben

**Kritisch (behoben).** Der Discriminator ist nicht mehr die HTTP-Methode, sondern der
Server-Action-Marker: `isServerActionRequest` (POST **und** `Next-Action`-Header) wählt zwischen
`thekeActionRateLimiter` und `thekeReadRateLimiter`; **ungezählt durchgereicht wird nichts** mehr.
Ein POST ohne Marker ist ein getarnter Seiten-Read und zählt aufs Lese-Budget. Der Schreibpfad
bekommt ein **eigenes** Budget (240/60 s) statt eines Freibriefs – der Marker ist nur ein Ausweis,
den jeder setzen kann, ein ungezählter Zweig wäre also ein Header-Schalter zum Abstellen der Bremse.
Reale Erfassung erreicht diese Grenze nie (ADR-044 riegelt pro Token schon bei 60/Fenster ab).

**Bewusste Grenze** (in Code, ADR und Test dokumentiert): Der No-JS-Server-Action-Pfad kodiert die
Action-ID im Multipart-Body, nicht im Header, und zählte aufs Lese-Budget. Im heutigen Aufbau
unerreichbar – das Erfassungs-Formular liegt hinter dem rein clientseitigen `IdentityGate`. Ein
Body-Parse im Proxy wäre teurer als der eingesparte Read.

**Wichtig (behoben):** `docs/routes.md` sagt für `/theke/[token]` nicht mehr „proxy-exempt"
(stimmt seit dem zweiten Matcher-Eintrag nicht), sondern „kein Auth-Gate, Token; Rate-Limit im
Proxy, ADR-048". · Die gekoppelten `60`-Literale sind aufgelöst: `THEKE_RATE_LIMIT_WINDOW_MS` ist
exportiert, `RETRY_AFTER_SECONDS` leitet sich daraus ab.

**Nitpicks (alle vier behoben):** Cold-Start-Test-Kommentar sagt jetzt ehrlich, dass er nur
`limit > 0` pinnt · `async` ohne `await` entfernt · `isThekePath(pathname: string)` statt
`NextRequest` · die Asymmetrie der Matcher-Prüfung ist als Kommentar begründet.

**ADR-048 im selben PR nachgezogen** (Lesson #211/#55 – dieselbe Stelle wie in Runde 1): D2 um die
exportierte Fensterkonstante, D3 um das korrigierte Codebeispiel, **D5 vollständig neu** samt
expliziter Kennzeichnung der widerlegten Prämisse; „Konsequenzen" um die zwei neuen Trade-offs
(Obergrenze auf dem Schreibpfad, Marker erkennt den No-JS-Pfad nicht).

**Vorgefundener Zustand:** Der Worktree enthielt uncommittete Änderungen aus einem abgebrochenen
Rework-Lauf – darin in `proxy.ts` eine **stehengebliebene Testmutation** (`// MUTANT`, beide
Zweigseiten auf `thekeReadRateLimiter`), die den Fix wirkungslos machte. Zurückgenommen und der
Zweig per Mutationsbeleg abgesichert (Lesson #185/#264/#324 – Retry ohne Gedächtnis baut auf
halbfertigem Fremd-Stand auf).

**Mutationsbeleg** (Lesson #286 – derselbe Assert-Ausdruck, nicht nur derselbe Grundbefehl):
Mutation der Zweigauswahl auf den Lese-Limiter → `proxy.test.ts` **3 Tests rot**
(`should_countOnActionBudgetOnly_when_thekeServerActionPost`,
`should_passRequestToRoute_when_thekeServerActionPostWithExhaustedReadBudget`,
`should_return429_when_thekeServerActionPostOverActionLimit`); ohne Mutation grün.

**Gates:** `pnpm lint` grün · `pnpm typecheck` grün (Lesson #137) · `pnpm test` 793 passed /
59 skipped · `routes-doc-check.sh` grün.

**Live-Verifikation** an der echten Proxy-Naht (`pnpm dev` + lokale DB, Lesson #63) – der Fund aus
Runde 1 ist dort widerlegt, wo er gemessen wurde:

| Probe (Lese-Budget ausgeschöpft) | Runde 1 | jetzt |
|---|---|---|
| `POST /theke/<segment>` ohne Marker | 404 (ungedeckelt) | **429** |
| `PUT` / `DELETE` ohne Marker | 404 (ungedeckelt) | **429** / **429** |
| `POST /theke/<segment>` **mit** `Next-Action` | 404 | **404** (AK-7: eigenes Budget) |
| `GET /veranstaltung` | 307 | **307** (AK-6, kein Übergriff) |
| 241. `GET /theke/<segment>` | 429 | **429** (AK-2/AK-4) |
| `GET` nach 61 s | – | **404** (AK-9, Fenster-Reset) |

FS-4 zusätzlich per Body-Hash zweier verschiedener Segmente: identisch. Header der 429:
`content-type: text/html; charset=utf-8`, `retry-after: 60`, `cache-control: no-store`.
Verifikations-Skripte als `scripts/verify-297-*.tmp.sh` (nicht Teil des Commits – geprüft: sie
erscheinen nicht in `git status`).

### Review-Runde 2 (`/review`, 2026-09-09): **NEEDS_REWORK**

Report: [`tasks/review-297.md`](review-297.md). 1 kritisch, 2 wichtig, 3 Nitpicks – **kein
Produktionscode betroffen**. Der kritische Fund aus Runde 1 ist wirksam behoben (am Code
verifiziert, alle 7 Findings abgehakt).

**Kritisch:** `spec-297` ist in **diesem** PR entstanden und wurde beim Rework nicht mitgezogen –
sie behauptet an vier Stellen (`:38-39`, AK-7 `:113-116`, AK-8-Klammer `:122-125`, OF-6 `:194-195`)
weiterhin „nur GET/HEAD" bzw. „der Server-Action-POST unterliegt ausschließlich ADR-044 und wird
nie mit der HTML-429 beantwortet". `proxy.test.ts:252-267` assertiert das Gegenteil. Die AK-7-Zeile
oben in dieser Datei spiegelt denselben Satz und ist als erfüllt abgehakt. Risiko: `/test` schreibt
seine Fälle gegen die AK-Tabelle der Spec. Lesson #253/#211/#176.

**Wichtig:** ADR-048 D2 `:71-73` beziffert die Wirkung noch mit „≤ 240 Renders / ~960 Reads pro
Minute und Instanz" – seit dem zweiten 240er-Budget (D5) ist die reale Decke ≤ 480 / ~1920; `:258`
spricht weiterhin von „ein Zähler, ein Fenster-Start". · `isThekePath` hat keine
Diskriminierungs-Kontrolle in der Gegenrichtung: Mutation `"/theke/"` → `"/theke"` lässt alle 35
Tests grün, obwohl ein zu breites Präfix Pfade wie `/thekenwart` am Auth-Gate vorbeiführte.

### Rework Runde 3 (`/implement`, 2026-09-09) – alle 6 Findings behoben

**Kein Produktionscode angefasst** (`proxy.ts`, `lib/rate-limit.ts`, `lib/theke-throttle-response.ts`
unverändert) – der Rework ist Doku-Drift plus ein Testfall, genau der vom Report benannte Umfang.

**Kritisch (behoben): `spec-297` zieht die Korrektur aus Runde 2 nach.** Vier gemeldete Stellen –
„Wechselwirkung" (jede Anfrage zählt, auf zwei getrennte Budgets; Discriminator ist der
Server-Action-Marker), **AK-7** (neu formuliert: „Schreibpfad vom Lese-Flood entkoppelt" – eigenes
Budget statt „unterliegt ausschließlich ADR-044 und wird nie mit der HTML-429 beantwortet"),
AK-8-Klammer und **OF-6** (die alte Fassung steht jetzt ausdrücklich als in Runde 1 **widerlegte**
Prämisse da, wie in ADR-048 D5). Die AK-7-Zeile in der AK-Liste oben ist mitgezogen; das Kriterium
bleibt damit erfüllt abgehakt, weil sein Wortlaut jetzt beschreibt, was der Code tut.
Fünfte Stelle per Grep selbst gefunden (Lesson #264 – Fix auf Geschwister-Stellen ausweiten):
„Nicht inbegriffen" behauptete, ADR-044 bleibe „unverändert **die** Grenze des Schreibpfads".

**Wichtig (behoben): ADR-048 quantifiziert jetzt beide Budgets.** D2 nennt die Decke als Summe
(**≤ 480 Renders / ≤ ~1920 Neon-Reads** pro Minute und Instanz statt ≤ 240 / ~960) mit der
Begründung aus D5 – wer den Header setzt, holt sich das zweite Budget. „Konsequenzen" sagt statt
„ein Zähler, ein Fenster-Start" nun „zwei Zähler mit je einem Fenster-Start"; FS-5 bleibt erfüllt
(konstant ist konstant).

**Wichtig (behoben): Diskriminierungs-Kontrolle für `isThekePath`.** Neuer Testfall
`should_leaveAuthGateUntouched_when_pathOnlyLooksLikeTheke` (`proxy.test.ts`): `GET /thekenwart`
→ **kein** Limiter-Aufruf, `fakeAuth` läuft, Session-Strip greift. Der bisherige Negativfall
`/veranstaltung` lag zu weit weg, um eine Präfix-Verbreiterung zu fangen – und `isThekePath`
entscheidet, ob eine Anfrage **ganz am Auth-Gate vorbei** läuft.

**Mutationsbeleg** (Lesson #286 – derselbe Assert-Ausdruck): `THEKE_PATH_PREFIX = "/theke/"` →
`"/theke"` mutiert → `proxy.test.ts` **1 Test rot**, exakt der neue
(`proxy.test.ts:288`, `expect(tryAcquireMock).not.toHaveBeenCalled()`); unmutiert 36 grün.
Mutation per `git checkout -- proxy.ts` zurückgenommen.

**Nitpicks:** Der erste (sichtbarer Wartezeit-Text koppelt an die Fensterkonstante) war bereits mit
`2bb6bec` behoben – verifiziert, keine erneute Änderung. Die beiden übrigen Kommentar-Aussagen sind
korrigiert **und empirisch belegt**, statt sie zu behaupten (Lesson #319/#314):

| Kommentar | Behauptung | Probe | Ergebnis |
|---|---|---|---|
| `proxy.test.ts` Mock-Factory | nicht „bekäme `NaN`", sondern „der Import schlägt fehl" | Konstante aus der Factory entfernt | `Error: [vitest] No "THEKE_RATE_LIMIT_WINDOW_MS" export is defined on the "@/lib/rate-limit" mock`, Datei rot, **0 Tests** gelaufen |
| `lib/rate-limit.test.ts` `+ 7_200_000` | Herleitung: geteilter Singleton-Zustand, +1 h läge **vor** dem Fenster-Start, den die Tests darüber hinterlassen | auf `+ 3_600_000` mutiert **und** die Schleife auf `toBe(true)` assertierend | `AssertionError: expected false to be true` → die Prämisse „240 sind hier frei" wäre falsch |

**Gates:** `pnpm lint` grün · `pnpm typecheck` grün (Lesson #137) · `pnpm test` **794 passed /
59 skipped** (+1 = der neue Testfall) · `routes-doc-check.sh` grün.

**Keine Live-/Oberflächen-Verifikation nötig:** Der Rework ändert kein Verhalten – Produktionscode
unverändert, die Proxy-Naht ist in Runde 2 am laufenden Dev-Server belegt (Tabelle oben). Die
Wegwerf-Skripte liegen als `scripts/verify-297-r3*.tmp.sh` und `scripts/cleanup-297-r3.tmp.sh`
(+ zwei `*.tmp.txt`-Backups, wieder gelöscht); `.gitignore` Zeile 18/19 deckt beide Muster –
per `git status --porcelain --ignored` geprüft, sie stehen unter `!!`, nicht unter den Änderungen.

**Kein neuer ADR-Trigger** (Skill-Schritt 0): Markdown-Drift und ein Testfall, keine
Technologie-/Muster-/Vertrags-Entscheidung.

### Review-Runde 3 (`/review`, 2026-09-09): **APPROVED**

Report: [`tasks/review-297.md`](review-297.md). **0 kritisch, 1 wichtig, 5 Nitpicks** – kein Befund
am Produktionscode. Alle 13 Findings der Runden 1+2 sind am Datei-Stand verifiziert behoben (nicht
aus den Task-Notizen übernommen); der Mutationsbeleg der Diskriminierungs-Kontrolle wurde
eigenständig nachvollzogen: `THEKE_PATH_PREFIX` `"/theke/"` → `"/theke"` → `proxy.test.ts`
1 failed / 19 passed, genau `should_leaveAuthGateUntouched_when_pathOnlyLooksLikeTheke`; Revert per
EXIT-Trap, Baum sauber.

**Gates selbst gemessen:** `pnpm test` 794 passed / 59 skipped · `pnpm lint` grün ·
`pnpm typecheck` grün · `routes-doc-check.sh` grün.

**Wichtiges Finding → an `/test` übergeben (nicht an eine 4. `/implement`-Iteration):**
`lib/rate-limit.test.ts:132-222` ist reihenfolge-abhängig – die drei Theken-`describe`-Blöcke
zählen an denselben produktiven Singletons und stellen die Fake-Uhr nur relativ vor (`+1 h`/`+2 h`).
Belegt mit `pnpm vitest run lib/rate-limit.test.ts --sequence.shuffle=true --sequence.seed=12345`
→ **1 failed** (`:191`, die 240er-Schleife des Schreib-Budgets). `vitest.config.ts` schaltet kein
Shuffle, die Suite ist heute also deterministisch grün – der Verstoß gegen
`testing-standards.md` → „Test-Isolation"/„Zero Tolerance" bleibt aber latent und trifft die
schärfste Assertion der Datei. Richtung: pro Block ein frisches Modul-Objekt
(`setSystemTime` → `resetModules` → Re-Import, wie im Cold-Start-Test `:137-150`).

**Circuit Breaker:** Dritter `/review`-Lauf = Iterationsgrenze aus CLAUDE.md erreicht. Bewusst
**kein** NEEDS_REWORK und **keine** Eskalation – es ist kein Konflikt offen: kein kritisches
Finding, kein Produktionscode-Befund, das eine wichtige Finding ist Test-Hygiene und liegt beim
unmittelbar folgenden Schritt `/test`. Nitpick 5 (UI-Verhalten, wenn ein echter Erfassungs-POST auf
das erschöpfte Schreib-Budget läuft) ist als Frage an `/security-review` adressiert.

## Test-Notizen (`/test`, 2026-09-09)

**Kein Produktionscode geändert** – nur `lib/rate-limit.test.ts` (`proxy.ts`, `lib/rate-limit.ts`,
`lib/theke-throttle-response.ts` unverändert), genau der von Review-Runde 3 benannte Umfang.

**Wichtiges Finding aus Runde 3 behoben:** Die drei theken-relevanten Blöcke
(`thekeReadRateLimiter`, `thekeActionRateLimiter`) liefen bislang gegen die über die Datei
**geteilten** produktiven Singletons und stellten die Fake-Uhr nur relativ vor (`+1 h`/`+2 h`) –
ein reihenfolgeabhängiges Design, das `testing-standards.md` → „Test-Isolation"/„Zero Tolerance"
verletzt. Umgesetzt wie im Bericht vorgeschlagen: Jeder Test, der einen vollständigen Zähler-Zyklus
braucht, holt sich jetzt per `vi.resetModules()` + dynamischem Re-Import ein **eigenes**
Modul-Objekt (Muster aus dem bestehenden Cold-Start-Test) und friert die Zeit **vor** dem Import
auf `0` ein – absolut statt relativ zu vorherigen Tests, kein geteilter Zustand mehr zwischen den
`describe`-Blöcken. Die nicht mehr benötigten statischen Top-Level-Importe von
`thekeActionRateLimiter`/`thekeReadRateLimiter` sind entfernt (jeder Test bezieht sie jetzt aus
seinem eigenen frischen Import).

**Beleg:** vorher reproduzierte `pnpm vitest run lib/rate-limit.test.ts --sequence.shuffle=true
--sequence.seed=12345` einen roten Test (`:191`, Schreib-Budget-Schleife). Nach dem Fix läuft
derselbe Seed grün, ebenso vier weitere Stichproben-Seeds (`1`, `42`, `999`, `7`, `2026`) –
alle 13 Tests der Datei bestehen unabhängig von der Ausführungsreihenfolge.

**Test-Vollständigkeit gegen die AK-Tabelle geprüft:** alle zehn AK und sechs FS aus der Spec haben
einen zugeordneten Testfall (Tabelle oben, Implementierungs-Notizen); keine Lücke gefunden, keine
neuen Testfälle über die Isolationskorrektur hinaus nötig.

**Gates:** `pnpm lint` grün · `pnpm typecheck` grün · `pnpm test` 794 passed / 59 skipped ·
`pnpm format:check` grün (ein `prettier --write` auf die geänderte Datei war nötig) ·
`routes-doc-check.sh` grün (keine Routen-Änderung).

**Kein neuer ADR-Trigger:** Die Änderung ist Test-Isolation ohne Verhaltens-, Technologie- oder
Vertragswechsel.

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/297-rate-limit-theke-leseroute`
Erstellt: 2026-09-09 02:03
