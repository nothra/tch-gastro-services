# Task 297: rate-limit-theke-leseroute

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
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
- [x] AK-7 Schreibpfad unberührt: Server-Action-POST unterliegt weiterhin nur ADR-044, nie der Lese-Bremse
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
`READ_METHODS` (wird gezählt). **ADR-048 D3/D5 sind im selben PR nachgezogen** (Lesson #211/#55).

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

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/297-rate-limit-theke-leseroute`
Erstellt: 2026-09-09 02:03
