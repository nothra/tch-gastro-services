# ADR 053: Detailseite – gemeinsamer Dialog-Baustein, Mehrfach-Anlage in einem Statement, Kennzahlen aus den bestehenden Summen

## Status

Accepted

> Erweitert **ADR-052** D1 um zwei Bausteine (`Dialog`, `ConfirmDialog`); die dort
> festgelegten Regeln, das Token-Modell und das Farb-Gate gelten unverändert. Berührt
> **ADR-033** (Abschluss) nur in der Platzierung des Buttons, nicht im Verhalten.

## Datum

2026-09-30

## Kontext

[spec-369](../specs/spec-369-veranstaltung-detailseite-neu-ordnen.md) (UX-2) ordnet
`/veranstaltung/[id]` neu: Kopf → drei Kacheln mit Kurzkennzahl → Teilnehmerliste →
eingeklappte Einstellungen. Dafür sind vier technische Fragen offen (Q1–Q3 der Spec plus die
Dialog-Grundlage):

- Es gibt **zwei** Dialoge mit Sonderverhalten: „+ Teilnehmer" und „Link & QR teilen"
  (Formular-/Inhaltsdialoge) sowie eine Bestätigung beim Entfernen. Die vorhandenen Dialoge
  (`VeranstaltungLoeschen`, 3× `CatalogControls`) sind `<dialog open>` ohne `showModal()`, ohne
  Escape und ohne Fokusführung – kopierter Code. #372 will genau das vereinheitlichen, ist aber
  noch offen; entschieden wurde, den Baustein **hier** schlank vorzuziehen.
- Die Mehrfachauswahl legt mehrere Teilnehmerzeilen an. Der Treiber in INT/PRD (Neon-HTTP)
  unterstützt keine interaktive `.transaction()`; die Lesson `db-drizzle.md` (#345) verlangt für
  Mehrfach-Writes `runAtomic`.
- „x von n bezahlt" und die Verzehr-Summe existieren bereits als Single Source (`kassierZeilen`,
  `kassierTagessummen`, ADR-033 D5); die Detailseite nutzt sie bisher nicht.
