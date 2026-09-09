# Review: Task 297

> **Runde 3** (`/review`, 2026-09-09) – Diff-Scope: `git diff origin/main...HEAD` (11 Dateien,
> 1671 Zeilen +). Die Reports der Runden 1 und 2 stehen darunter; **alle 13 Findings der beiden
> Runden sind behoben und hier abgehakt** (jedes am aktuellen Datei-Stand nachgeprüft, nicht aus
> der Task-Notiz übernommen).
>
> **Gate-Stand zum Review-Zeitpunkt, selbst gemessen:** `pnpm test` → **794 passed / 59 skipped**
> (69 Dateien) · `pnpm lint` grün · `pnpm typecheck` grün · `scripts/checks/routes-doc-check.sh`
> grün.
>
> **Der Mutationsbeleg aus Runde 3 ist eigenständig nachvollzogen** statt übernommen (Lesson
> #314/#319): `THEKE_PATH_PREFIX` `"/theke/"` → `"/theke"` → `proxy.test.ts` **1 failed / 19
> passed**, und zwar genau `should_leaveAuthGateUntouched_when_pathOnlyLooksLikeTheke`
> (`expected "vi.fn()" to not be called at all, but actually been called 1 times`). Revert per
> EXIT-Trap, Baum danach sauber (`git status --porcelain` leer).
>
> **Produktionscode ist in dieser Runde ohne Befund** – kein kritisches Finding. Die einzige
> substanzielle Beobachtung liegt in der Testdatei und ist mit einem reproduzierbaren Rot belegt.

## Kritische Findings (müssen behoben werden)

_Keine._ Der kritische Fund aus Runde 1 (Bremse per `curl -X POST` umgehbar) und der aus Runde 2
(Spec widerspricht der Implementierung) sind beide an der Wurzel behoben; die vier gemeldeten
Spec-Stellen plus die selbst gefundene fünfte („Nicht inbegriffen") sagen jetzt dasselbe wie
`proxy.ts`, ADR-048 D5 und `proxy.test.ts`.

## Wichtige Findings (sollten behoben werden)

- [ ] **`lib/rate-limit.test.ts:132-222` – die drei `describe`-Blöcke der Theken-Singletons sind
  reihenfolge-abhängig; die Datei ist bei anderer Ausführungsordnung rot.** Das verstößt gegen
  `testing-standards.md` → „Test-Isolation" (*„Jeder Test ist unabhängig – keine Abhängigkeit von
  der Test-Reihenfolge"*) und „Flaky Tests: Zero Tolerance" (*„keine
  Test-Reihenfolge-Abhängigkeiten"*).

  Ursache: Alle drei Blöcke zählen an **denselben** produktiven Singletons (globale Zähler ohne
  Schlüssel zur Isolation) und stellen die Fake-Uhr nur *relativ* nach vorn – `+3_600_000` in den
  beiden Parameter-Tests, `+7_200_000` im Trennungs-Test. Die Kommentare beschreiben diese Kopplung
  inzwischen korrekt (Runde-2-Nitpick behoben), heben sie aber nicht auf: Der `+2 h`-Sprung ist ein
  load-bearing Vertrag mit den Blöcken *darüber*.

  **Empirisch belegt** (nicht nur aus dem Code gelesen):

  | Probe | Ergebnis |
  |---|---|
  | `pnpm vitest run lib/rate-limit.test.ts` (Default-Reihenfolge) | 13 passed |
  | `pnpm vitest run lib/rate-limit.test.ts -t "should_keepSeparateBudget_when_readBudgetExhausted"` (isoliert) | 1 passed / 12 skipped → der Test selbst ist in Ordnung |
  | `pnpm vitest run lib/rate-limit.test.ts --sequence.shuffle=true --sequence.seed=12345` | **1 failed / 12 passed** – `thekeActionRateLimiter > should_allow240ThenThrottleUntilWindowElapsed`, `lib/rate-limit.test.ts:191`: `expected false to be true` (die 240er-Schleife bekommt ein vorbelastetes Fenster) |

  **Einordnung, ehrlich:** `vitest.config.ts` aktiviert **kein** `sequence.shuffle`, die Suite ist
  heute also deterministisch grün – das ist kein akutes Rot in CI. Der Schaden ist latent und
  trifft die *schärfste* Assertion der Datei (den 240/60 s-Pin am echten Singleton): Wer künftig
  einen `describe`-Block **vor** diese drei setzt oder die Blöcke umsortiert, macht eine korrekte
  Implementierung rot und muss die Kopplung erst rekonstruieren. Genau diese Klasse verbietet die
  Guideline ohne Ausnahme-Klausel.

  **Richtung (Auswahl liegt bei `/test`):** Pro Block ein frisches Modul-Objekt statt eines
  relativen Uhr-Sprungs – `vi.useFakeTimers()` + `vi.setSystemTime(...)` **vor** `vi.resetModules()`
  + `await import("./rate-limit")`, wie es der Cold-Start-Test in derselben Datei
  (`:137-150`) schon vormacht. Das nimmt beiden Magic Numbers (`+1 h`/`+2 h`) die
  Reihenfolge-Semantik und erhält alle bisherigen Zusicherungen. Der Trennungs-Test braucht dann
  beide Singletons aus **demselben** Re-Import (sonst prüft er zwei unabhängige Modul-Instanzen und
  wäre tautologisch). Gegenprobe nach dem Umbau: derselbe `--sequence.shuffle`-Lauf muss grün sein.

## Nitpicks (optional)

- [ ] **`lib/theke-throttle-response.ts:20` – `Retry-After` wird bei einem Fenster, das kein
  ganzzahliges Vielfaches von 1000 ms ist, ungültig.** `THEKE_RATE_LIMIT_WINDOW_MS / 1000` ergibt
  für `90_500` den Wert `90.5`; RFC 9110 verlangt für `Retry-After` in der delta-seconds-Form eine
  Ganzzahl, und der sichtbare Satz läse „in etwa 90.5 Sekunden". Heute unerreichbar (die Konstante
  ist `60_000`), und ein `Math.ceil` steht in Spannung zu `clean-code.md` („keine Fallbacks für
  ausgeschlossene Fälle") – deshalb Nitpick, nicht Finding. Wenn nicht `Math.ceil`, dann ein
  halber Satz am Export der Konstante, dass sie in ganzen Sekunden zu wählen ist.

- [ ] **Die Begründung „der `Next-Action`-Header ist nur ein Ausweis, keine Prüfung" steht
  vierfach im Repo** – `proxy.ts:36-42`, `proxy.ts:62-64`, `lib/rate-limit.ts:70-71`,
  `proxy.test.ts:256-260` (+ kanonisch ADR-048 D5). Inhaltlich sind alle vier heute deckungsgleich;
  genau diese Redundanz ist aber die Drift-Fläche, gegen die dieser PR schon drei Runden gekämpft
  hat (#211/#176/#253/#322 – zuletzt `READ_METHODS`, das in vier Dokumenten stand und in dreien
  nachgezogen werden musste). Ein Satz + ADR-Verweis an der Aufrufstelle wäre haltbarer als vier
  Kopien der Argumentation. Bewusst als Nitpick: kein Widerspruch, nur Wartungslast.

- [ ] **`docs/adr/048-rate-limit-theke-leseroute.md:271` – „**Ein gemeinsames Budget.**" ist nach
  D5 die irritierendste Formulierung, die noch steht.** Gemeint (und im Folgesatz korrekt erklärt)
  ist „ein Budget, das alle Besucher teilen" – nach zwei Absätzen über zwei getrennte Budgets liest
  der fette Lead-in aber wie „insgesamt nur ein Budget". Dieselbe Klasse wie der in Runde 2 an
  `:258` behobene Merksatz (#322); dort wurde die Geschwister-Stelle im selben Abschnitt nicht
  mitgezogen. Vorschlag: „Das Lese-Budget ist ein gemeinsames."

- [ ] **`tasks/task-297-rate-limit-theke-leseroute.md:173` nennt `READ_METHODS` im Präsens**
  („Implementiert ist deshalb `isThekePath` … getrennt von `READ_METHODS`") – die Konstante gibt es
  seit dem Rework in Runde 2 nicht mehr (repo-weit nur noch in dieser Zeile und im Runde-1-Report).
  Die Chronologie ist durch die datierte Überschrift und die spätere „Rework Runde 2"-Sektion
  erkennbar, deshalb Nitpick statt Finding – ein „(in Runde 2 ersetzt)" hinter der Klammer räumt
  die letzte Präsens-Behauptung auf.

- [ ] **Ungetestet: was ein *echter* Erfassungs-POST sieht, wenn das Schreib-Budget erschöpft ist.**
  ADR-048 entscheidet diesen Trade-off ausdrücklich (Konsequenzen, Bullet 4: „deckelt im Extremfall
  auch echte Erfassung") und stellt fest, dass eine HTML-429 „für den Client kein verwertbarer
  `VerzehrActionState`" ist – das relitigiere ich nicht. Offen ist nur: Kein AK und kein Test
  beschreibt das resultierende **UI**-Verhalten (`useActionState` bekommt eine HTML-Antwort statt
  eines Action-Ergebnisses). Neu ist die Lage durch diesen PR – vor ihm hatte der Schreibpfad im
  Proxy keine Obergrenze. Gehört als Frage an `/security-review` (Angreifer mit gesetztem Header
  kann die Erfassung im Fenster lahmlegen), nicht in einen weiteren `/implement`-Durchlauf.

## Positives

- **Die drei Doku-Ebenen sind jetzt widerspruchsfrei** – Spec (`:38-42`, AK-7 `:118-124`,
  AK-8 `:126-134`, OF-6 `:203-211`), ADR-048 D2/D5 und `docs/routes.md:27` sagen dasselbe wie
  `proxy.ts:68-71`. Der Runde-2-Fund war ein reiner Doku-Fund und wurde als solcher behandelt:
  **kein Produktionscode angefasst** (per `git diff` gegen den Vor-Rework-Stand nachgeprüft), genau
  der im Report vorgezeichnete Umfang.
- **OF-6 dokumentiert die widerlegte Prämisse statt sie stillschweigend zu ersetzen**
  (`spec-297:207-211`) – wer die Spec später liest, sieht, *warum* „nur GET/HEAD" falsch war. Das
  ist die teurere, aber richtige Variante; dieselbe Form wie ADR-048 D5.
- **Die selbst gefundene fünfte Drift-Stelle** („Nicht inbegriffen", `spec-297:72-75`) belegt, dass
  der Grep-Sweep aus Lesson #264 wirklich gelaufen ist und nicht nur die vier gemeldeten
  Zeilennummern abgearbeitet wurden.
- **Die Diskriminierungs-Kontrolle sitzt an der richtigen Stelle und ist wirksam.**
  `should_leaveAuthGateUntouched_when_pathOnlyLooksLikeTheke` prüft nicht die Bremse, sondern die
  Auth-Bypass-Grenze (`/thekenwart` → kein Limiter, `fakeAuth` läuft, Session-Strip greift) – und
  ist der einzige Test, der bei verbreitertem Präfix rot wird (selbst nachgemessen, siehe oben).
- **Die beiden Kommentar-Nitpicks wurden gemessen, nicht behauptet** – die Mock-Factory-Aussage
  („der Import schlägt fehl") und die `+7_200_000`-Herleitung sind je mit einer Gegenprobe belegt.
  Genau das, was Lesson #319/#314 verlangt; dass die `+2 h`-Herleitung dabei die Kopplung *korrekt*
  beschreibt, ist der Grund, warum das Finding oben sie als Vertrag benennen kann.
- **Der Schutzwert ist ehrlich beziffert.** ADR-048 D2 nennt seit dem Rework die Summe beider
  Budgets (≤ 480 Renders / ≤ ~1920 Reads pro Minute und Instanz) mit der Begründung, warum das
  Schreib-Budget dem Angreifer offensteht – eine Zahl, die den eigenen Beitrag kleiner aussehen
  lässt, aber stimmt.
- Architektur unverändert sauber: kein dritter Zähl-Code (AK-10), Fixed-Window-Arithmetik bleibt in
  `lib/rate-limit.ts`, Modul-Header zählt beide neuen Konsumenten auf (#207), Drossel-Antwort in
  einem domänenspezifisch benannten Modul (#105), kein toter `try/catch`, keine neue Route und
  damit kein `routes.md`-Drift (Drift-Check grün).

## Empfehlung

APPROVED

> **Circuit Breaker erreicht – bewusst kein NEEDS_REWORK.** Das war der **dritte** `/review`-Lauf
> auf denselben Code (CLAUDE.md → Guardrails: max. 3 Review↔Implement-Iterationen). Eine vierte
> `/implement`-Iteration wäre die falsche Antwort und ist auch nicht nötig:
>
> - **Kein kritisches Finding**, kein Befund am Produktionscode, alle 13 Findings der Runden 1+2
>   am Datei-Stand verifiziert behoben, alle Gates grün.
> - Das eine wichtige Finding ist **Test-Hygiene in einer Datei dieses PRs** und liegt im
>   Zuständigkeitsbereich des unmittelbar folgenden Pipeline-Schritts `/test` (Test-Isolation ist
>   dessen Guideline). Es dorthin zu geben ist kein Durchwinken, sondern die richtige Naht –
>   inklusive der Gegenprobe (`--sequence.shuffle`), die es messbar macht.
> - Die fünf Nitpicks sind optional; N5 (UI-Verhalten bei erschöpftem Schreib-Budget) ist als
>   Frage an `/security-review` adressiert, nicht als Änderungsauftrag.
>
> **Nichts zu eskalieren:** Der Circuit Breaker greift bei einem *ungelösten Konflikt* – hier ist
> keiner offen. Sollte `/test` die Reihenfolge-Kopplung nicht auflösen können, ist **das** der
> Moment für die Eskalation an den Menschen.

---

# Review: Task 297 – Runde 2 (2026-09-09)

> Diff-Scope: `git diff origin/main...HEAD` (6 Commits,
> 11 Dateien). Der Report von Runde 1 steht am Ende dieser Datei; seine 7 Findings sind alle
> behoben und hier abgehakt.
>
> Gate-Lauf zum Review-Zeitpunkt: `pnpm vitest run proxy.test.ts lib/rate-limit.test.ts
> lib/theke-throttle-response.test.ts` → **35 passed / 3 Dateien**. Die volle Suite und
> `pnpm lint`/`typecheck` sind in dieser Runde **nicht** erneut gelaufen (Stand aus der
> Task-Notiz: 793 passed / 59 skipped, lint + typecheck grün).
>
> **Der kritische Fund aus Runde 1 ist wirksam behoben** – am Code verifiziert: Der Zweig zählt
> jede Anfrage auf `/theke/*`, der Discriminator ist der Action-Marker, nicht die Methode.
> Alle Findings dieser Runde betreffen **Doku-Drift und eine Testlücke** – kein Produktionscode.

## Kritische Findings (müssen behoben werden)

- [x] **`docs/specs/spec-297-rate-limit-theke-leseroute.md:38-39,113-116,122-125,194-195` – die
  Spec dieses PRs behauptet an vier Stellen das Gegenteil dessen, was der PR implementiert und
  testet.** Die Spec ist in **diesem** PR entstanden (Commit `28d2f37`); sie wurde beim Rework in
  Runde 2 nicht mitgezogen, obwohl ADR-048 D5 vollständig neu geschrieben wurde. Der Widerspruch
  ist rein PR-intern belegbar, es braucht keine externe Referenz:

  | Spec-Stelle | Aussage | Ist-Zustand |
  |---|---|---|
  | `:38-39` (Wechselwirkung) | „gezählt werden nur GET und HEAD" | `proxy.ts:68-71` zählt **jede** Anfrage |
  | `:113-116` (**AK-7**) | „gilt für den Schreibpfad weiterhin **ausschließlich** die Grenze aus ADR-044; die Lese-Bremse … beantwortet ihn **nie** mit der HTML-Hinweisseite" | `thekeActionRateLimiter` (240/60 s) ist eine zweite Grenze; `proxy.test.ts:252-267` assertiert für den Server-Action-POST über Limit **exakt** eine HTML-429 |
  | `:122-125` (AK-8-Klammer) | „der Schreibpfad wird nicht mitgezählt" | er wird gezählt, nur auf ein eigenes Budget |
  | `:194-195` (**OF-6**) | „nur GET und HEAD. Jede andere Methode läuft unberührt durch; der Server-Action-POST unterliegt weiterhin allein ADR-044" | widerlegt – das ist wörtlich die in ADR-048 D5 als **falsch** gekennzeichnete Prämisse |

  Dazu spiegelt `tasks/task-297-rate-limit-theke-leseroute.md` in der AK-Liste denselben Satz
  („AK-7 Schreibpfad unberührt: Server-Action-POST unterliegt weiterhin nur ADR-044, nie der
  Lese-Bremse") und hakt ihn als **erfüllt** ab. Ein Akzeptanzkriterium, dessen Wortlaut die
  Implementierung bewusst verletzt, darf nicht als erfüllt abgehakt bleiben – entweder wird der
  Wortlaut nachgezogen (die Sache selbst ist in ADR-048 D5 sauber begründet: der Marker ist ein
  Ausweis, kein Nachweis, deshalb braucht auch der Schreibpfad ein Budget) oder das Kriterium ist
  offen.

  **Konkreter Folgeschaden, nicht nur Kosmetik:** Der nächste Pipeline-Schritt `/test`
  vervollständigt die Suite **gegen die AK-Tabelle der Spec**. Aus AK-7 in der heutigen Fassung
  folgt ein Test „Server-Action-POST wird nie mit 429 beantwortet" – der direkt gegen den
  bestehenden `should_return429_when_thekeServerActionPostOverActionLimit` läuft.

  Lesson-Klasse #253 (frisch im selben PR entstandene Spec braucht denselben Drift-Check wie ADRs)
  und #211/#176 – dieselbe Klasse, die in Runde 1 schon `docs/routes.md` traf. Die ADR-Seite wurde
  beide Male korrekt nachgezogen, die Spec-Seite kein Mal.

## Wichtige Findings (sollten behoben werden)

- [x] **`docs/adr/048-rate-limit-theke-leseroute.md:71-73` – die quantifizierte Obergrenze in D2
  ist seit D5 um den Faktor 2 zu niedrig.** D2 beziffert die Wirkung der Bremse mit „deckelt die
  Amplifikation … auf ≤ 240 Renders bzw. ≤ ~960 Neon-Reads pro Minute und Instanz". Diese Zahl
  stammt aus der Fassung mit **einem** Budget. D5 hat in Runde 2 ein zweites Budget mit denselben
  240/60 s ergänzt – und stellt dort selbst fest, dass eine Anfrage mit erfundener Action-ID „die
  Seite trotzdem rendert (am Dev-Server gemessen)". Ein Angreifer, der den `Next-Action`-Header
  setzt, holt sich also **zusätzlich** 240 Renders pro Fenster: die reale Decke ist ≤ 480 Renders
  bzw. ≤ ~1920 Neon-Reads pro Minute und Instanz. Die Herleitung des Schutzniveaus ist genau die
  Aussage, wegen der die ADR existiert – sie muss die Summe beider Budgets nennen.

  Gleiche Stelle, gleiche Ursache: `:258` („Der Zustand ist konstant – **ein** Zähler, **ein**
  Fenster-Start") beschreibt seit D5 zwei Zähler. FS-5 bleibt erfüllt (konstant ist konstant), die
  Formulierung stimmt aber nicht mehr. Lesson-Klasse #322 (Merksatz über dem im selben PR
  umgeschriebenen Detail-Absatz nicht mitgezogen).

- [x] **`proxy.test.ts:269-277` – der Zweig, der das Auth-Gate überspringt, hat keine
  Diskriminierungs-Kontrolle in der Gegenrichtung.** Der einzige Negativfall ist `/veranstaltung`
  – ein weit entfernter Pfad. Eine Verbreiterung von `THEKE_PATH_PREFIX` (`proxy.ts:22`) fällt
  damit durch kein Netz, obwohl `isThekePath` entscheidet, ob eine Anfrage **ganz am Auth-Gate
  vorbei** läuft: Träfe das Präfix zu breit, würde jeder künftige Pfad, der mit `/theke` beginnt
  (z. B. `/thekenwart`), unauthentifiziert an die Route durchgereicht – ein Auth-Bypass, kein
  Rate-Limit-Detail.

  **Mutationsbeleg** (Lesson #286 – derselbe Assert-Ausdruck, nicht nur derselbe Grundbefehl):
  `THEKE_PATH_PREFIX = "/theke/"` → `"/theke"` mutiert, `pnpm vitest run proxy.test.ts
  lib/rate-limit.test.ts lib/theke-throttle-response.test.ts` → **35 passed, unverändert grün**.
  Danach mit `git checkout -- proxy.ts` zurückgenommen (Baum sauber). Ein Nahtreffer-Fall
  (`request("GET", "/thekenwart")` → `tryAcquireMock` **nicht** aufgerufen, `fakeAuth` aufgerufen)
  macht die Mutation rot. Kann auch `/test` nachziehen; dann bitte dort mit demselben
  Mutationsbeleg.

## Nitpicks (optional)

- [x] **`lib/theke-throttle-response.ts:38-39` – die zweite, unerzwungene Kopplung an die
  Fensterlänge ist stehen geblieben.** Runde-1-Finding W2 wurde für den Header behoben
  (`RETRY_AFTER_SECONDS` leitet sich jetzt aus `THEKE_RATE_LIMIT_WINDOW_MS` ab), der **sichtbare**
  Satz sagt aber weiterhin fest „in etwa einer Minute". Ein geändertes Fenster zieht den Header
  mit und die Prosa nicht – dieselbe Klasse, nur eine Zeile tiefer. Lesson #264: Fix per Grep auf
  die Geschwister-Stellen im selben PR ausweiten. Entweder den Satz aus der Konstante
  interpolieren oder ihn fenster-unabhängig formulieren („gleich noch einmal" reicht für AK-4).

- [x] **`lib/rate-limit.test.ts:206` – `Date.now() + 7_200_000` ohne Herleitung.** Der Test
  darüber nimmt `+ 3_600_000` und begründet den Sprung („über die Importzeit hinaus"); warum
  dieser Test einen doppelt so großen braucht, steht nirgends. (Er braucht ihn, weil der
  vorherige Test die Fake-Uhr bereits auf ~+3,66 Mio. ms gestellt und die Singletons dort
  gezählt hat – geteilter Zustand zwischen den `describe`-Blöcken.) Magic Number mit
  Reihenfolge-Semantik: Herleitung sofort mitschreiben (Lesson #189).

- [x] **`proxy.test.ts:22-24` – der Kommentar behauptet eine falsche Fehlerwirkung.** „bekäme
  sonst `NaN` statt `60`" – tatsächlich bricht Vitest schon beim Import ab. **Empirisch geprüft**
  (Lesson #319 – „X bewirkt Y" ist eine überprüfbare Tatsachenbehauptung): Konstante aus der
  Mock-Factory entfernt → `Error: [vitest] No "THEKE_RATE_LIMIT_WINDOW_MS" export is defined on
  the "@/lib/rate-limit" mock`, 1 Datei rot; danach zurückgenommen. Der Kommentar sollte das sagen
  – „sonst schlägt der Import der Drossel-Antwort fehl" – statt eine `NaN`-Folge zu erfinden. (Zur
  Einordnung: In dieser Datei assertiert kein Test den `Retry-After`-Wert; die Konstante ist hier
  reine Import-Voraussetzung.)

## Positives

- **Der kritische Fund aus Runde 1 ist an der Wurzel behoben, nicht kaschiert.** Der Discriminator
  wanderte von der HTTP-Methode auf den Server-Action-Marker, und statt eines ungezählten
  Freibriefs bekam der Schreibpfad ein **eigenes** Budget – die Einsicht „der Marker ist ein
  Ausweis, den jeder setzen kann" ist die richtige und wird in Code (`proxy.ts:31-42`), ADR (D5)
  und Test (`proxy.test.ts:252-257`) übereinstimmend begründet. Genau das ist die schwierigere,
  nicht die bequeme Lösung.
- **Die bewusste Grenze des Discriminators ist getestet statt angenommen** – der No-JS-Multipart-
  Pfad hat einen eigenen Testfall (`proxy.test.ts:199-213`) samt Begründung, warum er im heutigen
  Aufbau unerreichbar ist. Das war in Runde 1 explizit eingefordert.
- **Der Mutationsbeleg der Zweigauswahl ist in der Task-Notiz mit den drei rot werdenden
  Testnamen dokumentiert** – nicht nur „Mutation getestet" behauptet (Lesson #286 sauber
  angewandt).
- **`docs/routes.md:27`** ist präzise nachgezogen („kein Auth-Gate, Token; Rate-Limit im Proxy,
  ADR-048") und der fail-closed Drift-Check bleibt grün.
- **Die Trennung der Budgets ist am echten Singleton belegt**
  (`lib/rate-limit.test.ts:202-212`) – ein erschöpftes Lesebudget lässt das Schreib-Budget
  unberührt. Ohne eigene Zähler-Instanz wäre AK-7 still gebrochen.
- **Die Fixture-Erweiterung ist die richtige Härtung:** `pathname` ist Pflichtargument mit
  Begründung – ein Default hätte die bestehenden Session-Guard-Tests still in den neuen Zweig
  fallen lassen.
- Kein dritter Zähl-Code (AK-10), Modul-Header in `lib/rate-limit.ts:1-8` zählt **beide** neuen
  Konsumenten auf (Lesson #207), kein toter `try/catch` um `tryAcquire`.

## Empfehlung

NEEDS_REWORK

> **Umfang des Reworks:** ausschließlich Markdown (`spec-297` an vier Stellen + AK-Zeile in der
> Task-Datei, `ADR-048:71-73` und `:258`, drei Kommentare) plus **ein** Testfall in
> `proxy.test.ts`. **Kein Produktionscode.**
>
> **Circuit Breaker:** Das wäre Iteration 3 von maximal 3 (CLAUDE.md → Guardrails). Findet die
> nächste Review-Runde erneut Blockierendes, wird eskaliert statt weiter iteriert.
>
> **Rework erledigt (`/implement`, 2026-09-09):** Alle 6 Findings behoben – der Umfang blieb wie
> vorgezeichnet reines Markdown plus **ein** Testfall
> (`should_leaveAuthGateUntouched_when_pathOnlyLooksLikeTheke`), **kein Produktionscode**. Details,
> der geforderte Mutationsbeleg (`"/theke/"` → `"/theke"` → genau dieser Test rot) und die
> empirischen Proben zu den beiden Kommentar-Nitpicks stehen in
> [`task-297-rate-limit-theke-leseroute.md`](task-297-rate-limit-theke-leseroute.md) →
> „Rework Runde 3". Der erste Nitpick (Wartezeit-Text ↔ Fensterkonstante) war zum Report-Zeitpunkt
> bereits mit `2bb6bec` behoben. **In Runde 3 am Datei-Stand verifiziert und abgehakt** – inklusive
> eigenständig nachvollzogenem Mutationsbeleg für die Diskriminierungs-Kontrolle.

---

# Review: Task 297 – Runde 1 (2026-09-09)

> Diff-Scope: `git diff origin/main...HEAD` (4 Commits, 9 Dateien).
> Gates zum Review-Zeitpunkt grün: `pnpm test` (785 passed / 59 skipped), `pnpm lint`,
> `scripts/checks/routes-doc-check.sh`.

## Kritische Findings (müssen behoben werden)

- [x] **`proxy.ts:26,49-52` (+ `docs/adr/048-rate-limit-theke-leseroute.md:115-121` D5) – Die
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

- [x] **`docs/routes.md:27` – „proxy-exempt" stimmt nach diesem PR nicht mehr.** Die Zeile
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

- [x] **`lib/theke-throttle-response.ts:14` ↔ `lib/rate-limit.ts:58` – gekoppelte Konstante ohne
  Guard.** `RETRY_AFTER_SECONDS = 60` und `windowMs: 60_000` sind zwei unabhängige Literale in
  zwei Modulen. Beide Kommentare behaupten die Kopplung ausdrücklich („Deckt sich mit der
  Fensterlänge des Limiters (ADR-048 D2)" bzw. „Retry-After deckt sich mit der Fensterlänge" in
  `lib/theke-throttle-response.test.ts:20`), aber nichts erzwingt sie: Wird das Fenster auf
  `120_000` gestellt, bleibt der Header still bei 60 und **alle drei** Kommentare werden zur
  Falschaussage. Entweder den Wert aus einer gemeinsamen Quelle ableiten (Fensterlänge als
  exportierte Konstante, aus der beide Stellen lesen) oder einen Test, der beide Literale
  gegeneinander pinnt. Lesson-Klasse #142 (Magic-Number-Konsistenz projektweit statt datei-lokal).

## Nitpicks (optional)

- [x] **`lib/rate-limit.test.ts:136-146` – der Cold-Start-Test ist nahezu tautologisch.** Ein per
  `vi.resetModules()` frisch importiertes Modul hat `count = 0`; `tryAcquire()` kann dort nur
  `false` liefern, wenn `limit <= 0` wäre. Der Test unterscheidet also nicht zwischen „fail-open
  funktioniert" und „ein frischer Zähler ist frisch"; die aussagekräftige Zusicherung (Limit 240)
  liefert bereits der Test darunter. Wenn er bleibt, sollte der Kommentar ehrlich sagen, was er
  pinnt (`limit > 0` am produktiven Singleton), statt FS-1 zu behaupten.

- [x] **`lib/theke-throttle-response.test.ts:9` – `async` ohne `await`.** Der erste Test ist als
  `async` deklariert, prüft aber nur synchrone Header/Status. Die beiden folgenden Tests brauchen
  `async` zu Recht.

- [x] **`proxy.ts:28-30` – `isThekePath(request: NextRequest)` nutzt nur `nextUrl.pathname`.** Ein
  Parameter `pathname: string` wäre der engere Vertrag (und die `request()`-Fixture in
  `proxy.test.ts` müsste die `NextRequest`-Form nicht mehr für diesen Zweck nachbauen).

- [x] **`proxy.test.ts:196-204` – asymmetrische Matcher-Prüfung.** `matcher[0]` wird als echter
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

> **Rework erledigt (`/implement`, 2026-09-09):** Alle 7 Findings behoben – Details, Mutationsbeleg
> und die Live-Gegenprobe zum kritischen Fund (POST/PUT/DELETE ohne Marker jetzt 429 statt 404)
> stehen in [`task-297-rate-limit-theke-leseroute.md`](task-297-rate-limit-theke-leseroute.md)
> → „Rework Runde 2". In Runde 2 verifiziert und abgehakt.
