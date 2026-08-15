# Task 182: rate-limit-selbstbedienungs-action

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [ ] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Rate-Limit/Missbrauchsbremse für `adjustVerzehrByTokenAction` (öffentliche, unauthentifizierte
Schreib-Grenze, F7/ADR-034 D3). Delegiert aus ADR-034 D7. Details, Kontext und Begründung:
[spec-182](../docs/specs/spec-182-rate-limit-selbstbedienung.md).

Gesetzte Parameter (mit Auftraggeber abgestimmt): Zähl-Dimension pro Token, Fixed-Window 60 s,
Schwellwert 60 Anfragen/Fenster, fail-open bei Limiter-Störung, Fehlertext
"Zu viele Anfragen – bitte kurz warten." bei Drosselung.

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [x] AK-1 (Normalfall unverändert): GIVEN Aufrufrate unter Schwellwert WHEN `adjustVerzehrByTokenAction` mit gültigem Token/offener Veranstaltung/existierender Zeile/aktivem Katalogartikel aufgerufen wird THEN läuft `applyVerzehrAdjust` unverändert durch.
- [x] AK-2 (Deckelung pro Token): GIVEN 61 Aufrufe mit demselben Token in 60 s WHEN der 61. Aufruf im Fenster erfolgt THEN wird er ohne DB-Zugriff abgelehnt (`"Zu viele Anfragen – bitte kurz warten."`).
- [x] AK-3 (Isolation zwischen Veranstaltungen): GIVEN Token A ist ausgeschöpft WHEN Token B (andere Veranstaltung) im selben Zeitraum aufgerufen wird THEN wird B nicht gedrosselt.
- [x] AK-4 (Fenster-Reset): GIVEN Token A war gedrosselt WHEN nach Ablauf des 60-s-Fensters ein neuer Aufruf mit Token A erfolgt THEN wird er wieder normal verarbeitet.
- [x] AK-5 (Kein Seiteneffekt bei Drosselung): GIVEN ein Aufruf wird gedrosselt THEN kein `adjustMenge`-Aufruf, kein `revalidatePath`, State ohne `ok`/`menge`.
- [x] AK-6 (Andere Actions unberührt): GIVEN das Rate-Limit ist aktiv WHEN `adjustVerzehrAction` (F5, authentifiziert) beliebig oft aufgerufen wird THEN wird sie nicht gedrosselt.
- [x] FS-1 (Fail-open): GIVEN die Limiter-Auswertung schlägt unerwartet fehl THEN wird die Anfrage durchgelassen (normale Verarbeitung).
- [x] FS-2 (Kein Cross-Token-Lockout): GIVEN ein Token wird geflutet THEN bleiben andere Veranstaltungen/Token unbeeinflusst.
- [x] FS-3 (Throttle billiger): GIVEN eine Anfrage wird gedrosselt THEN ist die Antwortzeit nicht langsamer als der reguläre Pfad (reine In-Memory-Prüfung).

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
Architektur-Entscheidung: [ADR-044](../docs/adr/044-rate-limit-selbstbedienungs-action.md).

**Betroffene Dateien:**
- `lib/rate-limit.ts` – neue Fabrikfunktion `createKeyedRateLimiter(options: RateLimiterOptions): KeyedRateLimiter`
  (interner `Map<string, RateLimiter>`, lazy angelegt, nutzt intern `createRateLimiter`) +
  neues Interface `KeyedRateLimiter { tryAcquire(key: string): boolean }` + Singleton-Export
  `selfServiceVerzehrRateLimiter = createKeyedRateLimiter({ limit: 60, windowMs: 60_000 })`.
- `lib/rate-limit.test.ts` – neue `describe("createKeyedRateLimiter", ...)`-Sektion.
- `app/veranstaltung/actions.ts` – neue Konstante `TOO_MANY_REQUESTS = "Zu viele Anfragen – bitte kurz warten."`
  neben `NOT_FOUND`/`NOT_OFFEN`/`ZEILE_NOT_FOUND`/`ITEM_NOT_FOUND`; Guard als **erste Zeile** in
  `adjustVerzehrByTokenAction`, **vor** `getVeranstaltungByToken(token)` (Schlüssel = roher
  Token-String, spart DB-Read bei Drosselung).
