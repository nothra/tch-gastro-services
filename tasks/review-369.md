# Review: Task 369

**Review-Iteration 3** (Stand `5264728`, nach dem manuellen Rework `d9a7f3e`, `f8acc99`, `5264728`).
Geprüft wurde der Diff seit der letzten Iteration (`git diff dba5c5e..HEAD`, 15 Dateien) gegen das
Wichtig-Finding und die Nitpicks aus Iteration 2. Alles, was der Rework nicht berührt, ist seit
Iteration 2 unverändert und wurde dort in drei Runden (Logik, Code-Qualität, Architektur) geprüft. Der
Reviewer hat den Rework selbst geschrieben; deshalb wurden die tragenden Behauptungen unten mit einem
eigenen Standalone-Check nachvollzogen statt nur gelesen.

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)

_Keine._ Das Wichtig-Finding aus Iteration 2 (Escape/„Abbrechen" im „+ Teilnehmer"-Dialog während einer
laufenden Action) ist behoben: `Dialog.tsx:69-72` ignoriert `cancel` bei `schliessbar={false}`,
`TeilnehmerHinzufuegenDialog.tsx:33-37,47` leitet `schliessbar` aus dem Lauf-Zähler ab,
„Abbrechen" ist währenddessen `disabled` (Z. 63). Die Tests mit nie auflösendem Promise decken beide
Bereiche ab (`TeilnehmerHinzufuegenDialog.test.tsx:262-300`) und waren vor der Änderung rot.

## Nitpicks (optional)

