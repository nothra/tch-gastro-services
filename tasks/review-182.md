# Review: Task 182

> **Runde 3** (nach dem Rework-Commit `e70d011`). Ersetzt den Report der Runde 2 – das dortige
> Wichtig-Finding und beide umsetzbaren Nitpicks sind verifiziert behoben (Nachweis unter
> *Positives*, inkl. eigener Mutationsprobe).
> **Circuit Breaker: 3. und letzte Review-Iteration von max. 3.**

Reviewt: `git diff origin/main...HEAD` (9 Dateien, +847/−12) gegen
[spec-182](../docs/specs/spec-182-rate-limit-selbstbedienung.md),
[ADR-044](../docs/adr/044-rate-limit-selbstbedienungs-action.md) und
[ADR-020](../docs/adr/020-health-endpoint-rate-limit.md).
Verifikation: `pnpm vitest run lib/rate-limit.test.ts app/veranstaltung/actions.test.ts
app/api/health/route.test.ts` → 3 Dateien / **114 Tests grün**.

## Kritische Findings (müssen behoben werden)

_Keine._ Alle Akzeptanzkriterien (AK-1…AK-6) und Fehlerszenarien (FS-1…FS-3) sind umgesetzt und
belegt; die Implementierung folgt ADR-044 D1/D2/D3 wörtlich, ohne Abweichung und ohne Gold-Plating.

## Wichtige Findings (sollten behoben werden)

_Keine._ Das einzige Wichtig-Finding der Runde 2 (Singleton-Test pinnte `windowMs` nicht) ist
behoben und **von diesem Review unabhängig nachgemessen**, nicht nur aus der Task-Notiz übernommen –
siehe *Positives*, erster Punkt.

## Nitpicks (optional)

- [ ] `lib/rate-limit.test.ts:55-61` – `should_throttleKey_when_limitExceededWithinWindow` wird von
  `should_countKeysIndependently_when_oneKeyExhausted` (`:63-74`) **vollständig subsumiert**:
  identische Optionen (`limit: 2, windowMs: 1000, now: () => 0`), identischer Schlüssel `"a"`,
  identische Aufrufsequenz; die dritte Assertion ist zeichengleich. Kein Risiko, aber genau die
  Klasse „parallele Struktur mit identischem Rumpf", die in #240 codifiziert wurde – dort war die
  Regel „vor dem Anlegen einer zweiten Schleife/Rumpf-Kopie gegen die vorhandene abgleichen".
  Zusammenführen (die zwei zusätzlichen `true`-Assertions in den Isolationstest ziehen) oder
  ersatzlos entfernen.

- [ ] `lib/rate-limit.test.ts:101-106` – `should_useDefaultClock_when_nowNotInjected` überlappt seit
  Runde 2 mit `describe("selfServiceVerzehrRateLimiter")` (`:109-136`), das denselben Default-Uhr-Pfad
  am echten Singleton **plus** das Fensterverhalten prüft. Als expliziter Kontrakt-Test des
  `?? (() => Date.now())`-Fallbacks weiterhin vertretbar – nur der Vollständigkeit halber notiert,
  keine Änderung gefordert.

