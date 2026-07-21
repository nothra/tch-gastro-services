# Lessons: Frontend & React

> Ausgelagerte `/codify`-Learnings (Volltext) zu **React/UI, Client Components, route-neutrale UI-Bausteine**. **Nicht** `@import`-
> geladen (ADR-037) – bei Bedarf gezielt lesen. Kanonische Quelle je Regel ist der
> jeweilige Eintrag hier; im @import-Pfad (`PROJECT-CONTEXT.md`) steht nur eine Index-Zeile.
> Neue Learnings kommen hierher (nicht in den @import-Pfad) – siehe `/codify` + ADR-037.

### `useActionState` + Inline-Toggle: ESLint `react-hooks/set-state-in-effect` (aus #49)

Bei Inline-Edit-Formularen entsteht der Reflex, den Erfolgsfall über einen `useEffect` zu
schließen: `useEffect(() => { if (state?.ok) setEditing(false); }, [state])`. ESLint
(`react-hooks/set-state-in-effect`) flaggt das als kaskadierende Re-Render-Falle.

**Regel:** Action in einem `useCallback` wrappen, der die originale Server Action **awaitet**
und `setState` direkt danach aufruft – kein `useEffect`:
```ts
const actionWithClose = useCallback(async (prev, formData) => {
  const result = await myAction(prev, formData);
  if (result.ok) setEditing(false);
  return result;
}, []);
const [state, formAction, pending] = useActionState(actionWithClose, undefined);
```
`useActionState` akzeptiert jeden async `(prev, formData) => State`-Wrapper, nicht nur
eine direkte Server Action. Der `useCallback`-Wrapper hält die Referenz stabil.

### Route-neutrale Module: keine Feature-Imports beim Implementieren prüfen (aus #52, Review-Finding)

`app/_verzehr/VerzehrErfassung.tsx` importierte `CATEGORY_LABEL` aus
`app/verwaltung/katalog/CatalogFields.tsx`. `app/_verzehr/` ist laut ADR-025 D5 bewusst
route-neutral, damit F7 (öffentliche Theke) es ohne Umbau wiederverwenden kann. Der
Feature-Import untergräbt diese Isolation still – die spätere Theke-Route hätte an einem
Verwalter-Modul gehangen. Erst das Review erkannte die Verletzung; beim Implementieren
war kein explizites Prüfkriterium aktiv.

**Regel:** Jedes `app/_<name>/`-Modul (route-neutraler Baustein, Unterstrich-Konvention) darf
**keine** Imports aus `app/<feature>/`-Verzeichnissen enthalten. Beim Implementieren nach dem
ersten Draft **explizit prüfen**:
```bash
grep -r 'from "@/app/[^_]' app/_<name>/
```
Ein Treffer bedeutet: gemeinsam genutzten Code in ein neutrales Modul (`app/_<name>/` selbst
oder `lib/`) verschieben und **alle** Konsumenten daraus importieren lassen – nicht
re-exportieren und hoffen. Die ADR-Beschreibung (hier D5) allein verhindert die Verletzung
nicht; der aktive Check beim Implementieren schon.

### Formular-Reset nach jeder Erfassung: key-Remount wirkt nur einmalig (aus #53, Review-Finding W1)

Ein key-basierter Remount (`<Form key={counter} />`, `counter` bei Erfolg hochgezählt) sieht wie
ein generischer Reset-Trick aus, leert die Felder aber nur **einmal** zuverlässig – bleibt der
Key nach dem ersten Erfolg unverändert (z. B. weil der Zähler nicht bei jeder Aktion neu
abgeleitet wird), stehen bei Folge-Erfassungen die alten Werte weiter im Formular. Ein Test, der
nur den ersten Erfolgsfall prüft, deckt das nicht auf.

