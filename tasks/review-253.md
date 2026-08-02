# Review: Task 253

> **2. Review-Durchlauf** (nach dem Rework `c13f506`). Diff-Scope: `git diff origin/main...HEAD`
> (7 Dateien, +785/−83). Geprüft gegen `docs/specs/spec-253-kassieren-position-bis-reload-behalten.md`,
> `docs/specs/spec-223-…`, `docs/adr/033-…`, `docs/factory/PROJECT-CONTEXT.md` und die Lessons
> `frontend-react.md` / `testing.md` / `code-style.md`.
> Verifiziert: `scripts/checks/pre-push.sh` grün (678 Tests, Typecheck, Prettier, Routen-Doku,
> Hooks, Branch-Guard), lokal ausgeführt.
>
> **Status der Runde-1-Findings** (beide waren Test-Beweiskraft, kein Produktionscode):
> - *W1 (AC5 nur halb abgedeckt)* – **behoben.** Der `KassiereZeileForm`-Stub reicht
>   `initialErhalten` als `data-initial-erhalten` durch; der AC5-Test prüft `2,50` vor und `3,00`
>   nach der Korrektur (`page.test.tsx:423`, `:434-437`). Die Wahl „Attribut statt Text" ist
>   richtig – als Text hätte sie `should_renderKassiereForm_forEachZeile_when_offen:374` gebrochen.
>   Der Test ist jetzt diskriminierend: Server-Reihenfolge wäre `[Dora, Anna, Bernd, Carla]`,
>   assertiert wird die eingefrorene `[Bernd, Dora, Anna, Carla]`.
> - *W2 (nicht diskriminierende Sortier-Assertion)* – **teilweise behoben.** Die Umbenennung +
>   Kommentierung von `EingefroreneZeilenListe.test.tsx:103` ist korrekt und ausreichend (dort
>   trägt die Statusstabilität den Test). Für den StatusToggle-Test gilt das nicht – siehe W1 unten.

## Kritische Findings (müssen behoben werden)

(keine)

Alle acht Akzeptanzkriterien sind funktional korrekt umgesetzt. Der Produktionscode ist aus
meiner Sicht fertig: das Einfrieren wirkt ausschließlich innerhalb einer gemounteten Sitzung,
die Sortierung aus spec-223 bleibt bytegleich unangetastet, und der `inhalt` je Zeile kommt
weiterhin vollständig vom Server. Auch hydrationsseitig ist der Ansatz sauber – der
`useState`-Initializer erzeugt bei SSR und bei der Hydration dieselbe Reihenfolge aus denselben
Props, es kann also kein Mismatch entstehen.

## Wichtige Findings (sollten behoben werden)