- [ ] `docs/specs/spec-182-rate-limit-selbstbedienung.md:113-125` – der Abschnitt „Offene Fragen"
  führt alle drei Fragen unverändert als offene Checkboxen, obwohl ADR-044 D1/D2 sie beantwortet und
  die Task-Datei „Keine offenen Architektur-Fragen mehr" vermerkt. Selbst-Drift einer im selben PR
  entstandenen Spec (#253). Präzedenz ist allerdings uneinheitlich: `spec-54` löst das mit einem
  „Durch ADR-034 entschieden"-Block samt Durchstreichung, der unmittelbare Vorgänger `spec-67`
  (dasselbe Modul) ließ die Fragen offen stehen. Daher optional, nicht blockierend.

- [ ] `docs/adr/044-…:201-207` – ADR-020 nennt unter *Consequences* explizit die Laufzeit-Voraussetzung
  des In-Memory-Ansatzes („setzt voraus, dass die Route auf der **Node**-Serverless-Runtime läuft,
  nicht Edge"). ADR-044 übernimmt die Instanz-Trade-offs, nicht aber diese Voraussetzung – sie gilt
  hier genauso (ein `export const runtime = "edge"` auf `app/theke/[token]` würde die
  Modul-State-Semantik ändern). Heute erfüllt (die Route deklariert keine Runtime → Node); ein
  Halbsatz unter „Negativ / Trade-offs" würde es für spätere Leser festhalten.

- [ ] Beobachtung zum Schwellwert (unverändert aus Runde 1/2, **keine Änderung gefordert** – der Wert
  ist laut spec-182 mit dem Auftraggeber gesetzt): 60 Anfragen/Minute gelten pro **Token**, nicht pro
  Person. Entschärfend: der Zähler ist pro Function-Instanz (effektiver Deckel ≈ 60 × M), die
  Abweichung geht also in die fail-open-Richtung; änderbar an genau einer Stelle
  (`lib/rate-limit.ts:78-81`).

## Positives

- **Das Runde-2-Wichtig-Finding ist echt behoben – nachgemessen, nicht geglaubt.** Der Singleton-Test
  (`lib/rate-limit.test.ts:109-136`) pinnt jetzt **beide** Spec-Parameter. Eigene Mutationsprobe
  dieses Reviews an `lib/rate-limit.ts:78-81` (jeweils danach zurückgesetzt, Arbeitsbaum sauber):
  | Mutation | Ergebnis |
  |---|---|
  | `windowMs: 600_000` | rot in `:134` – „expected false to be true" (Fenster läuft nicht ab) |
  | `windowMs: 6_000` | rot in `:131` – „expected true to be false" (Fenster läuft zu früh ab) |
  | `limit: 61` | rot – „expected true to be false" (Schwellwert verschoben) |
  Beide Fenster-Richtungen **und** der Schwellwert sind damit gegen Regression gedeckelt; die
  Zusicherung im Testkommentar deckt sich mit dem, was die Assertionen tatsächlich führen (#258/#268
  sauber aufgelöst). Die Begründung, warum ein Vorstellen der Systemzeit *nicht* nötig ist (lazy
  angelegter Zähler ⇒ Fensterstart stammt aus der eingefrorenen Fake-Zeit), ist im Test als WHY
  vermerkt und trifft zu.
- **Auch die beiden umsetzbaren Runde-2-Nitpicks sind belastbar erledigt:** `lib/rate-limit.ts:16`
  verweist jetzt symmetrisch zu `:14` auf die Singletons statt einen Produktionswert zu nennen; die
  ADR-044-D2-Abgrenzung zu ADR-020 (`:75-83`) benennt den **tragenden** Unterschied (spoofbare IP =
  frisches Budget für denselben Angriff vs. Token = Budget nur für ein anderes Token) und
  überzeichnet nicht – die verbleibende Speicher-Fläche wird ausdrücklich als akzeptiert stehen
  gelassen statt wegdefiniert.
- **ADR-044 1:1 umgesetzt:** `createKeyedRateLimiter` wiederverwendet `createRateLimiter` (eine
  Quelle für die Fenster-Arithmetik, D1), keine Eviction (D2), Guard als erste Zeile **vor**
  `getVeranstaltungByToken` (`actions.ts:315`, D3). ADR-Status korrekt `Accepted` (#197).
- **AK-5/FS-3 sind strukturell belegt, nicht behauptet:** `actions.test.ts:874-887` assertiert die
  Abwesenheit *jedes* awaited DB-Calls (`getVeranstaltungByToken`, `getZeile`, `getCatalogItem`,
  `adjustMenge`) plus `revalidatePath` und den exakten State – richtige Entscheidung gegen einen
  flaky Laufzeit-Test.
- **AK-6 in beide Richtungen assertiert** (`actions.test.ts:797-808`): der F5-Pfad läuft bei
  `tryAcquire → false` durch **und** konsultiert den Limiter gar nicht erst (#211-Spiegelregel).
- **Erwartete Werte sind Literale, keine Rückgriffe auf die Produktionskonstante:** der Drosselungstext
  steht im Test ausgeschrieben (`:880`) statt `TOO_MANY_REQUESTS` zu importieren – konform zu
  `testing-standards.md` („der erwartete Wert ist ein Literal"), damit fängt der Test auch eine
  unbeabsichtigte Textänderung.
- **Fail-open bleibt strukturell** (frischer Zähler bei unbekanntem Schlüssel) statt als `try/catch`
  um einen nicht fehlschlagenden synchronen Aufruf – kein toter Zweig, konform zu `clean-code.md`.
- **Testisolation trägt:** `beforeEach` (`actions.test.ts:196`) ruft `vi.resetAllMocks()` und setzt
  danach `tryAcquireMock.mockReturnValue(true)`; die `toHaveBeenNthCalledWith`-Assertionen in
  `:889-897` sind dadurch reihenfolgeunabhängig. Der Modul-Mock ist begründet dokumentiert
  (Singleton-State ⇒ sonst Testreihenfolge-Abhängigkeit) und kollidiert nicht mit
  `app/api/health/route.test.ts`, das denselben Modulpfad für `healthRateLimiter` mockt.
- **Keine Doku-Drift außerhalb der Nitpicks:** ADR-034 D7 trägt Vergangenheitsform + „Erledigt"-Absatz
  mit Verweis auf ADR-044 (#211/#176); ADR-020 bleibt zu Recht unberührt (seine Aussagen zu
  `lib/rate-limit.ts` sind weiterhin zutreffend, sein Map-Gegenargument war route-/IP-spezifisch);
  `lessons/code-style.md:9-19` erwähnt `lib/rate-limit.ts` nur in einem historischen Vorfall-Narrativ
  (#67), das dieser PR nicht entwertet.
- **Keine Routen-Änderung** → `docs/routes.md` korrekt unberührt (#145 greift nicht: weder
  `page.tsx`/`route.ts` hinzugefügt/entfernt noch Pfad oder Zugriff geändert).
- **Kein Schicht-Verstoß, UI korrekt ohne Änderung:** Fenster-Arithmetik in `lib/`, Guard in der
  Server Action, `applyVerzehrAdjust` und die Selbstbedienungs-Route unangetastet. Der
  Drosselungstext erscheint über das bestehende `state.error`-Rendering in
  `app/_verzehr/MengeControl.tsx:59`; da `MengeControl` die server-autoritative `menge`-Prop anzeigt
  und **nicht** optimistisch aktualisiert, hinterlässt eine gedrosselte Anfrage keine UI-Drift
  (nachgeprüft, weil das der einzige Pfad wäre, auf dem die Drosselung sichtbar falsche Daten
  erzeugen könnte).

## Empfehlung

APPROVED

Keine kritischen und keine wichtigen Findings. Das Wichtig-Finding der Runde 2 ist durch eine eigene
Mutationsprobe dieses Reviews als wirksam bestätigt (beide Fenster-Richtungen + Schwellwert machen
rot), die beiden umsetzbaren Nitpicks sind sauber übernommen. Was bleibt, sind fünf optionale
Nitpicks – zwei davon reine Test-Redundanz ohne Risiko, zwei Doku-Vollständigkeit, einer eine
unveränderte, vom Auftraggeber gesetzte Beobachtung. Nichts davon rechtfertigt eine vierte Iteration;
der Circuit Breaker (3 von 3) wird damit nicht überschritten. Weiter zu `/test`.