- `app/veranstaltung/actions.test.ts` (bzw. bestehende Testdatei zu `adjustVerzehrByTokenAction`) –
  Tests je AK/FS unten.

**TDD-Reihenfolge (Red → Green → Refactor):**
1. `lib/rate-limit.test.ts`: `createKeyedRateLimiter` – getrennte Fenster pro Key, Reset nach
   Fensterablauf, gemeinsam injizierte `now` (spiegelt AK-2/AK-3/AK-4 auf Modul-Ebene).
2. `app/veranstaltung/actions.test.ts`: `adjustVerzehrByTokenAction` mit gemocktem
   `selfServiceVerzehrRateLimiter`/`getVeranstaltungByToken` – AK-1, AK-2, AK-5 (kein
   `adjustMenge`/`revalidatePath` bei Drosselung), FS-1 (erster Aufruf mit neuem Token = Cold-Start
   = nicht gedrosselt), FS-2 (zwei verschiedene Token unabhängig), FS-3 lässt sich als
   „kein zusätzlicher awaited DB-Call vor dem Drosseln" prüfen (Spy-Reihenfolge/Aufrufzahl).
3. AK-6 (bestehender Test zu `adjustVerzehrAction`/F5 bleibt unverändert grün – kein neuer Test
   nötig, nur sicherstellen, dass F5 den neuen Rate-Limiter nicht importiert).

**Wichtig:** Fail-open (FS-1) ist strukturell (frischer Zähler bei erstem Zugriff), **kein**
`try/catch`-Fallback um `tryAcquire` – siehe ADR-044 „Fail-open ist strukturell, nicht defensiv
nachgerüstet" (kein toter Coverage-Zweig, `clean-code.md`).

### Umsetzungs-Notizen (/implement, 2026-08-15)

- **Umgesetzt wie in ADR-044 beschrieben** – keine Abweichung: `createKeyedRateLimiter` +
  `KeyedRateLimiter` + Singleton in `lib/rate-limit.ts`, `TOO_MANY_REQUESTS`-Konstante und Guard
  als erste Zeile von `adjustVerzehrByTokenAction` (vor `getVeranstaltungByToken`).
- **Modul-Header von `lib/rate-limit.ts` mitgepflegt:** er benannte bislang ausschließlich den
  `/api/health`-Zweck; das Modul bedient jetzt zwei Ausprägungen (Codify #207: aufzählenden
  Modul-Header beim Hinzufügen einer Einheit mitziehen).
- **Testverteilung (AK → Ort):** Die Fenster-Arithmetik (AK-2 Deckelung, AK-3/FS-2 Isolation,
  AK-4 Reset, FS-1 Cold-Start) wird in `lib/rate-limit.test.ts` mit injizierter Uhr geprüft –
  deterministisch, ohne Testreihenfolge-Abhängigkeit. Zusätzlich belegt dort
  `describe("selfServiceVerzehrRateLimiter")` die **produktiv verdrahteten Parameter** am echten
  Singleton – seit Review-Runde 2 beide (Schwellwert 60 **und** Fenster 60 s, mit Fake-Timern);
  ohne diesen Test wären die Spec-Parameter nur behauptet, weil die Action-Tests den Limiter mocken.