- „Link & QR" ist eine Server Component, die `qrcode` bewusst nur serverseitig importiert
  (ADR-034 D5/D6, #307).

## Entscheidung

### D1 · Ein `Dialog`-Baustein auf nativem `<dialog>`, `ConfirmDialog` darauf aufgesetzt

- `app/components/ui/Dialog.tsx` (Client Component, route-neutral wie die übrigen Bausteine):
  kontrolliertes `open`/`onClose`, `showModal()`/`close()` per Ref, Escape über das native
  `cancel`-Event, Titel und Beschreibung per `aria-labelledby`/`aria-describedby`. Den
  Fokus-Rücksprung setzt der Baustein selbst: auf `returnFocusRef` (in der Regel der Auslöser),
  ohne Angabe auf das beim Öffnen fokussierte Element. Das explizite Ziel ist nötig, weil
  Safari (macOS/iOS) einen getippten `<button>` nicht fokussiert – `activeElement` wäre dann
  `<body>`; jsdom und ältere Browser leisten den Rücksprung ohnehin nicht.
- **Kinder werden nur bei geöffnetem Dialog gemountet.** Das gibt jedem Öffnen frischen
  Zustand **in den Kindern** (keine Reste aus dem letzten Durchlauf) und vermeidet die
  Fehlerstand-Falle, die `VeranstaltungLoeschen` mit `abgeschickt` umgehen muss. Zustand beim
  **Konsumenten** (z. B. ein `useActionState` außerhalb des Dialogs, wie beim `ConfirmDialog`)
  überlebt das Schließen; der Konsument erneuert ihn je Öffnen selbst (z. B. per `key`).
- `app/components/ui/ConfirmDialog.tsx` setzt auf `Dialog`: Titel, Beschreibung, Bestätigen-
  Schaltfläche (Variante `primary` oder `danger`), „Abbrechen", optionaler Fehlertext
  (`role="alert"`) und ein `pending`-Zustand, der beide Schaltflächen **und Escape** sperrt –
  sonst schlösse sich der Dialog, während der Server den Vorgang trotzdem ausführt, und eine
  Ablehnung sähe niemand. Die Escape-Sperre liegt im `Dialog` selbst (Prop `schliessbar`), damit
  jeder Konsument dieselbe Regel nutzt; `TeilnehmerHinzufuegenDialog` meldet den Lauf beider
  Bereiche dorthin (Start aus `onSubmit`, Ende aus `useSchliessendeAction`), weil ein `setState`
  am Anfang der Action erst mit ihrem Ende sichtbar würde. Die Bestätigung ist ein `<form action>`, damit Server Actions direkt
  angeschlossen werden können.
- „Bei Erfolg schließen" liegt einmal im Hook `app/veranstaltung/useSchliessendeAction.ts`
  (umschließt die Action, ruft bei `ok` den Schließ-Handler, ohne `useEffect`); beide
  Konsumenten (`TeilnehmerHinzufuegenDialog`, `ZeilenMenue`) nutzen ihn. Er bleibt
  feature-lokal, bis #372 einen zweiten Bereich mitbringt.
- Die vier bestehenden Dialoge werden in #369 **nicht** migriert (das ist #372 AK1). Sie dürfen
  aber nach dieser ADR nicht als Vorbild für neue Dialoge dienen.
- Keine neue Abhängigkeit (ADR-052 D1). Ein Fokus-Trap ist beim nativen modalen `<dialog>`
  Plattformverhalten (Rest der Seite ist `inert`); ein eigener Trap wie in #134 entfällt.

### D2 · Zeilenmenü als kleine feature-lokale Client Component

- `app/veranstaltung/ZeilenMenue.tsx`: Auslöser-Button „⋯" (`aria-haspopup="menu"`,
  `aria-expanded`, `aria-label` mit Personenname, 44 × 44 px), darunter ein `role="menu"` mit
  einem `role="menuitem"` „Entfernen". Schließt bei Escape, Klick außerhalb und nach Auswahl.
  „Entfernen" öffnet den `ConfirmDialog` (D1), der `removeZeileAction` absendet.
- `removeZeileAction` wechselt dafür von fire-and-forget (`void`) auf einen Rückgabe-State
  (`{ ok }` / `{ error }`): nur so kann die Bestätigung eine Ablehnung anzeigen und offen
  bleiben (AK20). `revalidatePath` läuft auch ohne Treffer, damit eine auf einem anderen Gerät
  schon entfernte Zeile aus der Liste fällt.
- Bewusst **nicht** unter `ui/`: einziger Konsument, Menü-Verhalten ist noch nicht als
  projektweites Muster belegt (YAGNI). Wandert nach `ui/`, sobald ein zweiter Konsument da ist.
