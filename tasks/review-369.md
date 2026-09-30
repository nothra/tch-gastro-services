# Review: Task 369

**Review-Iteration 2** (nach dem Rework `c4f2ae5`, `c7952f3`, `525ef32`). Runde 1 (Logik), Runde 2
(Code-Qualität) und Runde 3 (Architektur) liefen als eigene Sub-Agenten auf dem Stand `525ef32`. Die
Agenten hatten keinen Bash-Zugriff und haben die Dateien auf HEAD direkt gelesen. Den Diff
(`git diff origin/main...HEAD`, `7123c8c..HEAD`) und die tragenden Behauptungen hat der Orchestrator
selbst nachgeprüft (`TeilnehmerHinzufuegenDialog.tsx`, `ConfirmDialog.tsx`, `Dialog.tsx`,
ADR-053 Z. 7-8/96-98/150-151, `actions.ts:69,92`, `anleitung.md:103`).

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)

- [ ] [app/veranstaltung/TeilnehmerHinzufuegenDialog.tsx:40-56 (dazu :72, :140-141, :154, :186-187)]
  Im „+ Teilnehmer"-Dialog bleiben Escape und „Abbrechen" während einer laufenden Action aktiv. Das
  ist dasselbe Muster wie Runde-1-W1, der Rework hat es nur im `ConfirmDialog` behoben.
  - `Dialog` bekommt immer `onClose={schliessen}` (Z. 42), „Abbrechen" (Z. 53) hat kein `disabled`.
    `pending` entsteht nur in `StammteilnehmerBereich`/`GastBereich` und wird nicht nach oben gereicht.
  - Hier wiegt es schwerer als beim `ConfirmDialog`: Der `useActionState` liegt in den Kindern, und
    die werden beim Schließen ausgehängt (`Dialog.tsx:85`). Eine Ablehnung (FS1 „abgeschlossen",
    FS2 „Nicht mehr wählbar: …") geht deshalb still verloren, obwohl FS1/FS2 die Meldung **im Dialog**
    verlangen. ADR-053 D1 (Z. 53-55) begründet die Sperre mit genau diesem Fall.
  - Nebenwirkung beim Gast: Schließen, neu öffnen und erneut abschicken, während der erste Aufruf
    noch läuft, legt den Gast doppelt an (`createTeilnehmer` prüft keine Namens-Eindeutigkeit).
  - Die Pending-Zweige („Hinzufügen …", „Anlegen …", `disabled={pending}`) sind ungetestet. Alle
    Tests arbeiten mit sofort aufgelösten Mocks, das Ziel „neuer Code 100 %" ist damit verfehlt.
  - Vorschlag: Die Sperre in `Dialog` selbst verlegen (z. B. Prop `schliessbar`). Dann entfällt
    `schliessenGesperrt` im `ConfirmDialog`, und beide Konsumenten folgen derselben Regel. Den
    Pending-Zustand beider Bereiche an den Dialog melden und „Abbrechen" währenddessen sperren.
    Test mit einem nie auflösenden Promise: `cancel` auslösen, dann erwarten, dass der Dialog offen
    bleibt, die Schaltflächen gesperrt sind und „Hinzufügen …" angezeigt wird (analog
    `ConfirmDialog.test.tsx:100-112`). Soll nur der `ConfirmDialog` sperren, gehört die Begründung
    in ADR-053 D1.

## Nitpicks (optional)

