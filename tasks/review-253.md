# Review: Task 253

> **3. Review-Durchlauf** (nach dem Rework `5f66703`) – **letzte Iteration laut Circuit Breaker.**
> Diff-Scope: `git diff origin/main...HEAD` (7 Dateien, +847/−83). Geprüft gegen
> `docs/specs/spec-253-…`, `docs/specs/spec-223-…`, `docs/adr/**` (vollständiger Sweep),
> `docs/routes.md`, `docs/factory/PROJECT-CONTEXT.md` und die Lessons `frontend-react.md` /
> `testing.md` / `code-style.md` / `factory-workflow.md`.
> Drei unabhängige Personas (Logik · Code-Qualität · Architektur), jede read-only.
> Verifiziert: Coverage-Lauf über beide betroffenen Testdateien – 35 Tests grün,
> `EingefroreneZeilenListe.tsx` 100 % (Stmts 13/13, Branch 0/0, Funcs 9/9, Lines 10/10).
>
> **Status der Runde-2-Findings:** W1 (nicht diskriminierender StatusToggle-Test) – **behoben und
> unabhängig bestätigt.** Die Divergenz wird jetzt vor dem Statuswechsel hergestellt; die Mutation
> `key={veranstaltung.status}` färbt genau diesen Test rot. `page.tsx` blieb dabei unangetastet.

## Kritische Findings (müssen behoben werden)

(keine)

Der Produktionscode ist in dieser Runde zum dritten Mal – und erstmals mit gezielter Suche nach
Reconciliation-, Hydration-, Strict-Mode-, Router-Cache- und Duplikat-Fehlern – als **korrekt**
bestätigt. Er soll nicht mehr angefasst werden. Belegt wurde außerdem:

- Der `useState`-Freeze überlebt den `revalidatePath`-Zyklus (Komponente steht immer im selben
  Slot des Ternary, `page.tsx:113` – kein `key`, kein Typwechsel).
- Kein Hydration-Mismatch möglich: SSR und Hydration nutzen dieselbe RSC-Payload, der Initializer
  ist eine reine Funktion der Props.
- Strict-Mode-Double-Invoke unschädlich (Initializer rein), kein Service Worker im Repo,
  kein Suspense-Boundary um die Liste.
- Navigation zwischen zwei Veranstaltungen auf derselben Route wäre selbst dann korrekt, wenn der
  State überlebte – der Append-Zweig rettet den Fall.
- Es gibt **keine** ADR, die die Kassier-Listendarstellung oder deren Sortierung namentlich
  beschreibt (Sweep über `docs/adr/**`) → Lesson #211 greift für ADRs hier nachweislich nicht.
