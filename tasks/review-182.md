# Review: Task 182

> **Runde 2** (nach dem Rework-Commit `9e51f08`). Ersetzt den Report der Runde 1 – die dortigen
> drei „Wichtig"-Findings sind verifiziert behoben (Nachweis unter *Positives*).
> Circuit Breaker: 2. Review-Iteration von max. 3.

Reviewt: `git diff origin/main...HEAD` (9 Dateien, +769/−10) gegen
[spec-182](../docs/specs/spec-182-rate-limit-selbstbedienung.md) und
[ADR-044](../docs/adr/044-rate-limit-selbstbedienungs-action.md).
Verifikation: `pnpm vitest run lib/rate-limit.test.ts app/veranstaltung/actions.test.ts
app/api/health/route.test.ts` → 3 Dateien / 114 Tests grün (einer weniger als in Runde 1,
weil der Duplikat-Test entfernt wurde – erwartete Differenz).

## Kritische Findings (müssen behoben werden)

_Keine._ Alle AK (AK-1…AK-6) und Fehlerszenarien (FS-1…FS-3) sind funktional umgesetzt; die
Implementierung folgt ADR-044 D1/D2/D3 wörtlich, ohne Abweichung und ohne Gold-Plating.

## Wichtige Findings (sollten behoben werden)