- **Action-Ebene (`app/veranstaltung/actions.test.ts`):** `@/lib/rate-limit` ist gemockt, weil der
  Singleton modul-lokaler State ist – ein echter Limiter würde den Zähler des Tokens `"tok"` über
  alle Tests der Datei hinweg teilen (Testreihenfolge-Abhängigkeit, `testing-standards.md`).
  Geprüft werden dort Wiring + Wirkung: AK-1 (Normalfall inkl. `revalidatePath`), AK-2/AK-5/FS-3
  (gedrosselt ⇒ **kein** `getVeranstaltungByToken`/`getZeile`/`getCatalogItem`/`adjustMenge`/
  `revalidatePath`, State ist exakt `{ error: … }`), AK-3/FS-2 (Schlüssel ist der rohe Token je
  Aufruf), AK-6 (F5-Pfad läuft auch bei `tryAcquire → false` durch **und** fragt den Limiter gar
  nicht erst – beide Richtungen assertiert, Codify #211).
- **FS-3** ist als „kein DB-Call vor dem Drosseln" assertiert (Abwesenheit der `await`-Calls), nicht
  als Zeitmessung – eine Laufzeit-Assertion wäre flaky (`testing-standards.md`, Zero Tolerance).
- **Keine Routen-Änderung** → `docs/routes.md` unberührt (weder Pfad noch Zugriff geändert).
- **UI:** kein UI-Code geändert; der Drosselungstext läuft über das bestehende
  `VerzehrActionState.error`-Feld, das `app/_verzehr/MengeControl.tsx:59` bereits rendert.
  Eine E2E-Spec für die Drosselung wurde bewusst **nicht** angelegt: sie müsste 61 echte Requests
  gegen den Dev-Server absetzen (langsam, fenster-/instanzabhängig ⇒ flaky-anfällig) und ist von
  der Spec nicht gefordert.
- **Gates lokal grün:** `pnpm lint`, `pnpm test` (689 passed / 59 skipped), `pnpm format:check`.
  Diff-Coverage: `lib/rate-limit.ts` 100 % Statements/Branches/Functions; die beiden neuen Zweige
  in `actions.ts` (erlaubt/gedrosselt) sind beide abgedeckt.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
_Keine offenen Architektur-Fragen mehr – siehe ADR-044._

## Review-Findings

### Runde 1 (/review → NEEDS_REWORK, keine kritischen Findings) – behoben in /implement 2026-08-15

- [x] **W1 · ADR-034 D7-Drift** (`docs/adr/034-…:88-92`, `:146`): D7 beschrieb die Missbrauchsbremse
  weiter im Präsens als offenen, an `/security-review` delegierten Punkt – genau das liefert dieser
  PR (Codify #211/#176). D7 auf „nachgeliefert in #182" umgestellt (inkl. Erledigt-Absatz mit
  Verweis auf ADR-044), Trade-off-Zeile entschärft. Nebenbefund gleicher Ursache mitgezogen:
  ADR-044 Kontext nannte D7 als Delegation „an einen eigenen Task (#182)", während D7 selbst
  `/security-review` adressiert – Formulierung angeglichen (Delegation an die nachgelagerte
  Härtung, umgesetzt als Task #182).
- [x] **W2 · JSDoc `RateLimiterOptions.limit`** (`lib/rate-limit.ts:14`): „(Produktion: 30)" war seit
  dem zweiten Limiter (60) falsch – dieselbe Drift-Klasse, die der Modul-Header eine Ebene höher
  bereits berücksichtigt (Codify #207). Konkreter Wert aus dem Interface entfernt, stattdessen
  Verweis auf die Singleton-Definitionen (dort steht der jeweils gültige Wert ohnehin).
  `windowMs` bleibt unverändert – 60_000 gilt für beide Limiter.
- [x] **W3 · Duplizierter Testrumpf** (`app/veranstaltung/actions.test.ts`): der neue AK-1-Test
  `should_processNormallyAndRevalidate_when_underRateLimit` war ein Rumpf-Duplikat von
  `should_adjustAndReturnAuthoritativeMenge_when_tokenValidAndOpen`; einziger Mehrwert war die
  `revalidatePath`-Assertion. Diese in den bestehenden Test gezogen (mit AK-1-Kommentar), das
  Duplikat entfernt (Codify #240).
- [x] **Nitpick übernommen:** Test `should_countPerToken_when_differentTokensUsed` →
  `should_passRawTokenAsRateLimitKey_when_differentTokensUsed` – der Name benennt jetzt das
  tatsächlich Geprüfte (übergebener Schlüssel); die Fenster-Isolation belegt `lib/rate-limit.test.ts`.
- Nitpick „Wanduhr-Test am Singleton" und „Beobachtung zum Schwellwert 60/Token" bewusst **ohne
  Änderung**: ersteres ist im Test begründet und praktisch risikofrei, letzteres ist ein mit dem
  Auftraggeber gesetzter Spec-Parameter (spec-182) und an einer Stelle änderbar.

**Gates nach Rework:** `pnpm lint`, `pnpm format:check`, `pnpm test` (688 passed / 59 skipped –
einer weniger als zuvor, weil W3 den Duplikat-Test entfernt hat).

### Runde 2 (/review → NEEDS_REWORK, keine kritischen Findings) – behoben in /implement 2026-08-15

- [x] **W1 · Singleton-Test pinnte `windowMs` nicht** (`lib/rate-limit.test.ts:109-121`): Der
  Kommentar sicherte „die produktiv verdrahteten Parameter (60/60 s)" zu, assertiert wurden aber
  nur 60×`true` + 1×`false` in schneller Folge – gegenüber der Fensterlänge blind (die
  `windowMs`-Tests darüber laufen gegen Ad-hoc-Limiter mit `windowMs: 1000`). Damit war ein mit
  dem Auftraggeber gesetzter Spec-Parameter nirgends gegen Regression gepinnt (Codify #258:
  Existenz-Guard ≠ Verdrahtungs-Nachweis; #268: Zusicherung ohne tatsächliche Prüfung).
  Weg 1 des Reviews umgesetzt: Test auf `vi.useFakeTimers()` umgestellt und um den Fenster-Verlauf
  erweitert (60 erlaubt → 61. abgelehnt → nach 59_999 ms weiter abgelehnt → nach +1 ms wieder
  erlaubt), `afterEach` gibt die echte Uhr zurück. Damit erledigt sich der Runde-1-Nitpick
  „Wanduhr-Test" mit – die dortige Einschätzung „bewusst ohne Änderung" ist überholt.
  **Mutationsbeleg** (Codify #286 – derselbe Assert-Ausdruck, nicht nur derselbe Befehl):
  `windowMs: 600_000` ⇒ rot in Zeile 134 („expected false to be true", Fenster läuft nicht ab);
  `windowMs: 6_000` ⇒ rot in Zeile 131 („expected true to be false", Fenster läuft zu früh ab).
  Beide Richtungen belegt, danach auf 60_000 zurückgesetzt.
  Der Review-Hinweis, die Systemzeit vor dem ersten `tryAcquire` vorzustellen, war **nicht** nötig
  und wurde bewusst nicht umgesetzt: `createKeyedRateLimiter` ruft `now()` nicht beim Modul-Import
  auf – der innere Zähler entsteht lazy beim ersten `tryAcquire` des Schlüssels, der Fensterstart
  stammt also bereits aus der eingefrorenen Fake-Zeit (im Test als WHY vermerkt).
- [x] **Nitpick 1 · JSDoc `RateLimiterOptions.windowMs`** (`lib/rate-limit.ts:16`): „(Produktion:
  60_000)" nannte weiter einen konkreten Wert in der geteilten Options-Schnittstelle – dieselbe
  Drift-Klasse, die in Runde 1 eine Zeile darüber für `limit` entschärft wurde. Symmetrisch auf den
  Verweis „die produktiven Werte stehen an den Singletons unten" umgestellt.
- [x] **Nitpick 2 · Abgrenzung zu ADR-020** (`docs/adr/044-…` D2): ADR-020 verwarf „per Quelle"
  u. a. wegen unbegrenzten Map-Wachstums – ADR-044 führt genau eine Schlüssel-Map ein. Absatz
  ergänzt, der den tragenden Unterschied benennt: bei der spoofbaren IP hätte jeder gefälschte
  Header ein frisches Budget **für denselben Angriff** gegeben (Schutz läuft leer), beim Token
  schützt ein neuer Schlüssel nur ein anderes Token. Übrig bleibt die Speicher-Fläche, die D3
  Option A „Con" bereits benennt und die hier akzeptiert ist – bewusst nicht stärker formuliert
  („Schlüsselraum an existierende Veranstaltungen gebunden" wäre falsch, da der Guard vor der
  Token-Auflösung sitzt).
- Nitpick 3 (Wanduhr) ist durch W1 miterledigt. Nitpick 4 (Beobachtung zum Schwellwert 60/Token)
  bleibt **ohne Änderung** – laut Review ausdrücklich nicht gefordert, der Wert ist in spec-182
  mit dem Auftraggeber gesetzt und an einer Stelle änderbar.

**Gates nach Rework Runde 2:** `pnpm lint`, `pnpm format:check`, `pnpm test`
(688 passed / 59 skipped – unverändert, da W1 den bestehenden Test erweitert statt einen neuen
anzulegen).

### Runde 3 (/review → APPROVED, keine kritischen/wichtigen Findings)

Siehe [`tasks/review-182.md`](review-182.md). Fünf optionale Nitpicks, keiner blockierend.

## Test-Notizen (/test, 2026-08-15)

- **Coverage-Analyse:** `lib/rate-limit.ts` 100 % Statements/Branches/Functions/Lines (isoliert
  gemessen, `pnpm vitest run lib/rate-limit.test.ts --coverage`). `app/veranstaltung/actions.ts`
  99,6 % Stmts / 98,9 % Branches – die beiden einzigen ungedeckten Zeilen (119, 331) liegen in
  `createWalkInAction` bzw. einer anderen, von diesem PR nicht berührten Funktion (verifiziert
  gegen `git diff origin/main...HEAD -- app/veranstaltung/actions.ts`: der Diff fügt nur Import,
  `TOO_MANY_REQUESTS`-Konstante, Kommentar und den Guard hinzu – alle vier Zeilen sind covered).
  Beide neuen Branches in `adjustVerzehrByTokenAction` (Guard greift / Guard lässt durch) sind
  über `actions.test.ts` abgedeckt. Weit über der 80-%-Projektschwelle.
- **AK/FS-Vollständigkeit gegen spec-182 geprüft:** AK-1…AK-6 und FS-1…FS-3 haben je einen
  eigenen, benannten Testfall bzw. sind Teil des Fenster-Verlaufstests am Singleton (siehe
  Umsetzungs- und Review-Notizen oben) – keine Lücke gefunden.
- **Ein Cleanup übernommen (Review-Runde-3-Nitpick, nicht blockierend, aber reiner
  Test-Scope):** `lib/rate-limit.test.ts:55-61` (`should_throttleKey_when_limitExceededWithinWindow`)
  war ein vollständiges Präfix-Duplikat von `should_countKeysIndependently_when_oneKeyExhausted`
  (identische Optionen, identischer Schlüssel `"a"`, identische ersten drei Assertions) – ersatzlos
  entfernt (Codify #240: keine parallele Struktur mit identischem Rumpf).
- **Übrige vier Nitpicks aus Runde 3 bewusst unverändert gelassen** – Doku-Vollständigkeit
  (Spec-Offene-Fragen-Checkboxen, ADR-020-Runtime-Voraussetzung) und die unveränderte,
  Auftraggeber-gesetzte Schwellwert-Beobachtung liegen außerhalb des Test-Scopes dieses Schritts.
- **Gates nach /test:** `pnpm lint`, `pnpm format:check`, `pnpm test` (687 passed / 59 skipped –
  einer weniger als nach Runde 2, weil das Duplikat entfernt wurde; keine anderen Zählungen
  geändert).

## Refactor-Notizen (/refactor, 2026-08-15)

- **Keine Code-Änderung nötig.** Checkliste (Naming, Funktionsgröße, Parameter, Duplikation,
  Magic Numbers, Verschachtelung, Kommentare) gegen `git diff origin/main...HEAD` geprüft: der
  Guard in `adjustVerzehrByTokenAction` ist eine einzeilige Guard-Clause vor dem bestehenden
  Code, `TOO_MANY_REQUESTS` ist eine benannte Konstante neben den Geschwister-Konstanten,
  `createKeyedRateLimiter`/`KeyedRateLimiter` in `lib/rate-limit.ts` sind klein und machen genau
  eine Sache. Die drei Review-Runden und der `/test`-Schritt hatten den Diff bereits auf diesen
  Stand gebracht (u. a. das einzige verbleibende Test-Duplikat aus Review-Runde 3 wurde schon in
  `/test` entfernt).
- **Verbleibende vier Nitpicks aus Review-Runde 3 bewusst unverändert:** zwei sind reine
  Test-Redundanz ohne Risiko (explizit "keine Änderung gefordert"), zwei sind Doku-Vollständigkeit
  (Spec-Offene-Fragen-Checkboxen, ADR-020-Runtime-Voraussetzung in ADR-044) – beides außerhalb
  des Verhaltens-neutralen Scopes von `/refactor` und nicht blockierend laut Review.
- **Gates:** `pnpm lint`, `pnpm format:check`, `pnpm test` (687 passed / 59 skipped) –
  unverändert gegenüber `/test`, da keine Datei angefasst wurde.

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/182-rate-limit-selbstbedienungs-action`
Erstellt: 2026-08-15 08:04