**Regel:** Soll ein unkontrolliertes Formular nach **jeder** erfolgreichen Server-Action geleert
werden (nicht nur einmalig), `formRef.current?.reset()` in dem `useCallback`-Wrapper um die
Action aufrufen (kein `useEffect`, analog zur bestehenden Regel oben zu `useActionState` +
Inline-Toggle) – nicht per key-Remount. Der Testfall muss **zwei aufeinanderfolgende**
erfolgreiche Submits prüfen, nicht nur den ersten, sonst bleibt die Regression unsichtbar:
```ts
it("should_clearFields_when_createSucceeds", async () => {
  // 1. Submit → Felder leer
  // 2. Submit (erneut erfolgreich) → Felder weiterhin leer, nicht nur beim ersten Mal
});
```

### `aria-modal="true"` ist ein Versprechen, kein Automatismus – Fokus-Trap explizit bauen + alle Branches testen (aus #134)

Der Drawer in `AppNav.tsx` setzte `aria-modal="true"`, ohne dass zunächst ein tatsächliches
Fokus-Containment existierte – Tab tabbte auf verdeckte Header-Bedienelemente hinter dem
Overlay durch. `aria-modal` ist nur eine **Ankündigung** an assistive Technologie; WAI-ARIA
verlangt, dass die Anwendung das Fokus-Trapping selbst implementiert (Review-Runde 1, Finding
W1). Zusätzlich deckte die Coverage-Analyse in `/test` **danach** zwei ungetestete Branches
in genau dieser neuen Logik auf (Shift+Tab direkt nach dem Öffnen, während der Fokus noch auf
dem Drawer-Container selbst liegt; Tab, während der Fokus komplett aus dem Drawer entwichen
ist) – beides reale Tastatur-/Screenreader-Szenarien, die beim ersten TDD-Durchlauf nicht
mitgedacht wurden.

**Regel:** Jede Komponente mit `aria-modal="true"` (Drawer, Dialog, Modal) braucht einen
echten Fokus-Trap im `keydown`-Handler, keine reine ARIA-Annotation. Beim Implementieren
**vor** dem ersten Test alle Tab-Branches enumerieren, nicht nur den Happy Path:
1. Tab am letzten fokussierbaren Element → zurück zum ersten.
2. Shift+Tab am ersten fokussierbaren Element → zum letzten.
3. Shift+Tab, während der Fokus noch auf dem Container selbst liegt (Zustand direkt nach dem
   Öffnen, bevor ein Kind fokussiert wurde).
4. Tab/Shift+Tab, während der Fokus komplett aus dem Container entwichen ist (z. B.
   Screenreader-Navigation auf ein verdecktes Element dahinter) → zurück ins Containment.
Jeder Branch bekommt einen eigenen Test (analog zur Exhaustiveness-Guard-Regel in
`testing-standards.md`) – sonst bleibt die Lücke bis zur Coverage-Analyse in `/test` unsichtbar,
wie hier geschehen.

### Schreib-Gate darf die Lese-Ansicht nicht mitverstecken – vorhandenes `editable`-Flag nutzen (aus #54, Review-Runde-1-Finding)

`IdentityGate` (Namenswahl vor Verzehr-Erfassung ohne Login, F7) zeigte im ersten Entwurf **vor**
der Namenswahl nur den Namens-Picker – Teilnehmerliste und laufende Summen blieben verborgen,
obwohl spec-54 AC B1 „Gültiger Link → Veranstaltung, Teilnehmerliste und laufende Summen ohne
Login sichtbar" deren Sichtbarkeit **unabhängig** von der Namenswahl forderte. Der Reflex beim
Bauen eines client-seitigen Gates vor einer bestehenden, route-neutralen Anzeige-Komponente
(hier `VerzehrErfassung`, die aus F5 bereits ein `editable`-Flag für ihren Read-only-Modus
mitbrachte) ist, das Gate als binäres Alles-oder-Nichts zu entwerfen (Picker **oder**
Komponente) – statt die vorhandene Read-only-Fähigkeit der Komponente zu verwenden.