- [ ] [docs/factory/kleinfunde.md:464-472 (Eintrag „E2E-Helfer `login` und `createVeranstaltung` …")]
  Der Satz „Das Kopiermuster ist älter als #369; der PR hat es nicht vergrößert, sondern die eigenen
  Kopien auf den gemeinsamen Helfer reduziert" stimmt nicht. `e2e/veranstaltung-detailseite.spec.ts` ist in
  diesem PR neu (`git cat-file -e origin/main:…` schlägt fehl) und trägt mit `login`/`createVeranstaltung`
  (Z. 40-66) selbst die dritte Kopie. Reduziert wurden nur die Gast-/Einstellungs-Helfer in
  `e2e/helpers/detailseite.ts`. Der Rest des Eintrags (Anker, Fix) ist korrekt. Den Satz auf „der PR
  fügt mit der neuen Spec eine dritte Kopie hinzu" ändern (Lesson: kanonische Anker brauchen denselben
  Drift-Check, #291/#351).
- [ ] [app/veranstaltung/TeilnehmerHinzufuegenDialog.tsx:148-152,189-192 · useSchliessendeAction.ts:10-27]
  Die Start-/Ende-Meldung des Laufs ist auf zwei Stellen verteilt: Start im `onSubmit` des Bereichs, Ende
  im `finally` des Hooks. Der WHY-Kommentar erklärt das korrekt (ein `setState` am Anfang der Action
  gehört zur Transition). Die Kopplung ist aber implizit: Ein künftiger Konsument (#372 bringt vier
  weitere Dialoge), der nur `onLaeuftChange` an den Hook reicht und den `onSubmit` vergisst, bekommt
  einen Zähler von −1 und damit einen Dialog, der die Sperre später nicht mehr auslöst. Kein heutiger
  Defekt (beide Bereiche sind verdrahtet, Ablehnung und Erfolg setzen den Zähler auf 0 zurück). Vorschlag:
  Der Hook liefert den `onSubmit`-Handler gleich mit zurück, sodass die Paarung an einer Stelle liegt,
  und ein Test „Ablehnung, dann erneutes Absenden sperrt wieder" sichert den Zähler über zwei Läufe ab.
- [ ] [app/components/ui/Dialog.test.tsx:140-159] Der Test
  `should_closeWithoutError_when_returnTargetIsNoHtmlElement` deckt die Zeile ab, belegt die
  `instanceof HTMLElement`-Prüfung aber nicht: In jsdom hat `SVGElement` eine `focus()`-Methode
  (nachgeprüft: `typeof svg.focus === "function"`, der Aufruf lässt `<body>` fokussiert). Entfiele die
  Prüfung, bliebe der Test grün. Er ist damit ein Coverage-Test, kein Verhaltensbeleg. Entweder ein
  Ziel verwenden, bei dem `.focus()` werfen würde (z. B. ein Objekt mit `focus: () => { throw … }` und
  Prototyp-Attrappe), oder den Test in der Benennung als reinen Abdeckungs-Test kennzeichnen. Der
  `svg as never`-Cast ist dabei ein Hinweis auf dasselbe Problem.
- [ ] [app/components/ui/Dialog.tsx:66-72 (plausibel, nicht im Browser geprüft)] Die CloseWatcher-Härtung
  aus Iteration 2 (zweites Escape bzw. Android-Zurück-Geste nach einem abgefangenen `cancel` schließt
  das DOM, React hält `open=true`) wurde bewusst nicht umgesetzt. Mit der neuen `schliessbar`-Sperre
  ist der Fall der **Hauptanwendungsfall** der Sperre (Dialog bleibt während `pending` offen), das
  Fenster ist aber weiter klein und heilt sich beim nächsten Öffnen. Vor einem Fix im Browser
  (Chromium, Android-PWA) prüfen; bis dahin als bekannte Lücke im Report lassen.
- [ ] [app/veranstaltung/ZeilenMenue.tsx (Fokus nach „Entfernen")] Offen aus Iteration 2, bewusst nicht
  umgesetzt: Nach erfolgreichem Entfernen springt der Fokus auf den verschwundenen Auslöser, landet also
  auf `<body>`. AK19/AK29 sind nicht verletzt; ein Ersatzziel („+ Teilnehmer") wäre für Tastatur und
  Screenreader besser. Gestaltungsfrage, steht in der Task-Datei.

## Positives

- **Die Sperre sitzt an der richtigen Stelle:** Ein einziger Mechanismus (`schliessbar`) im Baustein statt
  einer privaten Attrappe im `ConfirmDialog` (`schliessenGesperrt` ist weg, `ConfirmDialog.tsx:56-58`).
  Beide Konsumenten folgen derselben Regel, die JSDoc nennt den Grund (eine unsichtbare Ablehnung).
- **Den Transition-Stolperstein hat der Rework gefunden statt umschifft:** Der erste Wurf (Start-Meldung in
  der Action) war rot, weil ein `setState` am Anfang einer Form-Action erst mit deren Ende sichtbar wird.
  Die Lösung (Start aus `onSubmit`, Ende aus `finally`) ist im Hook-Kommentar und in ADR-053 D1
  begründet. Der Zähler statt Boolean deckt gleichzeitiges Absenden beider Bereiche ab.
- **`finally` im Hook:** Wirft die Action, bleibt der Zähler nicht hängen, und der Dialog wird nicht
  dauerhaft gesperrt.
- **Nitpicks aus Iteration 2 gezielt umgesetzt:** ADR-053 D1/D3/Kopfsatz stimmen wieder mit dem Code
  überein, `TEILNEHMER_NICHT_GEFUNDEN` benennt, was die Konstante sagt, der `revalidatePath`-Kommentar
  steht über der richtigen Zeile, die Walk-in-Tests prüfen exakte Meldungstexte inklusive „zu lang"
  (`actions.test.ts:1014-1022`, Lesson #116), `setzeEinstellungen` ersetzt die beiden fast gleichen
  Helfer, und der `ConfirmDialog`-Test räumt per `try/finally` auf.
- **Nicht umgesetzte Punkte sind benannt und verankert** (Task-Datei, `kleinfunde.md`), nicht still
  fallengelassen. Out-of-Scope-Funde aus Iteration 1 sind als #385/#386 angelegt.
- **Belegte Gates:** Lint, Format, Typecheck und die Pre-Push-Gates liefen bei jedem der drei Pushes durch
  (1264+ Tests), der E2E-Lauf der drei betroffenen Specs war 9/9 grün.

## Verlauf

- **Iteration 1** (Stand `7123c8c`): 0 kritische, 7 wichtige, 13 Nitpicks, `NEEDS_REWORK`.
- **Iteration 2** (Stand `525ef32`): 0 kritische, 1 wichtiges, 13 Nitpicks, `NEEDS_REWORK`.
- **Iteration 3** (Stand `5264728`): 0 kritische, 0 wichtige, 5 Nitpicks, `APPROVED`. Das ist die dritte
  Anwendung auf **geänderten** Code (der Rework hat 15 Dateien berührt); der Circuit Breaker
  („3. Mal auf denselben Code") greift deshalb nicht, und es gibt keinen ungelösten Konflikt zu eskalieren.
- Keine neuen Out-of-Scope-Funde in dieser Iteration. Die Nitpicks sind im Scope und optional.

## Empfehlung

APPROVED
