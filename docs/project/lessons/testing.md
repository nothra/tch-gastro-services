# Lessons: Testing & Coverage (Projekt)

> Ausgelagerte `/codify`-Learnings (Volltext) – projektspezifische Learnings (TCH Gastro Services) zu **Testing & Coverage**.
> **Nicht** `@import`-geladen (ADR-037) – bei Bedarf gezielt lesen. Kanonische Quelle je
> Regel ist der jeweilige Eintrag hier; im @import-Pfad (`PROJECT-CONTEXT.md`) steht nur eine Index-Zeile.
> Neue Learnings kommen in die Lesson-Datei **ihrer Seite** (Zuordnungsregel: betrifft das Learning eine
> Datei der Factory laut `docs/factory/OWNERSHIP.md` → `docs/factory/lessons/`, sonst → `docs/project/lessons/`;
> siehe `/codify` + ADR-037).
> Factory-Anteil dieses Themas: [`docs/factory/lessons/testing.md`](../../factory/lessons/testing.md).

### Vitest + Testing Library ohne `globals: true` (aus #48)

Ohne `globals: true` registriert Testing Library **kein** Auto-Cleanup → das DOM leakt zwischen
Component-Tests (ein Test sieht das Markup des vorigen; `screen`-Queries schlagen scheinbar grundlos fehl).

**Regel:** In `vitest.setup.ts` `afterEach(() => cleanup())` behalten – nicht entfernen. Async
Server Components in Tests via `render(await Component())` prüfen.