**Regel:** Ein Gate, das nur eine **Schreib**-Fähigkeit an eine Bedingung knüpft (Login,
Namenswahl, Rolle), darf die zugehörige **Lese**-Ansicht nicht mitblockieren, wenn die Spec deren
Sichtbarkeit unabhängig davon fordert. Bringt die dahinterliegende Anzeige-Komponente bereits ein
`editable`-Flag mit, das Gate darauf abbilden (`editable={gateBedingungErfüllt &&
komponenteneigenesEditable}`) statt eine eigene, separate Verzweigung (Picker vs. Komponente) zu
bauen. Pflicht-Begleitung: ein Test, der den Zustand **vor** Erfüllung der Gate-Bedingung gegen
die tatsächlich sichtbaren Daten prüft (Liste, Summen) – nicht nur, dass „irgendetwas" gerendert
wird.

### `setState`-Updater-Funktionen müssen rein bleiben – keine Seiteneffekte darin (aus #183, Review-Runde-1-Finding)

`FokusListe.toggle` rief `setOpenId((current) => { if (current === id) return null; if (editable)
writeZielId(token, id); kartenRefs.current.get(id)?.scrollIntoView?.(...); return id; })` auf. Die
Updater-Funktion berechnete nicht nur den nächsten State, sondern löste **Seiteneffekte** aus
(`writeZielId` schreibt localStorage + feuert ein Event, `scrollIntoView` mutiert das DOM). React
darf Updater-Funktionen unter StrictMode/Concurrent-Rendering **mehrfach** aufrufen (Render-Phase,
nicht Commit-Phase) – die Effekte liefen dadurch potenziell doppelt, und `writeZielId`s Event löste
ein Update in einer **anderen** Komponente während der Render-Phase der ersten aus. Der Reflex,
einen zusammengesetzten Zustandsübergang (State + Persistenz + Scroll) in einer einzigen
`setX((prev) => …)`-Closure zu bündeln, wirkt kompakt, verletzt aber die React-Reinheitsgarantie
für Updater.