- Tipp auf den Namen ist ein normaler `next/link` auf `…/verzehr?zeile=<id>`; der Personenbezug
  (#308, `personenbezug.ts`) existiert bereits und wird nicht verändert.

### D3 · Mehrfach-Anlage als **ein** Multi-Row-`INSERT`, alles-oder-nichts

- Neue Data-Layer-Funktion `addZeilen(veranstaltungId, teilnehmer[])` in `db/veranstaltung.ts`:
  ein einziges `insert(...).values([...]).returning()`. Ein einzelnes SQL-Statement ist in
  PostgreSQL atomar, **ohne** Transaktion – daher weder `db.transaction()` noch `runAtomic`
  nötig; die Lesson aus #345 (Neon-HTTP) greift nicht, weil keine Mehrfach-Statement-Klammer
  entsteht.
- Neue Action `addZeilenAction` ersetzt `addZeileAction` (Einzelfall = Liste der Länge 1; die
  alte Action hat nach dem Umbau keinen Aufrufer mehr und wird entfernt). Reihenfolge fail-closed
  wie bisher: Rolle → Eingabe (Zod) → Veranstaltung existiert und ist `offen` → alle Teilnehmer
  existieren, sind aktiv (ADR-022) **und** noch nicht erfasst → `addZeilen`.
- Eingabe: `teilnehmerIds` als Liste, **Zod** mit `min(1)` (Meldung „Bitte mindestens einen
  Teilnehmer wählen.", AK14), Obergrenze (`max(200)`, Lesson „Zod-Obergrenzen") und Duplikat-
  Bereinigung vor der Prüfung.
- Vor-Check in zwei parallelen Abfragen – kein N+1: `getTeilnehmerByIds` (`inArray`, unabhängig
  von `active`) und `listZeilen`. Fehlt eine Id (Anzahl weicht ab), lehnt die Action ohne Namen
  ab („Teilnehmer nicht gefunden."); sind Gewählte inaktiv oder schon erfasst, nennt sie die
  Betroffenen beim Namen („Nicht mehr wählbar: …" / „Bereits erfasst: …"). Beide Meldungen tragen
  den Zusatz „Es wurde niemand hinzugefügt." (FS2).
- Bei **jeder** Ablehnung des Vor-Checks läuft `revalidatePath`, damit die Auswahl im Dialog
  den aktuellen Stand zeigt.
- **Unique-Verletzung (`23505`)** fängt nur noch das Rennen zweier Geräte zwischen Vor-Check und
  Insert ab: der ganze Insert scheitert, **nichts** wurde angelegt, die Action meldet „Bereits
  erfasst: … auf einem anderen Gerät …" mit demselben Zusatz, und `revalidatePath` aktualisiert
  die Auswahl. `isUniqueViolation` prüft dafür auch `error.cause` (Drizzle umhüllt den
  SQLSTATE). Kein `onConflictDoNothing`: stille Teilerfolge wären die verwirrendere Variante.
- „Neuer Gast" bleibt `createWalkInAction` unverändert (legt Teilnehmer an und erfasst ihn). Die
  dort liegende Zweischritt-Schreibung (Teilnehmer anlegen, dann Zeile) ist vorbestehend und
  nicht Teil dieser Entscheidung.

### D4 · Kacheln-Kennzahlen aus den bestehenden Summen, ein reiner Adapter

- Die Detailseite lädt zusätzlich `listPositionen` und `listAuslagen` (parallel mit
  `listZeilen`) und berechnet **nur** über `kassierZeilen` → `kassierTagessummen` und
  `auslagenSummen`. Neue Formel entsteht nicht.
- Ein kleiner reiner Adapter `app/veranstaltung/kachelKennzahlen.ts` formt daraus die drei
  Anzeigewerte: Verzehr = `verzehrGesamtCents`; Auslagen = `gesamt.offenCents +
  gesamt.erstattetCents`; Kassieren = `(n − offeneZeilen)` von `n` bezahlt. Damit ist er
  DB-frei und zu 100 % unit-testbar; die Seite bleibt Komposition.
- Bei `offen === false` werden die Kennzahlen nicht berechnet und nicht geladen (AK6).
- Begründung der Auslagen-Zahl: die Auslagen-Seite zeigt offene und erstattete Beträge getrennt;
  die Kachel braucht eine Zahl und nimmt die Summe beider. Hat die Auslagen-Seite keinen
  eigenen Gesamtwert, bleibt „Summe" die einzig ehrliche Kurzform.

### D5 · „Link & QR teilen": Server rendert, Client öffnet

- `ZugangTeilen` bleibt eine Server Component und rendert Link und QR-SVG. Sie wird als
  `children` an eine kleine Client-Hülle `ZugangDialog` gereicht (Auslöser-Button + `Dialog`).
  Damit bleibt `qrcode` aus dem Client-Bundle (ADR-034 D5/D6, #307). Der QR wird bei jedem
  Seitenaufruf mit erzeugt, auch bei geschlossenem Dialog – Millisekunden und wenige KB
  RSC-Nutzlast, bewusst in Kauf genommen gegenüber einer Extra-Route.
- Die Kopieren-Schaltfläche nutzt die Clipboard-API mit `try/catch`; bei Ablehnung bleibt das
  markierte Nur-Lese-Feld als Rückfall.
- Druckbarkeit (#307 Teil 2, #181) ist **nicht** Teil dieser Entscheidung.

### D6 · Seitenstruktur und Abschließen

> **Teilweise abgelöst durch [ADR-055](055-detailseite-kopfaktionen-symbol-schaltflaechen.md)
> (#391):** Einstellungen sind kein `<details>` am Seitenende mehr, sondern ein Dialog hinter
> einem Zahnrad im Seitenkopf; Teilen und Löschen sind eigene Symbol-Schaltflächen dort.

- Die Seite bleibt eine Server Component und besteht nur noch aus Komposition: `PageHeader`
  (mit `Badge` für den Status), Kachel-Reihe, Teilnehmerliste mit `+ Teilnehmer`-Dialog,
  Einstellungen als natives `<details>` (kein JS, Standard geschlossen).
- `StatusToggle` wird unverändert an das **Ende der Kassieren-Seite** verschoben und dort
  entfernt aus dem Seitenkopf (heute steht er auch dort oben). Bestätigung und Offen-Hinweis
  sind #371.
  > **Überholt durch [ADR-055](055-kassieren-spende-live-abschluss-im-kopf.md) D3 (#371):**
  > Abschließen/Wieder öffnen sitzt jetzt im Seitenkopf der Detailseite, mit Bestätigung; der
  > `StatusToggle` entfällt.
- Der Abschlussbericht (`BerichtGruppe`) zieht aus `page.tsx` in eine eigene Datei, weil die
  Seite sonst die Komposition verlässt.

## Alternativen

### D1

**A – Eigener `Dialog` auf nativem `<dialog>` (gewählt).** Vorteile: Escape und inerter Hintergrund
kommen von der Plattform (den Fokus-Rücksprung setzt der Baustein selbst, siehe D1); passt zu ADR-052 (keine Abhängigkeit) und zu
#372 AK1. Nachteile: jsdom implementiert `showModal()` nicht – Tests brauchen einen Stub.
**B – shadcn/ui-Dialog (Radix).** Vorteile: fertig, gut getestet. Nachteile: neue Abhängigkeiten,
widerspricht ADR-052 D1 und bräuchte eine eigene ADR; für zwei Dialoge Überdimensionierung.
**C – Weiter `<dialog open>` kopieren.** Vorteile: kein Aufwand. Nachteile: genau die Mängel,
die #372 beseitigen soll, und ein fünfter und sechster Klon.

### D2

**A – Feature-lokales Menü (gewählt).** Vorteile: klein, kein vorzeitiges Muster. Nachteile:
muss später ggf. verschoben werden.
**B – `<details>` als Menü.** Vorteile: ohne JS. Nachteile: schließt nicht per Escape/Außenklick,
kein Menü-Semantik – für Touch-Bedienung am Rand unzuverlässig.
**C – „Entfernen" direkt als sichtbarer Button mit Bestätigung, ohne Menü.** Vorteile: ein Tipp
weniger. Nachteile: widerspricht AK3/AK18 (gewünschte Ruhe in der Zeile, keine versehentliche
Berührung am Zeilenrand).

### D3

**A – Ein Multi-Row-INSERT (gewählt).** Vorteile: atomar ohne Klammer, treiberunabhängig, eine
Roundtrip. Nachteile: bei Konflikt scheitert der ganze Schwung.
**B – `runAtomic` mit N Einzel-Inserts.** Vorteile: explizit. Nachteile: unnötige Klammer für
etwas, das ein Statement kann; N Statements in einem Batch.
**C – Schleife mit N Einzelaufrufen der alten Action.** Vorteile: kein neuer Code. Nachteile:
nicht atomar, N Roundtrips, Teilerfolge – genau FS2.

### D4

**A – Adapter über die bestehenden Summen (gewählt).** Vorteile: Single Source bleibt Single
Source. Nachteile: zwei zusätzliche Abfragen je Seitenaufruf.
**B – Eigene SQL-Aggregation für die Kacheln.** Vorteile: billiger. Nachteile: zweiter
Wahrheitspfad zu `kassierZeile` (ADR-033 D5), der lautlos divergieren kann.

### D5

**A – Server rendert, Client-Hülle öffnet (gewählt).** Nachteile: QR wird auch bei
geschlossenem Dialog erzeugt.
**B – Dialoginhalt per Route/Fetch nachladen.** Vorteile: QR nur bei Bedarf. Nachteile: neue
Route samt Zugriffsregel und `docs/routes.md`-Pflege für einen Gewinn im Millisekundenbereich.
**C – QR im Client erzeugen.** Nachteile: `qrcode` im Client-Bundle, bricht #307.

## Begründung

Jede Entscheidung bevorzugt, was die Plattform oder der bestehende Code schon garantiert:
natives `<dialog>` für Modalität, ein einzelnes SQL-Statement für Atomarität, die vorhandenen
Summenfunktionen für Zahlen. Das hält die neue Fläche klein (zwei Bausteine, ein Adapter, eine
Action) und macht jede Stelle für sich testbar.

## Konsequenzen

**Positiv:**
- #372 bekommt `Dialog`/`ConfirmDialog` fertig und migriert nur noch die vier Altdialoge.
- Die Detailseite besteht aus Komposition; Geschäftsregeln bleiben in Actions und Summenmodulen.
- Mehrfach-Anlage funktioniert in INT/PRD wie lokal, ohne Treiber-Sonderfall.

**Negativ / Trade-offs:**
- Bis #372 existieren zwei Dialog-Stile nebeneinander (alt: `<dialog open>`, neu: `Dialog`).
- Zwei zusätzliche Abfragen je Aufruf der Detailseite einer offenen Veranstaltung.
- Bei Duplikat-Konflikt in der Mehrfachauswahl wird nichts angelegt; der Nutzer muss die
  aktualisierte Auswahl erneut bestätigen.
- jsdom braucht einen `HTMLDialogElement`-Stub (`showModal`/`close`) in den Tests, sonst laufen
  Dialog-Tests nicht; er gehört in `vitest.setup.ts`.

## Implementierungs-Hinweise

- Reihenfolge (jeweils Red → Green): `Dialog` → `ConfirmDialog` → `kachelKennzahlen` →
  `addZeilen`/`getTeilnehmerByIds` (DB-Integrationstest, ohne `__test__`-Kollision mit anderen
  Dateien) → `addZeilenAction` → `ZeilenMenue` → `TeilnehmerHinzufuegenDialog` → `ZugangDialog`
  → Seitenkomposition → `StatusToggle`-Umzug → E2E mit 375-px-Screenshot (AK27).
- Formular im Dialog: Erfolg schließt den Dialog, indem die Client-Hülle die Action umschließt
  und bei `ok` `setOpen(false)` ruft – kein `useEffect` (Lesson `react-hooks/set-state-in-effect`).
  Reset-Handler an `onSubmit`, nicht `onClick` (Lesson #352).
- Neue Komponenten verwenden ausschließlich Token-Klassen und die Bausteine aus #368 (AK31); das
  Farb-Gate aus ADR-052 D3 ist um die neuen Dateien zu erweitern.
- `docs/routes.md` ändert sich nicht (Pfade und Zugriff unverändert).
- Der Branch liegt vor dem Merge von #368 – vor dem ersten Code auf `origin/main` bringen.
- Löschen: `VeranstaltungLoeschen` zieht unverändert in „Einstellungen" um (AK23).
- Beim Entfernen der Altkomponenten (`AddTeilnehmerForm`, `WalkInForm` sofern ersetzt) die
  Dateien samt Tests löschen (Lesson „Verschieben eines route-neutralen Moduls").