**Ergänzung `vi.clearAllMocks()` vs. `vi.resetAllMocks()` (aus #51):** `clearAllMocks()` löscht
nur Call-History, **nicht** Mock-Implementierungen (`mockReturnValue`/`mockRejectedValue`). Ein
`mockRejectedValue` aus einem `describe`-Block kann dadurch in den nächsten leaken → Reihenfolge-
Abhängigkeit zwischen Test-Blöcken (Verstoß gegen Test-Isolation).

**Regel:** In `beforeEach` immer `vi.resetAllMocks()` verwenden – nicht `vi.clearAllMocks()` –
wenn Test-Blöcke eigene Mock-Implementierungen setzen. `clearAllMocks()` genügt nur, wenn
keine Mock-Implementierungen gesetzt werden (nur `vi.fn()` ohne `.mockReturnValue`/`.mockRejectedValue`).

### Guard-Clause-Branches in Server Actions brauchen dedizierte Tests (aus #51, Review-Finding)

Die `!id || !veranstaltungId`-Guards an der Spitze mehrerer Server Actions hatten keine Tests.
Laut `testing-standards.md` erwartet neuer Code 100 % Coverage – aber der Reflex ist, nur
Happy-Path + bekannte Error-Paths (z. B. `23505`) zu testen, nicht die Eingabe-Guards.

**Smell:** „Wenn ich diesen Guard entferne, schlägt kein Test fehl" – dann fehlt der Test.

**Regel:** Jeder Guard-Clause-Branch an der Action-Grenze (Leerfeldprüfungen, null-Guards auf
Pflicht-IDs) erhält einen eigenen Testfall, der genau diesen Branch auslöst. Beispiel:
```ts
it("should_returnError_when_veranstaltungIdMissing", async () => {
  const formData = new FormData(); // veranstaltungId fehlt
  const result = await addZeileAction(undefined, formData);
  expect(result?.error).toBeDefined();
});
```

### Zod-Fehlermeldung: Ablehnungs-Test ≠ Meldungs-Test (aus #116, Review-Runde-1-Finding)

`should_rejectCategory_when_notInEnum` (`result.success === false`) und
`should_nameAllThreeCategories_when_categoryInvalid` (`firstIssueMessage === Literal`)
sind **zwei separate Tests**. Ein Ablehnungs-Test belegt nicht, dass die Meldung den richtigen
Inhalt hat – eine generische Meldung wie „Ungültige Kategorie." würde genauso durchkommen.
Aufgefallen erst in Review-Runde 1 (nicht in `/implement`): der Reflex ist, die Ablehnung zu
testen und den Meldungstext als „mitgetestet" anzunehmen.

**Smell:** „Ersetze ich die custom message im Schema durch eine generische Meldung – schlägt
ein Test fehl?" Wenn nein, ist der Meldungsinhalt ungetestet.

**Regel:** Wenn das AC den **Inhalt** der Zod-Fehlermeldung vorschreibt (z. B. „nennt alle drei
Kategorien"), ist das ein separierbar-testbares Kriterium und braucht einen eigenen `it`-Block
mit `firstIssueMessage(result.error)` gegen ein unabhängiges Literal:
```ts
// Assertion 1 – Ablehnungs-Verhalten:
it("should_rejectCategory_when_notInEnum", () => {
  const result = schema.safeParse({ category: "snack" });
  expect(result.success).toBe(false);
});

// Assertion 2 – Meldungsinhalt (separierbar, eigener it-Block):
it("should_nameAllThreeCategoriesInMessage_when_categoryInvalid", () => {
  const result = schema.safeParse({ category: "snack" });
  if (!result.success)
    expect(firstIssueMessage(result.error)).toBe("Kategorie muss Getränk, Kaffee oder Essen sein.");
});
```
Verwandt mit der #117-Regel (je separierbares AC-Kriterium eine eigene Assertion) und der
`testing-standards.md`-Regel (erwarteter Wert ist ein Literal, kein erneuter Ergebnis-Zugriff).

### Layout-Timing-Test-Stub (rAF) vor dem Neuschreiben im Verzeichnis suchen (aus #194, Review-Finding)

`IdentityGate.test.tsx` (#194) schrieb denselben `requestAnimationFrame`-Capture-Stub
(`rafCallbacks`-Array + `flushRaf()`) nochmal von Grund auf, den `FokusListe.test.tsx` bereits aus
#188 für exakt dasselbe Problem (Fokus/Scroll erst im nächsten Frame nach einem layout-änderndem
State-Wechsel) mitbrachte – im selben Verzeichnis (`app/theke/[token]/`). Der Reflow-Timing-Test
selbst war korrekt; nur die Infrastruktur dafür wurde blind dupliziert statt wiederverwendet.
Erst im Code-Qualität-Review aufgefallen, nicht in `/implement` – der Reflex ist, einen
funktionierenden Test-Setup-Block aus Erinnerung zu reproduzieren statt im Zielverzeichnis danach
zu suchen.

**Smell:** „Schreibe ich gerade einen `beforeEach`, der `requestAnimationFrame`/`IntersectionObserver`
o.ä. stubbt, um Layout-Timing zu testen?" → vor dem Schreiben `grep -rl "requestAnimationFrame"
<gleiches-Verzeichnis>/*.test.tsx` prüfen, ob es den Stub schon gibt.

**Regel:** Vor einem neuen Timing-/Browser-API-Stub (rAF, `IntersectionObserver`, `matchMedia` etc.)
in einer Testdatei erst im **selben Feature-/Routen-Verzeichnis** nach einem bereits bestehenden
Stub für dieselbe API suchen. Gibt es einen, in ein geteiltes Helper-Modul auslagern (z. B.
`app/theke/[token]/raf-stub.ts`, exportiert eine `flush()`/`pendingCount()`-Factory) statt ihn zu
kopieren – auch wenn nur zwei Testdateien ihn brauchen (kein Over-Engineering, da es sich um
Test-Infrastruktur handelt, nicht um Produktionscode-Abstraktion).

### Callback-Prop nur durch Codelesen belegt ist keine Testabdeckung – Coverage-Report gegen jedes „Review-Positiv" gegenprüfen (aus #187, Test-Selbstfund)

`IdentityGate` verkabelte den editierbaren Zweig mit
`onFokusWechsel={(id) => writeZielId(token, id)}`. Reviews über drei Runden bewerteten das AC „F7
merkt Ziel weiterhin geräte-lokal" als erfüllt – belegt durch **Codelesen** (die Zeile ist da, der
Callback wird nur im editierbaren Zweig gesetzt). Kein Test tippte in der Fokus-Ansicht tatsächlich
auf einen anderen Chip und prüfte `localStorage`. Erst `pnpm vitest run --coverage` markierte
`IdentityGate.tsx:169` als **nicht** ausgeführt – die Arrow-Function wurde beim Rendern zwar
*erzeugt*, aber ihr Rumpf (`writeZielId(...)`) nie *aufgerufen*, weil kein Test den Chip-Klick im
schon-gemerkten Zustand simulierte.

**Smell:** „Ist dieses AC nur durch **Lesen** der Verkabelung als erfüllt bewertet (Review-Positiv),
oder gibt es einen Testfall, der den Callback tatsächlich **auslöst** und seine Wirkung prüft
(hier: den geschriebenen `localStorage`-Wert)?" Bleibt die Antwort „nur gelesen", ist die Zeile
ungetestet – unabhängig davon, wie plausibel die Verkabelung beim Lesen wirkt.

**Regel:** Für jede inline verkabelte Callback-Prop (`onX={(arg) => sideEffect(arg)}`), die ein AC
über Verkabelung (nicht über sichtbaren Render-Output) erfüllt, braucht es einen eigenen Testfall,
der den auslösenden User-Event tatsächlich feuert und die **Wirkung** des Callback-Rumpfs prüft
(Mock-Aufruf, `localStorage`-Wert, o. ä.) – nicht nur, dass die Komponente rendert. Vor dem
Abschluss von `/test` den Coverage-Report (`pnpm vitest run --coverage`) gezielt auf die Zeilen der
neu verkabelten Callbacks prüfen, nicht nur auf die Gesamt-Prozentzahl – ein Review-„Positiv", das
nur den Code liest, ersetzt diesen Beleg nicht.

### ESLint-Ignore-Config verhaltensbasiert testen – mit Diskriminierungs-Kontrolle (aus #172, /test-Selbstfund)

Die Ignore-Liste (`globalIgnores`) einer ESLint-**Flat-Config** (`eslint.config.mjs`) wird von
ESLint geladen, **nicht** von Vitest importiert → sie erscheint nicht im Coverage-Report, und ein
String-Match auf das Config-Array beweist nur, dass ein Eintrag *dasteht*, nicht dass ESLint ihn
*anwendet*. Der belastbare Guard prüft das **Verhalten** über die ESLint-Node-API:
`await new ESLint().isPathIgnored("<pfad>")`. Zweite, in `/implement` übersehene Falle: `isPathIgnored`
ist ein boolesches Mitgliedschafts-Prädikat – reine `toBe(true)`-Assertions (der Pfad wird
ignoriert) blieben auch bei einer versehentlich **zu breiten** Regel (z. B. `"**"`) grün. Erst in
`/test` aufgefallen; der Reflex ist, nur die „soll-ignoriert"-Richtung zu prüfen.

**Smell:** „Ich assertiere nur, dass ignorierte Pfade `true` liefern – würde mein Test auch dann
grün bleiben, wenn die Ignore-Regel *alles* erfasst?" Wenn ja, fehlt die Diskriminierungs-Kontrolle.

**Regel:** Ein Test einer Ignore-/Allow-Liste (oder jedes booleschen Mitgliedschafts-Prädikats)
prüft das echte Verhalten (bei ESLint: `isPathIgnored`, nicht das Config-Array) **und** enthält
eine **Positiv-Kontrolle in der Gegenrichtung** – eine bekannte Nicht-Mitglied-Eingabe, die das
Gegenteil liefern muss (hier: eine normale Quelldatei wie `app/layout.tsx` → `isPathIgnored === false`).
Als konkretes JS-Prädikat-Analogon zu #211 (beide Richtungen) und #212 (Positiv-Gegenprobe): ohne
die `false`-Kontrolle beweist der Test nur „ist-immer-ignoriert", nicht „ignoriert **genau** das
Richtige". Bei mehreren Ignore-Zielen jedes einzeln assertieren (Wegfall genau eines Eintrags → nur
der zugehörige Test rot).

**Rezidiv in neuer Domäne: Pfad-Präfix-Diskriminator vor einem Auth-Gate (aus #297,
Review-Runde-2-Finding).** `proxy.ts` entscheidet über `isThekePath` (Pfad beginnt mit
`/theke/`), ob eine Anfrage **komplett am Auth-Gate vorbeiläuft**. Die erste Testsuite prüfte nur
den Treffer (`/theke/<token>`) und einen **weit entfernten** Negativfall (`/veranstaltung`) – ein
zu breites Präfix (`"/theke"` statt `"/theke/"`) hätte auch `/thekenwart` ungeprüft durchgelassen,
und alle Tests blieben trotzdem grün. Genau wie beim ESLint-Fall oben fehlte die **Positiv-Kontrolle
in der Gegenrichtung mit einer ähnlichen, aber falschen Eingabe** – ein entfernter Negativfall
diskriminiert eine Präfix-Verbreiterung nicht.

**Regel (Ergänzung):** Bei jedem Pfad-/Präfix-Prädikat, das über Sein-oder-Nichtsein eines
Sicherheitsgates entscheidet (Auth-Gate-Bypass, Rate-Limit-Zweig, Ignore-Liste), muss der
Negativtest ein Eingabe wählen, die dem Muster **ähnelt, aber nicht matchen darf** (Nachbar-Pfad
mit gemeinsamem Präfix, nicht ein thematisch entfernter Pfad) – sonst bleibt eine zu breite
Grenze (fehlender Trenner, offenes `startsWith` ohne Slash-Anker) unentdeckt. Mutationsbeleg
pflichtig: Präfix-Konstante probehalber verbreitern → genau der neue Negativtest muss rot werden.

### Row/Cell-Index-Assertions gegen einen gerenderten Report sind beim Schreiben Magic Numbers – Herleitung sofort mitschreiben (aus #189, Review-Runde-1-Finding)

Ein Test für `berichtXlsx.ts` (Excel-Renderer) rendert einen Bericht und liest ihn über
`workbook.xlsx.load()` zurück, um konkrete Zellwerte zu prüfen (hier: Formula-Injection-
Neutralisierung in `bezeichnung`/`anzeigename`). Die naheliegende erste Fassung griff direkt
`sheet.getRow(2)`, `sheet.getRow(9)`, `sheet.getRow(14)` – korrekt hergeleitet aus der
Zeilenreihenfolge des Renderers, aber **ohne** Kommentar, warum genau diese Zahlen stimmen. Ohne
Herleitung ist so ein Row-Index nicht von einem echten Zufallswert zu unterscheiden: Ändert sich
das Renderer-Layout (eine Kopfzeile mehr, ein zusätzlicher Teilnehmer vor der Zielzeile), bricht
der Test **stillschweigend falsch** (liest die falsche Zelle, statt rot zu werden) – erst im
Review (nicht in `/implement`) als Magic-Number-Verstoß gegen `clean-code.md` aufgefallen.

**Smell:** „Ich greife in einem Renderer-Round-Trip-Test auf `getRow(<Zahl>)`/`getCell(<Zahl>)` zu
– kann ich in einem Satz erklären, warum genau diese Zahl die Zielzelle trifft, ohne den
Renderer-Quellcode danebenzuhalten?" Wenn nein, fehlt die Herleitung.

**Regel:** Row-/Cell-Index-Zugriffe in einem Renderer-Round-Trip-Test (Bericht rendern → Datei-
Format zurücklesen → Zellwert prüfen) sofort beim Schreiben als **benannte Konstanten mit
WHY-Kommentar** einführen, der die Zeilen-Arithmetik gegen die tatsächliche `addRow`-Reihenfolge
im Renderer referenziert (z. B. „5 Kopfzeilen + Leerzeile + Header + Preiszeile ⇒ Zeile 9 für den
ersten Teilnehmer") – nicht erst auf einen Review-Fund warten. Wiederkehrende Lade-/Cast-
Boilerplate (`new Workbook()` + Format-Load) in einen kleinen Helper extrahieren, wenn mehr als
ein Testfall sie braucht.

### Flaky Timeout durch unamortisierten teuren Erst-Aufruf: in `beforeAll` aufwärmen mit eigenem, endlichem Timeout – nicht das Default-Timeout global erhöhen (aus #238)

`eslint.config.test.ts` (#172-Regression-Guard) schlug sporadisch mit einem Timeout fehl, aber
**nur** unter Parallellast (volle Suite, viele Worker) – isoliert lief er immer grün. Ursache:
`new ESLint().isPathIgnored(...)` löst beim **ersten** Aufruf die teure Flat-Config-Resolution
aus (lädt `eslint.config.mjs`, cached das Config-Array danach pfad-unabhängig). Unter
Parallellast überschritt allein diese einmalige Resolution gelegentlich das Vitest-Default-
Timeout (5000 ms) des ersten Testfalls – ein klassischer „isoliert immer grün, unter Last
manchmal rot"-Flaky, der leicht als reines Last-/Infrastruktur-Problem abgetan wird.

**Smell:** „Dieser Test ist isoliert **immer** grün, aber unter voller Suite/Last gelegentlich
rot mit Timeout" + der erste Testfall ruft eine teure, aber cachende Operation zum ersten Mal
auf (Config-Resolution, Erst-Verbindung, Erst-Kompilierung o. ä.). Der Reflex „globales
Vitest-Timeout hochsetzen" behebt das Symptom für **alle** Tests und maskiert echte Hänger.

**Regel:** Den teuren Erst-Aufruf explizit in einem `beforeAll` vorab ausführen (Aufwärmen) und
diesem `beforeAll` ein **eigenes, großzügigeres, aber weiterhin endliches** Timeout geben (hier
30_000 ms statt des 5000-ms-Defaults) – nicht das globale Timeout aller Testfälle erhöhen. Die
eigentlichen Testkörper bleiben beim Default-Timeout, da die teure Ressource danach bereits
aufgelöst/gecacht ist. Ein echter Hänger in der Resolution schlägt weiterhin nach endlicher
Frist fehl (kein unbegrenztes Timeout, das Bugs maskiert – Zero-Tolerance-Vorgabe oben bleibt
gewahrt). Pfad-Literale, die im Aufwärm-Aufruf **und** in einer Testassertion (z. B. einer
Positiv-Kontrolle) identisch sein müssen, sofort als geteilte benannte Konstante einführen, um
Drift zwischen beiden Stellen zu verhindern.

### Positions-/Zustand-Freeze-Test ohne vorherige Divergenz-Aktion ist nicht diskriminierend – dreifach im selben Task übersehen (aus #253, Review-Runde 1–3, W-Findings)

Task #253 fror die Render-Reihenfolge einer Liste client-seitig ein (`useState`-Initializer); der
Server liefert bei jedem Rerender ggf. eine andere Sortierung, die eingefrorene Position soll aber
bestehen bleiben. Drei aufeinanderfolgende Review-Runden fanden an drei verschiedenen Stellen
(`page.test.tsx` StatusToggle-Test, `EingefroreneZeilenListe.test.tsx` Fehlerszenario-Test)
denselben Fehler: `render`/`rerender` wurden mit **identischen** bzw. nicht-divergierenden Props
aufgerufen. Solange Server-Reihenfolge und eingefrorene Reihenfolge gleich sind, ist weder eine
Reihenfolge- noch eine daran hängende Status-Assertion diskriminierend – beide bleiben grün, ob
der Freeze-Code existiert oder komplett entfernt ist (Mutation `ordneNachEingefrorenerReihenfolge(
…).map(...)` → `zeilen.map(...)`: Test bleibt grün).

**Smell:** „Mein Test prüft ‚Position/Status bleibt trotz X unverändert' – divergiert die
Server-Reihenfolge an irgendeiner Stelle im Testverlauf tatsächlich von der eingefrorenen? Wenn
nicht, kann die Assertion gar nicht unterscheiden zwischen ‚Freeze wirkt' und ‚kein Freeze da'."

**Regel:** Ein Freeze-/Unverändert-Test (Position, Reihenfolge, Zustand bleibt über einen Rerender
hinweg stabil) braucht **zuerst eine echte, state-ändernde Aktion**, die Server- und eingefrorenen
Zustand tatsächlich auseinanderlaufen lässt (hier: ein *erfolgreicher* Kassiervorgang, der die
Server-Sortierung ändert), **bevor** der eigentliche Zielfall (z. B. ein *fehlgeschlagenes*
Kassieren, ein StatusToggle) ausgeführt wird. Ohne diesen vorgeschalteten Divergenz-Schritt ist der
Test bestenfalls ein Wiring-Test, kein Freeze-Beweis – Spezialfall von #214 („grün aus dem
falschen Grund"), hier auf Zustands-Freeze statt auf Fail-Pfad-Isolation zugeschnitten.

### Exhaustiveness-Guards (`never`-Check) brauchen einen eigenen Test (verschoben aus `testing-standards.md`, #319)

Ein `else`/`default`-Zweig, der eine Union über `const _exhaustive: never = wert; throw new
Error(...)` abschließt, ist zur **Compile-Zeit** unerreichbar – zur **Laufzeit** zählt er aber
weiter als Code-Zeile für Coverage. Der Reflex ist, ihn als „durch das Typsystem abgesichert"
zu betrachten und ungetestet zu lassen, weil kein regulärer Input ihn je auslöst.

**Smell:** „Ich kann diesen Zweig nicht über einen normalen Input erreichen" – das ist kein
Freibrief, ihn ungetestet zu lassen, sondern der Hinweis, den Wert per Type-Cast zu erzwingen.

**Regel:** Jeder Exhaustiveness-Guard bekommt einen eigenen Testfall, der die Guard-Bedingung
über einen Type-Cast (`as unknown as T`) erzwingt und den Fehlertext prüft:
```ts
it("should_throw_when_categoryIsUnknown", () => {
  const invalid = { category: "unknown" as unknown as CatalogCategory, /* … */ };
  expect(() => zeileSummen([invalid])).toThrow("Unbekannte Kategorie");
});
```
Ohne diesen Test bleibt der Guard-Zweig als einzige ungetestete Zeile zurück – Coverage-Ziele
(100 % bei neuem Code, siehe `testing-standards.md` → „Coverage-Anforderungen") werden verfehlt, ohne dass es beim Schreiben auffällt,
weil der Zweig „offensichtlich sicher" wirkt.

### Mock-Default mit leerem Array verdeckt Mapping-Code (verschoben aus `testing-standards.md`, #319)

Setzt ein `beforeEach` eine Mock-Funktion, die eine Liste liefert (z. B. ein Data-Layer-Call wie
`listZeilen`/`listPositionen`), pauschal auf `mockResolvedValue([])` und überschreibt kein
Einzeltest sie mit echten Daten, läuft jeder nachgelagerte `.map(...)`/`.filter(...)`-Aufruf im
Produktionscode nur über das leere Array. Der Lambda-Rumpf – meist die Feldübersetzung von
DB-Row auf Domain-/Modell-Objekt – wird dadurch **nie mit echten Werten** ausgeführt: ein
vertauschtes oder falsch benanntes Feld bliebe unentdeckt, obwohl Coverage-Tools die Zeile als
„covered" zählen (die Lambda-*Definition* läuft, ihr Aufruf mit befüllten Daten nicht).

**Smell:** „Wird dieser Mock in irgendeinem Testfall mit **befüllten** Daten aufgerufen?" Bleibt
er in jedem Test bei `[]`, ist das Mapping darüber ungetestet – unabhängig davon, ob der Test
selbst grün ist.

**Regel:** Verarbeitet ein Produktionscode-Pfad das Ergebnis eines gemockten Data-Layer-Calls
per `.map(...)`/`.filter(...)`, muss mindestens **ein** Testfall den Mock mit einem befüllten
Array (mind. ein Element mit allen relevanten Feldern) versorgen und das Ergebnis gegen die
erwarteten gemappten Werte prüfen – nicht nur den Response-Status:
```ts
listZeilenMock.mockResolvedValue([
  { id: "z-1", teilnehmerId: "t-1", anzeigename: "Anna", erhaltenCents: 1500, /* … */ },
]);
// … Act …
expect(berichtXlsxMock).toHaveBeenCalledWith(
  expect.objectContaining({ teilnehmer: [expect.objectContaining({ anzeigename: "Anna" })] }),
);
```

### Test-Blöcke gegen einen modulweit geteilten Singleton mit relativem Fake-Time-Vorstellen sind reihenfolgeabhängig (aus #297, Review-Runde-3-Finding)

`lib/rate-limit.test.ts` legte für zwei neue globale (schlüssellose) Rate-Limiter-Singletons je
einen `describe`-Block an, der gegen das **echte, produktive** Modul-Objekt testete und die
Fake-Uhr nur **relativ** vorstellte (`vi.advanceTimersByTime`/`setSystemTime(start + 1h)`,
`start + 2h`, …). Ein globaler Zähler ohne Schlüssel startet sein Fenster beim Modul-**Import**,
nicht lazy beim ersten Aufruf – und hat keine Isolation zwischen Test-Blöcken: der Block, der die
240 ausschöpft, verbraucht das Budget für den Rest der Datei. Mit `--sequence.shuffle` +
gepinntem Seed reproduzierbar: **1 Test rot**, isoliert/in der geschriebenen Reihenfolge lief die
Suite dagegen immer grün, weil `vitest.config.ts` kein Shuffle aktiviert – ein klassischer Fall
von „deterministisch grün, weil zufällig richtig sortiert", nicht weil isoliert.

**Smell:** Ein `describe`-Block importiert einen **modulweit geteilten** Singleton (kein Factory-
Aufruf, kein `resetModules` davor) und stellt die Fake-Uhr nur **relativ** zum vorherigen Wert vor,
statt absolut auf einen fixen Zeitpunkt einzufrieren. Test-Isolation prüft man nicht am
geschriebenen Lauf, sondern mit `--sequence.shuffle=true --sequence.seed=<n>` gegen mehrere Seeds.

**Regel:** Jeder Test, der einen **vollständigen Zähler-Zyklus** an einem schlüssellosen,
modulweiten Rate-Limiter-Singleton braucht, holt sich per `vi.resetModules()` + dynamischem
Re-Import ein **eigenes** Modul-Objekt (Muster: der bereits bestehende Cold-Start-Test) und friert
die Fake-Uhr **vor** dem Import absolut auf einen festen Wert ein (`vi.setSystemTime(0)`), nicht
relativ zu einem vorherigen Test-Zeitpunkt. Bei mehreren Test-Blöcken mit identischer
Import-Reset-Sequenz lohnt sich eine geteilte Helper-Funktion (`importFreshRateLimitModule()`).
Nachweis der Isolation: `pnpm vitest run <datei> --sequence.shuffle=true --sequence.seed=<n>` über
mehrere Seeds grün, nicht nur der Default-Lauf in Schreibreihenfolge.

### DOM-Adjazenz-Assertion mit `toBeGreaterThan` statt `toBe(index + 1)` (aus #318, Review-Runde-1-Finding)

Ein AK forderte „Element X steht **unmittelbar** unter Element Y" (Kopf → Wechsel-Link, ohne
Zwischenelement). Der erste Test belegte das mit `expect(aktionIndex).toBeGreaterThan(kopfIndex)`
– das prüft nur die Reihenfolge, nicht die Adjazenz. Per Mutation gemessen: ein zusätzliches
Fremd-Element zwischen Kopf und Link ließ alle 40 Tests der Datei grün bleiben, obwohl das AK
klar verletzt war. Dieselbe Wurzelursache wie
[„Zeilen-Gap-Assertion auf deterministischem Output"](#zeilen-gap-assertion-auf-deterministischem-output-unbegründete-toleranz-statt-ist-wert-aus-322-review-runde-2-finding)
(#322) – dort in einer Bash/Zeilenzähl-Assertion, hier erstmals in einer React/DOM-Index-Assertion.

**Smell:** Ein AK/Kommentar benutzt ein Wort wie „unmittelbar"/„direkt"/„sofort danach" (Adjazenz,
kein reiner Reihenfolge-Anspruch), der Test aber vergleicht mit `toBeGreaterThan`/`>`/`-gt` statt
mit einer exakten Index-Gleichheit.

**Regel:** Bei einer Adjazenz-Behauptung immer `expect(zielIndex).toBe(referenzIndex + 1)`
(bzw. Äquivalent) schreiben, nie eine reine Größer-als-Prüfung. Den Test durch Einfügen eines
Fremd-Elements zwischen den beiden Positionen verifizieren (muss rot werden).

### Reihenfolge-/Positions-Test auf dem Default-Props-Pfad, obwohl der einzige Produktions-Konsument eine andere Prop-Kombination rendert (aus #318, Review-Runde-1-Finding)

Derselbe Adjazenz-Test lief zunächst ohne `collapsible`/`open` – dem Default-Pfad der
Komponente. Der einzige Produktions-Konsument (`FokusListe`) rendert die Karte aber immer mit
`collapsible: true, open: true`; dieser Pfad rendert einen zusätzlichen Kopf-`<button>`, dessen
DOM-Struktur vom Default-Pfad abweicht. Ein Test, der nur den Default-Pfad trifft, kann eine
Positions-Regression übersehen, die ausschließlich in der tatsächlich ausgelieferten
Prop-Kombination auftritt.

**Smell:** Ein Positions-/Struktur-Test für eine Komponente mit optionalen Props nutzt die
Default-Werte dieser Props, während `grep` nach dem Komponentennamen zeigt, dass jeder reale
Konsument eine andere Kombination übergibt.

**Regel:** Vor dem Schreiben eines Positions-/Struktur-Tests kurz prüfen, welche Prop-Kombination
die realen Konsumenten tatsächlich verwenden (`grep` auf den Komponentennamen); der Test muss
diese Kombination abdecken, nicht nur den einfachsten/Default-Pfad.

### Gleicher Testdaten-Namensliteral in mehreren DB-Integrationstestdateien kollidiert unter Parallelisierung (aus #59/#347)

Mehrere `*.test.ts`-Dateien, die alle echte Zeilen in derselben Tabelle anlegen (hier:
`catalog_item` über `createItem`), griffen unabhängig voneinander auf denselben Namensliteral
zurück (`__test__Cola`, zusätzlich latent `__test__Kaffee` in zwei weiteren Dateien) – jede
Datei für sich war korrekt und räumte ihre eigene Zeile per `id` wieder ab, aber unter Vitests
paralleler Dateiausführung legten zwei Läufe gleichzeitig dieselbe `(catalogId, name, size)`-
Kombination an und kollidierten auf der Unique-Constraint. Der Flake war **vorbestehend** (auch
unter der alten globalen `UNIQUE(name, size)` reproduzierbar), wurde aber durch einen in
derselben Task neu hinzugefügten, länger laufenden Test in einer der beteiligten Dateien
praktisch deterministisch (3 von 3 rot statt gelegentlich).

**Smell:** Zwei oder mehr `*.test.ts`-Dateien legen Zeilen mit demselben Namensliteral in
derselben unique-constraint-tragenden Spalte an, ohne dass ein gemeinsames, dateispezifisches
Präfix das ausschließt – erkennbar per Grep auf das Literal über alle Testdateien, die dieselbe
Tabelle beschreiben.

**Regel:** Jede Testdatei, die Zeilen in einer Tabelle mit Unique-Constraint auf einem
Namensfeld anlegt, bekommt ein **eigenes** Namensfenster (z. B. `ITEM_PREFIX =
"__test__<dateithema>-"`), nicht ein geteiltes `__test__`-Präfix, das erst beim Kombinieren
mehrerer Dateien disjunkt sein muss. Der Fix ist reine **Konvention ohne Enforcer** – eine
vierte, neu hinzukommende Datei kann die Kollision wieder einführen, wenn sie das Muster nicht
kennt; ein Kommentar an der Konstante sollte alle beteiligten Namensfelder der Tabelle
vollständig aufzählen (nicht nur die zum Fix-Zeitpunkt bekannten), damit die nächste Datei sich
daran orientieren kann. Ein Test, der die **gesamte** Ergebnisliste einer geteilten Ressource
vor/nach einer Aktion vergleicht (hier: alle Artikel eines Katalogs), ist zusätzlich selbst
nicht parallelitätsfest, wenn andere Dateien parallel Zeilen derselben Ressource anlegen/abräumen
– er muss stattdessen nur den selbst angelegten Datensatz über seine Lesewege verfolgen.

### Regex-/Listen-Gate über ein externes Universum: Enumeration per Drift-Test aus der Quelle ableiten (aus #368, Review-Runde-1/2-Findings)

Das Farb-Gate (`eslint/no-raw-color-classes.mjs`) zählte Tailwind-Paletten und
Klassen-Präfix-Formen von Hand auf. Runde 1 fand vier fehlende Paletten (`mauve`, `mist`,
`olive`, `taupe`), weitere Utilities (`inset-shadow`, `drop-shadow` …) und Präfixformen
(`[…]`, `/name`, `@`, führendes `!`); Runde 2 nochmals verschachtelte Arbitrary-Varianten und
`/(--a)`. Jede Runde fand eine Form, die die Testliste nicht kannte – Tests, die nur die
selbst bedachten Formen prüfen, belegen die Vollständigkeit nicht.

**Smell:** Ein Gate schließt eine Menge aus (Farbnamen, Präfixe), deren Universum **nicht im
Repo** liegt (Tailwind-Theme, Framework-Syntax), und die Testfälle stammen aus derselben
Überlegung wie die Regel.

**Regel:** Die aufgezählte Menge per Drift-Test aus der echten Quelle ableiten (hier: Paletten
aus `tailwindcss/theme.css` lesen, je Palette ein `invalid`-Fall) und fail-closed, wenn der
Parser unplausibel wenig findet (< 20). Für Syntaxformen je Form genau einen `invalid`-Fall mit
exakter `className` im `data` (erst rot, dann grün) plus je einen `valid`-Nachbarn
(Wortgrenze, Token-Klasse). Grenzen bewusst im Kommentar und in der ADR benennen
(„eine Verschachtelungsebene"). **Laden bei:** `/implement`, `/test`, `/review` – bei neuem
oder erweitertem Regex-/Listen-Gate über ein externes Namens- oder Syntax-Universum.

### Playwright `reuseExistingServer` kann gegen einen fremden Dev-Server laufen – E2E ist dann kein Beleg (aus #368, /implement-Selbstfund)

Der erste E2E-Lauf hing an einem Dev-Server auf `:3000` aus einem **anderen Checkout**
(alter Stand: blauer Button, Arial). Grün, aber ohne Aussage über den eigenen Branch; aufgefallen
nur, weil die Screenshots den alten Stand zeigten.

**Regel:** Vor einem UI-/E2E-Beleg in einem Worktree einen eigenen Dev-Server auf freiem Port
starten (`next dev -p <port>`) und `PLAYWRIGHT_BASE_URL` darauf setzen; den Stand mit einem
branch-spezifischen Merkmal gegenprüfen, bevor „grün" als Nachweis gilt. **Laden bei:**
`/implement`, `/test` – bei E2E-/Screenshot-Nachweis in einem Worktree.

### Ein Stellvertreter, der den geprüften Zweig nicht unterscheiden kann, macht den Test zum reinen Abdeckungs-Test – Mutation belegen, und das Mutieren selbst prüfen (aus #369, Review-Iteration 3 + /refactor-Selbstfund)

Ein Test sollte belegen, dass ein Rücksprungziel, das kein `HTMLElement` ist, keinen Fokus bekommt.
Er nutzte ein `SVGElement` – in jsdom hat auch das eine (wirkungslose) `focus()`-Methode, `<body>`
bleibt fokussiert. Der Test wäre ohne die `instanceof`-Prüfung grün geblieben und deckte nur die
Zeile ab. Der Review fand das; der Umbau auf einen Stellvertreter mit `focus`-Spion
(`{ focus } as unknown as HTMLElement`) machte ihn diskriminierend. Beim Mutationsbeleg dafür lief
der erste Versuch über `sed -i` – auf macOS/BSD braucht `-i` ein Suffix-Argument, der Befehl
scheiterte, **die Mutation wurde nie angewendet**, und der folgende grüne Testlauf sah wie ein
Beleg aus.

**Smell:** „Der Test ist grün und die Zeile ist abgedeckt" – ohne dass jemand gezeigt hat, dass er
rot wird, wenn die Zeile fehlt; und: „Die Mutation scheint grün zu bleiben".

**Regel:** (1) Das Test-Double muss sich in genau dem Merkmal unterscheiden, das der Guard prüft
(Spion statt „ähnlicher" echter Typ). (2) Mutationsbeleg immer in drei Schritten: mutieren
(`python3`-Replace mit `assert old in s`, nicht `sed -i`), **`git diff --stat` zeigt die Änderung**,
Test muss rot sein; danach `git checkout -- <datei>` und grün gegenprüfen. Rot-Erwartung ohne
sichtbare Diff-Zeile ist kein Beleg.

### Playwright-`hasText` mit String ist ein Teilstring-Treffer (case-insensitiv) – für Artikelnamen exakt matchen, und die Ursache eines Fehlschlags vor dem Dokumentieren an den echten Daten messen (aus #388, Review-Iteration 1)

Die Capture-Spec wählte Verzehr-Artikel über `page.locator("li", { hasText: "Bier" }).…last()`. Das Seed-Sortiment
enthält „Weizenbier 0,5 l"; `hasText` mit String trifft jeden Eintrag, der „bier" **irgendwo** enthält, und `.last()` nahm
genau dieses. Annas Summe stimmte nicht (7,50 € statt 7,00 €), der Lauf brach beim Kassieren ab. Die Ursache wurde
zunächst aus der Seed-Migration **gelesen** („Bier 0,33 l/0,5 l kollidieren") und so in Kleinfund und Task-Notiz
geschrieben – falsch. Erst `/review` fragte die tatsächlichen Verzehr-Positionen des Laufs ab (`verzehr_position` ⨝
`catalog_item`) und fand Weizenbier.

**Smell:** `hasText: "<Name>"` / `getByText("<Name>")` ohne `exact` für einen Namen, der Teilstring eines anderen Eintrags sein
kann; und: Eine Fehlerursache steht im Text, ohne dass der gemessene Ist-Zustand (DB-Zeilen, DOM) danebenliegt.

**Regel:** (1) Für exakte Artikel-/Personennamen `getByText(name, { exact: true })` bzw. `hasText: new RegExp("^" + name + "$")`
(Label ohne Größen-Suffix) benutzen – nie den nackten String, wenn das Sortiment ähnliche Namen führt (`Bier`/`Weizenbier`,
`Kaffee`/`Filterkaffee`). (2) Bevor eine Ursache in Kleinfund, Task-Notiz oder Report steht, den Zustand **messen**, den der
Fehlschlag erzeugt hat (read-only Abfrage der betroffenen Zeilen) – eine aus dem Quelltext gelesene Erklärung ist eine
Hypothese. (Verwandt: „X erzwingt Y"-Behauptungen in `lessons/code-style.md`.)

### Manuell gestartete Capture-/E2E-Spec (nicht in CI) rottet unbemerkt – Annahmen über den Startzustand relativ formulieren (aus #388, /implement)

Die Capture-Spec für die Anleitungs-Bilder läuft nur mit `CAPTURE_ANLEITUNG=1`, also weder lokal im Standardlauf noch in CI.
Beim ersten vollständigen Lauf nach #221 (in #369 wurde sie nur angepasst, nicht gefahren) lief sie in **zwei** Annahmen auf:
(a) „frisch geseedete DB" hieß für die Spec „leerer Katalog" (`Artikel (1)` …), die frisch migrierte DB bringt aber 16
Standard-Artikel mit (Migration `0004_seed_catalog_reference`, aus #49); wie der Lauf bei #221 damit durchkam, ist nicht
geklärt; (b) die Artikelnamen der Demo-Daten sind Teilstrings des Seed-Sortiments (siehe oben). Beides fiel erst beim ersten
vollständigen Lauf auf. Dazu
kam ein Dialog-Effekt: Das native `<dialog>` fokussiert beim Öffnen das erste Bedienelement – das schreibgeschützte
Link-Feld –, es scrollt ans Ende der URL und trägt einen Fokusring; das Bild zeigte nur „…ffb7cff344".

**Smell:** Eine Spec/ein Skript hängt am Zustand „frisch geseedet" und zählt absolut (`(1)`, `(2)`), oder ein Screenshot wird
direkt nach dem Öffnen eines Dialogs aufgenommen.

**Regel:** Zählungen **relativ zum gelesenen Startwert** (`startAnzahl + i + 1`), nie absolut. Ändert ein PR Seeds oder
Migrationen mit Default-Daten, per `grep -rn "(1)\|(2)\|Artikel (" e2e/` die manuell laufenden Specs auf absolute
Startannahmen prüfen. Vor Dialog-Screenshots Fokus und Scrollposition des automatisch fokussierten Elements zurücksetzen
(`blur()`, `scrollLeft = 0`). Jeder fehlgeschlagene Lauf legt Demo-Daten an – vor dem Wiederholen die DB neu aufsetzen, nie
auf dem Rest weiterlaufen (Spec-FS2).

### React-19-Async-Actions: nie auflösende Promises halten einen modulweiten Scope offen – spätere Tests derselben Datei sind „grün aus dem falschen Grund" (aus #370, /implement-Selbstfund beim Mutationsbeleg)

Die Positionszustand-Tests von `VerzehrEinzelansicht` nutzen das echte `MengeControl` samt `useActionState`. Pending-Tests
halten eine Action bewusst mit einem nie aufgelösten Promise offen (Lesson #369). React 19 bündelt laufende Async-Actions in
einem **modulweiten** Scope: die offene Aktion lief über das Testende hinaus, und spätere Action-Ergebnisse der Datei wurden
nie committet. Der Test „später eintreffender Fehler wird verworfen" war so auch **ohne** den schützenden `key` grün – isoliert
belegt per Sonde: ohne die Vortests zeigte die Ansicht den Fehler bei der falschen Person.

**Smell:** Ein Abwesenheits-Test („kein Fehler sichtbar") bleibt grün, obwohl der Mutationsbeleg ihn rot machen müsste, und
die Datei enthält Tests mit nie aufgelösten Action-Promises.

**Regel:** Jede in einer Testdatei offen gehaltene Action registriert ihre `resolve`-Funktion in einer Liste, und ein
`afterEach` löst sie in `act(async …)` auf – **vor** `cleanup()`. Abwesenheits-Assertions zusätzlich an eine Anwesenheits-
Vorbedingung koppeln (z. B. `toBeDisabled()` belegt, dass die Aktion überhaupt lief). Den Mutationsbeleg (Schutz entfernen →
Test rot) für jeden Abwesenheits-Test fahren, nicht nur für den ersten.

### Negativ-Fixture auf einem realen Pfad bricht, sobald dieser Pfad später gelistet wird (aus #371, /implement-Selbstfund)

Der Gegenrichtungs-Test in `eslint/color-gate-wiring.test.ts` nutzte die Kassieren-Seite als
„nicht gelisteten Nachbarn". #371 listete genau dieses Verzeichnis in `eslint/ui-token-files.mjs` –
der Test wäre ohne Anpassung rot geworden.

**Regel:** Wer eine Pfad-Liste (Token-Gate, Matcher) erweitert, greppt vorher alle Tests, die einen
realen Pfad als „nicht enthalten" verwenden, und stellt sie auf einen weiterhin ungelisteten Nachbarn
um; zusätzlich je neuem Eintrag einen Positivfall ergänzen.

### E2E gegen den Dev-Server: `127.0.0.1` blockt HMR, Hydration bleibt aus (aus #374, /implement-Selbstfund)

**Smell:** Gegen `127.0.0.1:<port>` blockt Next dev die HMR-Ressourcen (`allowedDevOrigins`). Ohne Hydration bleibt
z. B. der Drawer zu – das sieht wie eine Regression im Produktcode aus.

**Regel:** E2E-Nachweise gegen `localhost:<port>` fahren (eigener Server, freier Port, Lesson #368). Rotes
Verhalten, das nur interaktive Client-Logik betrifft, zuerst auf die Host-Schreibweise prüfen.

### Playwright `getByRole(name)` ist ebenfalls ein Teilstring-Treffer – nach neuem Element im Dialog `exact: true` (aus #372, /implement)

Mit dem Toast-Portal im offenen Dialog traf `getByRole("button", { name: "Schließen" })` auch „Meldung schließen" und
brach drei Specs (strict-mode-Verletzung). Wie `hasText` (Lesson #388) matcht `name` ohne `exact: true` Teilstrings,
ohne Groß-/Kleinschreibung.

**Regel:** Fügt ein PR einem Dialog/einer Seite ein neues Bedienelement hinzu (Toast, Hinweis, Schließen-Knopf), alle
E2E-Locatoren auf dessen Namensraum greppen und auf `exact: true` umstellen – das fängt kein Unit-Test.

### Opt-in-E2E-Spec, die nie lief, belegt nichts – und prüfte hier die falsche CSS-Eigenschaft (aus #403, Review-Iteration 1 K1 + Iteration 3)

Die Spec `e2e/bausteine-listenzeile-aufklapper.spec.ts` ist per `E2E_BAUSTEINE_403=1` abgeschaltet und lief in allen
drei Review-Iterationen nie: Der Pfeil-Test prüfte `transform`, Tailwind v4 setzt aber die Eigenschaft `rotate` – der
Beleg für AK1.2 wäre rot bzw. aussagelos gewesen, und niemand hätte es bemerkt. Der Lauf braucht Freigabe des Menschen
(lokale DB, `.env.local`, eigener Port) und blieb deshalb bis zum Circuit Breaker offen.

**Regel:** (1) Eine nie gelaufene Spec gilt nicht als Beleg, auch wenn sie geschrieben ist; die Freigabe für den
Lauf in `/implement` **früh** einholen, nicht erst nach drei Review-Runden. (2) CSS-Assertions in Playwright gegen die
tatsächlich gesetzte Eigenschaft schreiben (Tailwind v4: `rotate`/`translate`/`scale` einzeln, nicht `transform`) und
einmal gegen den echten Browser messen, bevor die AK-Checkbox hängt.

**Rezidiv (aus #406, Review-Iteration 2):** `e2e/auslagen.spec.ts` (`E2E_406=1`) lief ebenfalls erst im Rework nach dem
Review-Finding. Beim Anlegen einer Opt-in-Spec den Lauf (eigener Port, `localhost`, `db:migrate` + `db:seed`) **im selben
`/implement`-Schritt** ausführen, bevor die Oberflächentest-Checkbox hängt. Grenze mitschreiben: Eine verzögerte
Server-Ablehnung lässt sich im E2E nicht ohne Eingriff in die Action erzeugen – solche Zustände bleiben jsdom-belegt.
