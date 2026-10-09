# ADR 059: Bausteine ListenZeile und Aufklapper – Slot statt Menü-Prop, CSS-only-Zustand, Abblendung ohne das Badge

## Status

Accepted

> Ergänzt **ADR-052** D1 um zwei weitere Bausteine unter `app/components/ui/`; die Regeln von
> D1–D3 (route-neutral, Token-Klassen, keine neue Abhängigkeit, Farb-Gate) gelten unverändert –
> mit einer begründeten Ausnahme beim Kartenrand der `ListenZeile` (D1, „Rahmen").
> **Nachtrag:** [ADR-060](060-listenzeile-dialog-ausloeser-notice-warnung.md) erweitert die API
> von D1 um eine Button-Betriebsart (Dialog-Auslöser) und den Slot `anhang`.

## Datum

2026-10-09

## Kontext

[spec-403](../specs/spec-403-bausteine-listenzeile-aufklapper.md) (#403) verlangt zwei neue
Bausteine, auf denen die Folge-Issues (Teilnehmer-Verwaltung, Auslagen, Katalog-Seite) aufbauen:
**Aufklapper** (AK1) und **ListenZeile** (AK2). Zu entscheiden ist die **Form der API** – sie ist
der Vertrag für alle späteren Konsumenten und deshalb schwer zu ändern – und die Antwort auf
vier Fragen aus der Spec (Q1–Q4).

Ausgangslage im Code:
- Listenzeilen existieren fünfmal mit je eigenem Markup. Die Detail-Teilnehmerzeile (`ZeileRow`)
  trägt als einzige ein **Zeilenmenü** (`ZeilenMenue`, ⋯-Knopf, feature-lokal, mit Server Action
  und `ConfirmDialog`); sie hat dafür bewusst das Layout „Karte mit Link **neben** Menü", damit
  kein interaktives Element in einem anderen steckt (spec-369 FS6).
- Aufklappbereiche sind natives `<details>`; `Kassieren` und `VerzehrAufschluesselung` sind
  **Server Components** und sollen es bleiben (Kommentar in `VerzehrAufschluesselung.tsx`).
- `Badge` (Ton `neutral`) existiert; sein Text trägt die Statusinformation (spec-368 AK2.9).
- `tokens.test.ts` rechnet WCAG-Kontraste aus den Token-Werten in `globals.css`.

## Entscheidung

### D1 · ListenZeile: ein Baustein, Zeilenaktion als Slot

`ListenZeile` rendert ein `<li>` (Konsumenten behalten ihr `<ul>`), ist selbst eine
**Server Component** und nimmt:

| Prop | Bedeutung |
|---|---|
| `href` (Pflicht) | Ziel des Tipp-Ziels (`next/link`) |
| `prefetch?` | wird an den Link durchgereicht (Startseite: `false`, ADR-031) |
| `titel` (Pflicht), `untertitel?` | Textblock; bricht um (`min-w-0`, `break-words`) |
| `zustand?` (Text) | gesetzt → Zeile verblasst + `Badge tone="neutral"` mit diesem Text (D3) |
| `pfeil?` (Default `true`) | rechter Pfeil; die Arbeitsschritt-Kacheln setzen `false` (Q2) |
| `aktion?` (`ReactNode`) | **Slot** für die Zeilenaktion rechts (⋯-Menü); Variante „mit Zeilenaktion" |
| `className?` | nur Layout (z. B. `min-w-0` für das Kachel-Raster) |

Aufbau: das `<li>` ist die Karte (`flex items-center rounded-lg border border-line-subtle
bg-surface`, Hover/Fokus `border-accent bg-accent-subtle`); der Link füllt `flex-1` mit
`min-h-11 p-3`, die `aktion` steht als **Geschwister** rechts daneben. Mit `aktion` entfällt der
Pfeil (der Knopf nimmt den Platz); ohne `aktion` steht der Pfeil rechts. Leere Slots
(`false`/`null`/`""`, typisch bei `aktion={editable && …}`) zählen als nicht gesetzt.

Hover/Fokus liegen per `hover:`/`focus-within:` am `<li>`: so hebt auch ein fokussierter ⋯-Knopf
die Zeile hervor. `focus-within` greift ebenso, solange ein nicht portalierter Dialog der
Zeilenaktion (z. B. `ConfirmDialog` des `ZeilenMenue`) offen ist – gewollt, er gehört zur Zeile.

**Rahmen – Ausnahme zu ADR-052 D2:** Der Kartenrand ist `line-subtle`, obwohl die ganze Karte ein
Link ist und ADR-052 D2 für Bedienelement-Rahmen `line` verlangt. Begründung: der Rand grenzt hier
nur die Fläche ab wie bei `Card` (ADR-052 D2, Tabelle „Kartenrand"); erkennbar ist die Zeile an
Titel und Pfeil, und WCAG 1.4.11 verlangt für Links keinen sichtbaren Rahmen. Das gilt auch für
die **pfeillose** Variante der Arbeitsschritt-Kacheln (vorher `border-line`): Tipp-Ziel ist dort
der Text-Link selbst (WCAG 1.4.11 gilt nicht für Text, 1.4.3 deckt ihn ab), und die Kacheln
stehen als Navigation im `nav` mit Titel und Kennzahl – der Rahmen ist auch dort nicht das
einzige Erkennungszeichen. Ein Wechsel auf `line` nur für die Kacheln hätte zwei Kartenränder
für dieselbe Zeilen-Sprache bedeutet. Bedienelemente mit
eigenem Rahmen als einzigem Erkennungszeichen (Eingabefelder, Knöpfe) bleiben bei `line`.

`ZeilenMenue` bleibt feature-lokal und wird von `ZeileRow` als `aktion` übergeben. Der Baustein
kennt weder Menü noch Server Action → route-neutral (ADR-052 D1).

### D2 · Aufklapper: natives `<details>`, Zustand nur per CSS

`Aufklapper` ist eine Server Component um `<details className="group/aufklapper">`:
- `<summary>` mit `list-none` und `[&::-webkit-details-marker]:hidden` (Safari), darin Pfeil
  (Inline-SVG in `icons.tsx`, `group-open/aufklapper:rotate-90`), Titel (+ optional Zähler) und
  rechts der Hinweis. „Anzeigen"/„Ausblenden" sind **zwei** Elemente, die
  `group-open/aufklapper:` ein-/ausblendet – kein State, kein Client-JS (spec F1; `Kassieren`
  bleibt Server Component).
- Die Gruppe ist **benannt** (`group/aufklapper`): eine unbenannte `group-open:`-Variante griffe
  bei jedem offenen fremden `.group`-Vorfahren. Der Name schützt **nur davor**. Tailwind erzeugt
  für `group-open/aufklapper:` einen Nachfahren-Selektor, und jeder Aufklapper trägt dieselbe
  Klasse – ein zugeklappter Aufklapper **in** einem offenen zeigte also weiterhin gedrehten Pfeil
  und „Ausblenden". Deshalb gilt: **Aufklapper nicht verschachteln.** Heute verschachtelt kein
  Konsument; braucht ein Folge-Issue das, wird der Selektor an das eigene `<details>` gebunden
  (direkter Kind-Kombinator) und mit einem Browser-Test belegt.
- Der Hinweis ist `aria-hidden`: den Zustand meldet `<details>` dem Screenreader selbst; im
  zugänglichen Namen des `<summary>` stünde er doppelt.
- `className` nur für Layout (Abstand, Schriftgröße) – Rahmen und Fläche kommen von außen,
  z. B. `Card` um den Aufklapper (Kassieren „Abrechnung im Detail").
- Props: `titel`, `zaehler?` (optional, Q4), `offen?` (Startzustand, setzt `open` am `<details>`,
  Default zu – AK1.4), `children`, `className?`, sowie `ueberschrift?: { id: string; ebene: "h2" |
  "h3" }`: gesetzt, steckt der Titel in einer Überschrift **im** `<summary>` (HTML erlaubt
  Heading-Content dort) und trägt die `id`, auf die der umgebende Abschnitt per
  `aria-labelledby` zeigt (AK1.7). Ohne Angabe ein `<span>`.
- `summary` hat `min-h-11` und den Fokusring `focus-visible:outline-2 outline-accent`.

### D3 · Zustand „verblasst": Abblendung auf dem Text, nicht auf dem Badge

Vorgabe der Spec ist `opacity-60`. Nachgerechnet nach der WCAG-2-Formel (Token-Werte aus
ADR-052 D2) gegen die Kartenfläche `surface`:

| Text bei `opacity-60` | hell | dunkel |
|---|---|---|
| Titel (`foreground`) | ≈ 4,7 : 1 | ≈ 6,5 : 1 |
| Untertitel (`muted`) | ≈ 2,9 : 1 ✗ | ≈ 3,3 : 1 ✗ |
| Badge `neutral` (`muted` auf `background`) | ≈ 2,8 : 1 ✗ | ≈ 3,2 : 1 ✗ |
| Titel (`foreground`) auf Hover-/Fokus-Fläche `accent-subtle` | ≈ 4,6 : 1 (knappster Wert) | ≈ 5,4 : 1 |

Das Badge ist der **Textträger** des Zustands und der Untertitel enthält Datum/Katalog/Kasse –
beides darf nicht unter 4,5 : 1 fallen. Entscheidung:
- `opacity-60` liegt auf dem **Textblock + Pfeil** (Titel, Untertitel), **nicht** auf dem
  gesamten `<li>` und **nicht** auf dem Badge. Das Badge bleibt voll lesbar; Rahmen und
  Kartenfläche bleiben unverändert.
- Im verblassten Zustand nutzt der Untertitel `text-foreground` statt `text-muted`
  (≈ 4,7 / 6,5 : 1 – gedämpft wie der Titel, aber lesbar).
- `tokens.test.ts` rechnet diese Paare (auf `surface` und auf `accent-subtle`, je Theme) mit der
  vorhandenen Kontrast-Funktion nach (Überblendung `0,6·Vordergrund + 0,4·Fläche`) und prüft
  ≥ 4,5 : 1; fällt ein Token-Wert später darunter, wird er rot. Die Werte oben sind gerundet.

Das weicht vom Wortlaut „Zeile `opacity-60`" des Issues ab (Spec AK2.5 wird entsprechend
nachgezogen); die erkennbare Wirkung – ausgegraute Zeile mit Status-Badge – bleibt.

### D4 · Farb-Gate

`app/components/ui/` ist bereits gegated (neue Bausteine fallen automatisch darunter).
`VerzehrAufschluesselung.tsx` und `KassierZeilenListe.tsx` kommen in `eslint/ui-token-files.mjs`
(der Kommentar „bleiben bis #272 außen vor" wird gestrichen). `KassierZeilenListe`:
Hervorhebung `border-accent bg-accent-subtle`, Normalrahmen `border-line-subtle` – gleiche
„gemeint/aktiv"-Sprache wie der ListenZeile-Hover (spec AK5.4).

### D5 · Ableitung der Spec-Fragen

- **Q1** → D3. **Q2** → `pfeil={false}` an den Kacheln (D1). **Q3** → Titel „Verzehr" im
  Aufklapper der Aufschlüsselung (der Hinweis „Anzeigen" liefert die Handlungsaufforderung).
  **Q4** → `zaehler` optional (D2). **Q5** → diese ADR.

## Alternativen

### D1 – Option A: Variante per Union-Prop (`variante: "link" | "aktion"`) mit `aktion: "menue"`
**Vorteile:** Baustein kennt beide Fälle, Konsument übergibt nur Daten.
**Nachteile:** der Baustein müsste das Zeilenmenü kennen oder importieren → bricht die
Route-Neutralität (Lesson „Route-neutrale Module") oder zwingt eine Menü-Abstraktion auf, die
nur einen Konsumenten hat (YAGNI; `ZeilenMenue`-Kommentar).

### D1 – Option B: Slot `aktion: ReactNode` (gewählt)
**Vorteile:** keine Kopplung, das Menü bleibt dort, wo Server Action und Bestätigung wohnen;
Teilnehmer-Verwaltung/Auslagen/Katalog können eigene Aktionen einhängen.
**Nachteile:** der Konsument ist selbst für Größe/Fokus des Knopfes zuständig (Mindestgröße
44 px steht in den Test-Erwartungen des Bausteins nicht durchsetzbar, nur dokumentiert).

### D2 – Option A: Aufklapper als Client Component mit `useState`
**Vorteile:** Hinweiswechsel und Zustand in React beobachtbar.
**Nachteile:** Kassieren und `VerzehrAufschluesselung` würden Client-Inseln oder selbst
Client Components; Hydrations-Abhängigkeit; kein Mehrwert gegenüber `group-open/aufklapper:`.

### D2 – Option B: Natives `<details>` + CSS (gewählt)
**Vorteile:** funktioniert vor Hydration und ohne JS, Tastatur/Screenreader nativ.
**Nachteile:** „offen" ist nur im DOM, nicht in React-State – Tests prüfen das `open`-Attribut;
programmatisches Öffnen ist nicht vorgesehen (nicht gefordert).

### D3 – Option A: `opacity-60` auf dem ganzen `<li>` (Wortlaut des Issues)
**Vorteile:** ein Klassenname, identisch zum Mockup.
**Nachteile:** Untertitel und Badge unterschreiten 4,5 : 1 in beiden Themes; das Badge soll
den Zustand gerade lesbar tragen.

### D3 – Option B: Abblendung nur auf dem Text, Untertitel kräftiger (gewählt)
**Vorteile:** AA bleibt erfüllt, Optik nahezu identisch (weiße Karte auf grauem Grund).
**Nachteile:** minimale Abweichung vom Issue-Wortlaut; Test nötig, damit sie nicht schleichend
bricht.

## Begründung

Der Slot hält den Baustein klein und route-neutral und lässt die Folge-Issues ihre Aktionen
selbst bestimmen. Natives `<details>` mit `group-open/aufklapper:` ist die einzige Lösung, die ohne JS und
ohne Client-Komponenten auskommt. Die Abblendung ist die einzige Stelle, an der der Spec-Wortlaut
einer Barrierefreiheits-Regel weichen muss; die Rechnung steht oben.

## Konsequenzen

**Positiv:**
- Vier Listen-Markups (Veranstaltungsliste, Startseite, Arbeitsschritt-Kacheln, Detail-
  Teilnehmerzeile) werden auf einen Baustein reduziert; Optik und Hover leben an einem Ort. Die
  Kassier-Zeilenliste behält ihr Markup und gleicht nur die Token an (D4).
- Folge-Issues stellen um, indem sie `ListenZeile`/`Aufklapper` nutzen – ohne Farbwissen.
- Kassieren bleibt Server Component.

**Negativ / Trade-offs:**
- Pfeil/Hinweis-Wechsel hängt an der Tailwind-Variante `group-open/aufklapper:`; ein
  Tailwind-Update, das sie
  ändert, fiele im Browser-Test (Playwright) auf, nicht im jsdom-Test (jsdom wertet
  CSS-Varianten nicht aus). Der Unit-Test prüft Klassen und `open`, der Funktionsbeleg ist
  Playwright (Lesson „Nativer Popover").
- Die Kachel-Variante ohne Pfeil ist eine bewusste Ausnahme (`pfeil={false}`).

## Bezug zu anderen ADRs

- **ADR-052 D1/D2/D3:** Bausteinort, Token, Farb-Gate – erhält einen Nachtrag auf diese ADR.
- **ADR-031:** `prefetch={false}` der Startseite wird durchgereicht.
- **ADR-055 D4:** „Abrechnung im Detail" war dort bewusst *kein* eigener Baustein (erst ab dem
  dritten Verbraucher); mit Aufschlüsselung, Kassieren und Veranstaltungsliste ist der erreicht –
  die Stelle nutzt jetzt den `Aufklapper` (D2). ADR-055 trägt einen Nachtrag.
- **ADR-053/ADR-056:** Baustein-/Symbol-Konventionen (Inline-SVG in `icons.tsx`).