- [ ] [docs/adr/053-detailseite-dialog-baustein-mehrfach-anlage-kennzahlen.md:150-151] Alternative A
  sagt „Escape, inerter Hintergrund und Fokus-Rücksprung kommen von der Plattform". Das widerspricht
  D1 nach dem Rework: Den Rücksprung setzt der Baustein selbst (`returnFocusRef`, Safari/jsdom). Die
  ADR ist im selben PR entstanden (Lesson #55/#211).
- [ ] [docs/adr/053-…:7-8] „der dort festgelegte Satz von sechs Bausteinen … gilt unverändert"
  widerspricht dem Nachtrag in ADR-052 D1 (jetzt acht). Vorschlag: „Regeln, Token-Modell und
  Farb-Gate gelten unverändert".
- [ ] [docs/adr/053-…:96-98] D3 sagt, bei fehlender Id nenne die Action die Betroffenen beim Namen.
  Unbekannte Ids liefern aber `TEILNEHMER_UNBEKANNT` ohne Namen (`actions.ts:92,344`); Namen gibt
  es dort auch nicht. Den Satz auf „inaktiv oder schon erfasst" einschränken.
- [ ] [app/veranstaltung/actions.ts:92] `TEILNEHMER_UNBEKANNT` wird aus `TEILNEHMER_INACTIVE` (Z. 69)
  gebaut. Der Text passt, der Konstantenname „inaktiv" führt beim Lesen in die Irre. Vorschlag:
  eigene Konstante `TEILNEHMER_NICHT_GEFUNDEN`.
- [ ] [app/veranstaltung/actions.ts:437-440] Der WHY-Kommentar „Auch ohne Treffer neu rendern" steht
  unter dem `revalidatePath`, das er begründet, und liest sich wie eine Erklärung zum folgenden `if`.
  Er gehört über Z. 437.
- [ ] [app/components/ui/Dialog.tsx:68-74 · ConfirmDialog.tsx:59] (plausibel, nicht im Browser
  geprüft) Chromium bindet `<dialog>` an CloseWatcher. Nach einem per `preventDefault` abgefangenen
  `cancel` ohne neue Nutzeraktivierung schließt ein zweites Escape bzw. die Android-Zurück-Geste den
  Dialog ohne abbrechbares `cancel`. Dann ist das DOM zu, React hält `open=true`, eine Ablehnung
  bleibt unsichtbar. Das Fenster ist klein, und das nächste Öffnen heilt es über `key={durchlauf}`.
  Beim Umbau der Sperre (Wichtig-Finding) mitbedenken, z. B. in `handleClose` bei gesperrtem Zustand
  erneut `showModal()` aufrufen. Vorher im Browser prüfen.
- [ ] [app/veranstaltung/ZeilenMenue.tsx:96 · Dialog.tsx:69-70] Nach erfolgreichem Entfernen springt
  der Fokus auf `triggerRef`. Dieser Button verschwindet mit der Zeile, der Fokus landet auf
  `<body>`. AK19/AK29 sind nicht verletzt. Ein Ersatzziel (z. B. „+ Teilnehmer") wäre für Tastatur
  und Screenreader besser.
- [ ] [app/components/ui/Dialog.tsx:70] Der Zweig „Rücksprungziel ist kein `HTMLElement`" ist
  ungetestet (z. B. `activeElement` ist ein SVG oder `null`).
- [ ] [app/components/ui/ConfirmDialog.test.tsx:116-131] Der Test hängt den Auslöser von Hand in
  `document.body` und entfernt ihn erst nach der Assertion. Schlägt er fehl, bleibt das Element für
  Folgetests liegen. Einen Button im Harness rendern (wie `Dialog.test.tsx:94-112`) oder
  `try/finally` verwenden.
- [ ] [app/veranstaltung/actions.test.ts:1010-1024] Die Walk-in-Tests prüfen `error` nur auf
  `toBeDefined()`, ein Test für „Name zu lang" fehlt. Das bestand schon vorher. AK13/FS3 verlangen
  aber „gleiche Validierung wie bisher", deshalb wäre der wörtliche Meldungstext sinnvoll
  (Lesson #116).
- [ ] [e2e/veranstaltung-detailseite.spec.ts:40-66,85-91] `login`, `createVeranstaltung` und
  `loescheVeranstaltung` kopieren Helfer aus `e2e/veranstaltung-bearbeiten-loeschen.spec.ts:33-61,72-76`.
  Das Kopiermuster ist älter, `e2e/helpers/` existiert jetzt aber.
- [ ] [e2e/helpers/detailseite.ts:39-49] `oeffneEinstellungen` und `schliesseEinstellungen`
  unterscheiden sich nur in der Negation. Eine Funktion `setzeEinstellungen(page, offen)` reicht.
- [ ] [e2e/veranstaltung-detailseite.spec.ts:138-141] `boundingBox()!` ohne Null-Prüfung, obwohl
  `hoehe()` (Z. 93-97) genau diese Prüfung kapselt.
- [ ] [docs/anleitung/veranstalter/anleitung.md:103 · TeilnehmerHinzufuegenDialog.tsx:80,102] Die
  Anleitung nennt den oberen Bereich „Bekannte Personen/Familien". Im Dialog hat er keine sichtbare
  Überschrift (nur `aria-label="Stammteilnehmer"`), der untere heißt sichtbar „Neuer Gast". In der
  Anleitung „oben im Fenster" schreiben oder eine kleine Überschrift ergänzen.

## Positives

- **Rework aus Iteration 1 vollständig und gezielt getestet:**
  - Die Escape-Sperre bei `pending` im `ConfirmDialog` prüft `defaultPrevented`, dass `onClose`
    nicht aufgerufen wird und `open` bestehen bleibt (`ConfirmDialog.test.tsx:100-112`).
  - Die `returnFocusRef`-Tests fokussieren den Auslöser vorher nicht und belegen damit den
    Safari-Fall. Die Vorrangregel ist abgesichert: Ein Vertauschen mit `triggerRef` machte sie rot.
  - `useSchliessendeAction` existiert genau einmal, ohne `useEffect`, mit WHY-Kommentar. Beide
    Konsumenten nutzen ihn.
  - Der FS2-Test „letzte verfügbare Person abgelehnt" rendert zweimal mit schrumpfender Liste und
    wäre ohne die neue `Notice` rot.
- **Kern-Kurzregeln eingehalten:** Parent-Key im WHERE von `removeZeile`
  (`db/veranstaltung.ts:207-212`), `undefined`-Rückgabe ausgewertet (`actions.ts:440`),
  `active`-Prüfung nach dem Laden (`actions.ts:346`), Zod-Grenzen für Anzahl und Id-Länge an beiden
  Rändern getestet (200/201, 100/101).
- `addZeilen` bleibt ein einziges Multi-Row-INSERT, atomar und Neon-HTTP-tauglich. Die Meldungen
  sind über `nichtsAngelegt`/`NIEMAND_ANGELEGT` vereinheitlicht, `revalidatePath` ist in jedem
  Ablehnungszweig getestet, und `umhuellterDbFehler` bildet die echte Drizzle-Fehlerform nach.
- `kachelKennzahlen` nutzt dieselbe Quelle wie die Kassieren-Seite. „x von n bezahlt" stimmt deshalb
  mit „Offene Zeilen" überein (AK4/AK5).
- ADR-053 D1–D6 decken sich nach dem Rework mit dem Code (bis auf die Nitpicks oben). Die Nachträge
  in ADR-034 D6 und ADR-052 D1 sind korrekt.
- Schichten und Grenzen sind sauber: `ui/`-Bausteine sind route-neutral, `qrcode` kommt nur in der
  Server Component `ZugangTeilen` vor, alle neuen Dateien stehen in `eslint/ui-token-files.mjs`,
  und es gibt keine rohen Farbklassen oder `dark:`.
- Routen sind unverändert, `docs/routes.md` muss nicht angepasst werden. Die `kleinfunde.md`-Anker
  aus diesem PR stimmen mit dem aktuellen Stand.
- Der gemeinsame E2E-Helfer `e2e/helpers/detailseite.ts` nutzt überall die abgesicherte
  `oeffneEinstellungen`.

## Verlauf

- **Iteration 1** (Stand `7123c8c`): 0 kritische, 7 wichtige Findings, 13 Nitpicks, `NEEDS_REWORK`.
  Alle bis auf einen bewusst offenen Nitpick sind im Rework behoben; die Sub-Agenten haben das in
  Iteration 2 einzeln nachgeprüft. Bewusst offen bleibt die Auslagen-Kachel (Summe aus offen +
  erstattet), die durch ADR-053 D4 gedeckt ist.
- Außerhalb des Scopes, in Iteration 1 über den Seam angelegt: **#385** (`hasSqlState` im Katalog
  prüft `cause` nicht) und **#386** („Entfernen" löscht Verzehr ohne Warnung). Zur Kenntnis,
  vorbestehend: Statusprüfung und INSERT in `addZeilenAction` sind nicht atomar.
- In Iteration 2 gibt es keine neuen Out-of-Scope-Funde. Das E2E-Kopiermuster ist ein Nitpick im
  Scope, weil der PR selbst eine weitere Kopie hinzufügt.
- **Circuit Breaker:** Das war die 2. Review-Iteration. Eine dritte Rückweisung wird an einen
  Menschen eskaliert.

## Empfehlung

NEEDS_REWORK