- Routen-Doku korrekt unberührt: der Diff fügt keine `page.tsx`/`route.ts` hinzu,
  `routes-doc-check.sh:44-52` leitet Routen ausschließlich daraus ab (#145 greift nicht).

## Wichtige Findings (sollten behoben werden)

- [ ] **[app/veranstaltung/EingefroreneZeilenListe.test.tsx:103-117] Der Test zum Fehlerszenario
      „Kassieren schlägt fehl" ist vakuum – und Runde 2 hat ihn ausdrücklich freigegeben.**
      Von zwei Personas unabhängig gefunden, von mir am Code nachgeprüft. Beide `render`-Aufrufe
      (`:105`, `:109`) übergeben **identische** Props. Damit ist nicht nur die Reihenfolge-
      Assertion (`:115`) nicht diskriminierend – das räumt der Kommentar selbst ein –, sondern
      auch die als tragend deklarierte Status-Assertion (`:116`): Die einzige Mutationsklasse, die
      eine Status-Assertion töten könnte, ist „Inhalt mit einfrieren", und die liefert hier
      `"offen"` (den Wert des Erstrenders) → grün.
      **Konkrete Mutation, die grün bleibt:** `:23` von
      `ordneNachEingefrorenerReihenfolge(zeilen, eingefroreneReihenfolge).map(...)` auf
      `zeilen.map(...)` ändern – der Freeze ist komplett entfernt, dieser Test bleibt grün.
      Der Kommentar `:111-114` zementiert damit für den nächsten Leser den Irrglauben, das
      Fehlerszenario sei abgedeckt – exakt das Muster aus Lesson #214 („grün aus dem falschen
      Grund"), und dieselbe Ursache wie beim StatusToggle-Test aus Runde 2, nur an der zweiten
      Stelle nicht angewandt.
      **Fix (~5 Zeilen, nur Testcode):** erst ein *erfolgreiches* Kassieren (erzeugt die
      Divergenz), dann das *fehlgeschlagene* (Server liefert unveränderte Daten):
      ```
      render:   [z-1 Anna offen, z-2 Bernd offen, z-3 Carla offen]   → frozen [z-1,z-2,z-3]
      rerender: [z-1 Anna, z-3 Carla, z-2 Bernd bezahlt]             (Bernd kassiert)
      rerender: [z-1 Anna, z-3 Carla, z-2 Bernd bezahlt]             (Kassieren von Carla scheitert)
      assert:   namenInReihenfolge() = [Anna, Bernd, Carla]  UND  status-z-3 = "offen"
      ```
      Danach entfällt der Erklärkommentar `:111-114` ersatzlos. Zusätzlich empfehlenswert und
      unabhängig davon billig: in `app/veranstaltung/actions.test.ts` bei den sechs bestehenden
      `kassiereZeileAction`-Fehlerfällen (`:585`–`:617`) je ein
      `expect(revalidatePathMock).not.toHaveBeenCalled()` – analog zum dort schon konsequent
      gefahrenen `expect(setErhaltenMock).not.toHaveBeenCalled()`. Heute bliebe die Mutation
      „`revalidatePath` vor die Guards ziehen" (`actions.ts:216-239`) in der **gesamten** Suite
      grün, obwohl sie jeden fehlgeschlagenen Kassiervorgang einen vollen Re-Render auslösen ließe.

- [ ] **[docs/specs/spec-253-…md:54 und :82-85] Die im selben PR gelieferte Spec beschreibt eine
      andere Mechanik als die, die gebaut (und in Runde 2 per Test zementiert) wurde.**
      Ebenfalls von zwei Personas unabhängig gefunden, Wortlaut von mir verifiziert.
      Der Freeze ist **mount-basiert**, nicht **kassier-basiert** (`EingefroreneZeilenListe.tsx:19`).
      Die Spec sagt an zwei Stellen das Gegenteil:
      - `:54` – „…Abschluss/Wiederöffnen via `StatusToggle` – **nur der Kassieren-Klick friert die
        Position ein**." Die Begründung in `:28-29` („dort ändert sich `kassier.bezahlt` ohnehin
        nicht") trägt nur für einen StatusToggle **ohne** vorherigen Kassiervorgang. Danach ist die
        Server-Sortierung bereits divergiert, und der StatusToggle-Render zeigt seit #253 die
        eingefrorene statt der Server-Reihenfolge – das Sortierverhalten dieser Aktion hat sich
        beobachtbar geändert.
      - `:84-85` – „**kein Einfrieren einer Position ohne tatsächliche Statusänderung**." Der
        Freeze existiert ab Mount, unabhängig davon, ob je kassiert wurde.
      Der auf Wunsch von Runde 2 verstärkte Test `page.test.tsx:440-460` assertiert nach dem
      Statuswechsel die **eingefrorene** Reihenfolge `[Bernd, Dora, Anna, Carla]` – das
      „bestehende Sortierverhalten" vor #253 wäre `[Dora, Anna, Bernd, Carla]` gewesen. **Test und
      Spec-Scope widersprechen sich innerhalb desselben Commits.** Runde 1 und 2 haben nur ADRs
      auf Drift geprüft und die Spec als Maßstab genommen, statt sie gegen das Ergebnis zu spiegeln
      (Lesson #176/#211, hier verschärft: die Prosa entsteht *in diesem PR*).
      **Fix (Doku, ~6 Zeilen, kein Produktionscode):**
      - `spec-253:54` und `:28-29` auf die tatsächliche Mechanik umformulieren – „die Reihenfolge
        wird beim ersten Rendern der Seite eingefroren und gilt für die gesamte Seiten-Session;
        jede Neuladung ohne Remount (Kassieren **und** StatusToggle) behält sie bei".
      - `:84-85` von „kein Einfrieren" auf „keine Positions**änderung**" korrigieren.
      - AC6 (`:76-78`) als „der Freeze bleibt erhalten; das Sortierverhalten des StatusToggle
        selbst wird nicht zusätzlich verändert" präzisieren, passend zum Test.
      - Gegenrichtung mitpflegen: in `spec-223` einen zweizeiligen Nachtrag unter das AC
        „…WHEN die Kassierseite gerendert wird THEN erscheinen alle offenen oberhalb aller
        bezahlten" (`spec-223:46-48`) – seit spec-253 gilt das für den Zustand **nach einem
        Seitenaufruf**. Präzedenz im Repo: ADR-039 („Ändert ADR-035 D2 … siehe Drift-Hinweis dort").
      - Ein Satz im Modulkommentar `EingefroreneZeilenListe.tsx:35-37`: „neu hinzukommende Zeilen
        werden angehängt, ihre Position wird nicht eingefroren".

## Nitpicks (optional)

- [ ] [app/veranstaltung/EingefroreneZeilenListe.test.tsx:52] `should_showCurrentServerContent_when_zeileStaysAtFrozenPosition`
      – im Test **bleibt nichts an einer eingefrorenen Position** (Server- und eingefrorene
      Reihenfolge sind identisch). Der Test ist nicht vakuum (er tötet „Inhalt mit einfrieren"),
      aber die `when`-Bedingung ist unbelegt. Eine Zeile: im Rerender zusätzlich umsortieren →
      Name wird ehrlich, Test strikt stärker.
- [ ] [app/veranstaltung/[id]/kassieren/page.test.tsx:440] „…ViaStatusToggle" im Namen, obwohl
      `StatusToggle` zu `() => null` gestubbt ist (`:42`) – umgeschaltet wird nur der
      `getVeranstaltung`-Mock. Ehrlicher: `…when_statusChangesToAbgeschlossen`.
- [ ] [app/veranstaltung/[id]/kassieren/page.test.tsx:402 und :462] Doppelung zu
      `EingefroreneZeilenListe.test.tsx:66` bzw. `:119` – identisches Szenario, identische
      Mutationsklasse; der Seitenlevel-Anteil („Verdrahtung stimmt") ist bereits durch `:386`
      belegt (Lesson #240). Berechtigt bleibt die zweite Ebene bei `:386`, `:415`, `:440`.
- [ ] [app/veranstaltung/EingefroreneZeilenListe.tsx:13-18] Der Typ `EingefroreneZeile` bezeichnet
      Objekte, die gerade **nicht** eingefroren sind – eingefroren ist nur die Reihenfolge ihrer
      Ids. → Teil von **#272**.
- [ ] [app/veranstaltung/EingefroreneZeilenListe.tsx:15] `inhalt: ReactNode` statt `children` ist
      der einzige solche Fall im `app/`-Baum (sonst nur `app/layout.tsx:43`,
      `IdentityGate.tsx:203`). Die geprüften Alternativen scheiden alle aus (`children` +
      Key-Matching fragil, Render-Prop überquert die RSC-Grenze nicht, Daten-statt-Slots zöge die
      ganze Zeilendarstellung in den Client). **Bewusst richtig – aber der Code sagt es nicht.**
      Ein Satz an `:14-16` hebt den Musterbruch von „unbegründet" auf „bewusst".
- [ ] [app/veranstaltung/[id]/kassieren/page.test.tsx:455-457] Der (gute) Warnkommentar vor einem
      statusabhängigen `key` liest sich wie „hier gehört kein `key` hin". Ein `key={veranstaltung.id}`
      wäre unbedenklich und gegen eine künftige „nächste Veranstaltung"-Soft-Navigation sogar
      sinnvoll – ein Halbsatz fängt die Fehllesart ab.
- [ ] [app/veranstaltung/EingefroreneZeilenListe.tsx:42, :49] Doppelte Ids würden still
      dedupliziert (Map „last wins"). Praktisch unmöglich (DB-PK), aber die route-neutral
      benannte Komponente lädt zur Wiederverwendung ein → Eindeutigkeit im Typkommentar nennen.
- [ ] [app/veranstaltung/EingefroreneZeilenListe.test.tsx:148] Spiegelfall „Id verschwindet **und
      kommt wieder**" ist ungetestet (Verhalten am Code geprüft und korrekt). Ein dritter
      `rerender` im bestehenden Test würde reichen (Lesson #211).
- [ ] [app/veranstaltung/KassiereZeileForm.tsx:30-32] Submit **vor** der Hydration (Mobil-PWA an
      der Theke) fällt auf den nativen Form-Submit zurück → volle Navigation → neuer Mount →
      Server-Sortierung → die Zeile springt doch nach unten. Inhärent für jeden `useState`-Ansatz
      und selbstheilend, aber die einzige reale Lücke in AC1 – gehört als bekannte Grenze in die
      Task-Doku.
- [ ] [docs/anleitung/veranstalter/anleitung.md:160-169] Schritt 6 („Der Status springt von
      ‚offen' auf ‚bezahlt'") bleibt korrekt, nennt das neue sichtbare Verhalten aber nicht
      („die Karte bleibt an ihrer Stelle, erst beim erneuten Öffnen wird neu sortiert") – genau
      die Art Verhalten, für die ein Nutzer sonst einen Bug vermutet.
- [ ] [app/veranstaltung/VerzehrAufschluesselung.tsx:6-7] Unverändert offen aus Runde 1+2:
      „…damit die Kassier-Seite Server Component bleiben kann" ist sachlich weiterhin korrekt,
      liest sich seit #253 aber als Constraint, den die neue Client-Hülle verletzt. Halbsatz.
- [ ] [EingefroreneZeilenListe.test.tsx:20-22 / page.test.tsx:176] Beide Reihenfolge-Helfer lesen
      `li.querySelector("span")` (Positionsheuristik), obwohl die neue Testdatei mit
      `data-testid="status-…"` bereits das saubere Muster verwendet. Unverändert aus Runde 2.

## Positives

- **Kein Produktionscode-Fehler in drei unabhängigen Durchläufen.** Die dritte Runde hat gezielt
  nach Reconciliation-, Hydration-, Strict-Mode-, Router-Cache-, Duplikat- und Leerlisten-Fehlern
  gesucht und keinen gefunden. Der `useState`-Initializer ist rein, damit Strict-Mode- und
  Hydration-sicher.
- **Minimalste Client-Fläche, korrekt geschnitten.** Nur `<ul>`/`<li>` überqueren die Grenze;
  Badge, Kategoriebeträge, Verzehr-Gesamt, Spende, `VerzehrAufschluesselung` (inkl. `<details>`
  ohne Client-JS) und `initialErhalten` bleiben server-gerendert. Kein Datenzugriff, keine
  Berechnung, kein Auth-Wissen im Client.
- **Serialisierbarkeit sauber gelöst:** die gebundene Server-Action (`page.tsx:87`) reist als
  Referenz im RSC-Payload mit, statt als Callback-Prop an die Client-Hülle gereicht zu werden.
- **Sortierung bleibt einzige Wahrheitsquelle:** `page.tsx:73-79` ist bytegleich zu `main`; die
  Client-Komponente sortiert nicht neu, sie *ordnet ein*. Die Index-Kopplung
  `zeile ↔ kassier ↔ positionen` (spec-223) bleibt intakt, weil das gezippte Objekt als Ganzes
  bewegt wird. Auch Tagessummen und „Offene Zeilen" hängen weiter an `kassierRows` (`page.tsx:80`),
  nicht an der sortierten Liste – ADR-033 D5 (SINGLE SOURCE) unangetastet.
- **`useState`-Initializer statt `useEffect`** (`:19`) – vermeidet `react-hooks/set-state-in-effect`
  (Lesson #49) und macht „Reload → Remount → Server-Sortierung" zum Default statt zum Sonderfall.
- **Stabile `<li key={zeile.id}>`:** da die gerenderte Reihenfolge während der Sitzung konstant
  bleibt, bewegt React gar keine DOM-Knoten – Eingabewert im `KassiereZeileForm` und
  `<details open>` überleben jeden Kassiervorgang zwangsläufig (Voraussetzung für AC5).
- **Fail-safe symmetrisch und real getestet:** unbekannte Ids anhängen statt ausblenden (`:49`),
  entfallene überspringen (`:46-48`) – beide Zweige haben eine **eigene** killende Mutation, also
  keine Alibi-Tests. Der Append-Zweig rettet nebenbei den Veranstaltungswechsel auf gleicher Route.
- **Der Runde-2-Fix sitzt und ist diskriminierend belegt** (`page.test.tsx:440-460`): Mutation
  `key={veranstaltung.status}` färbt genau diesen Test rot; der Kommentar nennt das
  Regressionsszenario konkret statt der früheren Falschbehauptung.
- **Testfixture konsolidiert statt dupliziert** (`arrangeVierZeilen`, `page.test.tsx:197-219`),
  Magic Numbers `250`/`null` an der Fixture erklärt, `teilnehmerNamesInOrder()` wiederverwendet
  (Lesson #240). Der `data-initial-erhalten`-Stub-Durchgriff ist der einzige Weg, AC5 auf
  Seitenebene ohne Kollateralschaden an `:374` zu belegen.
- **Coverage 100 % und ehrlich eingeordnet:** `Branches 0/0` ist korrekt (die Datei enthält keine
  Verzweigung), beide `filter`-Prädikat-Ausgänge sind real abgedeckt. Zugleich belegt dieselbe
  Runde, dass 100 % Coverage die Beweiskraft *nicht* garantiert (`:103` ist covered und vakuum) –
  Lesson #187 in beide Richtungen bestätigt.
- **Ehrliche Task-Dokumentation:** die nicht durchgeführte UI-Verifikation am Dev-Server ist mit
  Ursache (kein Docker/keine DB) und Ersatznachweis vermerkt statt verschwiegen.

## Out-of-Scope-Findings (als Issue angelegt)

- **#272** – „Kassierseite: Listendarstellung aufräumen" (`enhancement`, `tech-debt`). Bündelt die
  seit Runde 1 dreimal vertagten Refactor-Punkte, die bisher **kein** Issue hatten und beim Merge
  verdunstet wären: (a) `EingefroreneZeilenListe` ist route-neutral benannt, hardcodet aber das
  Layout ihres einzigen Konsumenten (`:22`, `:26` – Lesson #188/#187; **nicht** von #205 gedeckt,
  das betrifft `FokusListe`); (b) das ~64-zeilige JSX im `.map`-Callback (`page.tsx:114-177`),
  wofür dieselbe Datei mit `SummenZeile` (`:252-260`) den Präzedenzfall bereits liefert.
- **#273** – „Eingefrorene Reihenfolge berücksichtigt parallel geänderte/neue Zeilen nicht"
  (`enhancement`). Die Spec-Annahme „neue Zeilen gibt es auf dieser Seite nicht" gilt nur für
  Ein-Gerät-Nutzung. Bei zwei Geräten kann eine wieder **offen** gewordene Zeile unterhalb
  bezahlter Zeilen festhängen, und ein während der Sitzung angelegter Walk-in wird ans **Ende**
  angehängt. Kein Datenverlust (Abschluss-Gate serverseitig fail-closed, „Offene Zeilen" live),
  ein Reload heilt es – aber es ist eine Design-Entscheidung, die getroffen werden sollte statt
  als Nebenwirkung zu entstehen.
- **#271** (aus Runde 1, weiterhin gültig) – E2E-Abdeckung für die Kassierseite. Der echte
  RSC-Zyklus wird in den jsdom-Tests nur durch `rerender(await KassierenPage(...))` *simuliert*.

## Empfehlung

APPROVED

Der Produktionscode ist fertig, korrekt und dreifach unabhängig bestätigt; die Gates sind grün
(678 Tests, Typecheck, Prettier, Routen-Doku) und der neue Code hat 100 % Coverage. **Kein Finding
dieser Runde ist merge-blockierend, und keines betrifft Produktionscode.**

> **⚠️ Circuit Breaker – dies war Review-Iteration 3 von maximal 3. Keine vierte Runde.**
> Die zwei Wichtig-Findings gehen **nicht** in ein weiteres `/implement`, sondern gezielt an die
> nächsten Pipeline-Schritte:
> - **W1 (vakuumer Fehlerszenario-Test) → `/test`.** Es ist eine reine Testlücke in genau dem
>   Mandat des `/test`-Schritts (nur Testdateien): den Test in
>   `EingefroreneZeilenListe.test.tsx:103` mit vorheriger Divergenz aufbauen (oder ihn löschen und
>   die Abdeckung durch `:35`+`:66` dokumentieren – ein Kommentar, der begründet, *warum* eine
>   Assertion schwach ist, ist selbst ein Smell), plus die sechs
>   `expect(revalidatePathMock).not.toHaveBeenCalled()` in `actions.test.ts`.
> - **W2 (Spec-/Prosa-Drift) → Doku-Fix im selben PR, ~6 Zeilen** in `spec-253` + zwei Zeilen
>   Nachtrag in `spec-223`. Kein Verhaltens-, sondern ein Beschreibungsfehler.
> - **Eskalationspunkt an den Requirements-Owner:** W2 legt offen, dass der gebaute Freeze
>   *session-weit* wirkt, während die Spec *kassier-lokal* formuliert ist. Ich empfehle, das
>   gebaute Verhalten zu behalten (es ist das nützlichere) und die Spec nachzuziehen – die
>   Alternative (Semantik verschärfen) ist unter #273 als Entscheidung erfasst und gehört nicht
>   mehr in diesen PR.
> - Die Nitpicks bleiben optional bzw. sind in #272 gebündelt.