- [x] [app/veranstaltung/[id]/kassieren/page.test.tsx:452-454] Der Kommentar behauptet „Ein
      diskriminierender Test ist für diesen Pfad nicht konstruierbar" – **das stimmt nicht**, und
      dadurch bleibt AC6 in genau dem Fall ungetestet, in dem er unter der neuen Implementierung
      überhaupt erst brechen kann. Der Test `should_hideKassiereFormsAndLeaveOrderUntouched_…`
      startet aus einem Zustand, in dem Server-Sortierung und eingefrorene Reihenfolge noch
      identisch sind – deshalb ist die Assertion in `:455` vakuum. Ein Kassiervorgang **vor** dem
      StatusToggle erzeugt die nötige Divergenz; dass sie besteht, belegt bereits
      `should_reapplyServerOrder_when_pageIsRenderedAgainAfterReload:468` (Server-Reihenfolge bei
      `{anna:250, bernd:250, carla:250, dora:null}` = `[Dora, Anna, Bernd, Carla]`).
      **Konkretes Regressionsszenario, das heute niemand rot färbt:** Bekäme
      `<EingefroreneZeilenListe>` in `page.tsx:113` ein statusabhängiges `key`
      (z. B. `key={veranstaltung.status}` – eine naheliegende künftige Änderung, wenn jemand die
      Lese-Ansicht neu aufbauen will), remountete die Komponente beim Abschluss, der Freeze ginge
      verloren und die zuvor kassierte Zeile spränge nach unten. Die gesamte Suite bliebe grün.
      **Fix (3 Zeilen, kein Produktionscode):** im bestehenden Test vor dem StatusToggle-Schritt
      einen Kassiervorgang einschieben und danach die *eingefrorene* Reihenfolge assertieren:
      ```ts
      arrangeVierZeilen({ anna: 250, bernd: null, carla: 250, dora: null });
      const { rerender } = render(await KassierenPage({ params: params("v-1") }));
      // Bernd kassieren → ab hier weicht die Server-Sortierung von der eingefrorenen ab.
      arrangeVierZeilen({ anna: 250, bernd: 250, carla: 250, dora: null });
      rerender(await KassierenPage({ params: params("v-1") }));
      // Abschluss über den StatusToggle: lädt die Seite neu, darf die Reihenfolge aber weder
      // umsortieren noch den Freeze verlieren (Server sortierte hier [Dora, Anna, Bernd, Carla]).
      arrangeVierZeilen({ anna: 250, bernd: 250, carla: 250, dora: null });
      getVeranstaltungMock.mockResolvedValue({ ...aVeranstaltung, status: "abgeschlossen" });
      rerender(await KassierenPage({ params: params("v-1") }));

      expect(teilnehmerNamesInOrder()).toEqual(["Bernd", "Dora", "Anna", "Carla"]);
      expect(screen.queryAllByTestId("kassiere-form")).toHaveLength(0);
      ```
      Und den Kommentar `:450-454` entsprechend korrigieren – die Aussage „nicht konstruierbar"
      muss weg, sonst zementiert sie die Lücke für den nächsten Leser. Konform zu den Lessons
      „Negativ-Test … pfadspezifisches Signal assertieren – sonst grün aus dem falschen Grund"
      (#214) und „Spiegel-/Symmetrie-Akzeptanzkriterien beide Richtungen explizit assertieren"
      (#211).

> **Behoben im Rework (`/implement`, 2026-08-02):** Der StatusToggle-Test kassiert jetzt zuerst
> Bernd (Divergenz Server-Sortierung `[Dora, Anna, Bernd, Carla]` ↔ eingefrorene
> `[Bernd, Dora, Anna, Carla]`) und assertiert danach über den Statuswechsel hinweg die
> eingefrorene Reihenfolge; der Kommentar nennt statt „nicht konstruierbar" konkret das
> abgedeckte Regressionsszenario. Diskriminierung belegt: mit `key={veranstaltung.status}` an
> `<EingefroreneZeilenListe>` wird genau dieser Test rot (677 passed / 1 failed), alle übrigen
> bleiben grün; `page.tsx` danach bytegleich (`git diff` nennt die Datei nicht).

## Nitpicks (optional)

- [ ] [app/veranstaltung/EingefroreneZeilenListe.tsx:22, :26] Unverändert aus Runde 1: die
      route-neutral benannte Komponente hardcodet das Layout ihres einzigen Konsumenten
      (`flex flex-col gap-3` am `<ul>`, `rounded border … p-4` am `<li>`). Lesson #188/#187 und
      das offene Issue #205 zielen genau darauf. Bewusst als `/refactor`-Kandidat zurückgestellt –
      der Umzug war ein byte-gleicher 1:1-Move (Diff erneut geprüft), keine visuelle Regression.
- [ ] [app/veranstaltung/EingefroreneZeilenListe.tsx:13-16 vs. app/veranstaltung/ZeileRow.tsx]
      Unverändert aus Runde 1: Musterbruch (Listen-Komponente besitzt das `<li>` und nimmt einen
      opaken `inhalt: ReactNode` statt `children`). Funktional gleichwertig, gut begründet durch
      „nur die Hülle wird Client-Komponente".
- [ ] [app/veranstaltung/[id]/kassieren/page.tsx:114-177] Unverändert aus Runde 1: ~60-zeiliges
      JSX-Fragment in einem `.map`-Callback in einem Prop; `KassierenPage` bleibt bei ~160 Zeilen.
      Extraktion einer präsentationalen `KassierZeileInhalt` ist Kandidat für `/refactor`.
- [ ] [app/veranstaltung/EingefroreneZeilenListe.test.tsx:20-22 und
      app/veranstaltung/[id]/kassieren/page.test.tsx:176] Beide Reihenfolge-Helfer lesen
      `li.querySelector("span")` – also das *erste* `<span>` – und funktionieren nur, weil das
      Markup den Namen vor dem Badge platziert. `page.test.tsx` erbt das aus `main` (kein neues
      Problem), `EingefroreneZeilenListe.test.tsx` führt es neu ein. Ein
      `data-testid="name-…"` (analog zum vorhandenen `status-…`) machte den Helfer
      fixture-unabhängig.
- [ ] [app/veranstaltung/VerzehrAufschluesselung.tsx:6-7] Der Modul-Kommentar begründet das
      native `<details>` mit „ohne Client-JS, **damit die Kassier-Seite Server Component bleiben
      kann**". Die Aussage ist weiterhin **korrekt** (`page.tsx` ist unverändert eine Server
      Component, `VerzehrAufschluesselung` wird server-gerendert und nur als `inhalt`-Prop
      durchgereicht) – seit #253 steckt in der Liste aber eine Client-Komponente, was die Passage
      leicht missverständlich macht. Ein Halbsatz („die Liste selbst ist seit #253 eine
      Client-Hülle, der Zeileninhalt bleibt server-gerendert") würde die Doku-Drift vermeiden
      (Geist von Lesson #176/#211). Kein Faktenfehler, daher nur Nitpick.

## Positives

- **Runde-1-Rework präzise und minimal ausgeführt:** Beide Findings betrafen nur die
  Testbeweiskraft, und genau dort wurde angefasst – `page.tsx` ist gegenüber dem Vor-Rework-Stand
  bytegleich. Die Attribut-statt-Text-Entscheidung beim Stub ist mit ihrer Nebenwirkung auf
  `:374` sauber begründet (`page.test.tsx:37-41`).
- **Spec-Kern exakt getroffen:** Eingefroren wird ausschließlich die Reihenfolge der `zeile.id`s;
  Badge, Kategoriebeträge, Verzehr-Gesamt, Spende, `VerzehrAufschluesselung` und
  `initialErhalten` bleiben server-gerendert und damit live. Nur die `<ul>`/`<li>`-Hülle wandert
  über die Client-Grenze – die minimal mögliche Client-Fläche für diese Anforderung.
- **`useState`-Initializer statt `useEffect`** (`EingefroreneZeilenListe.tsx:19`) – vermeidet
  `react-hooks/set-state-in-effect` (Lesson #49) und macht „Reload → Remount → Server-Sortierung"
  zum natürlichen Standardverhalten statt zum Sonderfall. SSR und Hydration erzeugen dieselbe
  Reihenfolge → kein Hydration-Mismatch.
- **Stabile `<li key={zeile.id}>`:** Beim Zurücksortieren verschiebt React die vorhandenen
  DOM-Knoten, statt sie neu zu erzeugen. Dadurch überleben sowohl der Eingabewert im
  `KassiereZeileForm` als auch der `open`-Zustand des nativen `<details>` einen Kassiervorgang –
  Voraussetzung für AC5, und kein Anzeichen des in Lesson #206 beschriebenen Key-Musterbruchs.
- **Sortierlogik unangetastet:** `page.tsx:73-79` (spec-223) ist unverändert; der Diff des
  Zeilen-Markups ist ein reiner 1:1-Move (Klassen byte-gleich) – keine zweite Wahrheitsquelle für
  die Reihenfolge.
- **Fail-safe in beide Richtungen und belegt:** `ordneNachEingefrorenerReihenfolge` hängt
  unbekannte Ids an (statt sie stillschweigend auszublenden) und überspringt entfallene Ids –
  beides mit eigenem Test (`:133`, `:148`), obwohl auf dieser Seite nicht erwartet.
- **Zweistufiger Testaufbau:** Komponente isoliert *und* die echte Kassierseite über
  `render` → `rerender` als simulierter `revalidatePath`-Zyklus. Der Reload-Test (`:459`) belegt
  die Gegenrichtung (Server-Sortierung nach Remount) – Spiegel-Assertion aus Lesson #211 erfüllt.
- **Testfixture konsolidiert statt dupliziert:** `arrangeVierZeilen(...)` ersetzt den vorher
  inline duplizierten Setup-Block, und `teilnehmerNamesInOrder()` wird wiederverwendet statt neu
  danebengelegt (vgl. Lesson #240). Die Magic Numbers `250`/`null` sind an der Fixture erklärt
  (`page.test.tsx:194-196`).
- **Architektur/Doku:** Keine Routen-Änderung → `docs/routes.md` korrekt unberührt, Drift-Check
  grün (#145). Kein ADR betroffen: ADR-033 beschreibt Datenmodell und Abschluss-Gate, nicht die
  Listendarstellung oder die Sortierung – die Lesson „PR ändert eine von einer ADR beschriebene
  Mechanik" (#211) greift hier nachweislich nicht.
- **Ehrliche Task-Dokumentation:** Die nicht durchgeführte UI-Verifikation am Dev-Server ist mit
  Ursache (kein Docker/keine DB) und Ersatznachweis vermerkt statt verschwiegen.

## Out-of-Scope-Findings (als Issue angelegt)

- **#271** (aus Runde 1, weiterhin gültig) – „E2E-Abdeckung für die Kassierseite
  (`/veranstaltung/[id]/kassieren`) aufbauen" (`enhancement`, `test`). Der echte RSC-Zyklus
  (Server Action → `revalidatePath` → neuer Payload bei erhaltenem Client-State) wird in den
  jsdom-Tests nur durch `rerender(await KassierenPage(...))` *simuliert*. Verwandt: #166.
  In dieser Runde kein neues Out-of-Scope-Finding.

## Empfehlung

NEEDS_REWORK

Der Produktionscode ist fertig und korrekt – keine Änderung daran nötig, und ich empfehle
ausdrücklich, `page.tsx` und `EingefroreneZeilenListe.tsx` erneut nicht anzufassen. Offen ist ein
einziges Test-Finding: AC6 ist im einzigen Szenario, in dem er unter der neuen Implementierung
brechen kann (Freeze aktiv + StatusToggle), nicht abgesichert, und der Testkommentar behauptet
fälschlich, das sei unmöglich. Der Fix ist eine Ergänzung von drei Zeilen im bestehenden Test
plus die Korrektur des Kommentars.

> **Circuit Breaker:** Dies ist Review-Iteration 2 von maximal 3. Falls nach dem Rework noch
> etwas offen bleibt, nicht weiter iterieren, sondern eskalieren.
