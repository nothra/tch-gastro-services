# Task 297: rate-limit-theke-leseroute

## Status
- [ ] In Bearbeitung
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
- [ ] AK-1 Normalfall unverändert: gültiger Token unter Schwellwert → Seite rendert wie heute
- [ ] AK-2 Deckelung greift: ausgeschöpftes Fenster → kein `getVeranstaltungByToken`/`listZeilen`/`listActiveCatalog`/`listPositionen`
- [ ] AK-3 Invocation gespart: gedrosselte Anfrage wird vor der Route beantwortet, `ThekePage` läuft nicht
- [ ] AK-4 Sichtbare, ehrliche Antwort: eigene „Zu viele Anfragen"-Seite mit Retry-Hinweis, Status 429, nicht 404
- [ ] AK-5 Öffentlicher Zugang bleibt öffentlich: `/theke/<token>` ohne Login → 200, kein 307 auf `/login` (Nachweis auf Proxy-Ebene, Lesson #63)
- [ ] AK-6 Auth-Gate bleibt fail-closed: geschützte Route ohne Session → weiterhin Redirect auf `/login`
- [ ] AK-7 Schreibpfad unberührt: Server-Action-POST unterliegt weiterhin nur ADR-044, nie der Lese-Bremse
- [ ] AK-8 Kein Selbst-Drosseln: Schwellwert deckt reale Theken-Last inkl. `revalidatePath`-Re-Renders und 60 Schreibaufrufen/Fenster
- [ ] AK-9 Fenster-Reset: nach Fensterablauf wieder normale Verarbeitung
- [ ] AK-10 Muster wiederverwendet: Fixed-Window-Arithmetik aus `lib/rate-limit.ts`, keine dritte Implementierung

## Fehlerszenarien
- [ ] FS-1 Fail-open bei Limiter-Störung/Cold-Start
- [ ] FS-2 Throttle-Pfad billiger als Verarbeitungspfad (kein I/O)
- [ ] FS-3 Kein Lockout über das Fenster hinaus
- [ ] FS-4 Kein Enumerations-Leak: Drossel-Antwort für gültiges und erfundenes Token ununterscheidbar
- [ ] FS-5 Kein angreiferkontrolliert unbegrenzt wachsender Zustand (Schlüsselraum ist hier frei wählbar)
- [ ] FS-6 Keine Regression der Session-Rotations-Unterdrückung (#164/#170, ADR-032)

## Technische Notizen

> Aus `/architecture` (2026-09-09): **[ADR-048](../docs/adr/048-rate-limit-theke-leseroute.md)** –
> globaler Zähler im Proxy. Alle sechs offenen Fragen der Spec sind dort entschieden.

**Kurzfassung der Entscheidung:** ein **globaler** Fixed-Window-Zähler (240 / 60 s) für
`/theke/*`, ausgewertet in `proxy.ts` **vor** `authMiddleware`, gezählt werden nur **GET/HEAD**;
Drossel-Antwort ist eine 429 mit eigenem HTML direkt aus dem Proxy. Pro Token zu zählen wäre gegen
den Angriff aus dem Issue wirkungslos (jedes Zufallssegment = neuer Schlüssel = frisches Budget).

### Betroffene Dateien

1. **`lib/rate-limit.ts`** – neuer Singleton
   `export const thekeReadRateLimiter = createRateLimiter({ limit: 240, windowMs: 60_000 })`.
   Keine neue Arithmetik (AK-10). **Der Modul-Header zählt seine Konsumenten auf** („`createRateLimiter`
   – ein globaler Zähler, für den /api/health-Endpunkt") – beim Hinzufügen des zweiten Konsumenten
   mitpflegen (Lesson aus #207).
2. **`lib/rate-limit.test.ts`** – eigener `describe`-Block für den neuen Singleton, der **beide**
   produktiven Parameter pinnt (Muster: bestehender Block `selfServiceVerzehrRateLimiter`).
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
  if (isThekeRead(request)) {
    return thekeReadRateLimiter.tryAcquire() ? NextResponse.next() : tooManyRequestsResponse();
  }

  const response = await authMiddleware(request, event);
  if (response && shouldSuppressSessionRotation(request)) {
    stripSessionRotation(response);
  }
  return response;
}
```

`isThekeRead` = Pfad beginnt mit `/theke/` **und** Methode ist `GET` oder `HEAD`. Jede andere
Methode fällt durch in den bestehenden Pfad (AK-7). Kein `try/catch` um `tryAcquire` – reine
synchrone Arithmetik, ein Fallback wäre ein toter Zweig (`clean-code.md`, ADR-048 D6).

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
| AK-7, D5 | POST `/theke/<token>` → `tryAcquire` **nicht** aufgerufen, Anfrage läuft in den bestehenden Pfad | `proxy.test.ts` |
| AK-8 | HEAD wird gezählt, POST nicht – zusammen mit AK-7 der Nachweis, dass Erfassung das Lesebudget nicht belastet | `proxy.test.ts` |
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

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/297-rate-limit-theke-leseroute`
Erstellt: 2026-09-09 02:03