**Regel:** Ein `setState`-Updater (`setX((prev) => ...)`) berechnet **ausschließlich** den nächsten
State-Wert – keine I/O, kein `scrollIntoView`, kein Event-Dispatch, kein Aufruf von Funktionen mit
Seiteneffekten. Braucht ein Zustandsübergang begleitende Effekte, diese in eine benannte Funktion
auslagern, die die Effekte **im Event-Handler** ausführt und danach `setState` mit einem reinen
Wert aufruft:
```ts
// Falsch: Seiteneffekte im Updater
setOpenId((current) => {
  if (current === id) return null;
  writeZielId(token, id); // Seiteneffekt im Updater
  return id;
});

// Richtig: Effekte im Handler, Updater bleibt rein
const waehleZiel = useCallback((id: string) => {
  if (editable) writeZielId(token, id);
  kartenRefs.current.get(id)?.scrollIntoView?.({ block: "start" });
  setOpenId(id);
}, [editable, token]);

const toggle = useCallback(
  (id: string) => (openId === id ? setOpenId(null) : waehleZiel(id)),
  [openId, waehleZiel],
);
```
**Review-Smell:** Enthält eine `setX((prev) => ...)`-Updater-Funktion mehr als eine
Return-Anweisung mit begleitenden Funktionsaufrufen dazwischen, ist das ein Kandidat für diese
Falle – prüfen, ob die Aufrufe reine Berechnungen sind oder Seiteneffekte auslösen. Verwandt mit
der bestehenden Regel zu `useActionState`+Inline-Toggle (aus #49): beide behandeln, wo
Seiteneffekte bei State-Übergängen hingehören (Event-Handler, nie Render-/Updater-Phase).

### Layout-abhängige DOM-Aktion nach layout-änderndem `setState` erst im nächsten Frame; sticky Header braucht `scroll-margin-top` am Ziel (aus #188)

Der in #183 eingeführte `waehleZiel` rief `setOpenId(id)` und `scrollIntoView({block:"start"})` im
**selben Event-Tick** auf. React committet den DOM zwar synchron, aber der Reflex, die scroll-
Aktion direkt danebenzuschreiben, scrollt gegen das **noch nicht reflowte** Layout: die andere
Akkordeon-Karte klappt zu, die Zielkarte auf – gemessen wurde gegen den Vorzustand, also landete
das Ziel außerhalb des Sichtbereichs (nur unterer Rand sichtbar). Zweite, unabhängige Ursache:
`scrollIntoView({block:"start"})` richtet die Zielkante an der Viewport-Oberkante aus – eine
**sticky/fixed** Leiste (`sticky top-0`) darüber verdeckt dann den Kartenkopf.

**Regel:** Eine layout-abhängige DOM-Aktion (`scrollIntoView`, `getBoundingClientRect`-Messung,
manuelles `scrollTo`), die auf ein durch `setState` **geändertes** Layout zielt, erst **nach dem
Reflow** ausführen – in `requestAnimationFrame(() => …)` (nicht synchron im Handler direkt nach
`setState`). Und: Wird per `scrollIntoView` unter einen **sticky/fixed Header** gescrollt, braucht
das Ziel ein `scroll-margin-top` in Höhe des Headers (bzw. `scroll-padding-top` am Scroll-Container,
falls einer existiert; beim Fenster-Scroll wäre das global → daher `scroll-margin` am Ziel).
Tailwind-`scroll-mt-*` ist rem-basiert und skaliert mit einem rem-basierten Header mit. Testbar in
jsdom (ohne echtes Layout): rAF capture-only stubben und prüfen, dass `scrollIntoView` **nicht**
synchron, sondern erst nach dem rAF-Flush läuft; die Offset-Klasse per `toHaveClass` belegen.

### Route-neutrale Komponente: Fremd-Layout-Offset vom Konsumenten via `className` steuern, nicht hardcoden/an fremd-semantischen Prop koppeln (aus #188, Review-Finding)

Der #188-Fix legte das `scroll-margin` (für die F7-Chip-Leiste) zunächst **in** die route-neutrale
`ZeileKarte` (`app/_verzehr/`) und knüpfte es an deren `collapsible`-Prop (`collapsible ? " scroll-mt-16"
: ""`). Kein Import-Verstoß (Codify #52 betrifft Imports), aber eine **leaky abstraction**: die
neutrale Karte kodierte eine Layout-Dimension (~3rem sticky Leiste), die es allein im F7-Kontext gibt,
und `collapsible` („einklappbar") wurde zweckentfremdet als „liegt unter einer sticky Leiste". Zudem
gleicht kein Test den Offset gegen die tatsächliche Leistenhöhe ab → stiller Drift bei späterer
Änderung der Leiste. Erst `/refactor` verschob das Wissen zum Konsumenten.

**Regel:** Ein layoutseitiger Belang, der zum **Kontext des Konsumenten** gehört (Offset für einen
sticky Header, Ränder, Grid-Placement), gehört nicht hardcoded in die route-neutrale/geteilte
Komponente und **nicht** an einen semantisch anderen Prop gekoppelt. Die Komponente nimmt eine
optionale `className`-Prop, die auf ihr Wurzel-Element gemergt wird; der Konsument gibt den konkreten
Wert vor (hier `FokusListe` → `className="scroll-mt-16"` mit Rationale-Kommentar). So bleibt der
gemeinsame Baustein frei von Fremd-Layout-Wissen (stärkt #52), und die Prop-Semantik bleibt sauber.
Unit-Test der Komponente prüft den `className`-Durchreich-Vertrag; das reale Verhalten sichert ein
Integrationstest am Konsumenten.