- [ ] `lib/rate-limit.test.ts:110-120` – **Der einzige Test am produktiv verdrahteten Singleton
  belegt nur den Schwellwert (60), nicht die Fensterlänge (60 s) – behauptet im Kommentar aber
  beides.** Der Kommentar auf Zeile 111 lautet „die produktiv verdrahteten **Parameter**
  (60/60 s, ADR-044 D1)"; assertiert werden 60×`true` + 1×`false` in schneller Folge. Diese
  Assertion ist gegenüber `windowMs` **blind**: ein Vertippen von `windowMs: 60_000` auf
  `600_000` (oder `6_000`) in `lib/rate-limit.ts:80` lässt die gesamte Suite grün – die
  `windowMs`-Tests darüber laufen ausschließlich gegen ad-hoc erzeugte Limiter mit
  `windowMs: 1000`, nie gegen den Singleton. Damit ist ein mit dem Auftraggeber **gesetzter
  Spec-Parameter** (spec-182: „Fixed-Window 60 s") an keiner Stelle gegen Regression gepinnt,
  obwohl der Testkommentar das Gegenteil zusichert. Genau die Klasse, die in diesem Projekt
  schon dreifach codifiziert ist: „Existenz-Guard auf eine Pin-Konstante beweist nicht ihre
  Verdrahtung" (#258) und „‚verifiziert' im Kommentar ohne tatsächliche Prüfung" (#268).
  **Zwei Wege, einer genügt:**
  1. *(bevorzugt, löst zugleich den Runde-1-Nitpick zur Wanduhr)* Test auf `vi.useFakeTimers()` +
     `vi.setSystemTime(...)` umstellen und Fenster-Verhalten am Singleton assertieren: 60 erlaubt
     → 61. abgelehnt → `advanceTimersByTime(59_999)` weiter abgelehnt → `+1 ms` wieder erlaubt.
     Achtung beim Aufsetzen: `windowStart` des Singletons wird beim **Modul-Import** mit der
     echten Uhr gesetzt – die Systemzeit vor dem ersten `tryAcquire` bewusst weit nach vorn setzen,
     damit der erste Aufruf ein frisches Fenster öffnet.
  2. Falls das Fenster am Singleton bewusst ungetestet bleiben soll: den Kommentar auf das
     tatsächlich Geprüfte zurücknehmen („Schwellwert 60"), damit er nichts zusichert, was die
     Assertion nicht deckt.

## Nitpicks (optional)

- [ ] `lib/rate-limit.ts:16` – `/** Fensterlänge in Millisekunden (Produktion: 60_000). */` nennt
  weiterhin einen konkreten Wert in der **geteilten** Options-Schnittstelle. Aktuell korrekt (beide
  Limiter nutzen 60_000), aber es ist exakt die Drift-Klasse, die eine Zeile darüber gerade
  entschärft wurde (`limit`-JSDoc verweist jetzt auf die Singletons). Ein dritter Limiter mit
  anderer Fensterlänge macht die Zeile still falsch. Konsequente Symmetrie wäre derselbe Verweis
  („die produktiven Werte stehen an den Singletons unten") auch hier.

- [ ] `docs/adr/020-health-endpoint-rate-limit.md:77-81` – ADR-020 verwarf die Zähl-Dimension
  „per Quelle" u. a. mit dem Argument „Ein Map-Zustand pro Quelle wächst unbegrenzt (neue
  Amplifikations-/Memory-Fläche)". ADR-044 führt nun genau eine Schlüssel-Map im selben Modul ein.
  Ein echter Widerspruch ist das **nicht** (ADR-020 zielte auf die spoofbare IP-Dimension, der
  Token-Schlüsselraum ist gebunden – siehe *Positives*), und ADR-044 D2 behandelt das Wachstum
  inhaltlich; die explizite Abgrenzung zu ADR-020s Gegenargument fehlt aber. Ein Halbsatz in
  ADR-044 D2 („anders als die in ADR-020 verworfene IP-Dimension ist der Schlüsselraum hier nicht
  vom Angreifer wählbar") würde einem späteren Leser die Auflösung abnehmen.

- [ ] Der Runde-1-Nitpick „Singleton-Test läuft gegen die echte Wanduhr" bleibt formal bestehen,
  wird aber von Weg 1 des Wichtig-Findings vollständig miterledigt – kein eigener Aufwand nötig.

- [ ] Beobachtung zum Schwellwert (unverändert aus Runde 1, **keine Änderung gefordert** – der Wert
  ist laut spec-182 mit dem Auftraggeber gesetzt): 60 Anfragen/Minute gelten pro **Token**, nicht
  pro Person. Bei vielen gleichzeitig erfassenden Teilnehmern kann der Regelbetrieb das Fenster
  erreichen. Entschärfend: der Zähler ist pro Function-Instanz (effektiver Deckel ≈ 60 × M), die
  Abweichung geht also in die fail-open-Richtung; änderbar an genau einer Stelle
  (`lib/rate-limit.ts:78-81`).

## Positives

- **Alle drei Findings aus Runde 1 sind sauber behoben, nicht nur abgehakt:**
  - ADR-034 D7 trägt jetzt Vergangenheitsform + eigenen „Erledigt"-Absatz mit Verweis auf ADR-044,
    und die Trade-off-Zeile `:151` nennt das Rate-Limit nicht mehr als offenen Punkt (#211/#176).
    Der Nebenbefund (ADR-044 Kontext vs. D7-Adressat) ist mit angeglichen.
  - `lib/rate-limit.ts:14` nennt keinen konkreten Produktionswert mehr, sondern verweist auf die
    Singletons (#207).
  - Der Duplikat-Test ist entfernt, die `revalidatePath`-Assertion sitzt jetzt mit AK-1-Kommentar
    im bestehenden Test (`actions.test.ts:822-824`) – genau die von #240 geforderte Zusammenführung
    statt einer parallelen Schleife/Rumpf-Kopie.
- **ADR-044 1:1 umgesetzt:** `createKeyedRateLimiter` wiederverwendet `createRateLimiter` (eine
  Quelle für die Fenster-Arithmetik, D1), keine Eviction (D2), Guard als erste Zeile **vor**
  `getVeranstaltungByToken` (D3). ADR-Status korrekt auf `Accepted` (#197).
- **AK-5/FS-3 sind wirklich belegt, nicht behauptet:** `actions.test.ts:874-887` assertiert die
  Abwesenheit *jedes* awaited DB-Calls (`getVeranstaltungByToken`, `getZeile`, `getCatalogItem`,
  `adjustMenge`) plus `revalidatePath` und den exakten State `{ error: … }` – „kein Seiteneffekt"
  und „Throttle-Pfad ohne I/O" strukturell statt per Zeitmessung geprüft (richtige Entscheidung
  gegen einen flaky Laufzeit-Test).
- **AK-6 in beide Richtungen assertiert** (`actions.test.ts:797-808`): der F5-Pfad läuft bei
  `tryAcquire → false` durch **und** konsultiert den Limiter gar nicht erst (#211-Spiegelregel).
- **Testisolation ist tragfähig:** `beforeEach` ruft `vi.resetAllMocks()` und setzt danach
  `tryAcquireMock.mockReturnValue(true)` – dadurch sind die `toHaveBeenNthCalledWith(1, "tok-a")`-
  Assertionen (`:895`) reihenfolgeunabhängig, und der Mock des Moduls ist begründet dokumentiert
  (Singleton-State ⇒ sonst Testreihenfolge-Abhängigkeit, `testing-standards.md`).
- **Fail-open bleibt strukturell** (frischer Zähler bei unbekanntem Schlüssel) statt als `try/catch`
  um einen nicht fehlschlagenden synchronen Aufruf – kein toter Zweig, konform zu `clean-code.md`
  („Keine Fallbacks für vom Typsystem ausgeschlossene Fälle"). Der zugehörige Test
  (`should_allowFirstCall_when_keyUnknown`) prüft das Cold-Start-Verhalten, wie in ADR-044 begründet.
- **Beide Zweige von `createKeyedRateLimiter` sind abgedeckt** (Anlage bei unbekanntem Key,
  Wiederverwendung bei bekanntem) – kein ungetesteter Lazy-Init-Pfad.
- **Die YAGNI-Begründung aus D2 trägt tatsächlich:** der Token ist ein serverseitig gebundenes
  Action-Argument (`app/theke/[token]/page.tsx:31`, `.bind(null, token)`), die Seite antwortet bei
  unbekanntem Token mit `notFound()`. Der Map-Schlüsselraum bleibt damit auf real existierende
  Veranstaltungs-Token beschränkt – der Guard sitzt zwar vor der Token-Auflösung, eröffnet aber
  keine Fläche, die Map mit beliebigen Fremdschlüsseln aufzublähen. (Geprüft, weil ADR-044 D3
  Option A diese Frage nur unter „Enumeration", nicht unter „Speicherwachstum" abwägt.)
- **Keine Routen-Änderung** → `docs/routes.md` korrekt unberührt (#145 greift nicht: weder
  `page.tsx`/`route.ts` hinzugefügt/entfernt noch Pfad oder Zugriff geändert).
- **Kein Schicht-Verstoß:** Fenster-Arithmetik in `lib/`, Guard in der Server Action, UI unverändert
  (der Drosselungstext läuft über das bestehende `VerzehrActionState.error`-Feld) – die
  Selbstbedienungs-Route und `applyVerzehrAdjust` bleiben unangetastet, wie in der Spec gefordert.

## Empfehlung

NEEDS_REWORK

Keine kritischen Findings – Funktionalität, Architektur-Treue und Fehlerbehandlung sind korrekt,
und die Runde-1-Findings sind belastbar erledigt. Das eine verbleibende Wichtig-Finding ist eine
Test-Lücke mit Zusicherungs-Widerspruch (Kommentar behauptet einen Parameter-Nachweis, den die
Assertion nicht führt) an einem vom Auftraggeber gesetzten Spec-Parameter – Umfang ≤ 15 Zeilen in
einer Testdatei, kein Produktionscode. Beide Nitpicks sind optional.
